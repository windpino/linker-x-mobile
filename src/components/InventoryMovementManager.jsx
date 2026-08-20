import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Search, Calendar, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import WindowModal from './WindowModal';
import './InventoryTransfer.css';

const InventoryMovementManager = ({ 
  onClose, 
  historyData = [], 
  warehouses = [], 
  products = [], 
  onUpdateTransfer, 
  onDeleteTransfer,
  onDeleteAllTransfers
}) => {
  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    endDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    fromWarehouse: '전체',
    toWarehouse: '전체',
    searchTerm: ''
  });

  const handleQuickDate = (type) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDate(today);

    switch (type) {
      case '1년':
        start = `${y}-01-01`;
        end = `${y}-12-31`;
        break;
      case '상반기':
        start = `${y}-01-01`;
        end = `${y}-06-30`;
        break;
      case '하반기':
        start = `${y}-07-01`;
        end = `${y}-12-31`;
        break;
      case '한달':
        start = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
      case '1주일':
        const day = today.getDay();
        const sun = new Date(today);
        sun.setDate(today.getDate() - day);
        start = formatDate(sun);
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }

    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const filteredHistory = useMemo(() => {
    return historyData
      .filter(h => {
        if (h.date < filters.startDate || h.date > filters.endDate) return false;
        if (filters.fromWarehouse !== '전체' && h.from !== filters.fromWarehouse) return false;
        if (filters.toWarehouse !== '전체' && h.to !== filters.toWarehouse) return false;
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          const itemLower = h.item?.toLowerCase() || '';
          if (!itemLower.includes(term)) {
            const product = products && products.find(p => p.name === h.item);
            if (!product || !product.abbreviation || !product.abbreviation.toLowerCase().includes(term)) {
              return false;
            }
          }
        }
        return true;
      })
      .sort((a, b) => b.id - a.id);
  }, [historyData, filters]);

  const getWarehouseColor = (name) => {
    const wh = warehouses.find(w => w.name === name);
    return wh?.color || '#64748b';
  };

  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleSaveEdit = async () => {
    if (editForm.from === editForm.to) {
      alert('출고창고와 입고창고가 같을 수 없습니다.');
      return;
    }
    if (!editForm.item || editForm.qty <= 0) {
      alert('품목명과 수량을 올바르게 입력해주세요.');
      return;
    }

    try {
      await onUpdateTransfer(editForm.id, editForm);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('이 이동 내역을 삭제하시겠습니까?\n이동되었던 재고는 원래 창고로 자동 복구됩니다.')) {
      try {
        await onDeleteTransfer(id);
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (filteredHistory.length === 0) {
      alert('삭제할 내역이 없습니다.');
      return;
    }
    if (window.confirm(`현재 검색된 ${filteredHistory.length}개의 이동 내역을 모두 삭제하시겠습니까?\n이동되었던 재고는 원래 창고로 자동 복구됩니다.`)) {
      try {
        const idsToDelete = filteredHistory.map(h => h.id);
        if (onDeleteAllTransfers) {
          await onDeleteAllTransfers(idsToDelete);
        } else {
          // fallback if prop is not passed for some reason
          for (let id of idsToDelete) {
            await onDeleteTransfer(id);
          }
        }
        alert('삭제되었습니다.');
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <WindowModal title="재고 이동 현황 관리" onClose={onClose} width="1100px" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box' }}>
        
        {/* Header: Title & Bulk Delete */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeftRight size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                재고 이동 현황 관리
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                총 <strong style={{ color: '#3b82f6' }}>{filteredHistory.length}</strong>건 내역
              </p>
            </div>
          </div>

          <button 
            onClick={handleDeleteAll}
            style={{
              padding: '6px 10px', background: '#fee2e2', color: '#ef4444',
              border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem',
              fontWeight: 700
            }}
            title="현재 검색 조건에 해당하는 모든 내역을 삭제합니다."
          >
            <Trash2 size={13} /> 전체 삭제
          </button>
        </div>

        {/* Info Banner */}
        <div style={{ fontSize: '0.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', padding: '6px 10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <ShieldAlert size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span>내역 삭제/수정 시 실제 재고가 연동되어 자동 복구됩니다.</span>
        </div>

        {/* Filters Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={filters.startDate} 
              onChange={e => setFilters({...filters, startDate: e.target.value})} 
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>~</span>
            <input 
              type="date" 
              value={filters.endDate} 
              onChange={e => setFilters({...filters, endDate: e.target.value})} 
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
          </div>

          {/* Quick Date Chips */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
              <button
                key={btn}
                type="button"
                onClick={() => handleQuickDate(btn)}
                style={{
                  padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700,
                  border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff',
                  color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >{btn}</button>
            ))}
          </div>

          {/* Warehouse Selectors (2-Col Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select 
              value={filters.fromWarehouse} 
              onChange={e => setFilters({...filters, fromWarehouse: e.target.value})} 
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
            >
              <option value="전체">출고: 전체</option>
              {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>

            <select 
              value={filters.toWarehouse} 
              onChange={e => setFilters({...filters, toWarehouse: e.target.value})} 
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
            >
              <option value="전체">입고: 전체</option>
              {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="품목명 검색..." 
              value={filters.searchTerm} 
              onChange={e => setFilters({...filters, searchTerm: e.target.value})}
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
            />
          </div>
        </div>

        {/* History List Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', margin: '8px 0' }}>
              해당 기간 및 조건에 이동 내역이 없습니다.
            </div>
          ) : (
            filteredHistory.map(row => {
              const isEditing = editingId === row.id;

              if (isEditing) {
                return (
                  <div key={row.id} style={{ backgroundColor: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb' }}>내역 수정</span>
                      <input 
                        type="date" 
                        value={editForm.date} 
                        onChange={e => setEditForm({...editForm, date: e.target.value})} 
                        style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', outline: 'none' }} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>출고창고</label>
                        <select 
                          value={editForm.from} 
                          onChange={e => setEditForm({...editForm, from: e.target.value})} 
                          style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                          {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>입고창고</label>
                        <select 
                          value={editForm.to} 
                          onChange={e => setEditForm({...editForm, to: e.target.value})} 
                          style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                          {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{editForm.item}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>수량:</span>
                        <input 
                          type="number" 
                          value={editForm.qty} 
                          onChange={e => setEditForm({...editForm, qty: Number(e.target.value)})} 
                          style={{ width: '70px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontWeight: 800, fontSize: '0.85rem' }} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button onClick={handleSaveEdit} style={{ padding: '5px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                        저장
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '5px 12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                        취소
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={row.id} style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Row 1: Date & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{row.date}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleEditClick(row)} style={{ padding: '3px 6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Edit2 size={12} /> 수정
                      </button>
                      <button onClick={() => handleDelete(row.id)} style={{ padding: '3px 6px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Warehouse Route */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: `${getWarehouseColor(row.from)}20`, color: getWarehouseColor(row.from), fontSize: '0.75rem' }}>
                      {row.from}
                    </span>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: `${getWarehouseColor(row.to)}20`, color: getWarehouseColor(row.to), fontSize: '0.75rem' }}>
                      {row.to}
                    </span>
                  </div>

                  {/* Row 3: Product Name & Quantity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{row.item}</span>
                      {row.spec && <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>({row.spec})</span>}
                    </div>
                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.9rem' }}>
                      {Number(row.qty).toLocaleString()}개
                    </span>
                  </div>

                  {/* Row 4: Operator */}
                  {row.operator && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right' }}>
                      담당자: {row.operator}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default InventoryMovementManager;
