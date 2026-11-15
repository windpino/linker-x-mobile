import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Box, Printer, Download, Plus, Edit2, Trash2, RefreshCw, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import WindowModal from './WindowModal';
import WarehouseRegistration from './WarehouseRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import './Warehouse.css';

const WarehouseManagement = ({ onClose, warehouses = [], setWarehouses, currentUser, staffList = [], logOperation }) => {
  const [toastMsg, setToastMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  // 창고 목록을 order(sequence) 순으로 정렬
  const sortedWarehouses = useMemo(() => {
    if (!Array.isArray(warehouses)) return [];
    return [...warehouses].sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : (a.sequence !== undefined ? Number(a.sequence) : 9999);
      const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : (b.sequence !== undefined ? Number(b.sequence) : 9999);
      if (orderA !== orderB) return orderA - orderB;
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
  }, [warehouses]);

  // 컴포넌트 마운트 시 Firestore warehouses 컬렉션에서 원격 데이터를 직접 조회하여 누락된 창고 자동 동기화
  useEffect(() => {
    let isMounted = true;
    const syncFirestoreWarehouses = async () => {
      try {
        const companyId = currentUser?.companyId || 'default';
        if (!companyId || !db || window.__isResettingData) return;
        if (localStorage.getItem(`bundle_reconciled_warehouses_${companyId}`) === 'true' && (!warehouses || warehouses.length === 0)) {
          return;
        }
        const colRef = collection(db, 'companies', companyId, 'warehouses');
        const snap = await getDocs(colRef);
        if (!snap.empty && isMounted) {
          const remoteList = snap.docs.map(d => ({
            ...d.data(),
            _docId: d.id,
            id: d.data().id ?? (isNaN(Number(d.id)) ? d.id : Number(d.id))
          }));

          const mergedMap = new Map();
          (warehouses || []).forEach(w => {
            const key = String(w._docId || w.id || w.name);
            mergedMap.set(key, w);
          });
          remoteList.forEach(w => {
            const key = String(w._docId || w.id || w.name);
            mergedMap.set(key, { ...(mergedMap.get(key) || {}), ...w });
          });

          const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
            const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : (a.sequence !== undefined ? Number(a.sequence) : 9999);
            const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : (b.sequence !== undefined ? Number(b.sequence) : 9999);
            if (orderA !== orderB) return orderA - orderB;
            if (a.isMain && !b.isMain) return -1;
            if (!a.isMain && b.isMain) return 1;
            return (a.name || '').localeCompare(b.name || '', 'ko');
          });

          if (mergedList.length !== warehouses.length || JSON.stringify(mergedList) !== JSON.stringify(warehouses)) {
            if (setWarehouses) setWarehouses(mergedList);
            await saveBundle(companyId, 'warehouses', mergedList);
            localStorage.setItem(`warehouses_${companyId}`, JSON.stringify(mergedList));
          }
        }
      } catch (err) {
        console.warn('Auto sync warehouses failed:', err);
      }
    };

    syncFirestoreWarehouses();
    return () => { isMounted = false; };
  }, [currentUser?.companyId]);

  // 순서 변경 함수
  const handleReorder = async (fromIdx, toIdx) => {
    if (fromIdx === null || fromIdx === undefined || toIdx === null || toIdx === undefined || fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= sortedWarehouses.length || toIdx >= sortedWarehouses.length) return;

    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정 권한이 없습니다.');
      return;
    }

    const nextList = [...sortedWarehouses];
    const [movedWh] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, movedWh);

    const reorderedList = nextList.map((wh, idx) => ({
      ...wh,
      order: idx + 1,
      sequence: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    if (setWarehouses) setWarehouses(reorderedList);

    const companyId = currentUser?.companyId || 'default';
    await saveBundle(companyId, 'warehouses', reorderedList);
    localStorage.setItem(`warehouses_${companyId}`, JSON.stringify(reorderedList));
    localStorage.setItem('warehouses', JSON.stringify(reorderedList));

    try {
      if (db) {
        const batch = writeBatch(db);
        reorderedList.forEach(wh => {
          const docId = wh._docId || String(wh.id);
          const whDocRef = doc(db, 'companies', companyId, 'warehouses', docId);
          batch.set(whDocRef, { order: wh.order, sequence: wh.sequence, updatedAt: wh.updatedAt }, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Warehouse reorder batch error:', err);
    }

    if (logOperation) {
      await logOperation({
        category: '수정',
        subCategory: '창고',
        type: '순서변경',
        title: `창고 순서 변경 (${movedWh.name} ➔ ${toIdx + 1}번)`,
        detail: `창고 [${movedWh.name}] 순서를 ${toIdx + 1}번째로 변경`,
        user: currentUser?.name || '시스템',
        targetId: String(movedWh._docId || movedWh.id)
      });
    }

    setToastMsg(`창고 순서가 변경되었습니다. (${movedWh.name} ➔ ${toIdx + 1}번째)`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleMoveUp = (index) => {
    if (index > 0) handleReorder(index, index - 1);
  };

  const handleMoveDown = (index) => {
    if (index < sortedWarehouses.length - 1) handleReorder(index, index + 1);
  };

  const handleToggleMainWarehouse = async (targetWh) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const targetDocId = targetWh._docId || String(targetWh.id);
      const nextIsMain = !targetWh.isMain;
      const batch = writeBatch(db);

      const targetDocRef = doc(db, 'companies', companyId, 'warehouses', targetDocId);
      batch.set(targetDocRef, { isMain: nextIsMain, updatedAt: new Date().toISOString() }, { merge: true });

      if (nextIsMain) {
        warehouses.forEach(w => {
          const otherDocId = w._docId || String(w.id);
          if (otherDocId !== targetDocId && w.isMain) {
            const otherWhDocRef = doc(db, 'companies', companyId, 'warehouses', otherDocId);
            batch.set(otherWhDocRef, { isMain: false, updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
      }

      await batch.commit();

      const nextWarehouses = warehouses.map(w => {
        const isTarget = String(w._docId || w.id) === String(targetDocId);
        if (isTarget) return { ...w, isMain: nextIsMain };
        if (nextIsMain) return { ...w, isMain: false };
        return w;
      });

      if (setWarehouses) setWarehouses(nextWarehouses);
      await saveBundle(companyId, 'warehouses', nextWarehouses);
      localStorage.setItem(`warehouses_${companyId}`, JSON.stringify(nextWarehouses));
    } catch (err) {
      console.error('Toggle main warehouse error:', err);
      alert('메인창고 설정 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  };

  const filteredWarehouses = sortedWarehouses.filter(w => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const assignedStaff = staffList.filter(s => s.warehouse === w.name).map(s => s.name.toLowerCase()).join(' ');
    return (w.name && w.name.toLowerCase().includes(term)) ||
           assignedStaff.includes(term) ||
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
      const docId = editingWarehouse?._docId || (editingWarehouse?.id ? String(editingWarehouse.id) : String(Date.now()));
      const safeWhId = editingWarehouse?.id ?? (isNaN(Number(docId)) ? docId : Number(docId));
      
      const isVeh = !!(editingWarehouse?.isVehicle || editingWarehouse?.vehicleId || String(docId).startsWith('wh_veh_') || editingWarehouse?.name?.startsWith('[차량]'));
      const vId = editingWarehouse?.vehicleId || (String(docId).startsWith('wh_veh_') ? String(docId).replace('wh_veh_', '') : null);

      const finalData = {
        ...(editingWarehouse || {}),
        ...whData,
        id: safeWhId,
        color: whData.color || editingWarehouse?.color || '#3b82f6',
        companyId,
        order: editingWarehouse?.order ?? editingWarehouse?.sequence ?? (warehouses.length + 1),
        sequence: editingWarehouse?.sequence ?? editingWarehouse?.order ?? (warehouses.length + 1),
        updatedAt: new Date().toISOString()
      };

      if (isVeh) {
        finalData.isVehicle = true;
        if (vId) finalData.vehicleId = isNaN(Number(vId)) ? vId : Number(vId);
      }

      const batch = writeBatch(db);

      // 1. Save warehouse doc
      const whDocRef = doc(db, 'companies', companyId, 'warehouses', docId);
      batch.set(whDocRef, finalData, { merge: true });

      // If this warehouse is set as the main warehouse, disable isMain on all other warehouses
      if (whData.isMain) {
        warehouses.forEach(w => {
          const otherDocId = w._docId || String(w.id);
          if (otherDocId !== docId && w.isMain) {
            const otherWhDocRef = doc(db, 'companies', companyId, 'warehouses', otherDocId);
            batch.set(otherWhDocRef, { isMain: false, updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
      }

      // 2. If this warehouse is linked to a vehicle, also sync color to vehicles collection
      if (isVeh && vId) {
        const vehicleDocRef = doc(db, 'companies', companyId, 'vehicles', String(vId));
        batch.set(vehicleDocRef, {
          color: whData.color || '#3b82f6',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();

      // 상태 및 번들 동기화 반영
      const isNew = !editingWarehouse && !warehouses.some(w => String(w._docId || w.id) === String(docId));
      let nextWarehouses = isNew
        ? [...warehouses, { ...finalData, _docId: docId }]
        : warehouses.map(w => String(w._docId || w.id) === String(docId) ? { ...w, ...finalData, _docId: docId } : w);

      if (whData.isMain) {
        nextWarehouses = nextWarehouses.map(w =>
          String(w._docId || w.id) === String(docId) ? { ...w, isMain: true } : { ...w, isMain: false }
        );
      }

      nextWarehouses.sort((a, b) => {
        const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : (a.sequence !== undefined ? Number(a.sequence) : 9999);
        const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : (b.sequence !== undefined ? Number(b.sequence) : 9999);
        return orderA - orderB;
      });

      if (setWarehouses) setWarehouses(nextWarehouses);
      await saveBundle(companyId, 'warehouses', nextWarehouses);
      localStorage.setItem(`warehouses_${companyId}`, JSON.stringify(nextWarehouses));

      if (logOperation) {
        await logOperation({
          category: isNew ? '등록' : '수정',
          subCategory: '창고',
          type: isNew ? '등록' : '수정',
          title: isNew ? `창고 등록 (${finalData.name})` : `창고 수정 (${finalData.name})`,
          detail: `창고명: ${finalData.name} | 담당자: ${finalData.manager || '-'} | 주소: ${finalData.address || '-'}`,
          user: currentUser?.name || '시스템',
          targetId: String(docId)
        });
      }

      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Warehouse save error:', err);
      alert('창고 정보 저장 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  };

  const handleDeleteWarehouse = async (wh) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      const docId = typeof wh === 'object' ? (wh._docId || String(wh.id)) : String(wh);
      await deleteDoc(doc(db, 'companies', companyId, 'warehouses', docId));

      const nextWarehouses = warehouses
        .filter(w => String(w._docId || w.id) !== String(docId))
        .map((w, idx) => ({ ...w, order: idx + 1, sequence: idx + 1 }));

      if (setWarehouses) setWarehouses(nextWarehouses);
      await saveBundle(companyId, 'warehouses', nextWarehouses);
      localStorage.setItem(`warehouses_${companyId}`, JSON.stringify(nextWarehouses));

      if (logOperation) {
        await logOperation({
          category: '삭제',
          subCategory: '창고',
          type: '삭제',
          title: `창고 삭제 (${wh.name || '창고'})`,
          detail: `창고명: ${wh.name || '-'} | 담당자: ${wh.manager || '-'}`,
          user: currentUser?.name || '시스템',
          targetId: String(docId)
        });
      }
    } catch (err) {
      console.error('Warehouse delete error:', err);
      alert('창고 삭제 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  };

  const handleExcelExport = () => {
    const columnMap = {
      order: '순서',
      name: '창고명',
      address: '주소',
      memo: '메모',
      isMain: '메인창고여부'
    };
    const formattedData = formatDataForExcel(sortedWarehouses, columnMap);
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
        <div style={{ padding: '10px', position: 'relative' }}>
          
          {toastMsg && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}>
              <CheckCircle2 size={15} /> {toastMsg}
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box color="#3b82f6" size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>창고 관리</h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>물류 거점 및 차량 창고 순서 관리</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
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
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}
            />
          </div>

          {/* Mobile Warehouse Card List */}
          <div className="warehouse-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {filteredWarehouses.length === 0 ? (
              <div style={{
                padding: '36px 16px', textAlign: 'center', backgroundColor: '#1e293b',
                borderRadius: '10px', border: '1px dashed #334155', color: '#94a3b8',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}>
                <Box size={28} color="#94a3b8" />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>등록된 창고가 없습니다.</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>우측 상단의 '+ 창고 등록' 버튼을 눌러 등록하세요.</div>
              </div>
            ) : filteredWarehouses.map((wh, index) => (
              <div key={wh.id || wh._docId || index} style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    {/* 순번 & 이동 버튼 */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#60a5fa', background: 'rgba(37, 99, 235, 0.18)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 6px', borderRadius: '4px', minWidth: '18px', textAlign: 'center' }}>
                        {index + 1}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #475569', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          style={{
                            border: 'none',
                            borderRight: '1px solid #475569',
                            background: '#334155',
                            width: '20px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.3 : 1,
                            color: '#cbd5e1'
                          }}
                          title="위로 이동"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === filteredWarehouses.length - 1}
                          style={{
                            border: 'none',
                            background: '#334155',
                            width: '20px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: index === filteredWarehouses.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === filteredWarehouses.length - 1 ? 0.3 : 1,
                            color: '#cbd5e1'
                          }}
                          title="아래로 이동"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>

                    <input 
                      type="checkbox"
                      checked={!!wh.isMain}
                      onChange={() => handleToggleMainWarehouse(wh)}
                      style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                      title={wh.isMain ? '현재 메인창고입니다 (클릭 시 해제)' : '클릭하여 메인창고로 지정'}
                    />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: wh.color || '#3b82f6', flexShrink: 0 }}></div>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wh.name}
                    </span>
                    {wh.isMain && (
                      <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(37, 99, 235, 0.25)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid #3b82f6', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        메인
                      </span>
                    )}
                    {wh.isVehicle && (
                      <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid #f59e0b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        차량
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                    <button 
                      type="button"
                      onClick={() => handleEditWarehouse(wh)} 
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#f1f5f9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      <Edit2 size={12} /> 수정
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteWarehouse(wh)} 
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.78rem' }}>
                  <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>기본지정:</span>
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                      {staffList.filter(s => s.warehouse === wh.name).map(s => s.name).join(', ') || wh.manager || '미지정'}
                    </span>
                  </div>
                  {wh.address && (
                    <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>주소:</span>
                      <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.address}</span>
                    </div>
                  )}
                </div>

                {wh.memo && (
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '5px 8px', borderRadius: '6px', lineHeight: 1.4 }}>
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
