import React, { useState, useRef, useCallback } from 'react';
import { Box, Printer, Download, Plus, Edit2, Trash2 } from 'lucide-react';
import WindowModal from './WindowModal';
import WarehouseRegistration from './WarehouseRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Warehouse.css';

const WarehouseManagement = ({ onClose, warehouses = [], setWarehouses, currentUser, staffList = [] }) => {
  const [colWidths, setColWidths] = useState({
    name: 180,
    address: 280,
    manager: 150,
    memo: 250,
    control: 100
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 50;

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
  const [editingWarehouse, setEditingWarehouse] = useState(null);

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
      <WindowModal title="창고관리" onClose={onClose}>
        <div className="warehouse-header">
          <div className="wh-title-section">
            <h2 className="wh-title">
              <Box color="#3b82f6" size={24} strokeWidth={2} />
              창고 관리
            </h2>
            <p className="wh-desc">물류 거점(창고) 정보를 등록하고 관리합니다.</p>
          </div>
          <div className="wh-actions">
            <button className="btn-outline wh-btn"><Printer size={16} /> 인쇄</button>
            <button className="btn-outline wh-btn" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
            <button className="btn-primary" onClick={handleOpenRegistration}>
              <Plus size={16} /> 창고 등록
            </button>
          </div>
        </div>

        <div className="warehouse-table-container">
          <table className="warehouse-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                {[
                  { key: 'name', label: '창고명', width: colWidths.name, align: 'left' },
                  { key: 'address', label: '주소', width: colWidths.address, align: 'left' },
                  { key: 'manager', label: '담당자', width: colWidths.manager, align: 'left' },
                  { key: 'memo', label: '설명 메모', width: colWidths.memo, align: 'left' },
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
              {warehouses.map(wh => (
                <tr key={wh.id}>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div className="wh-name-cell">
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: wh.color || '#3b82f6', marginRight: '8px', flexShrink: 0 }}></div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.name}</span>
                      {wh.isMain && <span className="wh-badge" style={{ flexShrink: 0 }}><Box size={12} /> 메인</span>}
                    </div>
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.address}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.manager || '-'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wh.memo || '-'}
                  </td>
                  <td>
                    <div className="wh-action-cell">
                      <button className="icon-btn" onClick={() => handleEditWarehouse(wh)}><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={() => handleDeleteWarehouse(wh.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
