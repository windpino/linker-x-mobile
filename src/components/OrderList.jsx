import React, { useState } from 'react';
import { List, ShoppingCart, Users, Search, Trash2, Edit3, CheckCircle2, FileText, Calendar, Phone, Check } from 'lucide-react';
import WindowModal from './WindowModal';
import { addDays, DateNavButton } from '../utils/dateNavigationUtils';
import { playMenuClickSound, playLoadSound, playUnloadSound } from '../utils/audio';

const OrderList = ({ 
  onClose, 
  salesOrders = [], 
  salesInvoices = [],
  selectedDate, 
  staffList = [], 
  products = [], 
  partners = [],
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
  const isMobileView = true;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin';
  const canSelectOtherStaff = isAdmin || currentUser?.viewOtherWarehouseOrders === true;
  const [selectedStaff, setSelectedStaff] = useState(() => {
    if (initialSelectedStaff) return initialSelectedStaff;
    if (canSelectOtherStaff) return 'all';
    if (currentUser?.name) return currentUser.name;
    return 'all';
  });

  React.useEffect(() => {
    if (initialSelectedStaff) {
      setSelectedStaff(initialSelectedStaff);
    }
  }, [initialSelectedStaff]);
  const [processedItems, setProcessedItems] = useState({}); // { "orderId-itemIdx": true }
  const [stockFeedback, setStockFeedback] = useState({}); // { "orderId-itemIdx": "재고: 123" }
  const stockOverrides = React.useRef({}); // 창고별 품목 재고 연속 클릭 오차 방지용 세션 캐시
  const [activeTab, setActiveTab] = useState('list'); // default to 'list' (수주 목록) on mobile
  const [printConfig, setPrintConfig] = useState(null); // { order, copies: 1 }
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'waiting', 'completed'
  
  const [dateStr, setDateStr] = useState(() => {
    const d = selectedDate || new Date();
    if (typeof d === 'string') return d.split('T')[0];
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  React.useEffect(() => {
    if (selectedDate) {
      if (typeof selectedDate === 'string') {
        setDateStr(selectedDate.split('T')[0]);
      } else {
        setDateStr(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`);
      }
    }
  }, [selectedDate]);

  const isOrderCompleted = React.useCallback((o) => {
    if (o.status === '완료' || o.status === '배송완료' || o.isCompleted === true) return true;
    if (o.salesInvoiceId) return true;
    if ((salesInvoices || []).some(inv => 
      String(inv.salesOrderId) === String(o.id) || 
      String(inv.orderId) === String(o.id) ||
      (inv.partner === o.partner && inv.date === o.date)
    )) return true;
    return false;
  }, [salesInvoices]);
  
  // Filter orders by date and selected staff
  const staffOrders = salesOrders.filter(o => {
    const oDate = o.date || o.orderDate;
    const isToday = !dateStr || oDate === dateStr || (typeof oDate === 'string' && oDate.startsWith(dateStr));
    const isStaffUnassigned = !o.manager || o.manager === '알 수 없음' || o.manager === '-' || o.manager === '미지정';
    const matchesStaff = selectedStaff === 'all' || 
      o.manager === selectedStaff || 
      o.creator === selectedStaff || 
      isStaffUnassigned;
    return isToday && matchesStaff;
  });

  const totalOrderCount = staffOrders.length;
  const completedOrderCount = staffOrders.filter(isOrderCompleted).length;
  const waitingOrderCount = staffOrders.filter(o => !isOrderCompleted(o) && o.status !== '취소').length;

  const filteredOrders = staffOrders.filter(o => {
    if (statusFilter === 'waiting') return !isOrderCompleted(o) && o.status !== '취소';
    if (statusFilter === 'completed') return isOrderCompleted(o);
    return true;
  });

  const calculateCategoryTotals = () => {
    const totals = {}; 
    filteredOrders.forEach(order => {
      const displayItems = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? order.items
        : parseOrderItems(order.itemsText);

      displayItems.forEach((item, itemIdx) => {
        const category = item.category || '기타';
        const itemName = item.name || '품목';
        const qty = Number(item.qty) || 0;
        const key = `${order.id}-${itemIdx}`;
        const isLoaded = key in processedItems ? Boolean(processedItems[key]) : Boolean(item.loaded);

        if (!totals[category]) totals[category] = {};
        if (!totals[category][itemName]) {
          totals[category][itemName] = { totalQty: 0, loadedQty: 0 };
        }
        totals[category][itemName].totalQty += qty;
        if (isLoaded) {
          totals[category][itemName].loadedQty += qty;
        }
      });
    });
    return totals;
  };

  const categoryTotals = calculateCategoryTotals();
  const hasTotals = Object.keys(categoryTotals).length > 0;

  // 품목 합계 창에서 품목 클릭 시 해당 품목 전체 일괄 상차/상차풀기 핸들러
  const handleBatchToggleProduct = (targetCategory, targetItemName) => {
    const matchingItems = [];
    filteredOrders.forEach(order => {
      const items = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? order.items
        : parseOrderItems(order.itemsText);

      items.forEach((item, itemIdx) => {
        const itemCat = item.category || '기타';
        const name = item.name || item.raw;
        if (name === targetItemName && (!targetCategory || itemCat === targetCategory)) {
          const key = `${order.id}-${itemIdx}`;
          const isLoaded = key in processedItems ? Boolean(processedItems[key]) : Boolean(item.loaded);
          matchingItems.push({ order, item, itemIdx, key, isLoaded });
        }
      });
    });

    if (matchingItems.length === 0) return;

    // 전체 상차 여부 확인: 이미 전부 상차되었으면 전체 풀기, 하나라도 미상차면 전체 상차
    const allLoaded = matchingItems.every(m => m.isLoaded);
    const targetLoadState = !allLoaded;

    if (targetLoadState) {
      playLoadSound();
    } else {
      playUnloadSound();
    }

    const newProcessed = { ...processedItems };
    const orderUpdates = new Map();

    matchingItems.forEach(({ order, item, itemIdx, key, isLoaded }) => {
      if (isLoaded === targetLoadState) return;

      newProcessed[key] = targetLoadState;

      let currentItems = orderUpdates.get(order.id);
      if (!currentItems) {
        currentItems = [...((order.items && Array.isArray(order.items) && order.items.length > 0) ? order.items : parseOrderItems(order.itemsText))];
        orderUpdates.set(order.id, currentItems);
      }
      currentItems[itemIdx] = { ...currentItems[itemIdx], loaded: targetLoadState };

      const outWarehouse = order.outWarehouse || item.outWarehouse || '본사창고';
      const inWarehouse = order.inWarehouse || item.inWarehouse || '차량';
      const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
      const initialStock = prod?.initialStock || 0;
      const stockCacheKey = `${outWarehouse}_${item.name}`;
      const cachedStock = stockOverrides.current[stockCacheKey];
      const currentWhStock = (cachedStock !== undefined)
        ? (cachedStock - initialStock)
        : ((inventory[outWarehouse]?.[item.name] !== undefined)
            ? inventory[outWarehouse][item.name]
            : (inventory['본사창고']?.[item.name] || 0));
      const qtyNum = Number(item.qty || 0);

      if (targetLoadState) {
        const nextStock = initialStock + currentWhStock - qtyNum;
        stockOverrides.current[stockCacheKey] = nextStock;
        onMoveStock(outWarehouse, inWarehouse, item.name, item.qty, true, order.date, order.id);
      } else {
        const nextStock = initialStock + currentWhStock + qtyNum;
        stockOverrides.current[stockCacheKey] = nextStock;
        if (onRevertAutoMoveStock) {
          onRevertAutoMoveStock(outWarehouse, inWarehouse, item.name, item.qty, order.id);
        } else {
          onMoveStock(inWarehouse, outWarehouse, item.name, item.qty, true, order.date, order.id);
        }
      }
    });

    setProcessedItems(newProcessed);

    orderUpdates.forEach((updatedItems, orderId) => {
      onUpdateOrder(orderId, { items: updatedItems });
    });
  };

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

  const getCategoryBadgeStyle = (category) => {
    const cat = String(category || '기타');
    if (cat.includes('생물미끼')) {
      return { bg: 'rgba(16, 185, 129, 0.22)', border: '#10b981', color: '#34d399' };
    }
    if (cat.includes('크릴')) {
      return { bg: 'rgba(239, 68, 68, 0.22)', border: '#ef4444', color: '#f87171' };
    }
    if (cat.includes('파우다') || cat.includes('파우더')) {
      return { bg: 'rgba(245, 158, 11, 0.22)', border: '#f59e0b', color: '#fbbf24' };
    }
    if (cat.includes('미끼')) {
      return { bg: 'rgba(6, 182, 212, 0.22)', border: '#06b6d4', color: '#22d3ee' };
    }
    if (cat.includes('미등록상품')) {
      return { bg: 'rgba(244, 63, 94, 0.25)', border: '#f43f5e', color: '#f43f5e' };
    }
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.22)', border: '#3b82f6', color: '#60a5fa' },
      { bg: 'rgba(168, 85, 247, 0.22)', border: '#a855f7', color: '#c084fc' },
      { bg: 'rgba(236, 72, 153, 0.22)', border: '#ec4899', color: '#f472b6' },
      { bg: 'rgba(20, 184, 166, 0.22)', border: '#14b8a6', color: '#2dd4bf' }
    ];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
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
    
    // 로컬 옵티미스틱 상태 우선 판별
    const currentlyLoaded = key in processedItems ? Boolean(processedItems[key]) : Boolean(updatedItems[itemIdx]?.loaded);
    const isNowLoaded = !currentlyLoaded;

    // 0. 즉시 사운드 분기: 상차 시 playLoadSound(), 상차 풀기 시 playUnloadSound()
    if (isNowLoaded) {
      playLoadSound();
    } else {
      playUnloadSound();
    }
    
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], loaded: isNowLoaded };

    // 1. 로컬 상태 즉시 변경 (0ms 딜레이 없이 UI 색상 및 체크 즉시 전환)
    setProcessedItems(prev => ({ ...prev, [key]: isNowLoaded }));

    // 창고 명칭 안전 확보
    const outWarehouse = order.outWarehouse || item.outWarehouse || '본사창고';
    const inWarehouse = order.inWarehouse || item.inWarehouse || '차량';
    const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
    const initialStock = prod?.initialStock || 0;

    // 현재 재고 계산 (세션 캐시 우선 적용하여 연속 클릭/취소 시 오차 방지)
    const stockCacheKey = `${outWarehouse}_${item.name}`;
    const cachedStock = stockOverrides.current[stockCacheKey];
    const currentWhStock = (cachedStock !== undefined)
      ? (cachedStock - initialStock)
      : ((inventory[outWarehouse]?.[item.name] !== undefined)
          ? inventory[outWarehouse][item.name]
          : (inventory['본사창고']?.[item.name] || 0));

    const qtyNum = Number(item.qty || 0);

    // 2. 재고 이동 백그라운드 처리
    if (isNowLoaded) {
      // 상차 시: 재고 차감 (0일 때 3개 실으면 -3)
      const nextStock = initialStock + currentWhStock - qtyNum;
      stockOverrides.current[stockCacheKey] = nextStock;
      onMoveStock(outWarehouse, inWarehouse, item.name, item.qty, true, order.date, order.id);
      setStockFeedback(prev => ({ ...prev, [key]: `상차완료(재고): ${nextStock}` }));
    } else {
      // 상차 풀기(취소) 시: 재고 복구 (-3에서 3개 풀면 정확히 0)
      const nextStock = initialStock + currentWhStock + qtyNum;
      stockOverrides.current[stockCacheKey] = nextStock;
      if (onRevertAutoMoveStock) {
        onRevertAutoMoveStock(outWarehouse, inWarehouse, item.name, item.qty, order.id);
      } else {
        onMoveStock(inWarehouse, outWarehouse, item.name, item.qty, true, order.date, order.id);
      }
      setStockFeedback(prev => ({ ...prev, [key]: `상차취소(재고): ${nextStock}` }));
    }

    // 3. 부모 컴포넌트 즉각 동기화
    onUpdateOrder(order.id, { items: updatedItems });

    setTimeout(() => {
      setStockFeedback(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2500);
  };

  const handleShowStock = (e, order, item, itemIdx) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const key = `${order.id}-${itemIdx}`;
    const outWarehouse = order.outWarehouse || item.outWarehouse || '본사창고';
    const stockCacheKey = `${outWarehouse}_${item.name}`;
    const cachedStock = stockOverrides.current[stockCacheKey];
    const prod = products.find(p => p.name === item.name || p.abbreviation === item.name);
    const initialStock = prod?.initialStock || 0;
    const currentStock = cachedStock !== undefined 
      ? cachedStock 
      : (initialStock + (inventory[outWarehouse]?.[item.name] !== undefined ? inventory[outWarehouse][item.name] : (inventory['본사창고']?.[item.name] || 0)));
    setStockFeedback(prev => ({ ...prev, [key]: `재고: ${currentStock.toLocaleString()}개` }));
    setTimeout(() => {
      setStockFeedback(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2500);
  };

  // 납품 완료 및 전표 화면 즉시 전송 핸들러
  const handleTransferOrderToInvoice = (order) => {
    playMenuClickSound();
    const isCompleted = isOrderCompleted(order);
    if (isCompleted) {
      if (window.confirm('이미 납품 완료된 주문입니다.\n납품 완료 상태를 취소(대기로 변경)하시겠습니까?')) {
        onUpdateOrder(order.id, { status: '대기', isCompleted: false });
        return;
      }
    }
    const allItems = order.items || parseOrderItems(order.itemsText);
    const checkedItems = allItems.filter((item, idx) => (`${order.id}-${idx}` in processedItems ? processedItems[`${order.id}-${idx}`] : item.loaded));
    const itemsToTransfer = checkedItems.length > 0 ? checkedItems : allItems;

    if (itemsToTransfer.length === 0) {
      alert('전표로 전송할 품목이 없습니다.');
      return;
    }

    const outWH = order.outWarehouse || '본사창고';
    const inWH = order.inWarehouse || '차량';

    const invoiceItems = itemsToTransfer.map((item, idx) => {
      const product = products.find(p => p.name === item.name || p.abbreviation === item.name);
      const price = item.price !== undefined ? item.price : (product?.salesPriceSingle || product?.salesPrice || 0);
      const isTaxFree = product?.taxType === '면세';
      const qtyNum = Number(item.qty || 0);
      const itemTotal = qtyNum * price;
      const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
      const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

      return {
        id: Date.now() + idx,
        productId: product?.id,
        name: item.name,
        spec: product?.spec || '',
        qty: qtyNum,
        price: price,
        taxType: product?.taxType || '과세',
        supplyValue: itemSupplyValue,
        tax: itemTax,
        total: itemTotal,
        outWarehouse: item.outWarehouse || outWH,
        inWarehouse: item.inWarehouse || inWH
      };
    });

    // 1. 수주 상태 '완료'로 변경
    onUpdateOrder(order.id, { status: '완료', isCompleted: true });

    // 2. 매출 전표 화면으로 즉시 전송
    if (onTransferToInvoice) {
      onTransferToInvoice({
        ...order,
        id: Date.now(),
        orderId: order.id,
        salesOrderId: order.id,
        partner: order.partner,
        date: order.date,
        manager: order.manager || currentUser?.name || '미지정',
        warehouse: inWH || outWH,
        items: invoiceItems,
        receivedAmount: 0,
        payments: { cash: 0, account: 0, card: 0, bill: 0 },
        discount: 0
      });
    }

    // Clear processed states for this order
    setProcessedItems(prev => {
      const next = { ...prev };
      allItems.forEach((_, idx) => delete next[`${order.id}-${idx}`]);
      return next;
    });
  };

  const handleTransferCheckedItems = handleTransferOrderToInvoice;

  const handleCreatePartialOrder = (order) => {
    const allItems = order.items || parseOrderItems(order.itemsText);
    const unloadedItems = allItems.filter((item, idx) => !(`${order.id}-${idx}` in processedItems ? processedItems[`${order.id}-${idx}`] : item.loaded));

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
        padding: '10px 12px 8px 12px', 
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
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#f8fafc',
              padding: '5px 8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1'
            }}>
              <DateNavButton direction="prev" onClick={() => setDateStr(addDays(dateStr, -1))} size={11} style={{ width: '18px', height: '18px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }} />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  outline: 'none',
                  width: '102px'
                }}
              />
              <DateNavButton direction="next" onClick={() => setDateStr(addDays(dateStr, 1))} size={11} style={{ width: '18px', height: '18px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }} />
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: '#f8fafc', 
              padding: '6px 10px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1',
              flex: 1,
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#3b82f6" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>담당:</span>
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
                  color: '#1e293b', 
                  outline: 'none', 
                  cursor: !canSelectOtherStaff ? 'default' : 'pointer',
                  opacity: !canSelectOtherStaff ? 0.8 : 1
                }}
              >
                {canSelectOtherStaff && <option value="all">전체 직원</option>}
                {currentUser?.name && !staffList.some(s => s.name === currentUser.name) && (
                  <option value={currentUser.name}>{currentUser.name}</option>
                )}
                {staffList.filter(s => canSelectOtherStaff || s.name === currentUser?.name).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="acc-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#f8fafc',
              padding: '4px 8px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <Calendar size={14} color="#3b82f6" />
              <DateNavButton direction="prev" onClick={() => setDateStr(addDays(dateStr, -1))} size={12} style={{ width: '20px', height: '20px' }} />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <DateNavButton direction="next" onClick={() => setDateStr(addDays(dateStr, 1))} size={12} style={{ width: '20px', height: '20px' }} />
            </div>
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
                {currentUser?.name && !staffList.some(s => s.name === currentUser.name) && (
                  <option value={currentUser.name}>{currentUser.name}</option>
                )}
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
            padding: '2px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0',
            width: '100%'
          }}>
            <button 
              onClick={() => setActiveTab('summary')}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: activeTab === 'summary' ? '#ffffff' : '#64748b',
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
                color: activeTab === 'list' ? '#ffffff' : '#64748b',
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
        backgroundColor: isMobileView ? '#f8fafc' : 'transparent'
      }}>
        {/* Left Column - Category Totals Summary (Hidden on Mobile when list tab is active) */}
        {(!isMobileView || activeTab === 'summary') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              backgroundColor: isMobileView ? '#ffffff' : '#1e3a8a', 
              color: isMobileView ? '#1e293b' : 'white', 
              padding: isMobileView ? '14px' : '20px', 
              borderRadius: '16px', 
              height: 'fit-content', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              border: isMobileView ? '1px solid #e2e8f0' : 'none'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: isMobileView ? '10px' : '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: isMobileView ? '#1e293b' : '#fff' }}>카테고리별 품목 합계</span>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: isMobileView ? '#64748b' : 'rgba(255,255,255,0.8)' }}>{dateStr}</span>
              </div>
              {hasTotals ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px', 
                  maxHeight: isMobileView ? 'calc(100vh - 200px)' : '600px', 
                  overflowY: 'auto', 
                  paddingRight: '2px' 
                }}>
                  {Object.entries(categoryTotals).map(([category, items]) => {
                    const catStyle = getCategoryBadgeStyle(category);
                    const categoryTotalQty = Object.values(items).reduce((acc, curr) => acc + (curr.totalQty || 0), 0);
                    const categoryLoadedQty = Object.values(items).reduce((acc, curr) => acc + (curr.loadedQty || 0), 0);
                    const isCatAllLoaded = categoryLoadedQty >= categoryTotalQty && categoryTotalQty > 0;

                    return (
                      <div key={category} style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                      }}>
                        {/* 카테고리 헤더 */}
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: isMobileView ? '#f8fafc' : 'rgba(255,255,255,0.08)',
                          borderBottom: isMobileView ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: catStyle.bg,
                              border: `1px solid ${catStyle.border}`,
                              color: catStyle.color,
                              fontWeight: 800
                            }}>
                              {category}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: isMobileView ? '#64748b' : 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                              ({Object.keys(items).length}개 품목)
                            </span>
                          </div>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: isMobileView ? '#334155' : '#fbbf24' }}>
                            총 {categoryTotalQty.toLocaleString()}개
                          </span>
                        </div>

                        {/* 품목 리스트 (수주목록칸과 동일한 줄 나눔 및 레이아웃, 클릭 시 전체 상차) */}
                        <div>
                          {Object.entries(items).map(([name, data], idx) => {
                            const isAllLoaded = data.loadedQty >= data.totalQty && data.totalQty > 0;
                            const isPartiallyLoaded = data.loadedQty > 0 && data.loadedQty < data.totalQty;

                            return (
                              <div
                                key={name}
                                onClick={() => handleBatchToggleProduct(category, name)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  borderBottom: idx === Object.keys(items).length - 1 ? 'none' : (isAllLoaded ? '1px solid #1e293b' : '1px solid #f1f5f9'),
                                  backgroundColor: isAllLoaded ? '#0f172a' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.18s ease'
                                }}
                                title={`${name} 클릭 시 해당 품목 전체 ${isAllLoaded ? '상차 취소' : '상차'}`}
                              >
                                {/* 1) 번호 */}
                                <span style={{ width: '18px', fontSize: '0.76rem', fontWeight: 800, color: isAllLoaded ? '#94a3b8' : '#64748b', textAlign: 'center', flexShrink: 0 }}>
                                  {idx + 1}
                                </span>

                                {/* 2) 상차 체크 원 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', flexShrink: 0 }}>
                                  {isAllLoaded ? (
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: '#10b981',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Check size={11} color="#ffffff" strokeWidth={3.5} />
                                    </div>
                                  ) : isPartiallyLoaded ? (
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      border: '2px solid #f59e0b',
                                      backgroundColor: '#fffbeb',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>-</span>
                                    </div>
                                  ) : (
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      border: '2px solid #cbd5e1',
                                      backgroundColor: '#ffffff'
                                    }} />
                                  )}
                                </div>

                                {/* 3 & 4) 카테고리 뱃지 위 + 품목명 아래 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{
                                      fontSize: '0.58rem',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      backgroundColor: catStyle.bg,
                                      border: `1px solid ${catStyle.border}`,
                                      color: catStyle.color,
                                      fontWeight: 800,
                                      lineHeight: 1.2,
                                      letterSpacing: '-0.2px',
                                      display: 'inline-block'
                                    }}>
                                      {category || '기타'}
                                    </span>
                                  </div>
                                  <span style={{
                                    fontWeight: 700,
                                    color: isAllLoaded ? '#ffffff' : '#1e293b',
                                    fontSize: '0.84rem',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {name}
                                  </span>
                                </div>

                                {/* 5) 수량 박스 */}
                                <div style={{
                                  minWidth: '36px',
                                  height: '26px',
                                  padding: '0 6px',
                                  borderRadius: '7px',
                                  backgroundColor: isAllLoaded ? '#1e293b' : '#f1f5f9',
                                  border: isAllLoaded ? '1px solid #334155' : '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    color: isAllLoaded ? '#ffffff' : '#0f172a'
                                  }}>
                                    {isPartiallyLoaded ? `${data.loadedQty}/${data.totalQty}` : data.totalQty.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: isMobileView ? '#94a3b8' : 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>수주 내역이 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* Right Column - Orders List (Hidden on Mobile when summary tab is active) */}
        {(!isMobileView || activeTab === 'list') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              {!isMobileView && (
                <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: isMobileView ? '#1e293b' : 'inherit' }}>
                  <ShoppingCart size={18} color="#3b82f6" />
                  {selectedStaff === 'all' ? '전체 수주 목록' : `${selectedStaff}님의 수주 목록`}
                </div>
              )}
              
              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: isMobileView ? '100%' : 'auto' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    flex: isMobileView ? 1 : 'none',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: statusFilter === 'all' ? '1px solid #3b82f6' : (isMobileView ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'),
                    backgroundColor: statusFilter === 'all' ? '#3b82f6' : (isMobileView ? '#ffffff' : '#1e293b'),
                    color: statusFilter === 'all' ? '#ffffff' : (isMobileView ? '#475569' : '#94a3b8')
                  }}
                >
                  전체 ({totalOrderCount})
                </button>
                <button
                  onClick={() => setStatusFilter('waiting')}
                  style={{
                    flex: isMobileView ? 1 : 'none',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: statusFilter === 'waiting' ? '1px solid #f59e0b' : (isMobileView ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'),
                    backgroundColor: statusFilter === 'waiting' ? '#f59e0b' : (isMobileView ? '#ffffff' : '#1e293b'),
                    color: statusFilter === 'waiting' ? '#ffffff' : (isMobileView ? '#475569' : '#94a3b8')
                  }}
                >
                  대기 ({waitingOrderCount})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  style={{
                    flex: isMobileView ? 1 : 'none',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: statusFilter === 'completed' ? '1px solid #10b981' : (isMobileView ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'),
                    backgroundColor: statusFilter === 'completed' ? '#10b981' : (isMobileView ? '#ffffff' : '#1e293b'),
                    color: statusFilter === 'completed' ? '#ffffff' : (isMobileView ? '#475569' : '#94a3b8')
                  }}
                >
                  완료 ({completedOrderCount})
                </button>
              </div>
            </div>

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
                  const displayItems = (order.items && order.items.length > 0) ? order.items : parsedItems;
                  const totalQty = displayItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
                  const partnerObj = (partners || []).find(p => p.name === order.partner || String(p.id) === String(order.partnerId));
                  const phone = partnerObj?.phone || partnerObj?.tel || partnerObj?.mobile || '';
                  const isCompleted = isOrderCompleted(order);

                  if (isMobileView) {
                    return (
                      <div key={order.id} style={{ 
                        borderRadius: '16px', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        overflow: 'hidden', 
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        marginBottom: '14px'
                      }}>
                        {/* 1. Header (Matching screenshot: light mint background, - Partner Phone, [납품 완료], Edit, Delete) */}
                        <div style={{ 
                          padding: '8px 12px', 
                          backgroundColor: '#f0fdf4', 
                          borderBottom: '1px solid #dcfce7',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                            <span style={{ color: '#059669', fontWeight: 800, fontSize: '1rem' }}>-</span>
                            <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#064e3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {order.partner}
                            </span>
                            {phone && (
                              <a 
                                href={`tel:${phone}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginLeft: '2px' }}
                                title={`전화: ${phone}`}
                              >
                                <Phone size={13} />
                              </a>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransferOrderToInvoice(order);
                              }}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '4px 9px', 
                                borderRadius: '7px', 
                                fontSize: '0.74rem', 
                                fontWeight: 800, 
                                backgroundColor: isCompleted ? '#059669' : '#ffffff',
                                color: isCompleted ? '#ffffff' : '#059669', 
                                border: isCompleted ? '1px solid #059669' : '1px solid #cbd5e1', 
                                cursor: 'pointer',
                                boxShadow: isCompleted ? '0 2px 6px rgba(5,150,105,0.35)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <CheckCircle2 size={12} color={isCompleted ? '#ffffff' : '#059669'} /> 납품 완료
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEditOrder(order); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center' }}
                              title="수정"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('삭제하시겠습니까?')) onDeleteOrder(order.id); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center' }}
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 2. Items List (White by default, turns dark navy on check) */}
                        <div style={{ backgroundColor: '#ffffff', padding: '0' }}>
                          {displayItems.map((item, iIdx) => {
                            const key = `${order.id}-${iIdx}`;
                            const isProcessed = key in processedItems ? Boolean(processedItems[key]) : Boolean(item.loaded);
                            const feedback = stockFeedback[key];
                            const catStyle = getCategoryBadgeStyle(item.category);

                            return (
                              <div 
                                key={iIdx}
                                onClick={() => handleItemMove(order, item, iIdx)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  borderBottom: iIdx === displayItems.length - 1 ? 'none' : (isProcessed ? '1px solid #1e293b' : '1px solid #f1f5f9'),
                                  backgroundColor: isProcessed ? '#0f172a' : '#ffffff',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  transition: 'background-color 0.18s ease'
                                }}
                              >
                                {/* 1) Item Index */}
                                <span style={{ width: '18px', fontSize: '0.76rem', fontWeight: 800, color: isProcessed ? '#94a3b8' : '#64748b', textAlign: 'center', flexShrink: 0 }}>
                                  {iIdx + 1}
                                </span>

                                {/* 2) Checkmark Circle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', flexShrink: 0 }}>
                                  {isProcessed ? (
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: '#10b981',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Check size={11} color="#ffffff" strokeWidth={3.5} />
                                    </div>
                                  ) : (
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      border: '2px solid #cbd5e1',
                                      backgroundColor: '#ffffff'
                                    }} />
                                  )}
                                </div>

                                {/* 3 & 4) Category Above + Product Name Below (Clicking also toggles check) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{
                                      fontSize: '0.58rem',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      backgroundColor: catStyle.bg,
                                      border: `1px solid ${catStyle.border}`,
                                      color: catStyle.color,
                                      fontWeight: 800,
                                      lineHeight: 1.2,
                                      letterSpacing: '-0.2px',
                                      display: 'inline-block'
                                    }}>
                                      {item.category || '기타'}
                                    </span>
                                  </div>
                                  <span 
                                    style={{
                                      fontWeight: 700,
                                      color: isProcessed ? '#ffffff' : '#1e293b',
                                      fontSize: '0.84rem',
                                      lineHeight: 1.3,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {item.name}
                                  </span>
                                </div>

                                {/* 5) Quantity Box */}
                                <div style={{
                                  minWidth: '32px',
                                  height: '26px',
                                  padding: '0 6px',
                                  borderRadius: '7px',
                                  backgroundColor: isProcessed ? '#1e293b' : '#f1f5f9',
                                  border: isProcessed ? '1px solid #334155' : '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isProcessed ? '#ffffff' : '#1e293b',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  flexShrink: 0
                                }}>
                                  {item.qty}
                                </div>

                                {/* 6) Mismatch Button (맨 끝에 재고불일치 버튼만) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenInventoryMismatch && onOpenInventoryMismatch(order.outWarehouse, item.name);
                                  }}
                                  style={{
                                    border: '1px solid rgba(245, 158, 11, 0.5)',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    color: '#d97706',
                                    padding: '3px 6px',
                                    borderRadius: '5px',
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  title="재고불일치"
                                >
                                  재고불일치
                                </button>

                                {/* Temporary Stock Feedback Toast */}
                                {feedback && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: '50%', 
                                    left: '50%', 
                                    transform: 'translate(-50%, -50%)', 
                                    backgroundColor: '#020617', 
                                    color: '#38bdf8', 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap', 
                                    zIndex: 20, 
                                    border: '1px solid #38bdf8', 
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                    pointerEvents: 'none'
                                  }}>
                                    {feedback}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={order.id} style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '16px', 
                      backgroundColor: '#ffffff', 
                      overflow: 'hidden', 
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
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
                          {isOrderCompleted(order) ? (
                            <span style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 800, 
                              backgroundColor: '#ecfdf5', 
                              color: '#10b981', 
                              border: '1px solid #a7f3d0', 
                              padding: '2px 7px', 
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <CheckCircle2 size={11} /> 완료
                            </span>
                          ) : (
                            <span style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 800, 
                              backgroundColor: '#fffbeb', 
                              color: '#f59e0b', 
                              border: '1px solid #fde68a', 
                              padding: '2px 7px', 
                              borderRadius: '6px' 
                            }}>
                              대기
                            </span>
                          )}
                          {order.memo?.includes('MALL') && (
                            <span style={{ 
                              fontSize: '0.6rem', 
                              backgroundColor: '#eff6ff', 
                              color: '#2563eb', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              border: '1px solid #bfdbfe',
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
                            <Calendar size={12} color="#64748b" />
                            <input 
                              type="date" 
                              value={order.date} 
                              onChange={(e) => onUpdateOrder(order.id, { date: e.target.value })}
                              style={{ 
                                border: 'none', 
                                background: 'transparent', 
                                fontSize: '0.78rem', 
                                fontWeight: 600, 
                                color: '#1e293b', 
                                outline: 'none',
                                cursor: 'pointer'
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
                            const hasUnloaded = currentItems.some((item, idx) => !(`${order.id}-${idx}` in processedItems ? processedItems[`${order.id}-${idx}`] : item.loaded));
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
                              color: '#60a5fa', 
                              background: isMobileView ? 'rgba(59,130,246,0.1)' : '#eff6ff',
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
                              color: '#f87171', 
                              background: isMobileView ? 'rgba(239,68,68,0.1)' : '#fee2e2',
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
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>{isMobileView ? '' : '담당: '}{order.manager}</span>
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
                            const isProcessed = key in processedItems ? Boolean(processedItems[key]) : Boolean(item.loaded);
                            const feedback = stockFeedback[key];
                            
                            if (isMobileView) {
                              return (
                                <div key={iIdx} onClick={() => handleItemMove(order, item, iIdx)} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '9px 11px',
                                  backgroundColor: isProcessed ? '#1e293b' : '#f8fafc',
                                  border: isProcessed ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.18s ease',
                                  position: 'relative',
                                  boxShadow: isProcessed ? '0 2px 6px rgba(15,23,42,0.15)' : 'none'
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
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      backgroundColor: isProcessed ? 'rgba(255, 255, 255, 0.12)' : ((item.category || '기타') === '미등록상품' ? '#fee2e2' : '#e2e8f0'), 
                                      color: isProcessed ? '#93c5fd' : getCategoryColor(item.category || '기타'), 
                                      fontWeight: 700,
                                      flexShrink: 0,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {item.category || '기타'}
                                    </span>
                                    <span 
                                      onClick={(e) => handleShowStock(e, order, item, iIdx)}
                                      title="클릭 시 재고 확인"
                                      style={{ 
                                        fontWeight: 700, 
                                        color: isProcessed ? '#f8fafc' : '#1e293b', 
                                        fontSize: '0.84rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      {item.name}
                                    </span>
                                  </div>

                                  {/* Right part: Quantity + Status Badge + Stock Button */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <span style={{ fontWeight: 800, color: isProcessed ? '#fbbf24' : '#2563eb', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                      {item.qty.toLocaleString()}개
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {isProcessed ? (
                                        <span 
                                          style={{ fontSize: '0.7rem', backgroundColor: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                          title="상차 취소"
                                        >
                                          완료
                                        </span>
                                      ) : (
                                        <span 
                                          style={{ fontSize: '0.7rem', border: '1px solid #3b82f6', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                          onClick={(e) => { e.stopPropagation(); handleItemMove(order, item, iIdx); }}
                                        >
                                          상차
                                        </span>
                                      )}
                                      <span 
                                        style={{ fontSize: '0.7rem', border: isProcessed ? '1px solid #475569' : '1px solid #cbd5e1', backgroundColor: isProcessed ? 'rgba(255,255,255,0.08)' : '#ffffff', color: isProcessed ? '#cbd5e1' : '#64748b', padding: '2px 5px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                        onClick={(e) => handleShowStock(e, order, item, iIdx)}
                                        title="재고 상태 확인"
                                      >
                                        재고
                                      </span>
                                      <span 
                                        style={{ fontSize: '0.7rem', border: '1px solid #f59e0b', backgroundColor: isProcessed ? 'rgba(245,158,11,0.1)' : '#fffbeb', color: '#d97706', padding: '2px 5px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}
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
                                      color: '#38bdf8', 
                                      padding: '6px 14px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.78rem', 
                                      fontWeight: 800,
                                      whiteSpace: 'nowrap', 
                                      zIndex: 20, 
                                      border: '1px solid #38bdf8', 
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                                      pointerEvents: 'none'
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
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isMobileView ? '#1e293b' : '#1e3a8a' }}>합계 수량: <span style={{ color: '#2563eb', fontSize: '1.1rem' }}>{totalQty.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b', border: isMobileView ? '2px dashed #cbd5e1' : '2px dashed #f1f5f9', borderRadius: '16px', backgroundColor: isMobileView ? '#ffffff' : 'transparent' }}>수주 내역이 없습니다.</div>
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
            background-color: #0a0f1d !important;
            color: #f8fafc !important;
          }
          
          .window-container.is-maximized {
            background-color: #0a0f1d !important;
            border: none !important;
          }
          
          .account-header {
            border-radius: 0 !important;
          }

          .purchase-modal-body {
            padding: 10px !important;
            gap: 12px !important;
            background-color: #0a0f1d !important;
          }
          
          select option {
            background-color: #1e293b !important;
            color: #f8fafc !important;
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
