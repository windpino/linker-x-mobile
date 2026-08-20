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
    <WindowModal title="재고이동 (매출관리)" onClose={onClose} width="950px" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '14px', boxSizing: 'border-box' }}>
        
        {/* 1. 신규 재고이동 등록 카드 */}
        <div style={{ background: '#fff', border: '1.5px solid #3b82f6', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeftRight size={16} color="#3b82f6" /> 신규 재고이동 등록
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>창고 간 재고 이동</span>
          </div>

          {/* 창고 선택 (출고 -> 입고 2열) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                출고 창고 (FROM)
              </label>
              <select 
                value={fromWarehouse} 
                onChange={e => setFromWarehouse(e.target.value)} 
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid', borderColor: getWarehouseColor(fromWarehouse), borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체창고">전체창고</option>
                {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                입고 창고 (TO)
              </label>
              <select 
                value={toWarehouse} 
                onChange={e => setToWarehouse(e.target.value)} 
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid', borderColor: getWarehouseColor(toWarehouse), borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체창고">전체창고</option>
                {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {/* 이동 일자 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
              이동 일자
            </label>
            <input 
              type="date" 
              value={transferDate} 
              onChange={e => setTransferDate(e.target.value)} 
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} 
            />
          </div>

          {/* 품목 검색 */}
          <div style={{ position: 'relative' }} ref={searchRef}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              품목 검색
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                ref={productInputRef}
                type="text" 
                placeholder="품목명 또는 초성 검색 (예: 멸치)" 
                value={itemSearch}
                onChange={e => {
                  setItemSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (itemSearch) setShowSuggestions(true);
                }}
                style={{ width: '100%', padding: '8px 10px 8px 34px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={productListRef}
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  {suggestions.map((p, index) => (
                    <div 
                      key={p.id} 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProduct(p);
                      }}
                      style={{ 
                        padding: '10px 12px', cursor: 'pointer', 
                        borderBottom: '1px solid #f1f5f9', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: index === selectedIndex ? '#f0f9ff' : 'transparent'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '6px' }}>{p.spec}</span>
                      </div>
                      <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem' }}>
                        재고: {((p.initialStock || 0) + (inventory[fromWarehouse]?.[p.name] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 수량 입력 및 이동 실행 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                이동 수량
              </label>
              <input 
                ref={qtyInputRef}
                type="number" 
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onFocus={e => e.target.select()}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #3b82f6', borderRadius: '8px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              ref={submitBtnRef}
              onClick={handleTransfer}
              style={{ 
                height: '42px', 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 800, 
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
              }}
            >
              이동 실행
            </button>
          </div>
        </div>

        {/* 2. 이동 내역 (실시간) 섹션 */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
              이동 내역 (실시간)
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
              총 {recentHistory.length}건 ({totalQuantity.toLocaleString()}개)
            </span>
          </div>

          {/* 기간 조회 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="date" 
                value={startDateInput} 
                onChange={e => setStartDateInput(e.target.value)} 
                style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
              />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>~</span>
              <input 
                type="date" 
                value={endDateInput} 
                onChange={e => setEndDateInput(e.target.value)} 
                style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                  <button
                    key={btn}
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '4px 6px', fontSize: '0.72rem', fontWeight: 700,
                      border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff',
                      color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >{btn}</button>
                ))}
              </div>

              <button 
                onClick={handleSearch} 
                style={{
                  padding: '5px 14px', backgroundColor: '#1e293b', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                조회
              </button>
            </div>
          </div>

          {/* 품목명 검색 */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="내역 내 품목명 검색..."
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                border: '1px solid #e2e8f0', borderRadius: '6px',
                fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 이동 내역 카드 리스트 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {recentHistory.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                해당 기간의 재고 이동 내역이 없습니다.
              </div>
            ) : (
              recentHistory.map(item => {
                const badge = getTransferBadge(item);
                const isDeletable = badge.text === '창고이동';
                return (
                  <div key={item.id} style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, backgroundColor: badge.bg, color: badge.color }}>
                          {badge.text}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.date}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb' }}>
                        {item.qty?.toLocaleString()}개
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                      <span>{item.from}</span>
                      <span style={{ color: '#94a3b8' }}>➔</span>
                      <span>{item.to}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#475569' }}>
                      <span style={{ fontWeight: 600 }}>{item.item}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.operator || '-'}</span>
                        {isDeletable && (
                          <button
                            onClick={() => {
                              if (window.confirm('해당 재고이동 내역을 삭제하시겠습니까? (재고가 원복됩니다)')) {
                                onDeleteMoveStock(item);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: '2px 4px' }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. 하단 요약 바 */}
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>선택 기간 총 이동 수량</span>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#3b82f6' }}>{totalQuantity.toLocaleString()}개</span>
        </div>

      </div>
    </WindowModal>
  );
};

export default InventoryTransfer;
