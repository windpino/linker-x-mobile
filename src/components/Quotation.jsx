import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Save, 
  Package, 
  RefreshCw, 
  ShoppingCart, 
  Check, 
  AlertTriangle, 
  Info, 
  Trash2,
  Calendar,
  X
} from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';
import './Quotation.css';

// 한글 금액 변환 헬퍼 (견적서 인쇄용)
const numberToKorean = (number) => {
  if (!number || isNaN(number)) return '영원정';
  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const smallUnits = ['', '십', '백', '천'];
  const bigUnits = ['', '만', '억', '조'];
  const numStr = String(Math.floor(number));
  let result = '';
  const len = numStr.length;
  const chunkCount = Math.ceil(len / 4);
  
  for (let i = 0; i < chunkCount; i++) {
    const chunk = numStr.slice(Math.max(0, len - (i + 1) * 4), len - i * 4);
    let chunkStr = '';
    for (let j = 0; j < chunk.length; j++) {
      const digit = Number(chunk[j]);
      const unit = smallUnits[chunk.length - 1 - j];
      if (digit > 0) {
        chunkStr += (digit === 1 && unit ? '' : units[digit]) + unit;
      }
    }
    if (chunkStr) {
      result = chunkStr + bigUnits[i] + ' ' + result;
    }
  }
  return '일금 ' + (result.trim() || '영') + '원정';
};

const Quotation = ({
  onClose,
  partners = [],
  products = [],
  quotations = [],
  onSave,
  onConvertToOrder,
  onDelete,
  currentUser,
  staffList = [],
  initialPartner,
  warehouses = [],
  vehicles = [],
  selectedDate,
  editingQuotation,
  themeColor: propThemeColor,
  companySettings,
  specialPrices = [],
  setSpecialPrices
}) => {
  const isMobileView = true;
  const themeColor = propThemeColor || '#2563eb';

  const mainWH = warehouses.find(w => w.isMain)?.name || warehouses[0]?.name || '본사창고';
  const userWarehouse = currentUser?.warehouse && currentUser.warehouse !== '-' ? currentUser.warehouse : mainWH;

  const [activeMobileTab, setActiveMobileTab] = useState('input'); // 'input' or 'preview'
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [quotationData, setQuotationData] = useState(editingQuotation || {
    id: Date.now(),
    date: (() => {
      const d = selectedDate || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    validUntil: '견적일로부터 15일간',
    partner: initialPartner ? initialPartner.name : '',
    outWarehouse: userWarehouse,
    manager: currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'),
    itemsText: '',
    memo: ''
  });

  // Track custom modified unit prices
  const [itemPrices, setItemPrices] = useState({});

  useEffect(() => {
    if (editingQuotation && editingQuotation.items && editingQuotation.items.length > 0) {
      const prices = {};
      editingQuotation.items.forEach(it => {
        if (it.productId && it.price !== undefined) {
          prices[it.productId] = it.price;
        }
      });
      setItemPrices(prices);
    }
  }, [editingQuotation]);

  // Reset form when editingQuotation changes
  useEffect(() => {
    if (editingQuotation) {
      let text = editingQuotation.itemsText || '';
      if (!text && editingQuotation.items && editingQuotation.items.length > 0) {
        text = editingQuotation.items.map(it => `${it.abbreviation || it.name || ''}${it.qty || 1}`).join(' ');
      }
      setQuotationData({
        ...editingQuotation,
        itemsText: text
      });
    }
  }, [editingQuotation]);

  // Search & Autocomplete
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const itemInputRef = useRef(null);
  const skipNextFocusOpen = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [caretPos, setCaretPos] = useState({ top: 44, left: 16 });
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const updateCaretPosition = (el) => {
    if (!el) return;
    let clone = document.getElementById('quotation-textarea-clone');
    if (!clone) {
      clone = document.createElement('div');
      clone.id = 'quotation-textarea-clone';
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsItemSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lastWord = quotationData.itemsText.split(/[\s\n]+/).pop();
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
    const words = quotationData.itemsText.split(/([\s\n]+)/);
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
    setQuotationData({ ...quotationData, itemsText: newText });
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

  const getProductDefaultPrice = (prod) => {
    if (!prod) return 0;
    const partnerName = (quotationData?.partner || '').trim();
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

  // Parse itemsText into structured items
  const parsedItems = useMemo(() => {
    if (!quotationData.itemsText) return [];
    const tokens = quotationData.itemsText.trim().split(/\s+/);
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
            productId: product.id || null,
            name: product.name,
            spec: product.spec || '',
            qty: qty,
            price: price,
            taxType: product.taxType || '과세',
            supplyValue: itemSupplyValue,
            tax: itemTax,
            total: itemTotal,
            raw: token,
            category: product.category || '기타',
            outWarehouse: userWarehouse
          });
        }
      }
    });
    return items;
  }, [quotationData.itemsText, products, userWarehouse, itemPrices, specialPrices, quotationData.partner]);

  const parsedTotalQty = parsedItems.reduce((sum, item) => sum + item.qty, 0);
  const parsedTotalPrice = parsedItems.reduce((sum, item) => sum + item.total, 0);
  const parsedSupplyValue = parsedItems.reduce((sum, item) => sum + item.supplyValue, 0);
  const parsedTax = parsedItems.reduce((sum, item) => sum + item.tax, 0);

  // 1. 견적서 저장 핸들러
  const handleSave = () => {
    if (!quotationData.partner) {
      showToast('거래처가 입력되지 않았습니다.', 'error');
      return;
    }
    if (!quotationData.itemsText.trim() || parsedItems.length === 0) {
      showToast('견적 품목을 입력해주세요. (예: 사과10 배5)', 'error');
      return;
    }

    const payload = {
      ...quotationData,
      id: quotationData.id || Date.now(),
      totalPrice: parsedTotalPrice,
      totalAmount: parsedTotalPrice,
      totalQty: parsedTotalQty,
      supplyValue: parsedSupplyValue,
      tax: parsedTax,
      items: parsedItems
    };

    if (onSave) {
      onSave(payload);
    }
    showToast('견적서가 성공적으로 저장되었습니다.', 'success');
  };

  // 2. 수주등록 핸들러 (수주창으로 견적서 내역 바로 보내기)
  const handleConvertToOrder = () => {
    if (!quotationData.partner) {
      alert('거래처가 입력되지 않았습니다.');
      return;
    }
    if (parsedItems.length === 0) {
      alert('전송할 견적 품목이 없습니다. "품목명수량" 형식으로 입력해주세요.');
      return;
    }

    const orderPayload = {
      id: Date.now(),
      date: quotationData.date,
      partner: quotationData.partner,
      outWarehouse: quotationData.outWarehouse,
      manager: quotationData.manager,
      itemsText: quotationData.itemsText,
      items: parsedItems,
      totalPrice: parsedTotalPrice,
      totalAmount: parsedTotalPrice,
      totalQty: parsedTotalQty,
      memo: quotationData.memo ? `[견적연동] ${quotationData.memo}` : '[견적연동]',
      fromQuotationId: quotationData.id
    };

    if (onConvertToOrder) {
      onConvertToOrder(orderPayload);
    }
  };

  // New quotation reset
  const handleNewQuotation = () => {
    setQuotationData({
      id: Date.now(),
      date: (() => {
        const d = selectedDate || new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      validUntil: '견적일로부터 15일간',
      partner: '',
      outWarehouse: userWarehouse,
      manager: currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'),
      itemsText: '',
      memo: ''
    });
    setItemPrices({});
  };

  return (
    <WindowModal 
      title={editingQuotation ? "견적서 수정" : "견적서 등록"} 
      onClose={onClose} 
      width="100%" 
      contentPadding="0"
    >
      <div className="qo-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <div className="qo-header" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="qo-title" style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={18} color="#2563eb" />
            <span>{editingQuotation ? "견적서 수정" : "견적서"}</span>
            <span className="qo-date-badge" style={{ fontSize: '0.78rem', padding: '2px 8px' }}>
              <input 
                type="date"
                value={quotationData.date}
                onChange={(e) => setQuotationData(prev => ({ ...prev, date: e.target.value }))}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}
              />
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="qo-btn-outline" onClick={handleNewQuotation} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
              <RefreshCw size={12} /> 새견적
            </button>
            <button 
              className="qo-btn-outline" 
              onClick={() => {
                if (parsedItems.length === 0) {
                  showToast('인쇄할 견적 내역이 없습니다.', 'error');
                  return;
                }
                setIsPrintModalOpen(true);
              }}
              style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
            >
              <Printer size={12} /> 인쇄
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="qo-mobile-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <button 
            className={`qo-mobile-tab-btn ${activeMobileTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveMobileTab('input')}
            style={{ flex: 1, padding: '10px', border: 'none', background: activeMobileTab === 'input' ? '#eff6ff' : '#fff', color: activeMobileTab === 'input' ? '#2563eb' : '#64748b', fontWeight: 700, fontSize: '0.85rem' }}
          >
            견적 입력 (약칭/수량)
          </button>
          <button 
            className={`qo-mobile-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
            onClick={() => {
              setActiveMobileTab('preview');
              if (document.activeElement) document.activeElement.blur();
            }}
            style={{ flex: 1, padding: '10px', border: 'none', background: activeMobileTab === 'preview' ? '#eff6ff' : '#fff', color: activeMobileTab === 'preview' ? '#2563eb' : '#64748b', fontWeight: 700, fontSize: '0.85rem' }}
          >
            견적 내역 ({parsedItems.length}건)
          </button>
        </div>

        <div className="qo-body" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {activeMobileTab === 'input' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="qo-card" style={{ background: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>거래처명</label>
                  <PartnerSearchInput 
                    partners={partners} 
                    currentUser={currentUser}
                    value={quotationData.partner} 
                    onChange={(val) => setQuotationData({...quotationData, partner: val})} 
                    onSelect={(partner) => {
                      setQuotationData(prev => ({ ...prev, partner: partner.name }));
                    }}
                    typeFilter="매출처"
                    autoFocus={true}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>담당자</label>
                  <select 
                    value={quotationData.manager} 
                    onChange={(e) => setQuotationData({...quotationData, manager: e.target.value})}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="알 수 없음">선택안함</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>견적 유효기간</label>
                  <input 
                    type="text" 
                    value={quotationData.validUntil} 
                    onChange={(e) => setQuotationData({...quotationData, validUntil: e.target.value})}
                    placeholder="예: 견적일로부터 15일간"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="qo-card" style={{ background: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>견적 품목 빠른 입력</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>예: 사과10 배5</span>
                </div>
                <div style={{ position: 'relative' }} ref={searchRef}>
                  <textarea
                    ref={itemInputRef}
                    placeholder="품목 약칭과 수량을 입력하세요. (예: 신라면10)"
                    value={quotationData.itemsText}
                    onChange={(e) => {
                      setQuotationData({ ...quotationData, itemsText: e.target.value });
                      setIsItemSearchOpen(true);
                      updateCaretPosition(e.target);
                    }}
                    style={{ width: '100%', minHeight: '120px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                  {isItemSearchOpen && lastWord && (
                    <div style={{ position: 'absolute', top: `${caretPos.top}px`, left: '10px', right: '10px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '180px', overflowY: 'auto' }}>
                      {filteredProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          onMouseDown={() => handleProductSelect(p)}
                          style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: idx === selectedIndex ? '#eff6ff' : '#fff' }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</span>
                          {p.abbreviation && <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{p.abbreviation}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>비고 (메모)</label>
                  <input 
                    type="text" 
                    placeholder="특이사항 입력" 
                    value={quotationData.memo} 
                    onChange={(e) => setQuotationData({...quotationData, memo: e.target.value})} 
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Preview Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>품목명</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: '50px' }}>수량</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: '75px' }}>단가</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{item.qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input 
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setItemPrices(prev => ({ ...prev, [item.productId]: val }));
                            }}
                            style={{ width: '65px', textAlign: 'right', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {parsedItems.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>입력된 견적 품목이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                  <span>총 품목 / 수량</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{parsedItems.length}건 / {parsedTotalQty.toLocaleString()}개</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                  <span>공급가액 / 부가세</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{parsedSupplyValue.toLocaleString()}원 / {parsedTax.toLocaleString()}원</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px', fontSize: '1rem', fontWeight: 800 }}>
                  <span>총 견적금액</span>
                  <span style={{ color: '#2563eb' }}>{parsedTotalPrice.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: 견적서 저장 & 수주등록 */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Save size={16} /> {editingQuotation ? '수정 저장' : '견적서 저장'}
          </button>
          {editingQuotation && onDelete && (
            <button 
              type="button"
              onClick={() => {
                if (window.confirm('정말 이 견적서를 삭제하시겠습니까?')) {
                  onDelete(editingQuotation.id);
                  onClose();
                }
              }}
              style={{
                flex: 0.8,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                fontWeight: 800,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={16} /> 삭제
            </button>
          )}
          <button 
            onClick={handleConvertToOrder}
            style={{
              flex: 1.2,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ShoppingCart size={16} /> 수주등록
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.message && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : '#3b82f6',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.9rem',
          zIndex: 99999
        }}>
          {toast.message}
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <span style={{ fontWeight: 800 }}>견적서 인쇄</span>
              <button onClick={() => setIsPrintModalOpen(false)} style={{ border: 'none', background: 'transparent' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontSize: '12px' }}>
              <h2 style={{ textAlign: 'center', margin: '0 0 16px 0' }}>견 적 서</h2>
              <div style={{ marginBottom: '12px' }}>
                <div><strong>거래처:</strong> {quotationData.partner} 귀하</div>
                <div><strong>견적일자:</strong> {quotationData.date}</div>
                <div><strong>견적금액:</strong> {numberToKorean(parsedTotalPrice)} (₩{parsedTotalPrice.toLocaleString()})</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>품목명</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>수량</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>단가</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{it.name}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }}>{it.qty}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }}>{it.price.toLocaleString()}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }}>{it.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800, background: '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>합계</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }}>{parsedTotalQty}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}></td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'right' }}>{parsedTotalPrice.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => window.print()}
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
              >
                인쇄 실행
              </button>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </WindowModal>
  );
};

export default Quotation;
