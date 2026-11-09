import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ShoppingCart, Save, Package, RefreshCw, FileText, List, Check, AlertTriangle, Info, Trash2, ArrowLeft, ArrowRight, UserCheck, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound } from '../utils/koreanUtils';
import { getStaffWarehouse, isMainWarehouse } from '../utils/warehouseUtils';
import { addDays, DateNavButton } from '../utils/dateNavigationUtils';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const SalesOrder = ({ 
  onClose, 
  partners, 
  products, 
  onSave, 
  onTransferToInvoice, 
  onOpenOrderList, 
  onDeleteOrder, 
  salesOrders = [], 
  specialPrices = [], 
  setSpecialPrices, 
  currentUser, 
  staffList = [], 
  initialPartner, 
  warehouses = [], 
  selectedDate, 
  editingOrder, 
  themeColor: propThemeColor 
}) => {
  const mainWH = warehouses.find(w => w.isMain)?.name || 
                 warehouses.find(w => w.name.includes('메인'))?.name || 
                 warehouses.find(w => w.name.includes('main'))?.name || 
                 warehouses[0]?.name || 
                 '메인창고';
  const rawStaffWH = currentUser?.warehouse || (staffList.find(s => s.name === currentUser?.name)?.warehouse);
  const staffWH = isMainWarehouse(rawStaffWH, warehouses) ? mainWH : (rawStaffWH || mainWH);

  const defaultManager = currentUser?.name || (initialPartner && initialPartner.manager && initialPartner.manager !== '-' ? initialPartner.manager : (staffList.length > 0 ? staffList[0].name : '알 수 없음'));
  const defaultOutWH = getStaffWarehouse(defaultManager, staffList, warehouses, currentUser);

  const themeColor = propThemeColor || '#3b82f6';

  // Step 1: 'partner' (날짜, 담당자, 거래처 선택)
  // Step 2: 'order' (간편주문 입력, 비고, 전표전송, 저장)
  const [isOrderSettingsOpen, setIsOrderSettingsOpen] = useState(false);
  // Unified single-view mode: step is always 'order'
  const [step, setStep] = useState('order');

  const [partnerDayOrders, setPartnerDayOrders] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [itemPrices, setItemPrices] = useState({});

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [orderData, setOrderData] = useState(() => {
    if (editingOrder) return { ...editingOrder };
    const d = selectedDate || new Date();
    const initDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      id: Date.now(),
      date: initDate,
      partner: initialPartner ? initialPartner.name : '',
      outWarehouse: defaultOutWH,
      inWarehouse: staffWH,
      manager: defaultManager,
      itemsText: '',
      memo: ''
    };
  });

  const getProductDefaultPrice = (prod) => {
    if (!prod) return 0;
    const partnerName = (orderData?.partner || '').trim();
    if (!partnerName) return prod.salesPriceSingle || prod.salesPrice || 0;
    
    const matchedPartner = (partners || []).find(p => (p.name || '').trim() === partnerName);
    const partnerIdStr = matchedPartner ? String(matchedPartner.id) : '';

    const prodIdStr = prod.id !== undefined && prod.id !== null ? String(prod.id) : '';
    const prodNameTrimmed = (prod.name || '').trim();

    const specialPriceRecord = (specialPrices || []).find(sp => {
      const spPartnerName = (sp.partnerName || '').trim();
      const spPartnerId = sp.partnerId !== undefined && sp.partnerId !== null ? String(sp.partnerId) : '';
      const matchPartner = (spPartnerName && spPartnerName === partnerName) || (partnerIdStr && spPartnerId === partnerIdStr);
      if (!matchPartner) return false;

      const spProdId = sp.productId !== undefined && sp.productId !== null ? String(sp.productId) : '';
      const spProdName = (sp.productName || '').trim();
      return (prodIdStr && spProdId === prodIdStr) || (prodNameTrimmed && spProdName === prodNameTrimmed);
    });
    
    if (specialPriceRecord && specialPriceRecord.specialPrice !== undefined && specialPriceRecord.specialPrice !== null && !isNaN(Number(specialPriceRecord.specialPrice))) {
      return Number(specialPriceRecord.specialPrice);
    }
    return prod.salesPriceSingle || prod.salesPrice || 0;
  };

  useEffect(() => {
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

  const canIssuePastDateSlip = useMemo(() => {
    if (currentUser?.role === 'super_admin' || currentUser?.userId === 'admin') return true;
    const staff = (staffList || []).find(s => 
      (currentUser?.userId && s.userId === currentUser.userId) ||
      (currentUser?.id && String(s.id) === String(currentUser.id)) ||
      (currentUser?.name && s.name === currentUser.name)
    ) || currentUser;
    if (staff?.allowPastDateSlip !== undefined) return Boolean(staff.allowPastDateSlip);
    if (currentUser?.allowPastDateSlip !== undefined) return Boolean(currentUser.allowPastDateSlip);
    if (staff?.permissions?.['과거일자 전표발행'] !== undefined) return Boolean(staff.permissions['과거일자 전표발행']);
    if (currentUser?.permissions?.['과거일자 전표발행'] !== undefined) return Boolean(currentUser.permissions['과거일자 전표발행']);
    if (currentUser?.role === 'admin') return true;
    return false;
  }, [currentUser, staffList]);

  // Reset form when editingOrder or initialPartner changes
  useEffect(() => {
    if (editingOrder) {
      setOrderData({ ...editingOrder });
      setStep('order');
    } else if (initialPartner) {
      const nextMgr = initialPartner.manager && initialPartner.manager !== '-' ? initialPartner.manager : (currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'));
      const nextOutWH = getStaffWarehouse(nextMgr, staffList, warehouses, currentUser);
      const d = selectedDate || new Date();
      let initialDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!canIssuePastDateSlip && initialDate < todayStr) {
        initialDate = todayStr;
      }
      setOrderData({
        id: Date.now(),
        date: initialDate,
        partner: initialPartner.name,
        outWarehouse: nextOutWH,
        inWarehouse: staffWH,
        manager: nextMgr,
        itemsText: '',
        memo: ''
      });
      setStep('order');
    }
  }, [editingOrder, initialPartner, selectedDate]);

  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const itemInputRef = useRef(null);
  const partnerInputRef = useRef(null);
  const skipNextFocusOpen = useRef(false);
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
    propertiesToCopy.forEach(prop => { clone.style[prop] = style[prop]; });
    
    const textBefore = el.value.substring(0, el.selectionStart);
    clone.textContent = textBefore.endsWith('\n') ? textBefore + ' ' : textBefore;
    
    const marker = document.createElement('span');
    marker.textContent = '|';
    clone.appendChild(marker);
    
    const lineHeight = parseFloat(style.lineHeight) || 28;
    const topPos = marker.offsetTop + lineHeight + 2; 
    const leftPos = marker.offsetLeft;
    const maxLeft = el.offsetWidth - 280;
    
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsItemSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lastWord = orderData.itemsText.split(/[\s\n]+/).pop();
  const filteredProducts = lastWord ? products.filter(p => 
    matchesInitialSound(p.name, lastWord) || 
    (p.abbreviation && matchesInitialSound(p.abbreviation, lastWord))
  ) : [];

  useEffect(() => {
    if (isItemSearchOpen && filteredProducts.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [isItemSearchOpen, lastWord, filteredProducts.length]);

  const handleProductSelect = (product) => {
    const textToUse = product.abbreviation || product.name;
    const words = orderData.itemsText.split(/([\s\n]+)/);
    
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim()) {
        const currentWord = words[i];
        const qtyMatch = currentWord.match(/\d+$/);
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

  const parsedItems = useMemo(() => {
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
          const defaultPrice = getProductDefaultPrice(product);
          const price = itemPrices[product.id] !== undefined ? itemPrices[product.id] : defaultPrice;
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
  }, [orderData.itemsText, products, itemPrices, specialPrices, orderData.partner, partners]);

  const autoSaveSpecialPrice = async (targetPartner, targetProduct, newPrice, sourceName = '간편수주') => {
    if (!targetPartner || !targetProduct) return;
    const numPrice = Number(newPrice);
    if (isNaN(numPrice) || numPrice < 0) return;

    const partnerName = typeof targetPartner === 'string' ? targetPartner : (targetPartner.name || '');
    if (!partnerName) return;

    const partnerObj = typeof targetPartner === 'object' && targetPartner.id 
      ? targetPartner 
      : (partners || []).find(p => p.name === partnerName);
    const partnerId = partnerObj?.id || '';

    const prodObj = typeof targetProduct === 'object' && targetProduct.name 
      ? targetProduct 
      : (products || []).find(p => String(p.id) === String(targetProduct) || p.name === targetProduct);
    if (!prodObj) return;

    const companyId = currentUser?.companyId || 'default';
    
    const existingSP = (specialPrices || []).find(sp => {
      const spPartnerName = (sp.partnerName || '').trim();
      const spPartnerId = sp.partnerId !== undefined && sp.partnerId !== null ? String(sp.partnerId) : '';
      const matchPartner = (spPartnerName && spPartnerName === partnerName) || (partnerId && spPartnerId === String(partnerId));
      if (!matchPartner) return false;

      const spProdId = sp.productId !== undefined && sp.productId !== null ? String(sp.productId) : '';
      const spProdName = (sp.productName || '').trim();
      return (prodObj.id && spProdId === String(prodObj.id)) || (prodObj.name && spProdName === prodObj.name);
    });

    if (existingSP && Number(existingSP.specialPrice) === numPrice) {
      return;
    }

    const spId = existingSP ? String(existingSP._docId || existingSP.id) : String(Date.now());
    const newSpecialPriceData = {
      id: spId,
      partnerId: partnerId,
      partnerName: partnerName,
      productId: prodObj.id || '',
      productName: prodObj.name,
      specialPrice: numPrice,
      memo: `${sourceName}에서 자동 등록`,
      companyId,
      createdAt: existingSP?.createdAt || new Date().toISOString(),
      creator: existingSP?.creator || currentUser?.name || '시스템',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || '시스템',
      designatedDate: new Date().toISOString().split('T')[0],
      designatedBy: currentUser?.name || '시스템'
    };

    try {
      await setDoc(doc(db, 'companies', companyId, 'specialPrices', spId), newSpecialPriceData);
      if (typeof setSpecialPrices === 'function') {
        setSpecialPrices(prev => [
          ...(prev || []).filter(sp => String(sp._docId || sp.id) !== spId),
          newSpecialPriceData
        ]);
      }
      try {
        const prefix = currentUser?.isStaff ? `_staff_${currentUser.userId}` : '';
        const cached = JSON.parse(localStorage.getItem(`specialPrices${prefix}`)) || [];
        const updatedCache = [...cached.filter(sp => String(sp._docId || sp.id) !== spId), newSpecialPriceData];
        localStorage.setItem(`specialPrices${prefix}`, JSON.stringify(updatedCache));
        localStorage.setItem(`specialPrices_${companyId}`, JSON.stringify(updatedCache));
      } catch (cacheErr) {}
    } catch (err) {
      console.error(`Error saving special price from ${sourceName}:`, err);
    }
  };

  const parsedTotalQty = parsedItems.reduce((sum, item) => sum + item.qty, 0);
  const parsedTotalPrice = parsedItems.reduce((sum, item) => sum + item.total, 0);

  // 저장 핸들러
  const handleSave = () => {
    if (!orderData.partner) {
      showToast('거래처가 입력되지 않았습니다.', 'error');
      setStep('partner');
      return;
    }
    if (!orderData.itemsText.trim()) {
      showToast('수주 품목을 입력해주세요.', 'error');
      return;
    }
    if (!canIssuePastDateSlip && !editingOrder && orderData?.date && orderData.date < todayStr) {
      alert('과거일자 전표발행 권한이 없습니다. 당일 또는 미래일자만 발행할 수 있습니다.');
      return;
    }

    // 특별단가 자동 저장
    if (orderData.partner) {
      parsedItems.forEach(item => {
        const prod = products.find(p => p.id === item.productId || p.name === item.name);
        if (prod && item.price !== undefined && item.price !== null) {
          autoSaveSpecialPrice(orderData.partner, prod, item.price, '간편수주');
        }
      });
    }

    const finalDate = orderData.date || todayStr;
    const finalManager = orderData.manager && orderData.manager !== '알 수 없음' && orderData.manager !== '-'
      ? orderData.manager 
      : (currentUser?.name || '미지정');
    const finalCreator = currentUser?.name || '사용자';

    onSave({ 
      ...orderData, 
      id: orderData.id || Date.now(),
      date: finalDate,
      orderDate: finalDate,
      manager: finalManager,
      creator: finalCreator,
      items: parsedItems,
      itemsText: orderData.itemsText,
      totalPrice: parsedTotalPrice,
      totalAmount: parsedTotalPrice,
      totalQty: parsedTotalQty,
      status: orderData.status || '대기'
    });
    
    showToast('저장완료', 'success');

    // 저장이후에는 빠르게 다음 거래처를 지정할 수 있게 앞의 화면(거래처 입력창)으로 전환 & 초기화
    setOrderData(prev => ({
      ...prev,
      id: Date.now(),
      partner: '',
      itemsText: '',
      memo: ''
    }));
    setStep('partner');

    setTimeout(() => {
      const partnerInput = document.querySelector('.partner-input');
      if (partnerInput) partnerInput.focus();
    }, 120);
  };

  const handleTransferToInvoice = () => {
    if (!orderData.partner || !orderData.itemsText) {
      alert('전송할 수주 정보가 부족합니다.');
      return;
    }

    if (parsedItems.length === 0) {
      showToast('품목 정보를 인식할 수 없습니다. "품목명수량" 형식으로 입력해주세요.', 'error');
      return;
    }

    onTransferToInvoice({
      ...orderData,
      warehouse: orderData.outWarehouse,
      orderId: orderData.id,
      salesOrderId: orderData.id,
      items: parsedItems,
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      discount: 0
    });
  };

  return (
    <WindowModal 
      title={editingOrder ? "수주 수정" : "수주 등록"} 
      onClose={onClose} 
      width="100%" 
      contentPadding="0"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* 상단 거래처 검색 & 가리기/펼치기 & 보조 도구 바 (매출전표창과 일원화된 컴팩트 디자인) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0
        }}>
          {/* 거래처 검색 입력란 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <PartnerSearchInput 
              partners={partners} 
              currentUser={currentUser}
              value={orderData.partner} 
              placeholder="거래처명 또는 초성 입력 (예: 링, ㄹㅋ)"
              onChange={(val) => setOrderData(prev => ({ ...prev, partner: val }))} 
              onSelect={(partner) => {
                setOrderData(prev => ({
                  ...prev,
                  partner: partner.name,
                  inWarehouse: staffWH
                }));
                setTimeout(() => {
                  if (itemInputRef.current) itemInputRef.current.focus();
                }, 50);
              }}
              typeFilter="매출처"
              autoFocus={!orderData.partner}
              nameOnly={true}
              hideReceivables={true}
            />
          </div>

          {/* [ 가리기/펼치기 버튼 ] (거래처명 검색란 오른쪽에 작은 화살표로 날짜와 담당자 토글) */}
          <button
            type="button"
            onClick={() => setIsOrderSettingsOpen(prev => !prev)}
            style={{
              height: '36px',
              width: '36px',
              padding: 0,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: isOrderSettingsOpen ? '#3b82f6' : '#ffffff',
              color: isOrderSettingsOpen ? '#ffffff' : '#0f172a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              transition: 'all 0.15s'
            }}
            title={isOrderSettingsOpen ? "수주일자/담당자 접기" : `수주일자/담당자 펼치기 (${orderData.date})`}
          >
            {isOrderSettingsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* 새로고침 (지우기) */}
          <button
            type="button"
            onClick={() => {
              setOrderData(prev => ({
                ...prev,
                id: Date.now(),
                partner: '',
                itemsText: '',
                memo: ''
              }));
              if (itemInputRef.current) itemInputRef.current.focus();
            }}
            style={{
              height: '36px',
              padding: '0 8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#64748b',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              flexShrink: 0
            }}
            title="새 전표 작성"
          >
            <RefreshCw size={13} />
          </button>

          {/* 취소 / 닫기 */}
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#64748b',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              flexShrink: 0
            }}
            title="창 닫기"
          >
            <X size={14} />
          </button>
        </div>

        {/* Collapsible 수주일자 & 담당자 설정 (작은 화살표 클릭 시 펼쳐짐) */}
        {isOrderSettingsOpen && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            flexShrink: 0
          }}>
            {/* 수주일자 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', padding: '3px 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <DateNavButton
                direction="prev"
                disabled={!canIssuePastDateSlip && !editingOrder && orderData.date <= todayStr}
                onClick={() => {
                  const prevDate = addDays(orderData.date, -1);
                  if (!canIssuePastDateSlip && !editingOrder && prevDate < todayStr) {
                    alert('과거일자 전표발행 권한이 없습니다.');
                    return;
                  }
                  setOrderData(prev => ({ ...prev, date: prevDate }));
                }}
                size={13}
                style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#f1f5f9' }}
              />
              <input 
                type="date"
                value={orderData.date}
                min={!canIssuePastDateSlip && !editingOrder ? todayStr : undefined}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (!canIssuePastDateSlip && !editingOrder && newDate < todayStr) {
                    alert('과거일자 전표발행 권한이 없습니다.');
                    return;
                  }
                  if (newDate) {
                    setOrderData(prev => ({ ...prev, date: newDate }));
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <DateNavButton
                direction="next"
                onClick={() => setOrderData(prev => ({ ...prev, date: addDays(prev.date, 1) }))}
                size={13}
                style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#f1f5f9' }}
              />
            </div>

            {/* 담당자 설정 */}
            <div style={{ flex: 1, minWidth: '130px' }}>
              <select 
                value={orderData.manager} 
                onChange={(e) => {
                  const nextMgr = e.target.value;
                  const nextOutWH = getStaffWarehouse(nextMgr, staffList, warehouses, currentUser);
                  const mStaff = staffList.find(s => s.name === nextMgr);
                  const mWH = mStaff?.warehouse;
                  const nextInWH = isMainWarehouse(mWH, warehouses) ? mainWH : (mWH || nextOutWH);
                  setOrderData(prev => ({
                    ...prev,
                    manager: nextMgr,
                    outWarehouse: nextOutWH || prev.outWarehouse,
                    inWarehouse: nextInWH || prev.inWarehouse
                  }));
                }} 
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              >
                <option value="알 수 없음">담당자 선택안함</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.name}>{s.name} {s.jobTitle ? `(${s.jobTitle})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 메인 입력 영역: 간편주문 입력창 + 비고(메모)창 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* 간편주문 입력창 카드 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: '170px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }} ref={searchRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Package size={15} color={themeColor} /> 간편 주문 입력창
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                예: 사과10 배5
              </span>
            </div>

            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={itemInputRef}
                placeholder="품목 약칭과 수량을 연속으로 입력하세요.&#10;예시: 사과10 배5 귤20"
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
                onClick={(e) => {
                  setIsItemSearchOpen(true);
                  updateCaretPosition(e.target);
                }}
                onKeyDown={(e) => {
                  if (isItemSearchOpen && filteredProducts.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProductSelect(filteredProducts[selectedIndex]);
                    } else if (e.key === 'Escape') {
                      setIsItemSearchOpen(false);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '110px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.98rem',
                  lineHeight: '1.5',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />

              {/* 품목 실시간 검색 자동완성 팝업 */}
              {isItemSearchOpen && (
                <div style={{
                  position: 'absolute',
                  top: `${Math.min(caretPos.top + 24, 120)}px`,
                  left: `${Math.min(caretPos.left, 160)}px`,
                  width: '260px',
                  maxHeight: '180px',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  border: '1px solid #cbd5e1',
                  overflowY: 'auto',
                  zIndex: 9999
                }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '10px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                      검색 결과 없음
                    </div>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => handleProductSelect(p)}
                        style={{
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: idx === selectedIndex ? '#eff6ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb' }}>
                          {(getProductDefaultPrice(p) || 0).toLocaleString()}원
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 비고 (메모) 입력창 카드 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={14} color="#64748b" /> 비고 (배송 메모 / 특이사항)
            </span>
            <input
              type="text"
              placeholder="배송 메모나 전달사항을 입력하세요..."
              value={orderData.memo}
              onChange={(e) => setOrderData({ ...orderData, memo: e.target.value })}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

        </div>

        {/* 하단 고정 액션 버튼 바 */}
        <div style={{
          padding: '10px 14px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          flexShrink: 0,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {editingOrder && onDeleteOrder && (
              <button 
                type="button"
                onClick={() => {
                  if (window.confirm('정말 이 수주를 삭제하시겠습니까?')) {
                    onDeleteOrder(orderData.id);
                    onClose();
                  }
                }} 
                style={{
                  flex: '0 0 65px',
                  height: '44px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={15} /> 삭제
              </button>
            )}
            
            <button 
              type="button"
              onClick={handleTransferToInvoice}
              style={{
                flex: 1,
                height: '44px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
              }}
            >
              <FileText size={16} /> 전표전송
            </button>

            <button 
              type="button"
              onClick={handleSave}
              style={{
                flex: 1.2,
                height: '44px',
                backgroundColor: editingOrder ? '#f59e0b' : themeColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)'
              }}
            >
              <Save size={16} /> {editingOrder ? '수정 저장' : '💾 수주 저장'}
            </button>
          </div>
        </div>

      </div>

      {toast.message && (
        <div className={`toast-notification ${toast.type}`} style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(30, 41, 59, 0.95)',
          color: 'white', padding: '16px 28px', borderRadius: '12px', boxShadow: '0 15px 25px -5px rgba(0,0,0,0.2)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontWeight: 800,
          fontSize: '1rem', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center'
        }}>
          {toast.type === 'success' ? <Check size={28} /> : toast.type === 'error' ? <AlertTriangle size={28} /> : <Info size={28} />}
          {toast.message}
        </div>
      )}
</WindowModal>
  );
};

export default SalesOrder;
