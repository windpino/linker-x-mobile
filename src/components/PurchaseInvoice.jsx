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

  return (
    <WindowModal title="매입전표" onClose={onClose} width="1100px">
      <style>{`
        .invoice-header { background-color: ${themeColor} !important; border-top: none !important; }
        .invoice-title svg { color: white !important; }
        .window-modal-title { border-bottom: 2px solid ${themeColor} !important; }
        .form-group input:focus, .form-group select:focus, .partner-input:focus { border-color: ${themeColor} !important; box-shadow: 0 0 0 3px ${themeColor}20 !important; }
      `}</style>
      <div className="invoice-header">
        <div className="invoice-title">
          <FileText size={28} />
          매입전표 등록
        </div>
        <div className="invoice-header-btns">
          <button className="header-btn" onClick={() => setInvoiceData({ ...invoiceData, items: [], paidAmount: 0 })}>
            <Plus size={16} /> 새전표
          </button>
          <button className="header-btn highlight" onClick={openPaymentModal}>
            <Wallet size={16} /> 출금
          </button>
          <button className="header-btn orange-btn" onClick={onOpenLedger}>
            <BookOpen size={16} /> 매입원장
          </button>
          <button className="header-btn dark-btn" onClick={() => window.print()}>
            <Printer size={16} /> 인쇄
          </button>
        </div>
      </div>

      <div className="purchase-invoice-body">
        <div className="purchase-invoice-left-content">
          <div className="purchase-invoice-main-fields">
            <div className="form-group">
              <label>전표 일자</label>
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
              />
            </div>
            <div className="form-group">
              <label>거래처명</label>
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
                  // Check if an invoice already exists for this partner and date
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
            <div className="form-group">
              <label>입고 창고</label>
              <select 
                value={invoiceData.warehouse} 
                onChange={(e) => {
                  const updatedInvoice = {...invoiceData, warehouse: e.target.value};
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                }}
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
            <div className="form-group">
              <label>담당자</label>
              <select 
                value={invoiceData.manager} 
                onChange={(e) => {
                  const updatedInvoice = {...invoiceData, manager: e.target.value};
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                }}
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="item-search-section">
            <div className="item-search-grid">
              <div className="form-group" style={{ position: 'relative' }} ref={productSearchRef}>
                <label>품목 검색 <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>초성 검색 가능</span></label>
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
                    style={{ paddingLeft: '28px', paddingRight: searchItem ? '28px' : '8px', width: '100%' }}
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
                          padding: '8px 12px', cursor: 'pointer', fontSize: '0.87rem',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: index === productSelectedIndex ? '#f0f9ff' : 'transparent'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                          {p.spec && <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>{p.spec}</span>}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: themeColor, fontWeight: 600 }}>
                          {(p.purchasePrice || 0).toLocaleString()}원
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>수량</label>
                <input 
                  ref={qtyInputRef}
                  type="text" 
                  value={qty ? qty.toLocaleString() : ''} 
                  style={{ textAlign: 'right', width: '100%' }} 
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
              <div className="form-group">
                <label>단가</label>
                <input 
                  type="text" 
                  value={price} 
                  style={{ textAlign: 'right', width: '100%' }} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPrice(val === '' ? 0 : Number(val));
                  }} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem();
                  }}
                />
              </div>
              <button className="btn-add-item" onClick={handleAddItem}>
                <Plus size={18} /> 추가
              </button>
            </div>
          </div>

          <div className="invoice-table-container" style={{ overflowX: 'auto' }}>
            <table className="invoice-table" style={{ tableLayout: 'fixed', minWidth: '700px' }}>
              <colgroup>
                <col style={{ width: colWidths.name + 'px' }} />
                <col style={{ width: colWidths.spec + 'px' }} />
                <col style={{ width: colWidths.qty + 'px' }} />
                <col style={{ width: colWidths.price + 'px' }} />
                <col style={{ width: colWidths.supplyValue + 'px' }} />
                <col style={{ width: colWidths.tax + 'px' }} />
                <col style={{ width: colWidths.total + 'px' }} />
                <col style={{ width: colWidths.del + 'px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ position: 'relative' }}>
                    품목명
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'name')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    규격
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'spec')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    수량
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'qty')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    단가
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'price')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    공급가
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'supplyValue')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    세액
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'tax')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ position: 'relative' }}>
                    합계
                    <div className="col-resize-handle" onMouseDown={(e) => onResizeMouseDown(e, 'total')}>
                      <div className="col-resize-bar"></div>
                    </div>
                  </th>
                  <th style={{ width: colWidths.del + 'px', position: 'relative' }}>
                    <button 
                      onClick={handleClearAllItems}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                      title="전체 품목 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map(item => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: colWidths.name + 'px' }}>{item.name}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: colWidths.spec + 'px' }}>{item.spec}</td>
                    <td>{item.qty}</td>
                    <td>{item.price.toLocaleString()}</td>
                    <td>{item.supplyValue.toLocaleString()}</td>
                    <td>{item.tax.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>{item.total.toLocaleString()}</td>
                    <td>
                      <button className="icon-btn" onClick={() => removeItem(item.id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                ))}
                {invoiceData.items.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '60px', color: '#94a3b8' }}>추가된 품목이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="total-footer-inline">
              <span className="label">총 합계 (VAT 포함)</span>
              <span className="amount">{totalAmount.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="purchase-invoice-summary-card">
          <div className="summary-title" style={{ color: themeColor }}>
            <BookOpen size={18} />
            결제 요약
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingBottom: '8px' }}></div>
          
          <div className="summary-row">
            <span className="label">총 합계</span>
            <span className="value" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {totalAmount.toLocaleString()}원
            </span>
          </div>
          
          <div className="summary-row">
            <span className="label">출금액</span>
            <span className="value" style={{ color: '#10b981', fontWeight: 700 }}>
              {invoiceData.paidAmount.toLocaleString()}원
            </span>
          </div>

          {invoiceData.paidAmount > 0 && (
            <div className="payment-breakdown" style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '10px', marginTop: '-4px', marginBottom: '8px', borderLeft: '2px solid #e2e8f0' }}>
              {invoiceData.payments?.cash > 0 && <div>현금: {invoiceData.payments.cash.toLocaleString()}원</div>}
              {invoiceData.payments?.account > 0 && <div>계좌: {invoiceData.payments.account.toLocaleString()}원</div>}
              {invoiceData.payments?.card > 0 && <div>카드: {invoiceData.payments.card.toLocaleString()}원</div>}
              {invoiceData.payments?.bill > 0 && <div>어음: {invoiceData.payments.bill.toLocaleString()}원</div>}
            </div>
          )}

          <div style={{ borderTop: '1px solid #f1f5f9', margin: '8px 0' }}></div>
          
          <div className="summary-row">
            <span className="label">전 미지급금</span>
            <span className="value" style={{ color: '#64748b', fontSize: '1rem' }}>
              {previousBalance.toLocaleString()}원
            </span>
          </div>
          
          <div className="summary-row">
            <span className="label">금회 미지급금</span>
            <span className="value" style={{ color: '#475569', fontSize: '1rem' }}>
              {outstandingBalance.toLocaleString()}원
            </span>
          </div>
          
          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
          
          <div className="summary-row">
            <span className="label" style={{ color: '#f97316', fontWeight: 700 }}>누적 미지급금</span>
            <span className="value" style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 800 }}>
              {finalBalance.toLocaleString()}원
            </span>
          </div>

          <button 
            className="btn-primary" 
            style={{ marginTop: 'auto', backgroundColor: themeColor, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700 }}
            onClick={() => onSave(invoiceData)}
          >
            {editingInvoice ? '전표 수정하기' : '전표 저장하기'}
          </button>
        </div>
      </div>

      {isPaymentModalOpen && tempPaymentState && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10001, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '400px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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
