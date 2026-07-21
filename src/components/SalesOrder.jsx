import React, { useState } from 'react';
import { ShoppingCart, Printer, Search, Save, Package, RefreshCw, FileText, List, Check, AlertTriangle, Info } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound } from '../utils/koreanUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const SalesOrder = ({ onClose, partners, products, onSave, onTransferToInvoice, onOpenOrderList, salesOrders = [], currentUser, staffList = [], initialPartner, warehouses = [], selectedDate, editingOrder, themeColor: propThemeColor }) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  const mainWH = warehouses.find(w => w.isMain)?.name || 
                 warehouses.find(w => w.name.includes('메인'))?.name || 
                 warehouses.find(w => w.name.includes('main'))?.name || 
                 warehouses[0]?.name || 
                 '메인창고';
  const staffWH = currentUser?.warehouse || (staffList.find(s => s.name === currentUser?.name)?.warehouse) || '통영';

  const themeColor = propThemeColor || '#3b82f6';

  const [activeMobileTab, setActiveMobileTab] = useState('input'); // 'input' or 'preview'
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState(false);

  const [partnerDayOrders, setPartnerDayOrders] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [orderData, setOrderData] = useState(editingOrder || {
    id: Date.now(),
    date: (() => {
      const d = selectedDate || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    partner: initialPartner ? initialPartner.name : '',
    outWarehouse: mainWH,
    inWarehouse: staffWH,
    manager: currentUser?.name || (initialPartner && initialPartner.manager && initialPartner.manager !== '-' ? initialPartner.manager : (staffList.length > 0 ? staffList[0].name : '알 수 없음')),
    itemsText: '',
    memo: ''
  });

  React.useEffect(() => {
    if (orderData.partner) {
      const stack = salesOrders.filter(o => o.partner === orderData.partner && o.date === orderData.date).sort((a, b) => a.id - b.id);
      setPartnerDayOrders(stack);
      const idx = stack.findIndex(o => String(o.id) === String(orderData.id));
      setCurrentIndex(idx);
    } else {
      setPartnerDayOrders([]);
      setCurrentIndex(-1);
    }
  }, [salesOrders, orderData.id, orderData.partner, orderData.date]);

  // Reset form when editingOrder or initialPartner changes
  React.useEffect(() => {
    if (!isItemSearchOpen) { // Don't reset while searching
      if (editingOrder) {
        setOrderData({ ...editingOrder });
      } else {
        setOrderData({
          id: Date.now(),
          date: (() => {
            const d = selectedDate || new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })(),
          partner: initialPartner ? initialPartner.name : '',
          outWarehouse: mainWH,
          inWarehouse: staffWH,
          manager: initialPartner && initialPartner.manager && initialPartner.manager !== '-' ? initialPartner.manager : (currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음')),
          itemsText: '',
          memo: ''
        });
      }
    }
  }, [editingOrder, initialPartner, selectedDate]);

  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const searchRef = React.useRef(null);
  const itemInputRef = React.useRef(null);
  const skipNextFocusOpen = React.useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [caretPos, setCaretPos] = useState({ top: 44, left: 16 });

  const updateCaretPosition = (el) => {
    if (!el) return;
    
    let clone = document.getElementById('so-textarea-clone');
    if (!clone) {
      clone = document.createElement('div');
      clone.id = 'so-textarea-clone';
      document.body.appendChild(clone);
    }
    
    const style = window.getComputedStyle(el);
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.whiteSpace = 'pre-wrap';
    clone.style.wordWrap = 'break-word';
    clone.style.overflowWrap = 'break-word';
    
    const propertiesToCopy = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'width', 'boxSizing'
    ];
    
    propertiesToCopy.forEach(prop => {
      clone.style[prop] = style[prop];
    });
    
    const textBefore = el.value.substring(0, el.selectionStart);
    // Replace trailing newline with space to render the line correctly
    clone.textContent = textBefore.endsWith('\n') ? textBefore + ' ' : textBefore;
    
    const marker = document.createElement('span');
    marker.textContent = '|';
    clone.appendChild(marker);
    
    const lineHeight = parseFloat(style.lineHeight) || 28;
    // Calculate position: offset from top of textarea
    const topPos = marker.offsetTop + lineHeight + 2; 
    const leftPos = marker.offsetLeft;
    
    const maxLeft = el.offsetWidth - 280; // keep dropdown inside
    
    setCaretPos({ 
      top: topPos, 
      left: Math.max(16, Math.min(leftPos, maxLeft > 0 ? maxLeft : 16))
    });
  };
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  // Close search results when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsItemSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the last word for search (split by space or newline)
  const lastWord = orderData.itemsText.split(/[\s\n]+/).pop();
  const filteredProducts = lastWord ? products.filter(p => 
    matchesInitialSound(p.name, lastWord) || 
    (p.abbreviation && matchesInitialSound(p.abbreviation, lastWord))
  ) : [];

  React.useEffect(() => {
    if (isItemSearchOpen && filteredProducts.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [isItemSearchOpen, lastWord, filteredProducts.length]);

  const handleProductSelect = (product) => {
    const textToUse = product.abbreviation || product.name;
    const words = orderData.itemsText.split(/([\s\n]+)/); // Keep separators
    
    // Replace the last non-empty word, preserving trailing numbers (quantity)
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim()) {
        const currentWord = words[i];
        const qtyMatch = currentWord.match(/\d+$/); // Find trailing digits
        const qty = qtyMatch ? qtyMatch[0] : '';
        words[i] = textToUse + qty;
        break;
      }
    }
    
    const newText = words.join('');
    setOrderData({ ...orderData, itemsText: newText });
    setIsItemSearchOpen(false);
    skipNextFocusOpen.current = true;
    
    if (itemInputRef.current) {
      const el = itemInputRef.current;
      setTimeout(() => {
        el.focus();
        const len = newText.length;
        el.setSelectionRange(len, len);
      }, 0);
    }
  };

  const parsedItems = React.useMemo(() => {
    if (!orderData.itemsText) return [];
    const tokens = orderData.itemsText.trim().split(/\s+/);
    const items = [];
    tokens.forEach((token, idx) => {
      const match = token.match(/^(.+?)(\d+)$/);
      if (match) {
        const nameOrAbbr = match[1];
        const qty = parseInt(match[2], 10);
        const product = products.find(p => p.name === nameOrAbbr || p.abbreviation === nameOrAbbr);
        if (product) {
          const price = product.salesPrice || 0;
          const isTaxFree = product.taxType === '면세';
          const itemTotal = qty * price;
          const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
          const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;
          items.push({
            id: Date.now() + idx,
            productId: product.id,
            name: product.name,
            spec: product.spec,
            qty: qty,
            price: price,
            taxType: product.taxType || '과세',
            supplyValue: itemSupplyValue,
            tax: itemTax,
            total: itemTotal,
            raw: token,
            category: product.category || '기타'
          });
        }
      }
    });
    return items;
  }, [orderData.itemsText, products]);

  const handleSave = () => {
    if (!orderData.partner) {
      showToast('거래처가 입력되지 않았습니다.', 'error');
      return;
    }
    if (!orderData.itemsText.trim()) {
      showToast('수주 품목을 입력해주세요.', 'error');
      return;
    }
    const isAlreadySaved = partnerDayOrders.some(o => String(o.id) === String(orderData.id));
    onSave({ 
      ...orderData, 
      id: orderData.id || Date.now(),
      items: parsedItems // explicitly pass the updated items
    });
    
    if (!isAlreadySaved) {
      setCurrentIndex(partnerDayOrders.length);
      setOrderData(prev => ({
        ...prev,
        id: Date.now(),
        partner: '',
        itemsText: '',
        memo: ''
      }));
    }
    
    showToast('수주가 저장되었습니다.', 'success');

    // Automatically focus back to the partner name input for continuous order entry
    setTimeout(() => {
      const partnerInput = document.querySelector('.partner-input');
      if (partnerInput) {
        partnerInput.focus();
      }
    }, 100);
  };

  const handleTransferToInvoice = () => {
    if (!orderData.partner || !orderData.itemsText) {
      alert('전송할 수주 정보가 부족합니다.');
      return;
    }

    const tokens = orderData.itemsText.trim().split(/\s+/);
    const items = [];
    
    tokens.forEach((token, idx) => {
      const match = token.match(/^(.+?)(\d+)$/);
      if (match) {
        const nameOrAbbr = match[1];
        const qty = parseInt(match[2], 10);
        const product = products.find(p => p.name === nameOrAbbr || p.abbreviation === nameOrAbbr);
        
        if (product) {
          const price = product.salesPrice || 0;
          const isTaxFree = product.taxType === '면세';
          const itemTotal = qty * price;
          const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
          const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

          items.push({
            id: Date.now() + idx,
            productId: product.id,
            name: product.name,
            spec: product.spec,
            qty: qty,
            price: price,
            taxType: product.taxType || '과세',
            supplyValue: itemSupplyValue,
            tax: itemTax,
            total: itemTotal
          });
        }
      }
    });

    if (items.length === 0) {
      showToast('품목 정보를 인식할 수 없습니다. "품목명수량" 형식으로 입력해주세요.', 'error');
      return;
    }

    onTransferToInvoice({
      ...orderData,
      items,
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      discount: 0
    });
  };

  return (
    <WindowModal title={editingOrder ? (isMobileView ? "수주 수정" : "간편수주 수정") : (isMobileView ? "수주 등록" : "간편수주 등록")} onClose={onClose} width="1200px" contentPadding="0">
      <div className="so-wrapper" style={{ maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 상단 헤더: 왼쪽(날짜선택), 오른쪽(새 수주 | 수주 목록 버튼) */}
        <div className="so-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', gap: '8px' }}>
          <div className="so-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={isMobileView ? 18 : 22} />
            <span className="so-date-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input 
                type="date"
                value={orderData.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (newDate) {
                    setOrderData(prev => ({ ...prev, date: newDate }));
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit'
                }}
              />
              {orderData.partner && (partnerDayOrders.length > 0 || orderData.itemsText) && (
                <span className="so-nav-controls" style={{ fontSize: '0.75rem' }}>
                  <button 
                    disabled={currentIndex <= 0}
                    onClick={(e) => { e.stopPropagation(); const prev = partnerDayOrders[currentIndex - 1]; setOrderData({...prev}); setCurrentIndex(currentIndex - 1); }}
                  >◀</button>
                  <span>{currentIndex >= 0 ? currentIndex + 1 : partnerDayOrders.length + 1} / {Math.max(partnerDayOrders.length, currentIndex >= 0 ? currentIndex + 1 : partnerDayOrders.length + 1)}</span>
                  <button 
                    disabled={currentIndex === -1 || currentIndex >= partnerDayOrders.length - 1}
                    onClick={(e) => { e.stopPropagation(); const nxt = partnerDayOrders[currentIndex + 1]; setOrderData({...nxt}); setCurrentIndex(currentIndex + 1); }}
                  >▶</button>
                </span>
              )}
            </span>
          </div>

          <div className="so-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="so-btn-outline" style={{ padding: '5px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => {
              setOrderData({
                id: Date.now(),
                date: (() => {
                  const d = selectedDate || new Date();
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })(),
                partner: orderData.partner,
                outWarehouse: mainWH,
                inWarehouse: staffWH,
                manager: currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'),
                itemsText: '',
                memo: ''
              });
            }}>
              <RefreshCw size={13} /> 새 수주
            </button>
            <button className="so-btn-outline" style={{ padding: '5px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={onOpenOrderList}>
              <List size={13} /> 목록
            </button>
          </div>
        </div>

        {isMobileView && (
          <div className="so-mobile-tabs">
            <button 
              className={`so-mobile-tab-btn ${activeMobileTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('input')}
            >
              수주 입력 (약칭/수량)
            </button>
            <button 
              className={`so-mobile-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
              onClick={() => {
                setActiveMobileTab('preview');
                if (document.activeElement) document.activeElement.blur();
              }}
            >
              수주 내역 ({parsedItems.length}건)
            </button>
          </div>
        )}

        <div className="so-body" style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
          {/* Left Pane: Data Entry */}
          {(!isMobileView || activeMobileTab === 'input') && (
            <div className="so-pane-left">
              <div className="so-card" style={{ marginBottom: '10px' }}>
                <h3 className="so-card-title" 
                    onClick={() => isMobileView && setIsBasicInfoCollapsed(!isBasicInfoCollapsed)}
                    style={{ cursor: isMobileView ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', width: '100%', userSelect: 'none', marginBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}><Info size={15}/> 기본 정보</span>
                  {isMobileView && (
                    <span style={{ fontSize: '0.75rem', color: themeColor, fontWeight: 800 }}>
                      {isBasicInfoCollapsed ? "▼ 상세설정 펼치기" : "▲ 접기"}
                    </span>
                  )}
                </h3>
                
                {(!isMobileView || !isBasicInfoCollapsed) && (
                  <div className="so-grid-2" style={{ marginBottom: '10px', animation: 'so-fade-in 0.2s' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem' }}>수주일자</label>
                      <input type="date" value={orderData.date} onChange={(e) => setOrderData({...orderData, date: e.target.value})} style={{ padding: '6px', fontSize: '0.8rem' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem' }}>담당자</label>
                      <select value={orderData.manager} onChange={(e) => setOrderData({...orderData, manager: e.target.value})} style={{ padding: '6px', fontSize: '0.8rem' }}>
                        <option value="알 수 없음">선택안함</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem' }}>출고 창고</label>
                      <select value={orderData.outWarehouse} onChange={(e) => setOrderData({...orderData, outWarehouse: e.target.value})} style={{ padding: '6px', fontSize: '0.8rem' }}>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.name}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem' }}>입고 창고</label>
                      <select value={orderData.inWarehouse} onChange={(e) => setOrderData({...orderData, inWarehouse: e.target.value})} style={{ padding: '6px', fontSize: '0.8rem' }}>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.name}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {/* 거래처명 (한 라인 레이아웃: 거래처명 라벨 오른쪽 입력창 정렬) */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  <label style={{ margin: 0, flexShrink: 0, width: '60px', fontSize: '0.8rem', fontWeight: 700 }}>거래처명</label>
                  <div style={{ flex: 1 }}>
                    <PartnerSearchInput 
                      partners={partners} 
                      value={orderData.partner} 
                      onChange={(val) => setOrderData({...orderData, partner: val})} 
                      onSelect={(partner) => {
                        setOrderData(prev => ({
                          ...prev,
                          partner: partner.name,
                          inWarehouse: staffWH
                        }));
                        setTimeout(() => {
                          if (itemInputRef.current) itemInputRef.current.focus();
                        }, 0);
                      }}
                      typeFilter="매출처"
                      autoFocus={true}
                    />
                  </div>
                </div>
              </div>

              {/* 품목 빠른 입력 창 (스크롤 방지 및 피팅) */}
              <div className="so-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px' }}>
                <h3 className="so-card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem' }}><Package size={15}/> 수주 품목 빠른 입력</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8' }}>예: 사과10 배5</span>
                </h3>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }} ref={searchRef}>
                  <textarea
                    ref={itemInputRef}
                    placeholder="품목 약칭과 수량을 입력하세요."
                    className="so-items-textarea"
                    value={orderData.itemsText}
                    onChange={(e) => {
                      setOrderData({ ...orderData, itemsText: e.target.value });
                      setIsItemSearchOpen(true);
                      updateCaretPosition(e.target);
                    }}
                    onFocus={(e) => {
                      if (!skipNextFocusOpen.current) {
                        setIsItemSearchOpen(true);
                      }
                      skipNextFocusOpen.current = false;
                      updateCaretPosition(e.target);
                    }}
                    onKeyUp={(e) => updateCaretPosition(e.target)}
                    onClick={(e) => updateCaretPosition(e.target)}
                    style={{
                      height: '140px',
                      minHeight: '120px',
                      maxHeight: '180px',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      resize: 'none'
                    }}
                    onKeyDown={(e) => {
                      updateCaretPosition(e.target);
                      if (isItemSearchOpen && filteredProducts.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                        } else if (e.key === 'Enter') {
                          if (selectedIndex >= 0) {
                            e.preventDefault();
                            handleProductSelect(filteredProducts[selectedIndex]);
                          }
                        } else if (e.key === 'Escape') {
                          setIsItemSearchOpen(false);
                        }
                      }
                    }}
                  />
                  {isItemSearchOpen && lastWord && (
                    <div className="so-autocomplete-dropdown" style={{ top: `${caretPos.top}px`, left: `${caretPos.left}px`, right: 'auto', width: '280px' }}>
                      {filteredProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          onMouseDown={() => handleProductSelect(p)}
                          className={`so-autocomplete-item ${idx === selectedIndex ? 'selected' : ''}`}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={16} color={themeColor} />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                          </div>
                          {p.abbreviation && <span className="so-abbr-badge">{p.abbreviation}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>비고 (메모)</label>
                  <input 
                    type="text" 
                    placeholder="특이사항이나 요청사항을 입력하세요" 
                    value={orderData.memo} 
                    onChange={(e) => setOrderData({...orderData, memo: e.target.value})} 
                    style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Pane: Live Preview & Totals */}
          {(!isMobileView || activeMobileTab === 'preview') && (
            <div className="so-pane-right">
              <div className="so-preview-header">
                <h3>실시간 수주 내역 ({parsedItems.length}건)</h3>
              </div>
              
              <div className="so-preview-table-container">
                {parsedItems.length === 0 ? (
                  <div className="so-empty-state">
                    <Package size={48} color="#cbd5e1" strokeWidth={1} />
                    <p>좌측에 약칭과 수량을 입력하시면<br/>여기에 내역이 실시간으로 표시됩니다.</p>
                  </div>
                ) : (
                  <table className="so-preview-table">
                    <thead>
                      <tr>
                        <th>품목명</th>
                        <th>규격</th>
                        <th style={{ textAlign: 'right' }}>수량</th>
                        <th style={{ textAlign: 'right' }}>단가</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.spec}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: themeColor }}>{item.qty.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.price.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="so-summary-section">
                <div className="so-summary-row">
                  <span>총 수주 수량</span>
                  <span className="so-summary-value">{parsedTotalQty.toLocaleString()} <small>개</small></span>
                </div>
                <div className="so-summary-row total">
                  <span>총 수주 금액</span>
                  <span className="so-summary-value highlight">{parsedTotalPrice.toLocaleString()} <small>원</small></span>
                </div>
              </div>

              <div className="so-action-buttons">
                <button className="so-btn-save" onClick={handleSave} style={{ backgroundColor: editingOrder ? '#f59e0b' : themeColor }}>
                  <Save size={18} /> {editingOrder ? '수주 수정 저장' : '수주서 저장'}
                </button>
                <button className="so-btn-transfer" onClick={handleTransferToInvoice}>
                  <FileText size={18} /> 전표로 전송
                </button>
              </div>
            </div>
          )}
        </div>

        {isMobileView && (
          <div className="so-mobile-footer">
            <div className="so-mobile-summary" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '4px' }}>
              <span>품목: <strong style={{ color: themeColor }}>{parsedItems.length}건</strong></span>
              <span>총량: <strong style={{ color: themeColor }}>{parsedTotalQty}개</strong></span>
              <span>합계: <strong style={{ color: themeColor, fontSize: '1rem' }}>{parsedTotalPrice.toLocaleString()}원</strong></span>
            </div>
            <div className="so-mobile-actions">
              <button className="so-btn-save" onClick={handleSave} style={{ backgroundColor: editingOrder ? '#f59e0b' : themeColor }}>
                <Save size={16} /> {editingOrder ? '수정 저장' : '저장'}
              </button>
              <button className="so-btn-transfer" onClick={handleTransferToInvoice}>
                <FileText size={16} /> 전표로 전송
              </button>
            </div>
          </div>
        )}
      </div>

      {toast.message && (
        <div className={`toast-notification ${toast.type}`} style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(30, 41, 59, 0.95)',
          color: 'white', padding: '20px 40px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontWeight: 700,
          fontSize: '1.2rem', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)',
          animation: 'toast-center-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {toast.type === 'success' ? <Check size={32} /> : toast.type === 'error' ? <AlertTriangle size={32} /> : <Info size={32} />}
          {toast.message}
        </div>
      )}

      <style>{`
        /* -------------------------------------
           NEW SalesOrder (간편주문) UI CSS 
           ------------------------------------- */
        @keyframes toast-center-in {
          from { transform: translate(-50%, -40%) scale(0.8); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        .so-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #f8fafc;
        }

        .so-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .so-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e293b;
        }

        .so-title svg {
          color: ${themeColor};
        }

        .so-date-badge {
          display: flex;
          align-items: center;
          margin-left: 8px;
          font-size: 0.85rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 100px;
          font-weight: 500;
        }

        .so-nav-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 1px solid #cbd5e1;
          padding-left: 12px;
          margin-left: 8px;
        }

        .so-nav-controls button {
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }
        
        .so-nav-controls button:disabled {
          color: #cbd5e1;
          cursor: not-allowed;
        }

        .so-header-actions {
          display: flex;
          gap: 8px;
        }

        .so-btn-outline {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .so-btn-outline:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
        }

        .so-body {
          display: flex;
          flex: 1;
          gap: 24px;
          padding: 24px;
          overflow: hidden;
        }

        .so-pane-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 400px;
        }

        .so-pane-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .so-card {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .so-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .so-card-title svg {
          color: ${themeColor};
        }

        .so-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .so-items-textarea {
          width: 100%;
          flex: 1;
          min-height: 150px;
          padding: 16px;
          font-size: 1.1rem;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background-color: #f8fafc;
          line-height: 1.6;
          resize: none;
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
          box-sizing: border-box;
          color: #0f172a !important;
        }

        .so-items-textarea:focus {
          border-color: ${themeColor};
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .so-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          z-index: 10;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 220px;
          overflow-y: auto;
        }

        .so-autocomplete-item {
          padding: 12px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.1s;
          color: #1e293b !important;
        }
        
        .so-autocomplete-item:last-child {
          border-bottom: none;
        }

        .so-autocomplete-item.selected {
          background-color: #f0f9ff;
        }

        .so-abbr-badge {
          font-size: 0.75rem;
          color: ${themeColor};
          background-color: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 600;
        }

        /* Right Pane Elements */
        .so-preview-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .so-preview-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 700;
        }

        .so-preview-table-container {
          flex: 1;
          overflow-y: auto;
          background-color: #ffffff;
        }

        .so-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 300px;
          color: #94a3b8;
          text-align: center;
          gap: 16px;
        }

        .so-preview-table {
          width: 100%;
          border-collapse: collapse;
        }

        .so-preview-table th {
          position: sticky;
          top: 0;
          background-color: #f1f5f9;
          padding: 12px 16px;
          font-size: 0.85rem;
          color: #475569;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .so-preview-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 0.95rem;
        }

        .so-summary-section {
          padding: 20px 24px;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .so-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #475569;
          font-weight: 600;
        }

        .so-summary-row.total {
          padding-top: 12px;
          border-top: 1px dashed #cbd5e1;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .so-summary-value {
          font-size: 1.1rem;
          color: #1e293b;
        }

        .so-summary-value.highlight {
          font-size: 1.5rem;
          color: ${themeColor};
          font-weight: 800;
        }

        .so-action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 20px 24px;
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        .so-btn-save {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, filter 0.2s;
        }

        .so-btn-save:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .so-btn-transfer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background-color: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, filter 0.2s;
        }

        .so-btn-transfer:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        /* Mobile Tabs & Layout */
        .so-mobile-tabs {
          display: flex;
          background-color: #ffffff;
          border-bottom: 1px solid #cbd5e1;
        }

        .so-mobile-tab-btn {
          flex: 1;
          padding: 12px 8px;
          border: none;
          background: none;
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          text-align: center;
          border-bottom: 3px solid transparent;
          transition: all 0.15s;
        }

        .so-mobile-tab-btn.active {
          color: ${themeColor};
          border-bottom-color: ${themeColor};
          background-color: color-mix(in srgb, ${themeColor} 12%, transparent);
        }

        /* Mobile Sticky Footer */
        .so-mobile-footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px 16px;
          background-color: #ffffff;
          border-top: 1px solid #cbd5e1;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
        }

        .so-mobile-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #334155;
        }

        .so-mobile-summary strong {
          color: ${themeColor};
        }

        .so-mobile-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .so-mobile-actions button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }

        @keyframes so-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive / Mobile overrides */
        @media (max-width: 768px) {
          .so-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          
          .so-title {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .so-header-actions {
            width: 100% !important;
            display: flex !important;
            justify-content: flex-end !important;
            gap: 8px !important;
          }

          .so-body {
            flex-direction: column;
            padding: 12px;
            overflow: hidden; /* Prevent body scroll, use pane scroll instead */
            flex: 1;
            gap: 0;
          }
          
          .so-pane-left {
            min-width: 100%;
            flex: 1;
            overflow-y: auto;
            padding-bottom: 8px;
          }

          .so-pane-right {
            min-width: 100%;
            flex: 1;
            overflow-y: auto;
            padding-bottom: 8px;
            box-shadow: none;
            border: none;
            border-radius: 0;
          }

          /* Hide desktop-only elements on mobile preview pane */
          .so-pane-right .so-summary-section,
          .so-pane-right .so-action-buttons {
            display: none !important;
          }

          .so-pane-right .so-preview-header {
            padding: 12px 8px;
          }

          .so-pane-right .so-preview-table-container {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          
          .so-grid-2 {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .so-items-textarea {
            min-height: 140px;
          }
        }
      `}</style>
    </WindowModal>
  );
};

export default SalesOrder;
