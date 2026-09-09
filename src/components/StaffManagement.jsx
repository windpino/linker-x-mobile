import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UserPlus, Printer, Download, Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import WindowModal from './WindowModal';
import StaffRegistration from './StaffRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Staff.css';

const StaffManagement = ({ onClose, staffList, setStaffList, warehouses = [], currentUser, staffZones, setStaffZones, staffJobTitles, setStaffJobTitles }) => {
  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const handleOpenRegistration = () => {
    setEditingStaff(null);
    setIsRegistrationOpen(true);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setIsRegistrationOpen(true);
  };

  const handleSaveStaff = async (staffData) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const targetDocId = staffData.userId ? `${companyId}_${staffData.userId}` : (editingStaff?._docId || String(staffData.id || Date.now()));
      
      const finalData = {
        ...(editingStaff || {}),
        ...staffData,
        id: editingStaff?.id || staffData.id || Date.now(),
        companyId,
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);

      // 1. Save staff doc
      const staffDocRef = doc(db, 'companies', companyId, 'staffList', targetDocId);
      batch.set(staffDocRef, finalData, { merge: true });

      // If existing _docId is different from targetDocId, delete the old doc
      if (editingStaff?._docId && editingStaff._docId !== targetDocId) {
        const oldStaffDocRef = doc(db, 'companies', companyId, 'staffList', editingStaff._docId);
        batch.delete(oldStaffDocRef);
      }

      // Also clean up any legacy raw numeric ID doc if it exists and differs
      if (editingStaff?.id && String(editingStaff.id) !== targetDocId && !String(editingStaff.id).includes('_')) {
        const legacyDocRef = doc(db, 'companies', companyId, 'staffList', String(editingStaff.id));
        batch.delete(legacyDocRef);
      }

      // 2. Bidirectional sync:
      // If this staff member has a warehouse assigned, set them as the manager of that warehouse
      if (staffData.warehouse) {
        // Find the warehouse by name
        const warehouse = warehouses.find(w => w.name === staffData.warehouse);
        if (warehouse) {
          const whDocId = warehouse._docId || String(warehouse.id);
          const whDocRef = doc(db, 'companies', companyId, 'warehouses', whDocId);
          batch.set(whDocRef, { manager: staffData.name, updatedAt: new Date().toISOString() }, { merge: true });
        }

        // Also, if they were previously the manager of a different warehouse, clear it.
        warehouses.forEach(w => {
          const otherDocId = w._docId || String(w.id);
          if (w.name !== staffData.warehouse && w.manager === staffData.name) {
            const oldWhDocRef = doc(db, 'companies', companyId, 'warehouses', otherDocId);
            batch.set(oldWhDocRef, { manager: '', updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
      } else {
        // If warehouse is unassigned/cleared, clear this staff from any warehouse where they were manager
        warehouses.forEach(w => {
          const otherDocId = w._docId || String(w.id);
          if (w.manager === staffData.name) {
            const oldWhDocRef = doc(db, 'companies', companyId, 'warehouses', otherDocId);
            batch.set(oldWhDocRef, { manager: '', updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
      }

      await batch.commit();
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Staff save error:', err);
      alert('직원 정보 저장 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  };

  const handleDeleteStaff = async (staffOrId) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 이 직원을 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      const staff = typeof staffOrId === 'object' ? staffOrId : staffList.find(s => String(s.id) === String(staffOrId));
      const batch = writeBatch(db);

      const docIdsToDelete = new Set();
      if (staff?._docId) docIdsToDelete.add(staff._docId);
      if (staff?.userId) docIdsToDelete.add(`${companyId}_${staff.userId}`);
      if (staff?.id) docIdsToDelete.add(String(staff.id));
      if (typeof staffOrId === 'string') docIdsToDelete.add(staffOrId);

      docIdsToDelete.forEach(dId => {
        if (dId) {
          batch.delete(doc(db, 'companies', companyId, 'staffList', dId));
        }
      });

      // 담당 창고가 있다면 창고 관리자 해제
      warehouses.forEach(w => {
        const otherDocId = w._docId || String(w.id);
        if (staff?.name && w.manager === staff.name) {
          const oldWhDocRef = doc(db, 'companies', companyId, 'warehouses', otherDocId);
          batch.set(oldWhDocRef, { manager: '', updatedAt: new Date().toISOString() }, { merge: true });
        }
      });

      await batch.commit();
    } catch (err) {
      console.error('Staff delete error:', err);
      alert('직원 삭제 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  };

  const sortStaffList = (list) => {
    return [...list].sort((a, b) => {
      const isAdminA = a.role === 'super_admin' || a.role === 'admin' || a.userId === 'admin' || a.jobTitle === '관리자' || a.jobTitle === '대표이사' || a.jobTitle === '대표';
      const isAdminB = b.role === 'super_admin' || b.role === 'admin' || b.userId === 'admin' || b.jobTitle === '관리자' || b.jobTitle === '대표이사' || b.jobTitle === '대표';

      if (isAdminA && !isAdminB) return -1;
      if (!isAdminA && isAdminB) return 1;

      const seqA = a.sequence !== undefined && a.sequence !== null && a.sequence !== '' ? a.sequence : null;
      const seqB = b.sequence !== undefined && b.sequence !== null && b.sequence !== '' ? b.sequence : null;

      if (seqA !== null && seqB !== null) {
        const numA = Number(seqA);
        const numB = Number(seqB);
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB;
        } else {
          const comp = String(seqA).localeCompare(String(seqB), 'ko', { numeric: true });
          if (comp !== 0) return comp;
        }
      } else if (seqA !== null && seqB === null) {
        return -1;
      } else if (seqA === null && seqB !== null) {
        return 1;
      }

      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });
  };

  const handleExcelExport = () => {
    const columnMap = {
      sequence: '순번',
      name: '성명',
      jobTitle: '직위',
      phone: '전화번호',
      warehouse: '담당창고',
      email: '이메일',
      memo: '메모'
    };
    const formattedData = formatDataForExcel(sortStaffList(staffList), columnMap);
    exportToExcel(formattedData, '직원명단');
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaffList = sortStaffList(staffList.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (s.name && s.name.toLowerCase().includes(term)) ||
           (s.phone && s.phone.includes(term)) ||
           (s.jobTitle && s.jobTitle.toLowerCase().includes(term)) ||
           (s.warehouse && s.warehouse.toLowerCase().includes(term));
  }));

  return (
    <>
      <WindowModal title="직원관리" onClose={onClose} width="100%">
        <div style={{ padding: '10px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus color="#3b82f6" size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>직원 관리</h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>직원 정보 및 담당 창고 관리</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button 
                onClick={handleExcelExport} 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <Download size={13} /> 엑셀
              </button>
              <button 
                onClick={handleOpenRegistration}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
              >
                <Plus size={14} /> 직원 추가
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="직원 성명, 직위, 전화번호, 담당창고 검색"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#f8fafc' }}
            />
          </div>

          {/* Mobile Staff Card List */}
          <div className="staff-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {filteredStaffList.length === 0 ? (
              <div style={{
                padding: '36px 16px', textAlign: 'center', backgroundColor: '#f8fafc',
                borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}>
                <UserPlus size={28} color="#94a3b8" />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>등록된 직원이 없습니다.</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>우측 상단의 '+ 직원 추가' 버튼을 눌러 직원을 등록하세요.</div>
              </div>
            ) : filteredStaffList.map(staff => (
              <div key={staff.id} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                      #{staff.sequence || '-'}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1e293b' }}>
                      {staff.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                      {staff.jobTitle || '사원'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleEditStaff(staff)} 
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      <Edit2 size={12} /> 수정
                    </button>
                    <button 
                      onClick={() => handleDeleteStaff(staff)} 
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                  <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>전화:</span>
                    <a href={`tel:${staff.phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                      {staff.phone || '-'}
                    </a>
                  </div>
                  <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>창고:</span>
                    <Building2 size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.warehouse || '미지정'}{staff.zone ? ` (${staff.zone})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WindowModal>

      {isRegistrationOpen && (
        <StaffRegistration 
          onClose={() => setIsRegistrationOpen(false)} 
          initialData={editingStaff}
          onSave={handleSaveStaff}
          warehouses={warehouses}
          nextSequence={(() => {
            const sequences = staffList.map(s => parseInt(s.sequence)).filter(n => !isNaN(n));
            return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
          })()}
          staffZones={staffZones}
          setStaffZones={setStaffZones}
          staffJobTitles={staffJobTitles}
          setStaffJobTitles={setStaffJobTitles}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default StaffManagement;
