import React, { useState } from 'react';
import { List, ShoppingCart, Users, Search, Trash2, Edit3, CheckCircle2, FileText, Calendar } from 'lucide-react';
import WindowModal from './WindowModal';

const OrderList = ({ 
  onClose, 
  salesOrders = [], 
  selectedDate, 
  staffList = [], 
  products = [], 
  onEditOrder, 
  onDeleteOrder, 
  onTransferToInvoice, 
  onAddPartialOrder,
  onUpdateOrder,
  currentUser, 
  inventory = {}, 
  onMoveStock,
  onRevertAutoMoveStock,
  initialSelectedStaff,
  onOpenInventoryMismatch
}) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin';
  const canSelectOtherStaff = isAdmin || currentUser?.viewOtherWarehouseOrders === true;
  const [selectedStaff, setSelectedStaff] = useState(() => {
    if (initialSelectedStaff) return initialSelectedStaff;
    return canSelectOtherStaff ? 'all' : (currentUser?.name || 'all');
  });

  React.useEffect(() => {
    if (initialSelectedStaff) {
      setSelectedStaff(initialSelectedStaff);
    }
  }, [initialSelectedStaff]);
  const [processedItems, setProcessedItems] = useState({}); // { "orderId-itemIdx": true }
  const [stockFeedback, setStockFeedback] = useState({}); // { "orderId-itemIdx": "재고: 123" }
  const [activeTab, setActiveTab] = useState('list'); // default to 'list' (수주 목록) on mobile
  const [printConfig, setPrintConfig] = useState(null); // { order, copies: 1 }
  
  const dateStr = (() => {
    const d = selectedDate || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  
  // Filter orders by date and selected staff
  const filteredOrders = salesOrders.filter(o => {
    const isToday = o.date === dateStr;
    const matchesStaff = selectedStaff === 'all' || o.manager === selectedStaff;
    return isToday && matchesStaff;
  });

  const calculateCategoryTotals = () => {
    const totals = {}; 
    filteredOrders.forEach(order => {
      if (!order.itemsText) return;
      const tokens = order.itemsText.trim().split(/[\s\n]+/);
      tokens.forEach(token => {
        const match = token.match(/^(.+?)(\d+)$/);
        if (match) {
          const nameOrAbbr = match[1];
          const qty = parseInt(match[2], 10);
          const product = products.find(p => p.name === nameOrAbbr || p.abbreviation === nameOrAbbr);
          const category = product ? (product.category || '기타') : '미등록상품';
          const itemName = product?.name || nameOrAbbr;
          if (!totals[category]) totals[category] = {};
          totals[category][itemName] = (totals[category][itemName] || 0) + qty;
        }
      });
    });
    return totals;
  };

  const categoryTotals = calculateCategoryTotals();
  const hasTotals = Object.keys(categoryTotals).length > 0;

  const getCategoryColor = (category) => {
    if (!category) return '#64748b';
    if (category === '미등록상품') return '#ef4444';
    if (category === '기타') return '#64748b';
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const parseOrderItems = (text) => {
    if (!text) return [];
    const tokens = text.trim().split(/[\s\n]+/);
    return tokens.map((token, idx) => {
      const match = token.match(/^(.+?)(\d+)$/);
      if (match) {
        const nameOrAbbr = match[1];
        const qty = parseInt(match[2], 10);
        const product = products.find(p => p.name === nameOrAbbr || p.abbreviation === nameOrAbbr);
        return {
          id: idx,
          raw: token,
          category: product ? (product.category || '기타') : '미등록상품',
          name: product?.name || nameOrAbbr,
          qty: qty
        };
      }
      return { id: idx, raw: token, category: '알 수 없음', name: token, qty: 0 };
    });
  };

  const handleItemMove = (order, item, itemIdx) => {
    const key = `${order.id}-${itemIdx}`;
    const currentItems = order.items || parseOrderItems(order.itemsText);
    const updatedItems = [...currentItems];
    
    // Capture the current stock level synchronously before executing any asynchronous moves
    const currentWhStock = inventory[order.outWarehouse]?.[item.name] || 0;
    const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
    const initialStock = prod?.initialStock || 0;

    // Toggle loaded status
    const isNowLoaded = !updatedItems[itemIdx].loaded;
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], loaded: isNowLoaded };

    // Move stock
    if (isNowLoaded) {
      onMoveStock(order.outWarehouse, order.inWarehouse, item.name, item.qty, true, order.date, order.id); // true for auto-logging with order.id
      setProcessedItems(prev => ({ ...prev, [key]: true }));
      const currentStock = initialStock + currentWhStock - item.qty;
      setStockFeedback(prev => ({ ...prev, [key]: `상차완료(재고): ${currentStock}` }));
    } else {
      if (onRevertAutoMoveStock) {
        onRevertAutoMoveStock(order.outWarehouse, order.inWarehouse, item.name, item.qty, order.id); // pass order.id for accurate match
      } else {
        onMoveStock(order.inWarehouse, order.outWarehouse, item.name, item.qty, true, order.date, order.id); // fallback with order.id
      }
      setProcessedItems(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      const currentStock = initialStock + currentWhStock + item.qty;
      setStockFeedback(prev => ({ ...prev, [key]: `상차취소(재고): ${currentStock}` }));
    }

    // Persist to parent
    onUpdateOrder(order.id, { items: updatedItems });

    setTimeout(() => {
      setStockFeedback(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 3000);
  };

  const handleTransferCheckedItems = (order) => {
    const allItems = parseOrderItems(order.itemsText);
    const checkedItems = allItems.filter((_, idx) => processedItems[`${order.id}-${idx}`]);

    if (checkedItems.length === 0) {
      alert('체크박스(창고 이동)가 확인된 품목이 없습니다.');
      return;
    }

    const invoiceItems = checkedItems.map((item, idx) => {
      const product = products.find(p => p.name === item.name);
      const price = product?.salesPrice || 0;
      const isTaxFree = product?.taxType === '면세';
      const itemTotal = item.qty * price;
      const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
      const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

      return {
        id: Date.now() + idx,
        productId: product?.id,
        name: item.name,
        spec: product?.spec || '',
        qty: item.qty,
        price: price,
        taxType: product?.taxType || '과세',
        supplyValue: itemSupplyValue,
        tax: itemTax,
        total: itemTotal
      };
    });

    // Send to invoice
    onTransferToInvoice({
      ...order,
      items: invoiceItems,
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      discount: 0
    });

    // 원본 주문 유지 (주문 삭제 및 항목 삭제 로직 제거)
    // - 체크박스(상차) 여부만 유지되고, 원본 텍스트나 주문 자체는 보존됨.
    
    // Clear processed states for this order
    setProcessedItems(prev => {
      const next = { ...prev };
      allItems.forEach((_, idx) => delete next[`${order.id}-${idx}`]);
      return next;
    });
  };

  const handleCreatePartialOrder = (order) => {
    const allItems = order.items || parseOrderItems(order.itemsText);
    const unloadedItems = allItems.filter((item, idx) => !(item.loaded || processedItems[`${order.id}-${idx}`]));

    if (unloadedItems.length === 0) {
      alert('모두 상차 처리되어 미상차 품목이 없습니다.');
      return;
    }

    const newItemsText = unloadedItems.map(i => i.raw || (i.name + String(i.qty))).join(' ');
    
    const partialOrder = {
      ...order,
      id: Date.now(),
      itemsText: newItemsText,
      items: undefined
    };

    if (onAddPartialOrder) {
      onAddPartialOrder(partialOrder);
    }
  };

  return (
    <WindowModal title={isMobileView ? "수주 목록" : "수주 목록 및 현황"} onClose={onClose} width="1150px">
      {/* Dynamic Header section */}
      <div className="account-header" style={isMobileView ? { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        padding: '10px 12px 6px 12px', 
        background: '#ffffff', 
        borderBottom: '1px solid #e2e8f0' 
      } : {}}>
        {!isMobileView && (
          <div className="acc-title-section">
            <h2 className="acc-title">
              <List color="#3b82f6" size={24} />
              수주 목록 및 현황
            </h2>
          </div>
        )}
        
        {/* Mobile View Top Filter Bar */}
        {isMobileView ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: '#f8fafc', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              flex: 1,
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>담당자:</span>
              </div>
              <select 
                value={selectedStaff} 
                onChange={(e) => setSelectedStaff(e.target.value)}
                disabled={!canSelectOtherStaff}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  color: '#3b82f6', 
                  outline: 'none', 
                  cursor: !canSelectOtherStaff ? 'default' : 'pointer',
                  opacity: !canSelectOtherStaff ? 0.8 : 1
                }}
              >
                {canSelectOtherStaff && <option value="all" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>전체 직원</option>}
                {staffList.filter(s => canSelectOtherStaff || s.name === currentUser?.name).map(s => (
                  <option key={s.id} value={s.name} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="acc-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#f8fafc', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>담당자:</span>
              </div>
              <select 
                value={selectedStaff} 
                onChange={(e) => setSelectedStaff(e.target.value)}
                disabled={!canSelectOtherStaff}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  color: '#3b82f6', 
                  outline: 'none', 
                  cursor: !canSelectOtherStaff ? 'default' : 'pointer',
                  opacity: !canSelectOtherStaff ? 0.8 : 1
                }}
              >
                {canSelectOtherStaff && <option value="all">전체 직원</option>}
                {staffList.filter(s => canSelectOtherStaff || s.name === currentUser?.name).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Mobile Navigation Tabs */}
        {isMobileView && (
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0',
            width: '100%',
            marginBottom: '10px'
          }}>
            <button 
              onClick={() => setActiveTab('summary')}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: activeTab === 'summary' ? '#ffffff' : '#94a3b8',
                backgroundColor: activeTab === 'summary' ? '#2563eb' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <List size={14} />
              품목 합계
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: activeTab === 'list' ? '#ffffff' : '#94a3b8',
                backgroundColor: activeTab === 'list' ? '#2563eb' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShoppingCart size={14} />
              수주 목록 ({filteredOrders.length})
            </button>
          </div>
        )}
      </div>

      <div className="purchase-modal-body" style={{ 
        padding: isMobileView ? '8px' : '20px', 
        display: 'grid', 
        gridTemplateColumns: isMobileView ? '1fr' : '300px 1fr', 
        gap: isMobileView ? '12px' : '20px',
        backgroundColor: 'transparent'
      }}>
        {/* Left Column - Category Totals Summary (Hidden on Mobile when list tab is active) */}
        {(!isMobileView || activeTab === 'summary') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              backgroundColor: '#1e3a8a', 
              color: 'white', 
              padding: isMobileView ? '14px' : '20px', 
              borderRadius: '16px', 
              height: 'fit-content', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: 'none'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: isMobileView ? '10px' : '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>카테고리별 품목 합계</span>
                <span style={{ fontWeight: 400, fontSize: '0.72rem', opacity: 0.8 }}>{dateStr}</span>
              </div>
              {hasTotals ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  maxHeight: isMobileView ? 'calc(100vh - 200px)' : '600px', 
                  overflowY: 'auto', 
                  paddingRight: '4px' 
                }}>
                  {Object.entries(categoryTotals).map(([category, items]) => (
                    <div key={category} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.75rem', color: getCategoryColor(category), fontWeight: 700, marginBottom: '6px' }}>{category}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(items).map(([name, qty]) => (
                          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ opacity: 0.85 }}>{name}</span>
                            <span style={{ fontWeight: 700, color: '#fbbf24' }}>{qty.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>수주 내역이 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* Right Column - Orders List (Hidden on Mobile when summary tab is active) */}
        {(!isMobileView || activeTab === 'list') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isMobileView && (
              <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit' }}>
                <ShoppingCart size={18} color="#3b82f6" />
                {selectedStaff === 'all' ? '전체 수주 목록' : `${selectedStaff}님의 수주 목록`}
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 400 }}>({filteredOrders.length})</span>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              maxHeight: isMobileView ? 'calc(100vh - 200px)' : '650px', 
              overflowY: 'auto', 
              paddingRight: '4px' 
            }}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, oIdx) => {
                  const parsedItems = parseOrderItems(order.itemsText);
                  const totalQty = parsedItems.reduce((acc, item) => acc + item.qty, 0);

                  return (
                    <div key={order.id} style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '16px', 
                      backgroundColor: '#fff', 
                      overflow: 'hidden', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      marginBottom: isMobileView ? '12px' : '0'
                    }}>
                      <div style={{ 
                        padding: isMobileView ? '12px 14px' : '16px', 
                        borderBottom: '1px solid #f1f5f9', 
                        display: 'flex', 
                        flexDirection: isMobileView ? 'column' : 'row',
                        alignItems: isMobileView ? 'stretch' : 'center',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{oIdx + 1}.</span>
                          <div style={{ fontWeight: 800, fontSize: isMobileView ? '1rem' : '1.1rem', color: '#1e293b' }}>{order.partner}</div>
                          {order.memo?.includes('MALL') && (
                            <span style={{ 
                              fontSize: '0.6rem', 
                              backgroundColor: '#eff6ff', 
                              color: '#3b82f6', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              border: '1px solid #dbeafe',
                              marginLeft: '4px'
                            }}>MALL</span>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            marginLeft: isMobileView ? '0' : '12px', 
                            padding: '4px 8px', 
                            background: '#f8fafc', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0' 
                          }}>
                            <Calendar size={12} color="#94a3b8" />
                            <input 
                              type="date" 
                              value={order.date} 
                              onChange={(e) => onUpdateOrder(order.id, { date: e.target.value })}
                              style={{ 
                                border: 'none', 
                                background: 'transparent', 
                                fontSize: '0.78rem', 
                                fontWeight: 600, 
                                color: '#334155', 
                                outline: 'none',
                                colorScheme: 'light'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Action buttons row on mobile */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '6px',
                          justifyContent: isMobileView ? 'space-between' : 'flex-end',
                          flexWrap: 'wrap'
                        }}>
                          {(() => {
                            const currentItems = order.items || parsedItems;
                            const hasUnloaded = currentItems.some((item, idx) => !(item.loaded || processedItems[`${order.id}-${idx}`]));
                            if (hasUnloaded) {
                              return (
                                <button 
                                  onClick={() => handleCreatePartialOrder(order)}
                                  style={{ 
                                    color: '#fff', 
                                    background: '#8b5cf6', 
                                    border: '1px solid #7c3aed',
                                    padding: '6px 12px', 
                                    fontSize: '0.72rem', 
                                    fontWeight: 700, 
                                    gap: '4px',
                                    flex: isMobileView ? 1 : 'none',
                                    justifyContent: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <FileText size={13} /> 추가수주서작성
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button 
                            onClick={() => setPrintConfig({ order, copies: 1 })}
                            style={{ 
                              color: '#fff', 
                              background: '#3b82f6', 
                              border: '1px solid #2563eb',
                              padding: '6px 12px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              gap: '4px',
                              flex: isMobileView ? 1 : 'none',
                              justifyContent: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={13} /> 수주서 인쇄
                          </button>
                          <button 
                            onClick={() => handleTransferCheckedItems(order)}
                            style={{ 
                              color: '#fff', 
                              background: '#10b981', 
                              border: '1px solid #059669',
                              padding: '6px 12px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              gap: '4px',
                              flex: isMobileView ? 1 : 'none',
                              justifyContent: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={13} /> 전표전송
                          </button>
                          <button 
                            onClick={() => onEditOrder(order)} 
                            style={{ 
                              color: '#3b82f6', 
                              background: '#eff6ff',
                              border: 'none',
                              borderRadius: '6px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => { if(window.confirm('삭제하시겠습니까?')) onDeleteOrder(order.id); }} 
                            style={{ 
                              color: '#ef4444', 
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Print Settings Row */}
                      {printConfig && printConfig.order.id === order.id && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>인쇄 매수:</span>
                          <select 
                            value={printConfig.copies} 
                            onChange={(e) => setPrintConfig({ ...printConfig, copies: Number(e.target.value) })}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            <option value={1}>1장 (수주서)</option>
                            <option value={2}>2장 (공급자용/공급받는자용)</option>
                            <option value={3}>3장 (보관용 포함)</option>
                          </select>
                          <button 
                            onClick={() => {
                              setTimeout(() => {
                                const container = document.querySelector('.print-only-container');
                                if (!container) return;
                                
                                const printContents = container.innerHTML;
                                const printWindow = window.open('', '_blank', 'width=900,height=800');
                                
                                printWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>수주서 인쇄</title>
                                      <style>
                                        @media print {
                                          @page { margin: 10mm; }
                                        }
                                        body { 
                                          font-family: "Malgun Gothic", "맑은 고딕", sans-serif; 
                                          margin: 0; 
                                          padding: 20px; 
                                          background-color: white;
                                          color: black;
                                        }
                                        .print-statement { 
                                          page-break-after: always; 
                                          padding: 20px; 
                                          box-sizing: border-box; 
                                          width: 100%; 
                                          max-width: 800px; 
                                          margin: 0 auto; 
                                        }
                                        .print-item-table { 
                                          width: 100%; 
                                          border-collapse: collapse; 
                                          margin-bottom: 20px; 
                                        }
                                        .print-item-table th, .print-item-table td { 
                                          border: 1px solid #cbd5e1; 
                                          padding: 8px; 
                                        }
                                        .print-item-table th { 
                                          background-color: #f1f5f9; 
                                          -webkit-print-color-adjust: exact; 
                                          color-adjust: exact;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      ${printContents}
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                                printWindow.focus();
                                
                                setTimeout(() => {
                                  printWindow.print();
                                }, 300);
                              }, 50);
                            }}
                            style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            인쇄 시작
                          </button>
                          <button 
                            onClick={() => setPrintConfig(null)}
                            style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            취소
                          </button>
                        </div>
                      )}
                      
                      {/* Mobile Header Row / Desktop Action Row end */}

                      <div style={{ padding: isMobileView ? '12px' : '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', gap: '4px' }}>
                          <span>{isMobileView ? '' : '출고: '}{order.outWarehouse} → {isMobileView ? '' : '입고: '}{order.inWarehouse}</span>
                          <span style={{ fontWeight: 700, color: '#3b82f6' }}>{isMobileView ? '' : '담당: '}{order.manager}</span>
                        </div>

                        {/* Hide header row on mobile */}
                        {!isMobileView && (
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 120px 1fr 100px 100px', gap: '12px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                            <span>No. (체크)</span><span>카테고리</span><span>품목명</span><span style={{ textAlign: 'right' }}>수량</span><span style={{ textAlign: 'center' }}>창고 이동</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '6px' : '4px' }}>
                          {(order.items || parsedItems).map((item, iIdx) => {
                            const key = `${order.id}-${iIdx}`;
                            const isProcessed = item.loaded || processedItems[key];
                            const feedback = stockFeedback[key];
                            
                            if (isMobileView) {
                              return (
                                <div key={iIdx} onClick={() => handleItemMove(order, item, iIdx)} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderBottom: '1px solid #e2e8f0',
                                  backgroundColor: isProcessed ? '#f0fdf4' : '#ffffff',
                                  border: isProcessed ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  position: 'relative'
                                }}>
                                  {/* Left part: Checkbox + Category + Product Name */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!isProcessed} 
                                      onChange={() => handleItemMove(order, item, iIdx)} 
                                      onClick={(e) => e.stopPropagation()} 
                                      style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} 
                                    />
                                    <span style={{ 
                                      fontSize: '0.62rem', 
                                      padding: '1px 4px', 
                                      borderRadius: '4px', 
                                      backgroundColor: (item.category || '기타') === '미등록상품' ? '#fee2e2' : '#f1f5f9', 
                                      color: getCategoryColor(item.category || '기타'), 
                                      fontWeight: 600,
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {item.category || '기타'}
                                    </span>
                                    <span style={{ 
                                      fontWeight: 700, 
                                      color: (item.category || '기타') === '미등록상품' ? '#ef4444' : '#1e293b', 
                                      fontSize: '0.82rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'normal',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      {item.name}
                                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                        (재고: {(() => {
                                          const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
                                          const initialStock = prod?.initialStock || 0;
                                          const currentStock = initialStock + (inventory[order.outWarehouse]?.[item.name] || 0);
                                          return currentStock.toLocaleString();
                                        })()}개)
                                      </span>
                                    </span>
                                  </div>

                                  {/* Right part: Quantity + Status Badge */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                      {item.qty.toLocaleString()}개
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {isProcessed ? (
                                        <span 
                                          style={{ fontSize: '0.7rem', backgroundColor: '#e2fbe9', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid #bbf7d0' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                          title="상차 취소"
                                        >
                                          완료
                                        </span>
                                      ) : (
                                        <span 
                                          style={{ fontSize: '0.7rem', border: '1px solid #3b82f6', color: '#2563eb', padding: '2px 4px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', backgroundColor: '#eff6ff' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                        >
                                          상차
                                        </span>
                                      )}
                                      <span 
                                        style={{ fontSize: '0.7rem', border: '1px solid #f59e0b', color: '#d97706', padding: '2px 4px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', backgroundColor: '#fffbeb' }}
                                        onClick={(e) => { e.stopPropagation(); onOpenInventoryMismatch && onOpenInventoryMismatch(order.outWarehouse, item.name); }}
                                      >
                                        불일치
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {feedback && (
                                    <div style={{ 
                                      position: 'absolute', 
                                      top: '50%', 
                                      left: '50%', 
                                      transform: 'translate(-50%, -50%)', 
                                      backgroundColor: '#0f172a', 
                                      color: '#fff', 
                                      padding: '6px 12px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.75rem', 
                                      whiteSpace: 'nowrap', 
                                      zIndex: 10, 
                                      border: '1px solid rgba(255,255,255,0.15)', 
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
                                    }}>
                                      {feedback}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div key={iIdx} onClick={() => handleItemMove(order, item, iIdx)} style={{ display: 'grid', gridTemplateColumns: '80px 120px 1fr 100px 100px', gap: '12px', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: isProcessed ? '#f0fdf4' : 'transparent', transition: 'all 0.2s', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: '#94a3b8' }}>{iIdx + 1}</span>
                                  <input type="checkbox" checked={!!isProcessed} onChange={() => handleItemMove(order, item, iIdx)} style={{ cursor: 'pointer' }} />
                                </div>
                                <span style={{ color: getCategoryColor(item.category || '기타'), fontWeight: 600 }}>{item.category || '기타'}</span>
                                <span style={{ fontWeight: 700, color: (item.category || '기타') === '미등록상품' ? '#ef4444' : 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {item.name}
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    (출고창고 재고: {(() => {
                                      const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
                                      const initialStock = prod?.initialStock || 0;
                                      const currentStock = initialStock + (inventory[order.outWarehouse]?.[item.name] || 0);
                                      return currentStock.toLocaleString();
                                    })()}개)
                                  </span>
                                </span>
                                <span style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>{item.qty.toLocaleString()}</span>
                                <div style={{ textAlign: 'center', position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                      {isProcessed ? (
                                        <CheckCircle2 
                                          size={18} 
                                          color="#22c55e" 
                                          style={{ cursor: 'pointer' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                          title="상차 취소"
                                        />
                                      ) : (
                                        <span 
                                          style={{ fontSize: '0.7rem', color: '#3b82f6', border: '1px solid #3b82f6', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                        >
                                          상차
                                        </span>
                                      )}
                                      <span 
                                        style={{ fontSize: '0.7rem', color: '#f59e0b', border: '1px solid #f59e0b', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        onClick={(e) => { e.stopPropagation(); onOpenInventoryMismatch && onOpenInventoryMismatch(order.outWarehouse, item.name); }}
                                      >
                                        불일치
                                      </span>
                                    </div>
                                  {feedback && <div style={{ position: 'absolute', top: '-25px', right: '0', backgroundColor: '#1e293b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap', zIndex: 10 }}>{feedback}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {order.memo ? <div style={{ fontSize: '0.82rem', color: '#ef4444', fontStyle: 'italic' }}><span style={{ fontWeight: 700 }}>[메모]</span> {order.memo}</div> : <div />}
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a' }}>합계 수량: <span style={{ color: '#3b82f6', fontSize: '1.1rem' }}>{totalQty.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '16px' }}>수주 내역이 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print Only Container (Hidden from main UI, used as a template) */}
      {printConfig && (
        <div className="print-only-container" style={{ display: 'none' }}>
          {Array.from({ length: printConfig.copies }).map((_, i) => (
            <div key={i} className="print-statement">
              <div className="print-header">
                <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>
                  수 주 서 
                  <span style={{ fontSize: '14px', marginLeft: '10px', color: '#64748b' }}>
                    ({i === 0 ? (printConfig.copies === 1 ? '수주서' : '공급자 보관용') : i === 1 ? '공급받는자용' : '기타 보관용'})
                  </span>
                </h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #1e293b', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>수주일자: {printConfig.order.date}</div>
                    <div style={{ fontSize: '16px' }}>거래처: <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{printConfig.order.partner}</span> 귀하</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>담당자: {printConfig.order.manager}</div>
                    <div>출고/입고: {printConfig.order.outWarehouse} / {printConfig.order.inWarehouse}</div>
                  </div>
                </div>
              </div>
              <table className="print-item-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', width: '50px' }}>No</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>품목명</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', width: '100px' }}>수량</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', width: '150px' }}>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {(printConfig.order.items || parseOrderItems(printConfig.order.itemsText)).map((item, idx) => {
                    const itemPrice = item.price || (() => {
                      const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
                      return prod ? (prod.salesPriceSingle || prod.salesPrice || 0) : 0;
                    })();
                    const total = itemPrice * item.qty;
                    return (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>{item.name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{item.qty.toLocaleString()}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1e293b', paddingTop: '10px', fontSize: '16px' }}>
                <div>비고: {printConfig.order.memo}</div>
                <div style={{ fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <div>총 수주수량: {(printConfig.order.items || parseOrderItems(printConfig.order.itemsText)).reduce((sum, it) => sum + it.qty, 0).toLocaleString()}</div>
                  <div>총 합계금액: {(printConfig.order.items || parseOrderItems(printConfig.order.itemsText)).reduce((sum, it) => {
                    const price = it.price || (() => {
                      const prod = products.find(p => p.name === it.name || p.abbreviation === it.name);
                      return prod ? (prod.salesPriceSingle || prod.salesPrice || 0) : 0;
                    })();
                    return sum + (price * it.qty);
                  }, 0).toLocaleString()}원</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* Mobile specific overrides for OrderList */
        @media (max-width: 768px) {
          .window-overlay.maximized .window-content-area,
          .window-container.is-maximized .window-content-area {
            padding: 0 !important;
            background-color: #f8fafc !important;
            color: #0f172a !important;
          }
          
          .window-container.is-maximized {
            background-color: #f8fafc !important;
            border: none !important;
          }
          
          .account-header {
            border-radius: 0 !important;
          }

          .purchase-modal-body {
            padding: 10px !important;
            gap: 12px !important;
            background-color: #f8fafc !important;
          }
          
          select option {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          
          /* Custom ultra-thin webkit scrollbar */
          ::-webkit-scrollbar {
            width: 4px !important;
            height: 4px !important;
          }
          ::-webkit-scrollbar-track {
            background: transparent !important;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15) !important;
            border-radius: 2px !important;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3) !important;
          }
        }
      `}</style>
    </WindowModal>
  );
};

export default OrderList;
