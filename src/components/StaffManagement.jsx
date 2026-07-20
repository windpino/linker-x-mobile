import React, { useState, useRef, useCallback } from 'react';
import { UserPlus, Printer, Download, Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import WindowModal from './WindowModal';
import StaffRegistration from './StaffRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Staff.css';

const StaffManagement = ({ onClose, staffList, setStaffList, warehouses = [], currentUser, staffZones, setStaffZones, staffJobTitles, setStaffJobTitles }) => {
  const [colWidths, setColWidths] = useState({
    sequence: 70,
    name: 150,
    phone: 200,
    warehouse: 350,
    control: 100
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 40;

  const onResizeMouseDown = useCallback((e, colKey) => {
    e.preventDefault();
    resizingCol.current = colKey;
    resizeStartX.current = e.clientX;
    resizeStartW.current = colWidths[colKey];

    const onMove = (mv) => {
      const delta = mv.clientX - resizeStartX.current;
      const newW = Math.max(MIN_COL_W, resizeStartW.current + delta);
      setColWidths(prev => ({ ...prev, [resizingCol.current]: newW }));
    };

    const onUp = () => {
      resizingCol.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colWidths]);

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
      const docId = `${companyId}_${staffData.userId}`;
      
      const finalData = {
        ...staffData,
        id: staffData.id || Date.now(),
        companyId,
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);

      // 1. Save staff doc
      const staffDocRef = doc(db, 'companies', companyId, 'staffList', docId);
      batch.set(staffDocRef, finalData);

      // 2. Bidirectional sync:
      // If this staff member has a warehouse assigned, set them as the manager of that warehouse
      if (staffData.warehouse) {
        // Find the warehouse by name
        const warehouse = warehouses.find(w => w.name === staffData.warehouse);
        if (warehouse) {
          const whDocRef = doc(db, 'companies', companyId, 'warehouses', String(warehouse.id));
          batch.update(whDocRef, { manager: staffData.name });
        }

        // Also, if they were previously the manager of a different warehouse, clear it.
        warehouses.forEach(w => {
          if (w.name !== staffData.warehouse && w.manager === staffData.name) {
            const oldWhDocRef = doc(db, 'companies', companyId, 'warehouses', String(w.id));
            batch.update(oldWhDocRef, { manager: '' });
          }
        });
      }

      await batch.commit();
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Staff save error:', err);
      alert('직원 정보 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    console.log('handleDeleteStaff called with ID:', staffId);
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 이 직원을 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      const staff = staffList.find(s => String(s.id) === String(staffId));
      
      // Use _docId from sync if available, otherwise reconstruct from userId
      const docId = staff?._docId || (staff?.userId ? `${companyId}_${staff.userId}` : String(staffId));
      
      console.log('Deleting document:', docId);
      await deleteDoc(doc(db, 'companies', companyId, 'staffList', docId));
      
      // Secondary check: if it was a numeric ID in the new structure
      if (staff?.id && String(staff.id) !== docId) {
         await deleteDoc(doc(db, 'companies', companyId, 'staffList', String(staff.id)));
      }
    } catch (err) {
      console.error('Staff delete error:', err);
      alert('직원 삭제 중 오류가 발생했습니다: ' + err.message);
    }
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
    const formattedData = formatDataForExcel(staffList, columnMap);
    exportToExcel(formattedData, '직원명단');
  };

  return (
    <>
      <WindowModal title="직원관리" onClose={onClose}>
        <div className="staff-header">
          <div className="staff-title-section">
            <h2 className="staff-title">
              <UserPlus color="#3b82f6" size={24} strokeWidth={2} />
              직원 관리
            </h2>
            <p className="staff-desc">시스템 접근 권한 및 직원 정보를 관리합니다.</p>
          </div>
          <div className="staff-actions">
            <button className="btn-outline staff-btn"><Printer size={16} /> 인쇄</button>
            <button className="btn-outline staff-btn" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
            <button className="btn-primary" onClick={handleOpenRegistration}>
              <UserPlus size={16} /> 직원 추가
            </button>
          </div>
        </div>

        <div className="staff-table-container">
          <table className="staff-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                {[
                  { key: 'sequence', label: '순번', width: colWidths.sequence, align: 'center' },
                  { key: 'name', label: '성명', width: colWidths.name, align: 'left' },
                  { key: 'phone', label: '전화번호', width: colWidths.phone, align: 'left' },
                  { key: 'warehouse', label: '담당창고 및 지역', width: colWidths.warehouse, align: 'left' },
                  { key: 'control', label: '관리', width: colWidths.control, align: 'center' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    style={{ 
                      width: col.width + 'px', 
                      position: 'relative', 
                      userSelect: 'none',
                      textAlign: col.align === 'center' ? 'center' : 'left'
                    }}
                  >
                    {col.label}
                    <span
                      onMouseDown={(e) => onResizeMouseDown(e, col.key)}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0,
                        width: '6px', cursor: 'col-resize',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2,
                      }}
                      title={`${col.label} 너비 조절`}
                    >
                      <span style={{
                        display: 'block', width: '0px', height: '100%',
                        borderLeft: '1px dotted #cbd5e1',
                      }} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr key={staff.id}>
                  <td style={{ textAlign: 'center', fontWeight: '700', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.sequence || '-'}</td>
                  <td style={{ fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {staff.name}
                    <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', flexShrink: 0 }}>
                      {staff.jobTitle || '사원'}
                    </span>
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.phone}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div className="staff-warehouse-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Building2 size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {staff.warehouse || '미지정'}{staff.zone ? ` (지역: ${staff.zone})` : ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="staff-action-cell">
                      <button className="icon-btn" onClick={() => handleEditStaff(staff)}><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={() => handleDeleteStaff(staff.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
