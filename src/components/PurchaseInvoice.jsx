import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, Trash2, Printer, Wallet, BookOpen, X } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound, convertEnToKo } from '../utils/koreanUtils';
import './PurchaseInvoice.css';

const PurchaseInvoice = ({ onClose, products, partners, staffList, onSave, purchaseInvoices = [], editingInvoice = null, onOpenLedger, onDeleteInvoice, selectedDate, themeColor: propThemeColor, warehouses = [] }) => {
  const themeColor = propThemeColor || '#3b82f6';

  // ─── 컬럼 너비 (localStorage 복원) ───
  const COL_STORAGE_KEY = 'purchaseInvoice_colWidths';
  const DEFAULT_COL_WIDTHS = { name: 180, spec: 100, qty: 70, price: 100, supplyValue: 100, tax: 80, total: 100, del: 50 };
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(COL_STORAGE_KEY);
      return saved ? { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) } : { ...DEFAULT_COL_WIDTHS };
    } catch { return { ...DEFAULT_COL_WIDTHS }; }
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 40;

  const onResizeMouseDown = (e, colKey) => {
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
      setColWidths(prev => {
        const next = { ...prev };
        localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      resizingCol.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const [invoiceData, setInvoiceData] = useState(() => editingInvoice ? { ...editingInvoice } : {
    date: (() => {
      const d = selectedDate || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    partner: '',
    warehouse: warehouses.find(w => w.isMain)?.name || warehouses.find(w => w.name.includes('메인'))?.name || warehouses[0]?.name || '통영',
    manager: staffList[0]?.name || '',
    items: [],
    paidAmount: 0,
    payments: { cash: 0, account: 0, card: 0, bill: 0 }
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [tempPaymentState, setTempPaymentState] = useState(null);

  const openPaymentModal = () => {
    setTempPaymentState({
      payments: { ...invoiceData.payments }
    });
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (editingInvoice) {
      setInvoiceData({ ...editingInvoice });
    }
  }, [editingInvoice]);

  const [searchItem, setSearchItem] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSelectedIndex, setProductSelectedIndex] = useState(-1);
  
  const productSearchRef = useRef(null);
  const productInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const productListRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanSearch = searchItem.trim();
  const convertedSearch = convertEnToKo(cleanSearch);

  const productSuggestions = cleanSearch
    ? products.filter(p => {
        const matchesOriginal = matchesInitialSound(p.name, cleanSearch) ||
          (p.abbreviation && matchesInitialSound(p.abbreviation, cleanSearch));
          
        const matchesConverted = convertedSearch && (
          matchesInitialSound(p.name, convertedSearch) ||
          (p.abbreviation && matchesInitialSound(p.abbreviation, convertedSearch))
        );
        
        return matchesOriginal || matchesConverted;
      })
    : [];

  useEffect(() => {
    setProductSelectedIndex(productSuggestions.length > 0 ? 0 : -1);
  }, [searchItem, showProductSuggestions]);

  useEffect(() => {
    if (productSelectedIndex !== -1 && productListRef.current) {
      const activeItem = productListRef.current.children[productSelectedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [productSelectedIndex]);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSearchItem(prod.name);
    setPrice(prod.purchasePrice || 0);
    setShowProductSuggestions(false);
    
    // Focus quantity input and select all text
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  const handleClearProduct = () => {
    setSearchItem('');
    setSelectedProduct(null);
    setPrice(0);
    setShowProductSuggestions(false);
  };

  const handleAutoSave = async (updatedInv) => {
    const saved = await onSave(updatedInv, true);
    if (saved && saved.id) {
      setInvoiceData(saved);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;

    if (!qty || qty <= 0) {
      alert('수량을 1개 이상 입력해주세요.');
      return;
    }
    
    const isTaxFree = selectedProduct.taxType === '면세';
    const itemTotal = qty * price;
    const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
    const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

    const newItem = {
      id: Date.now(),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      spec: selectedProduct.spec,
      qty: qty,
      price: price,
      taxType: selectedProduct.taxType || '과세',
      supplyValue: itemSupplyValue,
      tax: itemTax,
      total: itemTotal
    };
    
    const updatedInvoice = {
      ...invoiceData,
      items: [...invoiceData.items, newItem]
    };
    
    setInvoiceData(updatedInvoice);
    handleAutoSave(updatedInvoice);
    
    // Reset item search
    setSearchItem('');
    setQty(1);
    setPrice(0);
    setSelectedProduct(null);
    
    // Focus back to product search for next item
    setTimeout(() => productInputRef.current?.focus(), 10);
  };

  const handleClearAllItems = () => {
    if (invoiceData.items.length === 0) return;
    if (!window.confirm('품목전체를 삭제하시겠습니까?')) return;
    
    // 기존 저장된 전표인 경우 삭제 처리
    if (editingInvoice || (purchaseInvoices.find(inv => inv.id === invoiceData.id))) {
      onDeleteInvoice(invoiceData.id);
    }
    
    setInvoiceData({ ...invoiceData, items: [], paidAmount: 0 });
  };

  const removeItem = (id) => {
    const updatedItems = invoiceData.items.filter(item => item.id !== id);
    if (updatedItems.length === 0) {
      if (editingInvoice || (purchaseInvoices.find(inv => inv.id === invoiceData.id))) {
        onDeleteInvoice(invoiceData.id);
      }
      setInvoiceData({ ...invoiceData, items: [], paidAmount: 0 });
    } else {
      const updatedInvoice = { ...invoiceData, items: updatedItems };
      setInvoiceData(updatedInvoice);
      handleAutoSave(updatedInvoice);
    }
  };

  const handlePaymentChange = (type, value, localState, setLocalState) => {
    const val = Number(value) || 0;
    const newPayments = { ...localState.payments, [type]: val };
    
    // If card, account, or bill is entered, adjust cash to cover the difference
    const others = (newPayments.account || 0) + (newPayments.card || 0) + (newPayments.bill || 0);
    const calculatedCash = Math.max(0, totalAmount - others);
    
    if (type !== 'cash') {
      newPayments.cash = calculatedCash;
    }

    setLocalState({ ...localState, payments: newPayments });
  };

  const currentPartner = partners.find(p => p.name === invoiceData.partner);

  const getPreviousBalance = () => {
    if (!invoiceData.partner || !currentPartner) return 0;
    const currentReceivables = Number(currentPartner.receivables) || 0;
    if (editingInvoice) {
      const oldTotal = editingInvoice.items.reduce((sum, item) => sum + item.total, 0);
      const oldOutstanding = oldTotal - (editingInvoice.paidAmount || 0);
      return currentReceivables - oldOutstanding;
    }
    return currentReceivables;
  };

  const previousBalance = getPreviousBalance();
  const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
  const finalBalance = previousBalance + totalAmount - invoiceData.paidAmount;
  const outstandingBalance = totalAmount - invoiceData.paidAmount;

  const InvoiceDateHeader = (
    <div 
      className="titlebar-date-picker" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '2px 8px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}
    >
      <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800 }}>전표일자:</span>
      <input 
        type="date" 
        value={invoiceData.date} 
        onChange={(e) => {
          const updatedInvoice = {...invoiceData, date: e.target.value};
          setInvoiceData(updatedInvoice);
          if (updatedInvoice.items.length > 0) {
            handleAutoSave(updatedInvoice);
          }
        }} 
        style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', outline: 'none' }}
      />
    </div>
  );

  return (
    <WindowModal 
      title="매입전표" 
      onClose={onClose} 
      width="100%" 
      contentPadding="0" 
      noScroll
      headerExtra={InvoiceDateHeader}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header & Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#db2777" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                {editingInvoice ? '매입전표 수정' : '매입전표 등록'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                품목 <strong style={{ color: '#db2777' }}>{invoiceData.items.length}</strong>개 등록됨
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setInvoiceData({ ...invoiceData, items: [], paidAmount: 0 })}
              style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 700 }}
            >
              <Plus size={12} /> 새전표
            </button>
            <button 
              onClick={openPaymentModal}
              style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 700 }}
            >
              <Wallet size={12} /> 출금
            </button>
            <button 
              onClick={onOpenLedger}
              style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 700 }}
            >
              <BookOpen size={12} /> 원장
            </button>
          </div>
        </div>

        {/* Basic Info (Partner, Warehouse, Manager) */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>거래처명</label>
            <PartnerSearchInput 
              partners={partners} 
              value={invoiceData.partner} 
              onChange={(val) => {
                const updatedInvoice = {...invoiceData, partner: val};
                setInvoiceData(updatedInvoice);
                if (updatedInvoice.items.length > 0) {
                  handleAutoSave(updatedInvoice);
                }
              }} 
              onSelect={(partner) => {
                const existing = (purchaseInvoices || []).find(inv => inv.partner === partner.name && inv.date === invoiceData.date);
                if (existing && !editingInvoice) {
                  if (confirm(`해당 거래처로 오늘(${invoiceData.date}) 발행된 매입전표가 이미 존재합니다.\n기존 전표 내용을 불러올까요?`)) {
                    setInvoiceData({ ...existing });
                    handleAutoSave(existing);
                  }
                }
                productInputRef.current?.focus();
              }}
              typeFilter="매입처"
              autoFocus={true}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>입고 창고</label>
              <select 
                value={invoiceData.warehouse} 
                onChange={(e) => {
                  const updatedInvoice = {...invoiceData, warehouse: e.target.value};
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                {warehouses.length > 0 ? (
                  warehouses.map(w => (
                    <option key={w.id || w.name} value={w.name}>{w.name}</option>
                  ))
                ) : (
                  <>
                    <option value="통영">통영</option>
                    <option value="거제">거제</option>
                    <option value="마산">마산</option>
                    <option value="본사">본사</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>담당자</label>
              <select 
                value={invoiceData.manager} 
                onChange={(e) => {
                  const updatedInvoice = {...invoiceData, manager: e.target.value};
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                }}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Product Add Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }} ref={productSearchRef}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              품목 검색 <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>초성 가능</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                ref={productInputRef}
                type="text" 
                lang="ko"
                autoComplete="off"
                placeholder="품목명 검색 (예: ㅋㄹ)" 
                value={searchItem}
                onChange={(e) => {
                  setSearchItem(e.target.value);
                  setSelectedProduct(null);
                  setShowProductSuggestions(true);
                }}
                onFocus={() => searchItem && setShowProductSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setProductSelectedIndex(prev => (prev < productSuggestions.length - 1 ? prev + 1 : prev));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setProductSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                  } else if (e.key === 'Enter') {
                    if (showProductSuggestions && productSelectedIndex >= 0 && productSelectedIndex < productSuggestions.length) {
                      e.preventDefault();
                      handleSelectProduct(productSuggestions[productSelectedIndex]);
                    } else if (productSuggestions.length === 1) {
                      handleSelectProduct(productSuggestions[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setShowProductSuggestions(false);
                  }
                }}
                style={{ paddingLeft: '28px', paddingRight: searchItem ? '28px' : '8px', width: '100%', height: '34px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              />
              {searchItem && (
                <button 
                  onClick={handleClearProduct}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {showProductSuggestions && productSuggestions.length > 0 && (
              <div 
                ref={productListRef}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto',
                  marginTop: '4px'
                }}
              >
                {productSuggestions.map((p, index) => (
                  <div
                    key={p.id}
                    onMouseDown={() => handleSelectProduct(p)}
                    onMouseEnter={() => setProductSelectedIndex(index)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: index === productSelectedIndex ? '#f0f9ff' : 'transparent'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</span>
                      {p.spec && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '4px' }}>({p.spec})</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#db2777', fontWeight: 700 }}>
                      {(p.purchasePrice || 0).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '6px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>수량</label>
              <input 
                ref={qtyInputRef}
                type="text" 
                value={qty ? qty.toLocaleString() : ''} 
                style={{ textAlign: 'right', width: '100%', height: '34px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, padding: '0 8px', boxSizing: 'border-box', outline: 'none' }} 
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setQty(val === '' ? 0 : Number(val));
                }} 
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>단가</label>
              <input 
                type="text" 
                value={price ? price.toLocaleString() : ''} 
                style={{ textAlign: 'right', width: '100%', height: '34px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, padding: '0 8px', boxSizing: 'border-box', outline: 'none' }} 
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setPrice(val === '' ? 0 : Number(val));
                }} 
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                }}
              />
            </div>

            <button 
              onClick={handleAddItem} 
              style={{ height: '34px', padding: '0 14px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Plus size={14} /> 추가
            </button>
          </div>
        </div>

        {/* Added Items List (Mobile Cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              전표 품목 목록 ({invoiceData.items.length}개)
            </span>
            {invoiceData.items.length > 0 && (
              <button 
                onClick={handleClearAllItems}
                style={{ padding: '2px 6px', fontSize: '0.7rem', color: '#ef4444', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
              >
                전체 비우기
              </button>
            )}
          </div>

          {invoiceData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              추가된 품목이 없습니다. 상단에서 품목을 검색하여 추가하세요.
            </div>
          ) : (
            invoiceData.items.map((item, idx) => (
              <div key={item.id || idx} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                      {item.name}
                      {item.spec && <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>({item.spec})</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {item.qty}개 × {item.price.toLocaleString()}원 = 공급가 {item.supplyValue.toLocaleString()}원 (VAT {item.tax.toLocaleString()}원)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#db2777' }}>
                      {item.total.toLocaleString()}원
                    </span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Balance Summary Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>총 합계 (VAT 포함)</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>
              {totalAmount.toLocaleString()}원
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>출금액</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
              {invoiceData.paidAmount.toLocaleString()}원
            </span>
          </div>

          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>전 미지급금</span>
              <span>{previousBalance.toLocaleString()}원</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>금회 미지급금</span>
              <span>{outstandingBalance.toLocaleString()}원</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>
              <span>누적 미지급금</span>
              <span>{finalBalance.toLocaleString()}원</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button 
              onClick={onClose} 
              style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              닫기
            </button>
            <button 
              onClick={() => onSave(invoiceData)}
              style={{ flex: 2, padding: '10px', backgroundColor: '#db2777', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(219, 39, 119, 0.3)' }}
            >
              {editingInvoice ? '전표 수정하기' : '전표 저장하기'}
            </button>
          </div>
        </div>

      </div>

      {isPaymentModalOpen && tempPaymentState && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10001, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', width: '90%', maxWidth: '340px',
            padding: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet color={themeColor} /> 출금 처리
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>미지급 잔액</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{totalAmount.toLocaleString()}원</div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { id: 'card', label: '카드 출금', color: '#ef4444' },
                { id: 'account', label: '계좌 이체', color: '#3b82f6' },
                { id: 'bill', label: '어음 지급', color: '#f59e0b' },
                { id: 'cash', label: '현금 지급 (차액 자동)', color: '#10b981' },
              ].map(item => (
                <div key={item.id} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: item.color }}>{item.label}</label>
                  <input
                    type="number"
                    value={tempPaymentState.payments[item.id] || ''}
                    onChange={(e) => handlePaymentChange(item.id, e.target.value, tempPaymentState, setTempPaymentState)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, backgroundColor: themeColor }}
                onClick={() => {
                  const totalPaid = Object.values(tempPaymentState.payments).reduce((a, b) => a + b, 0);
                  const updatedInvoice = { 
                    ...invoiceData, 
                    payments: tempPaymentState.payments, 
                    paidAmount: totalPaid 
                  };
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                  setIsPaymentModalOpen(false);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </WindowModal>
  );
};

export default PurchaseInvoice;
