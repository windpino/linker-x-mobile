import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeftRight, Search, Plus } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import './InventoryTransfer.css';

const InventoryTransfer = ({ 
  onClose, currentUser, warehouses = [], products = [], inventory = {}, onMoveStock,
  onDeleteMoveStock, historyData = [], setHistoryData,
  salesOrders = [], salesInvoices = [], onOpenSalesInvoice, onOpenSalesOrder,
  purchaseInvoices = [], onOpenPurchaseInvoice,
  initialDate
}) => {
  const [colWidths, setColWidths] = useState({
    date: 110,
    from: 100,
    to: 100,
    moveType: 90,
    item: 200,
    qty: 80,
    processedAt: 100,
    operator: 90,
    manage: 80
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
  const [startDateInput, setStartDateInput] = useState(() => {
    if (initialDate) {
      return typeof initialDate === 'string' ? initialDate : (initialDate instanceof Date ? initialDate.toISOString().split('T')[0] : initialDate);
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDateInput, setEndDateInput] = useState(() => {
    if (initialDate) {
      return typeof initialDate === 'string' ? initialDate : (initialDate instanceof Date ? initialDate.toISOString().split('T')[0] : initialDate);
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState(startDateInput);
  const [endDate, setEndDate] = useState(endDateInput);

  const [transferDate, setTransferDate] = useState(() => {
    if (initialDate) {
      return typeof initialDate === 'string' ? initialDate : (initialDate instanceof Date ? initialDate.toISOString().split('T')[0] : initialDate);
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (initialDate) {
      const dateStr = typeof initialDate === 'string' ? initialDate : (initialDate instanceof Date ? initialDate.toISOString().split('T')[0] : initialDate);
      setStartDateInput(dateStr);
      setEndDateInput(dateStr);
      setStartDate(dateStr);
      setEndDate(dateStr);
      setTransferDate(dateStr);
    }
  }, [initialDate]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleSaveEdit = async () => {
    if (editForm.from === editForm.to) {
      alert('출고창고와 입고창고가 같을 수 없습니다.');
      return;
    }
    if (Number(editForm.qty) <= 0) {
      alert('이동 수량을 1개 이상 입력해주세요.');
      return;
    }

    try {
      // 1. 기존 이동 삭제 및 재고 복구 (수정 전 데이터 롤백)
      await onDeleteMoveStock(editForm.id);
      
      // 2. 새로운 이동 등록 및 재고 가감 (수정 후 데이터 반영)
      await onMoveStock(editForm.from, editForm.to, editForm.item, Number(editForm.qty), false, editForm.date);
      
      setEditingId(null);
      setEditForm(null);
      alert('재고이동 내역이 성공적으로 수정되었습니다.');
    } catch (err) {
      console.error(err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleRowClickOrDoubleClick = (row) => {
    const badge = getTransferBadge(row);
    
    if (badge.text === '매출전표') {
      const foundInvoice = salesInvoices.find(inv => 
        inv.date === row.date && 
        inv.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundInvoice) {
        onOpenSalesInvoice(foundInvoice);
        onClose();
      } else {
        alert('매칭되는 매출전표를 찾을 수 없습니다.');
      }
    } else if (badge.text === '매입전표') {
      const foundInvoice = purchaseInvoices.find(inv => 
        inv.date === row.date && 
        inv.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundInvoice) {
        if (onOpenPurchaseInvoice) {
          onOpenPurchaseInvoice(foundInvoice);
          onClose();
        }
      } else {
        alert('매칭되는 매입전표를 찾을 수 없습니다.');
      }
    } else if (badge.text === '주문상차') {
      const parseOrderItems = (text) => {
        if (!text) return [];
        const tokens = text.trim().split(/[\s\n]+/);
        return tokens.map(token => {
          const match = token.match(/^(.+?)(\d+)$/);
          if (match) {
            return { name: match[1], qty: parseInt(match[2], 10) };
          }
          return { name: token, qty: 0 };
        });
      };
      
      const foundOrder = salesOrders.find(order => 
        order.date === row.date && 
        parseOrderItems(order.itemsText).some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundOrder) {
        onOpenSalesOrder(foundOrder);
        onClose();
      } else {
        alert('매칭되는 주문서를 찾을 수 없습니다.');
      }
    }
  };

  const handleSearch = () => {
    setStartDate(startDateInput);
    setEndDate(endDateInput);
  };

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

    setStartDateInput(start);
    setEndDateInput(end);
    setStartDate(start);
    setEndDate(end);
  };
  const [fromWarehouse, setFromWarehouse] = useState('전체창고');
  const [toWarehouse, setToWarehouse] = useState('전체창고');
  
  const getWarehouseColor = (name) => {
    if (name === '전체창고') return '#3b82f6';
    const wh = warehouses.find(w => w.name === name);
    return wh?.color || '#64748b';
  };

  const getTransferBadge = (row) => {
    if (row.memo === '상차(자동이동)') {
      return { text: '주문상차', bg: '#e0e7ff', color: '#4f46e5' };
    }
    if (row.to === '매출출고' || row.memo?.startsWith('[매출]') || row.memo?.includes('매출')) {
      return { text: '매출전표', bg: '#dcfce7', color: '#16a34a' };
    }
    if (row.from === '매입입고' || row.memo?.startsWith('[매입]') || row.memo?.includes('매입')) {
      return { text: '매입전표', bg: '#fee2e2', color: '#dc2626' };
    }
    if (row.memo === '수동이동') {
      return { text: '창고이동', bg: '#f1f5f9', color: '#475569' };
    }
    return { text: '창고이동', bg: '#f1f5f9', color: '#475569' };
  };
  const [itemSearch, setItemSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  
  // Search and selection
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const productInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const submitBtnRef = useRef(null);
  const productListRef = useRef(null);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setItemSearch(prod.name);
    setShowSuggestions(false);
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!itemSearch.trim()) return [];
    return products.filter(p => 
      matchesInitialSound(p.name, itemSearch) || 
      (p.abbreviation && matchesInitialSound(p.abbreviation, itemSearch))
    ).slice(0, 50);
  }, [itemSearch, products]);

  useEffect(() => {
    setSelectedIndex(suggestions.length > 0 ? 0 : -1);
  }, [itemSearch, suggestions]);

  useEffect(() => {
    if (selectedIndex !== -1 && productListRef.current) {
      const activeItem = productListRef.current.children[selectedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const recentHistory = useMemo(() => {
    return historyData.filter(item => {
      const matchesDate = item.date >= startDate && item.date <= endDate;
      if (!matchesDate) return false;
      const matchesFrom = fromWarehouse === '전체창고' || item.from === fromWarehouse;
      const matchesTo = toWarehouse === '전체창고' || item.to === toWarehouse;
      if (!matchesFrom || !matchesTo) return false;
      if (historySearch.trim()) {
        return matchesInitialSound(item.item || '', historySearch.trim());
      }
      return true;
    });
  }, [historyData, startDate, endDate, fromWarehouse, toWarehouse, historySearch]);

  const deletableHistory = useMemo(() => {
    return recentHistory.filter(h => getTransferBadge(h).text === '창고이동');
  }, [recentHistory]);

  const isAllSelected = useMemo(() => {
    return deletableHistory.length > 0 && deletableHistory.every(h => selectedHistoryIds.includes(h.id));
  }, [deletableHistory, selectedHistoryIds]);

  const isSomeSelected = useMemo(() => {
    return deletableHistory.length > 0 && 
      deletableHistory.some(h => selectedHistoryIds.includes(h.id)) && 
      !isAllSelected;
  }, [deletableHistory, selectedHistoryIds, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      const deletableIds = deletableHistory.map(h => h.id);
      setSelectedHistoryIds(prev => prev.filter(id => !deletableIds.includes(id)));
    } else {
      const deletableIds = deletableHistory.map(h => h.id);
      setSelectedHistoryIds(prev => {
        const otherIds = prev.filter(id => !deletableIds.includes(id));
        return [...otherIds, ...deletableIds];
      });
    }
  }, [isAllSelected, deletableHistory]);

  const handleTransfer = () => {
    if (fromWarehouse === '전체창고' || toWarehouse === '전체창고') {
      alert('출고창고와 입고창고는 "전체창고" 이외의 실제 창고를 지정해야 이동할 수 있습니다.');
      productInputRef.current?.focus();
      return;
    }

    if (!selectedProduct || quantity <= 0) {
      alert('품목과 수량을 정확히 입력해주세요.');
      productInputRef.current?.focus();
      return;
    }
    
    if (fromWarehouse === toWarehouse) {
      alert('출고창고와 입고창고가 같습니다.');
      productInputRef.current?.focus();
      return;
    }

    const prodObj = products.find(p => p.name === selectedProduct.name);
    const initialStock = prodObj?.initialStock || 0;
    const available = initialStock + ((inventory[fromWarehouse]?.[selectedProduct.name]) || 0);
    if (available < quantity) {
      if (!window.confirm(`선택한 창고의 재고(${available}개)가 부족합니다. 그래도 이동하시겠습니까?`)) {
        productInputRef.current?.focus();
        return;
      }
    }

    onMoveStock(fromWarehouse, toWarehouse, selectedProduct.name, parseInt(quantity, 10), false, transferDate);
    
    setItemSearch('');
    setSelectedProduct(null);
    setQuantity(0);
    alert('재고 이동이 완료되었습니다.');
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 10);
  };

  const totalQuantity = recentHistory.reduce((sum, item) => sum + item.qty, 0);

  return (
    <WindowModal title="재고이동 (매출관리)" onClose={onClose} width="950px">
      <div className="inv-wrapper" style={{ padding: '10px' }}>
        <div className="inv-form-box" style={{ background: '#fff', border: '2px solid #3b82f6', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#3b82f6" /> 신규 재고이동 등록
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>이력조회:</span>
              <input type="date" value={startDateInput} onChange={e => setStartDateInput(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: '#334155', fontWeight: 700 }} />
              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>~</span>
              <input type="date" value={endDateInput} onChange={e => setEndDateInput(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: '#334155', fontWeight: 700 }} />
              <div style={{ display: 'flex', gap: '3px', margin: '0 4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>
                {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                  <button
                    key={btn}
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >{btn}</button>
                ))}
              </div>
              <button 
                onClick={handleSearch}
                style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                검색
              </button>
            </div>
          </div>
          
          <div className="inv-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div className="inv-col">
              <label className="inv-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', marginBottom: '5px' }}>출고 창고 (FROM)</label>
              <select className="inv-select" value={fromWarehouse} onChange={e => setFromWarehouse(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid', borderColor: getWarehouseColor(fromWarehouse), borderRadius: '8px', outline: 'none' }}>
                <option value="전체창고">전체창고</option>
                {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>
            <div className="inv-col">
              <label className="inv-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '5px' }}>입고 창고 (TO)</label>
              <select className="inv-select" value={toWarehouse} onChange={e => setToWarehouse(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid', borderColor: getWarehouseColor(toWarehouse), borderRadius: '8px', outline: 'none' }}>
                <option value="전체창고">전체창고</option>
                {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>
            <div className="inv-col">
              <label className="inv-label text-blue" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', marginBottom: '5px' }}>이동 일자</label>
              <input type="date" className="inv-input" value={transferDate} onChange={e => setTransferDate(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
            </div>
          </div>

          <div className="inv-form-row" style={{ position: 'relative' }} ref={searchRef}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
              <div style={{ position: 'relative' }}>
                <label className="inv-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>품목 검색</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    ref={productInputRef}
                    type="text" 
                    className="inv-input" 
                    placeholder="품목명 또는 초성 검색" 
                    value={itemSearch}
                    onChange={e => {
                      setItemSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (itemSearch) setShowSuggestions(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                      } else if (e.key === 'Enter') {
                        if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                          e.preventDefault();
                          handleSelectProduct(suggestions[selectedIndex]);
                        } else if (suggestions.length === 1) {
                          e.preventDefault();
                          handleSelectProduct(suggestions[0]);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', height: '48px', outline: 'none' }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div 
                      ref={productListRef}
                      className="search-suggestions" 
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto',
                        marginTop: '5px'
                      }}
                    >
                      {suggestions.map((p, index) => (
                        <div 
                          key={p.id} 
                          className="suggestion-item" 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectProduct(p);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          style={{ 
                            padding: '12px 15px', 
                            cursor: 'pointer', 
                            borderBottom: '1px solid #f1f5f9', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            backgroundColor: index === selectedIndex ? '#f0f9ff' : 'transparent'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: index === selectedIndex ? 800 : 700 }}>{p.name}</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '8px' }}>{p.spec}</span>
                          </div>
                          <span style={{ color: '#3b82f6', fontWeight: 600 }}>현 재고: {((p.initialStock || 0) + (inventory[fromWarehouse]?.[p.name] || 0))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="inv-col">
                <label className="inv-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>이동 수량</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  className="inv-input" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitBtnRef.current?.focus();
                    }
                  }}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', height: '48px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', outline: 'none' }}
                />
              </div>

              <button 
                ref={submitBtnRef}
                className="btn-primary-inline" 
                onClick={handleTransfer}
                style={{ 
                  height: '48px', 
                  background: '#3b82f6', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 800, 
                  cursor: 'pointer' 
                }}
              >
                이동 실행
              </button>
            </div>
          </div>
        </div>

        <div className="inv-table-container" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>이동 내역 (실시간)</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="품목명 검색"
                  style={{
                    paddingLeft: '32px', paddingRight: '10px',
                    height: '34px', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '0.85rem',
                    outline: 'none', width: '180px',
                    background: '#fff'
                  }}
                />
              </div>
            </div>
            {recentHistory.some(h => getTransferBadge(h).text === '창고이동') && (
              <button
                onClick={async () => {
                  const deletableHistory = recentHistory.filter(h => getTransferBadge(h).text === '창고이동');
                  const visibleSelectedIds = selectedHistoryIds.filter(id => deletableHistory.some(h => h.id === id));
                  if (visibleSelectedIds.length === 0) {
                    alert('삭제할 내역을 선택해주세요.');
                    return;
                  }
                  const count = visibleSelectedIds.length;
                  if (window.confirm(`선택한 수동 재고이동 내역 ${count}건을 삭제하시겠습니까?\n(선택된 창고이동 건만 삭제되며, 각 창고의 재고가 복구됩니다)`)) {
                    try {
                      if (onDeleteMoveStock) {
                        for (const id of visibleSelectedIds) {
                          await onDeleteMoveStock(id);
                        }
                      } else {
                        setHistoryData(historyData.filter(h => !visibleSelectedIds.includes(h.id)));
                      }
                      setSelectedHistoryIds(prev => prev.filter(id => !visibleSelectedIds.includes(id)));
                      alert('삭제가 완료되었습니다.');
                    } catch (err) {
                      console.error(err);
                      alert('삭제 중 오류가 발생했습니다.');
                    }
                  }
                }}
                disabled={selectedHistoryIds.length === 0}
                style={{
                  padding: '6px 12px',
                  background: selectedHistoryIds.length === 0 ? '#cbd5e1' : '#ef4444',
                  color: selectedHistoryIds.length === 0 ? '#64748b' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedHistoryIds.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                선택삭제 {selectedHistoryIds.length > 0 ? `(${selectedHistoryIds.length})` : ''}
              </button>
            )}
          </div>
          <div className="inv-table-scrollable" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
            <table className="inv-table" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {[
                    { key: 'select', label: '', width: 40, align: 'center' },
                    { key: 'date', label: '이동일자', width: colWidths.date, align: 'center' },
                    { key: 'from', label: '출고 창고', width: colWidths.from, align: 'center' },
                    { key: 'to', label: '입고 창고', width: colWidths.to, align: 'center' },
                    { key: 'moveType', label: '이동내역', width: colWidths.moveType, align: 'center' },
                    { key: 'item', label: '품목명 (규격)', width: colWidths.item, align: 'left' },
                    { key: 'qty', label: '수량', width: colWidths.qty, align: 'right' },
                    { key: 'processedAt', label: '시간', width: colWidths.processedAt, align: 'center' },
                    { key: 'operator', label: '담당자', width: colWidths.operator, align: 'center' },
                    { key: 'manage', label: '관리', width: colWidths.manage, align: 'center' }
                  ].map(col => (
                    <th 
                      key={col.key} 
                      style={{ 
                        width: col.width + 'px', 
                        position: 'relative', 
                        userSelect: 'none', 
                        padding: '12px',
                        borderBottom: '2px solid #e2e8f0', 
                        fontSize: '0.85rem',
                        textAlign: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left'
                      }}
                    >
                      {col.key === 'select' ? (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={el => {
                            if (el) {
                              el.indeterminate = isSomeSelected;
                            }
                          }}
                          onChange={handleSelectAll}
                          disabled={deletableHistory.length === 0}
                          style={{ cursor: deletableHistory.length > 0 ? 'pointer' : 'default' }}
                        />
                      ) : (
                        col.label
                      )}
                      {col.key !== 'select' && (
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
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentHistory.length === 0 ? (
                  <tr><td colSpan="10" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>해당 조건 및 기간에 발생한 이동 내역이 없습니다.</td></tr>
                ) : (
                  recentHistory.map(row => {
                    const badge = getTransferBadge(row);
                    const isEditing = editingId === row.id;

                    if (isEditing) {
                      return (
                        <tr key={row.id} style={{ background: '#eff6ff' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              disabled 
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input 
                              type="date" 
                              value={editForm.date} 
                              onChange={e => setEditForm({...editForm, date: e.target.value})} 
                              style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }} 
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <select 
                              value={editForm.from} 
                              onChange={e => setEditForm({...editForm, from: e.target.value})} 
                              style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                            >
                              {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <select 
                              value={editForm.to} 
                              onChange={e => setEditForm({...editForm, to: e.target.value})} 
                              style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                            >
                              {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: badge.bg,
                              color: badge.color
                            }}>{badge.text}</span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 700, color: '#64748b' }}>{row.item}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{row.spec}</div>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <input 
                              type="number" 
                              value={editForm.qty} 
                              onChange={e => setEditForm({...editForm, qty: Number(e.target.value)})} 
                              style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontWeight: 800 }} 
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>{row.processedAt}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{row.operator}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={handleSaveEdit} 
                                style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              >저장</button>
                              <button 
                                onClick={() => { setEditingId(null); setEditForm(null); }} 
                                style={{ padding: '4px 8px', background: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              >취소</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={row.id}
                        onDoubleClick={() => handleRowClickOrDoubleClick(row)}
                        style={{ cursor: (badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? 'pointer' : 'default' }}
                        title={(badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? '더블클릭하여 전표/주문서 상세로 이동' : ''}
                      >
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedHistoryIds.includes(row.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedHistoryIds(prev => [...prev, row.id]);
                              } else {
                                setSelectedHistoryIds(prev => prev.filter(id => id !== row.id));
                              }
                            }}
                            disabled={badge.text !== '창고이동'}
                            style={{ cursor: badge.text === '창고이동' ? 'pointer' : 'default' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                          {row.date}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', background: `${getWarehouseColor(row.from)}20`, color: getWarehouseColor(row.from), fontWeight: 700, fontSize: '0.75rem' }}>{row.from}</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', background: `${getWarehouseColor(row.to)}20`, color: getWarehouseColor(row.to), fontWeight: 700, fontSize: '0.75rem' }}>{row.to}</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            whiteSpace: 'nowrap'
                          }}>{badge.text}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div 
                            onClick={() => handleRowClickOrDoubleClick(row)}
                            style={{ 
                              fontWeight: 700,
                              cursor: (badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? 'pointer' : 'default',
                              color: (badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? '#3b82f6' : 'inherit',
                              textDecoration: (badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? 'underline' : 'none'
                            }}
                            title={(badge.text === '매출전표' || badge.text === '주문상차' || badge.text === '매입전표') ? '클릭 시 전표/주문서 상세로 이동' : ''}
                          >{row.item}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{row.spec}</div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', fontWeight: 800, color: '#3b82f6' }}>{row.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: '#64748b' }}>{row.processedAt}</td>
                        <td style={{ textAlign: 'center', padding: '10px', fontWeight: 600 }}>{row.operator}</td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {badge.text === '창고이동' ? (
                              <>
                                <button 
                                  onClick={() => handleEditClick(row)}
                                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                                >수정</button>
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('이 내역을 삭제하시겠습니까? (이동된 재고가 각 창고에서 환원됩니다)')) {
                                      if (onDeleteMoveStock) {
                                        await onDeleteMoveStock(row.id);
                                      } else {
                                        setHistoryData(historyData.filter(h => h.id !== row.id));
                                      }
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                                >삭제</button>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="inv-footer" style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'flex-end', gap: '30px' }}>
          <div className="inv-stat">
            <span style={{ color: '#64748b', fontWeight: 600 }}>오늘 총 이동:</span>
            <span style={{ marginLeft: '8px', fontWeight: 800, fontSize: '1.1rem', color: '#3b82f6' }}>{totalQuantity.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </WindowModal>
  );
};

export default InventoryTransfer;
