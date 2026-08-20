import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Printer, Download, Plus, Edit2, Trash2 } from 'lucide-react';
import WindowModal from './WindowModal';
import WarehouseRegistration from './WarehouseRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Warehouse.css';

const WarehouseManagement = ({ onClose, warehouses = [], setWarehouses, currentUser, staffList = [] }) => {
  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWarehouses = warehouses.filter(w => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (w.name && w.name.toLowerCase().includes(term)) ||
           (w.manager && w.manager.toLowerCase().includes(term)) ||
           (w.address && w.address.toLowerCase().includes(term)) ||
           (w.memo && w.memo.toLowerCase().includes(term));
  });

  const handleSaveWarehouse = async (whData) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const whId = editingWarehouse ? String(editingWarehouse.id) : String(Date.now());
      
      const finalData = {
        ...whData,
        id: Number(whId),
        companyId,
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);

      // 1. Save warehouse doc
      const whDocRef = doc(db, 'companies', companyId, 'warehouses', whId);
      batch.set(whDocRef, finalData);

      // If this warehouse is set as the main warehouse, disable isMain on all other warehouses
      if (whData.isMain) {
        warehouses.forEach(w => {
          if (w.id !== Number(whId) && w.isMain) {
            const otherWhDocRef = doc(db, 'companies', companyId, 'warehouses', String(w.id));
            batch.update(otherWhDocRef, { isMain: false });
          }
        });
      }

      // 2. Sync Staff's default warehouse if manager is set
      if (whData.manager) {
        const staff = staffList.find(s => s.name === whData.manager);
        if (staff) {
          const docId = staff._docId || `${companyId}_${staff.userId}`;
          const staffDocRef = doc(db, 'companies', companyId, 'staffList', docId);
          batch.update(staffDocRef, { warehouse: whData.name });
        }

        // Also, if this staff member was previously the manager of another warehouse, clear it.
        warehouses.forEach(w => {
          if (w.id !== Number(whId) && w.manager === whData.manager) {
            const oldWhDocRef = doc(db, 'companies', companyId, 'warehouses', String(w.id));
            batch.update(oldWhDocRef, { manager: '' });
          }
        });
      }

      await batch.commit();
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Warehouse save error:', err);
      alert('창고 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteWarehouse = async (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      await deleteDoc(doc(db, 'companies', companyId, 'warehouses', String(id)));
    } catch (err) {
      console.error('Warehouse delete error:', err);
      alert('창고 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExcelExport = () => {
    const columnMap = {
      name: '창고명',
      address: '주소',
      memo: '메모',
      isMain: '메인창고여부'
    };
    const formattedData = formatDataForExcel(warehouses, columnMap);
    exportToExcel(formattedData, '창고목록');
  };

  const handleOpenRegistration = () => {
    setEditingWarehouse(null);
    setIsRegistrationOpen(true);
  };

  const handleEditWarehouse = (wh) => {
    setEditingWarehouse(wh);
    setIsRegistrationOpen(true);
  };

  return (
    <>
      <WindowModal title="창고관리" onClose={onClose} width="100%">
        <div style={{ padding: '10px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box color="#3b82f6" size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>창고 관리</h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>물류 거점(창고) 및 차량 창고 관리</p>
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
                <Plus size={14} /> 창고 등록
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="창고명, 담당자, 주소 검색"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#f8fafc' }}
            />
          </div>

          {/* Mobile Warehouse Card List */}
          <div className="warehouse-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {filteredWarehouses.length === 0 ? (
              <div style={{
                padding: '36px 16px', textAlign: 'center', backgroundColor: '#f8fafc',
                borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}>
                <Box size={28} color="#94a3b8" />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>등록된 창고가 없습니다.</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>우측 상단의 '+ 창고 등록' 버튼을 눌러 등록하세요.</div>
              </div>
            ) : filteredWarehouses.map(wh => (
              <div key={wh.id} style={{
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
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: wh.color || '#3b82f6', flexShrink: 0 }}></div>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1e293b' }}>
                      {wh.name}
                    </span>
                    {wh.isMain && (
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        메인
                      </span>
                    )}
                    {wh.isVehicle && (
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        차량
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleEditWarehouse(wh)} 
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      <Edit2 size={12} /> 수정
                    </button>
                    <button 
                      onClick={() => handleDeleteWarehouse(wh.id)} 
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                  <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>담당:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{wh.manager || '미지정'}</span>
                  </div>
                  <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>주소:</span>
                    <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.address || '-'}</span>
                  </div>
                </div>

                {wh.memo && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                    {wh.memo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </WindowModal>

      {isRegistrationOpen && (
        <WarehouseRegistration 
          onClose={() => setIsRegistrationOpen(false)} 
          initialData={editingWarehouse}
          onSave={handleSaveWarehouse}
          staffList={staffList}
        />
      )}
    </>
  );
};

export default WarehouseManagement;
