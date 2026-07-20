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
    <WindowModal title="재고 이동 현황 관리" onClose={onClose} width="1100px">
      <div className="report-v2-header">
        <div className="report-v2-title-group">
          <ArrowLeftRight size={24} color="#3b82f6" />
          <h2 className="report-v2-title">재고 이동 현황 관리</h2>
        </div>
        <div className="report-v2-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <ShieldAlert size={14} color="#f59e0b" />
            내역 삭제/수정 시 실제 재고가 연동되어 자동 복구됩니다.
          </div>
          <button 
            onClick={handleDeleteAll}
            style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
            title="현재 검색 조건에 해당하는 모든 내역을 삭제합니다."
          >
            <Trash2 size={14} />
            전체 내역 삭제
          </button>
        </div>
      </div>

      <div className="report-v2-filters" style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="date-range-picker" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px' }}>
              <Calendar size={18} color="#64748b" />
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ border: 'none', outline: 'none' }} />
              <span>~</span>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ border: 'none', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleQuickDate(btn)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}
                >{btn}</button>
              ))}
            </div>
          </div>
          
          <select value={filters.fromWarehouse} onChange={e => setFilters({...filters, fromWarehouse: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', outline: 'none' }}>
            <option value="전체">출고창고 (전체)</option>
            {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
          </select>

          <select value={filters.toWarehouse} onChange={e => setFilters({...filters, toWarehouse: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', outline: 'none' }}>
            <option value="전체">입고창고 (전체)</option>
            {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
          </select>

          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="품목명 검색..." 
              value={filters.searchTerm} 
              onChange={e => setFilters({...filters, searchTerm: e.target.value})}
              style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', background: '#fff' }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>일자</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>출고창고 (From)</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>입고창고 (To)</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>품목명</th>
                <th style={{ padding: '12px', textAlign: 'right', width: '100px' }}>수량</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>담당자</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    해당 기간에 이동 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', background: editingId === row.id ? '#eff6ff' : '#fff' }}>
                    {editingId === row.id ? (
                      // 편집 모드
                      <>
                        <td style={{ padding: '8px' }}>
                          <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={editForm.from} onChange={e => setEditForm({...editForm, from: e.target.value})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                            {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={editForm.to} onChange={e => setEditForm({...editForm, to: e.target.value})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                            {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="text" value={editForm.item} readOnly disabled style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b' }} title="품목명은 수정할 수 없습니다." />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" value={editForm.qty} onChange={e => setEditForm({...editForm, qty: Number(e.target.value)})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{row.operator}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={handleSaveEdit} style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>저장</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // 보기 모드
                      <>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{row.date}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', background: `${getWarehouseColor(row.from)}20`, color: getWarehouseColor(row.from), fontWeight: 600, fontSize: '0.75rem' }}>{row.from}</span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', background: `${getWarehouseColor(row.to)}20`, color: getWarehouseColor(row.to), fontWeight: 600, fontSize: '0.75rem' }}>{row.to}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.item}</div>
                          {row.spec && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.spec}</div>}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>
                          {Number(row.qty).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>{row.operator}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleEditClick(row)} style={{ padding: '4px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }} title="수정">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(row.id)} style={{ padding: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="삭제">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default InventoryMovementManager;
