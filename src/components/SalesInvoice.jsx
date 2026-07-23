import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Trash2, Printer, Save, Wallet, BookOpen, RefreshCw, X } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound, convertEnToKo } from '../utils/koreanUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const SalesInvoice = ({ onClose, products, partners, staffList, onSave, salesInvoices = [], editingInvoice = null, onOpenLedger, onDeleteInvoice, onPrintTaxInvoice, zIndex, selectedDate, currentUser, warehouses = [], specialPrices = [], inventory = [], warnNoStock = true, saveMode = 'auto', themeColor: propThemeColor }) => {
  const mainWH = warehouses.find(w => w.isMain)?.name || 
                 warehouses.find(w => w.name.includes('메인'))?.name || 
                 warehouses.find(w => w.name.includes('main'))?.name || 
                 warehouses[0]?.name || 
                 '메인창고';
  
  // Resolve user's assigned warehouse safely, fallback to mainWH
  const userWH = (() => {
    const rawWH = (currentUser?.warehouse && currentUser.warehouse !== '-')
      ? currentUser.warehouse
      : (staffList.find(s => s.name === currentUser?.name)?.warehouse);
    
    if (rawWH && warehouses.some(w => w.name === rawWH)) {
      return rawWH;
    }
    return mainWH;
  })();

  const staffWH = currentUser?.warehouse || (staffList.find(s => s.name === currentUser?.name)?.warehouse) || '통영';

  // Filter invoices to only show ones created by this user, or the one being edited
  const mySalesInvoices = (salesInvoices || []).filter(inv => 
    inv.creator === currentUser?.name || 
    (editingInvoice && inv.id === editingInvoice.id)
  );

  // Theme color state
  const themeColor = propThemeColor || '#3b82f6';

  // Track which invoice in the day's stack we are looking at
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [partnerDayInvoices, setPartnerDayInvoices] = useState([]);

  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''

  // ─── 컬럼 너비 (localStorage 복원) ───
  const COL_STORAGE_KEY = 'salesInvoice_colWidths';
  const DEFAULT_COL_WIDTHS = { name: 160, spec: 90, qty: 70, stock: 80, price: 110, supply: 110, tax: 90, total: 110, del: 44 };
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(COL_STORAGE_KEY);
      return saved ? { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) } : { ...DEFAULT_COL_WIDTHS };
    } catch { return { ...DEFAULT_COL_WIDTHS }; }
  });

  const resizingCol = useRef(null);   // 현재 드래그 중인 열 key
  const resizeStartX = useRef(0);     // 드래그 시작 X
  const resizeStartW = useRef(0);     // 드래그 시작 시 열 너비
  const tableRef = useRef(null);

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
  }, [colWidths]);

  const [invoiceData, setInvoiceData] = useState(() => editingInvoice ? { ...editingInvoice } : {
    id: Date.now(), // Give it an ID immediately for tracking
    date: (() => {
      const d = selectedDate || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    partner: '',
    warehouse: userWH,
    manager: currentUser?.name || staffList[0]?.name || '',
    items: [],
    receivedAmount: 0,
    payments: { cash: 0, account: 0, card: 0, bill: 0 },
    discount: 0,
    creator: currentUser?.name || '시스템'
  });

  const currentPartner = partners.find(p => p.name === invoiceData.partner);
  const hideAmount = currentPartner?.hideAmountInInvoice || false;

  // Auto-save logic removed as per user request

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [tempPaymentState, setTempPaymentState] = useState(null);

  const openPaymentModal = () => {
    // Calculate initial cash based on total amount minus other payments
    const others = (invoiceData.payments.account || 0) + (invoiceData.payments.card || 0) + (invoiceData.payments.bill || 0);
    const initialCash = Math.max(0, totalAmount - (invoiceData.discount || 0) - others);

    setTempPaymentState({
      payments: { ...invoiceData.payments, cash: initialCash },
      discount: invoiceData.discount || 0
    });
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (editingInvoice) {
      const isAlreadySaved = salesInvoices.some(si => String(si.id) === String(editingInvoice.id));
      let nextData = { ...editingInvoice };
      
      if (!isAlreadySaved) {
        nextData = {
          ...editingInvoice,
          manager: currentUser?.name || editingInvoice.manager || '',
          warehouse: userWH || editingInvoice.warehouse || '',
          creator: currentUser?.name || editingInvoice.creator || '시스템'
        };
        setInvoiceData(nextData);
      } else {
        setInvoiceData(nextData);
      }

      if (editingInvoice.autoSave && !isAlreadySaved) {
        // Trigger auto-save immediately to DB
        setTimeout(() => {
          const saveCopy = { ...nextData };
          delete saveCopy.autoSave;
          onSave(saveCopy);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingInvoice, currentUser, userWH]);

  useEffect(() => {
    if (invoiceData.id && mySalesInvoices.length > 0) {
      const stack = mySalesInvoices.filter(inv => inv.partner === invoiceData.partner && inv.date === invoiceData.date);
      setPartnerDayInvoices(stack);
      const idx = stack.findIndex(inv => inv.id === invoiceData.id);
      setCurrentIndex(idx);
    } else {
      setPartnerDayInvoices([]);
      setCurrentIndex(-1);
    }
  }, [salesInvoices, invoiceData.id, invoiceData.partner, invoiceData.date, editingInvoice]);

  // Calculate previous outstanding balance for the current partner
  const getPreviousBalance = () => {
    if (!invoiceData.partner || !currentPartner) return 0;
    const currentReceivables = Number(currentPartner.receivables) || 0;
    if (editingInvoice) {
      const oldTotal = editingInvoice.items.reduce((sum, item) => sum + item.total, 0);
      const oldOutstanding = oldTotal - (editingInvoice.receivedAmount || 0) - (editingInvoice.discount || 0);
      return currentReceivables - oldOutstanding;
    }
    return currentReceivables;
  };

  const previousBalance = getPreviousBalance();
  const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
  const finalBalance = previousBalance + totalAmount - invoiceData.receivedAmount - (invoiceData.discount || 0);
  const outstandingBalance = totalAmount - invoiceData.receivedAmount - (invoiceData.discount || 0);

  const handleClearAllItems = () => {
    if (!window.confirm('품목전체를 삭제하시겠습니까?')) return;
    
    // 기존에 저장된 전표인 경우 삭제 처리
    if (currentIndex >= 0 && partnerDayInvoices[currentIndex]) {
      onDeleteInvoice(partnerDayInvoices[currentIndex].id);
    }
    
    // 현재 화면의 품목 및 결제 정보 초기화
    setInvoiceData(prev => ({
      ...prev,
      items: [],
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      discount: 0,
      creator: currentUser?.name || '시스템'
    }));
    
    setCurrentIndex(-1);
  };

  // Sync partner stack when date or partner changes is handled by the effect above
  // (lines 49-57) to ensure currentIndex is also updated correctly.

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

  // ─── 재고 조회 헬퍼 함수 ───
  const getStockQty = (productId, warehouse) => {
    if (!productId || !warehouse) return null;
    
    // 1. 품목 리스트에서 해당 품목의 기초 재고 확인
    const product = products?.find(p => String(p.id) === String(productId));
    if (!product) return 0;
    const initialStock = Number(product.initialStock) || 0;
    
    // 2. inventory 객체에서 창고 및 품목 이름 기준으로 재고 변동량 확인
    let displayStock = 0;
    if (inventory && typeof inventory === 'object' && !Array.isArray(inventory)) {
      if (inventory[warehouse]) {
        displayStock = Number(inventory[warehouse][product.name]) || 0;
      }
    }
    
    // 3. 실제 현재고 = 기초재고 + 재고변동량 (매출, 매입, 이동, 조정 누적)
    return initialStock + displayStock;
  };

  const getStockBadge = (qty) => {
    if (qty === null) return { color: '#94a3b8', bg: '#f8fafc', label: null };
    if (qty < 0)      return { color: '#dc2626', bg: '#fff1f2', label: '⚠ 음수 재고' };
    if (qty === 0)    return { color: '#ef4444', bg: '#fef2f2', label: '⚠ 재고 없음' };
    if (qty <= 5)     return { color: '#f59e0b', bg: '#fffbeb', label: '⚠ 재고 부족' };
    return              { color: '#10b981', bg: '#f0fdf4', label: null };
  };

  const getProductDefaultPrice = (prod) => {
    if (!prod) return 0;
    if (!invoiceData.partner) return prod.salesPriceSingle || prod.salesPrice || 0;
    
    const specialPriceRecord = specialPrices.find(sp => 
      sp.partnerName === invoiceData.partner && 
      String(sp.productId) === String(prod.id)
    );
    
    if (specialPriceRecord) {
      return specialPriceRecord.specialPrice;
    }
    return prod.salesPriceSingle || prod.salesPrice || 0;
  };

  const hasSpecialPricePermission = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.userId === 'admin') {
      return true;
    }
    const staff = staffList.find(s => s.userId === currentUser.userId || s.name === currentUser.name);
    if (staff && staff.allowSpecialPriceSave) {
      return true;
    }
    if (currentUser.allowSpecialPriceSave) {
      return true;
    }
    return false;
  };

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSearchItem(prod.name);
    setPrice(getProductDefaultPrice(prod));
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
    if (!invoiceData.partner) {
      alert('거래처가 등록되지 않았습니다.');
      return;
    }
    if (!selectedProduct) return;

    if (!qty || qty <= 0) {
      alert('수량을 1개 이상 입력해주세요.');
      return;
    }

    // ─── 재고 확인 (warnNoStock 설정이 켜져 있을 때만) ───
    if (warnNoStock) {
      const currentWarehouse = invoiceData.warehouse;
      const stockQty = getStockQty(selectedProduct.id, currentWarehouse) || 0;

      if (qty > stockQty) {
        const confirmed = window.confirm('재고가 부족합니다. 그래도 추가할까요?');
        if (!confirmed) return;
      }
    }

    const isBox = selectedProduct.innerQty > 1 && qty === Number(selectedProduct.innerQty);
    const finalPrice = (isBox && selectedProduct.salesPriceBox > 0) ? (selectedProduct.salesPriceBox / qty) : price;
    
    const isTaxFree = selectedProduct.taxType === '면세';
    const itemTotal = Math.floor(qty * finalPrice);
    const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
    const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

    const newItem = {
      id: Date.now(),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      spec: selectedProduct.spec,
      qty: qty,
      innerQty: selectedProduct.innerQty,
      isBox: isBox,
      price: finalPrice,
      taxType: selectedProduct.taxType || '과세',
      supplyValue: itemSupplyValue,
      tax: itemTax,
      total: itemTotal
    };

    // 매출전표 단가 수정 시 특별단가 저장 로직
    const defaultPrice = getProductDefaultPrice(selectedProduct);
    if (finalPrice !== defaultPrice && hasSpecialPricePermission()) {
      if (window.confirm(`입력한 단가(${finalPrice.toLocaleString()}원)가 기존 단가(${defaultPrice.toLocaleString()}원)와 다릅니다. 이 단가를 해당 거래처의 특별단가로 지정하시겠습니까?`)) {
        const companyId = currentUser?.companyId || 'default';
        const partner = partners.find(p => p.name === invoiceData.partner);
        if (partner) {
          const existingSP = specialPrices.find(sp => 
            sp.partnerName === invoiceData.partner && 
            String(sp.productId) === String(selectedProduct.id)
          );
          const spId = existingSP ? String(existingSP.id) : String(Date.now());
          const newSpecialPriceData = {
            id: spId,
            partnerId: partner.id,
            partnerName: partner.name,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            specialPrice: Number(finalPrice),
            memo: '매출전표에서 자동 등록됨',
            companyId,
            updatedAt: new Date().toISOString()
          };
          setDoc(doc(db, 'companies', companyId, 'specialPrices', spId), newSpecialPriceData)
            .then(() => {
              console.log('Special price auto-saved successfully.');
            })
            .catch(err => {
              console.error('Error auto-saving special price:', err);
            });
        }
      }
    }
    
    const updatedInvoice = { ...invoiceData, items: [...invoiceData.items, newItem] };
    setInvoiceData(updatedInvoice);
    handleAutoSave(updatedInvoice);
    
    // 첫 품목 추가 시 인덱스 설정
    if (currentIndex === -1) setCurrentIndex(0);
    
    setSearchItem(''); setQty(1); setPrice(0); setSelectedProduct(null);
    // Focus back to product search for next item
    setTimeout(() => productInputRef.current?.focus(), 10);
  };

  const handleUpdateItemPrice = (itemId, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    const newPrice = cleanVal === '' ? 0 : Number(cleanVal);
    
    const updatedItems = invoiceData.items.map(item => {
      if (item.id === itemId) {
        const product = products.find(p => String(p.id) === String(item.productId));
        const isTaxFree = item.taxType === '면세' || product?.taxType === '면세';
        const total = Math.floor(item.qty * newPrice);
        const supplyValue = isTaxFree ? total : Math.floor(total / 1.1);
        const tax = isTaxFree ? 0 : total - supplyValue;
        return {
          ...item,
          price: newPrice,
          supplyValue,
          tax,
          total
        };
      }
      return item;
    });
    
    const updatedInvoice = { ...invoiceData, items: updatedItems };
    setInvoiceData(updatedInvoice);
    handleAutoSave(updatedInvoice);
  };

  const handleItemPriceBlur = (item) => {
    const product = products.find(p => String(p.id) === String(item.productId));
    if (!product) return;
    
    const defaultPrice = getProductDefaultPrice(product);
    if (item.price !== defaultPrice && hasSpecialPricePermission()) {
      if (window.confirm(`입력한 단가(${item.price.toLocaleString()}원)가 기존 단가(${defaultPrice.toLocaleString()}원)와 다릅니다. 이 단가를 해당 거래처의 특별단가로 지정하시겠습니까?`)) {
        const companyId = currentUser?.companyId || 'default';
        const partner = partners.find(p => p.name === invoiceData.partner);
        if (partner) {
          const existingSP = specialPrices.find(sp => 
            sp.partnerName === invoiceData.partner && 
            String(sp.productId) === String(product.id)
          );
          const spId = existingSP ? String(existingSP.id) : String(Date.now());
          const newSpecialPriceData = {
            id: spId,
            partnerId: partner.id,
            partnerName: partner.name,
            productId: product.id,
            productName: product.name,
            specialPrice: Number(item.price),
            memo: '매출전표에서 자동 등록됨',
            companyId,
            updatedAt: new Date().toISOString()
          };
          setDoc(doc(db, 'companies', companyId, 'specialPrices', spId), newSpecialPriceData)
            .then(() => {
              console.log('Special price saved successfully on blur.');
            })
            .catch(err => {
              console.error('Error auto-saving special price on blur:', err);
            });
        }
      }
    }
  };

  // Note: Auto-syncing of payments removed as per user request to only process on 'Confirm'

  const handlePaymentChange = (type, value, localState, setLocalState) => {
    const cleanStr = String(value).replace(/[^0-9]/g, '');
    const val = cleanStr === '' ? 0 : Number(cleanStr);
    
    if (type === 'discount') {
      const others = (localState.payments.account || 0) + (localState.payments.card || 0) + (localState.payments.bill || 0);
      const newCash = Math.max(0, totalAmount - val - others);
      setLocalState({ 
        ...localState, 
        discount: val, 
        payments: { ...localState.payments, cash: newCash } 
      });
      return;
    }

    const newPayments = { ...localState.payments, [type]: val };
    const others = (newPayments.account || 0) + (newPayments.card || 0) + (newPayments.bill || 0);
    const calculatedCash = Math.max(0, totalAmount - (localState.discount || 0) - others);
    // Always adjust cash unless we are specifically editing the cash field
    // Even if editing cash, we might want to let the user override, 
    // but the user's request says "차감한 상태로 자동으로 보여죠"
    if (type !== 'cash') {
      newPayments.cash = calculatedCash;
    }

    setLocalState({ ...localState, payments: newPayments });
  };

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
    <>
      <WindowModal title="매출등록" onClose={onClose} width="100%" zIndex={zIndex} contentPadding="0">
        <div style={{
          backgroundColor: '#18092b',
          backgroundImage: 'radial-gradient(circle at center, #240c42 0%, #06020c 100%)',
          color: '#ffffff',
          fontFamily: '"Pretendard Variable", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '85vh',
          overflow: 'hidden'
        }}>
          {/* 천년경영S 스타일 회색 상단 띠 */}
          <div style={{
            backgroundColor: '#a8a8a8',
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>천년경영S - 매출등록</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({currentUser?.name || '담당자'})</span>
          </div>

          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 첫 번째 행: [메뉴] | 날짜선택 | 담당자/창고 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button style={{
                backgroundColor: '#cbd5e1',
                color: '#0f172a',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid #94a3b8'
              }} onClick={() => {
                if (invoiceData.partner) {
                  setInvoiceData({ 
                    ...invoiceData, 
                    id: Date.now(), 
                    items: [], 
                    receivedAmount: 0, 
                    payments: { cash: 0, account: 0, card: 0, bill: 0 }, 
                    discount: 0, 
                    creator: currentUser?.name || '시스템',
                    manager: currentUser?.name || staffList[0]?.name || '',
                    warehouse: userWH
                  });
                  setCurrentIndex(partnerDayInvoices.length);
                }
              }}>
                메뉴
              </button>

              <input 
                type="date"
                value={invoiceData.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (newDate) {
                    const updated = { ...invoiceData, date: newDate };
                    setInvoiceData(updated);
                  }
                }}
                style={{
                  backgroundColor: '#3b0d5c',
                  border: '1px solid #6b21a8',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 6px',
                  width: '105px',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />

              <select 
                value={invoiceData.warehouse}
                onChange={(e) => setInvoiceData({...invoiceData, warehouse: e.target.value})}
                style={{
                  flex: 1,
                  backgroundColor: '#3b0d5c',
                  border: '1px solid #6b21a8',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px',
                  outline: 'none'
                }}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.name} style={{ backgroundColor: '#18092b', color: '#fff' }}>
                    [{w.id || '3'}] {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 두 번째 행: 거래처 검색 & 총미수 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PartnerSearchInput 
                  partners={partners} 
                  value={invoiceData.partner} 
                  onChange={(val) => setInvoiceData({...invoiceData, partner: val})} 
                  onSelect={(partner) => {
                    const stack = mySalesInvoices.filter(inv => inv.partner === partner.name && inv.date === invoiceData.date);
                    if (stack.length > 0) {
                      const latestInvoice = [...stack].sort((a, b) => b.id - a.id)[0];
                      setInvoiceData({ ...latestInvoice });
                      setCurrentIndex(stack.findIndex(inv => inv.id === latestInvoice.id));
                    } else {
                      setInvoiceData(prev => ({ 
                        ...prev, 
                        id: Date.now(), 
                        partner: partner.name, 
                        manager: currentUser?.name || prev.manager,
                        warehouse: userWH,
                        items: [], 
                        receivedAmount: 0,
                        creator: currentUser?.name || '시스템'
                      }));
                      setCurrentIndex(0);
                    }
                    productInputRef.current?.focus();
                  }}
                  typeFilter="매출처"
                  placeholder="거래처 입력"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    width: '100%',
                    height: '28px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <button style={{
                backgroundColor: '#a8a8a8',
                border: '1px solid #787878',
                borderRadius: '4px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px'
              }}>
                <Search size={14} color="#000000" />
              </button>

              <div style={{ flexShrink: 0, textAlign: 'right', paddingLeft: '4px' }}>
                <div style={{ fontSize: '0.62rem', color: '#ffb74d', fontWeight: 600 }}>총미수:</div>
                <div style={{ fontSize: '0.78rem', color: '#ff9800', fontWeight: 800 }}>
                  {(finalBalance || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 세 번째 행: [상품명 ▼] | 상품 입력 | 🔍 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select style={{
                backgroundColor: '#e2e8f0',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                height: '28px',
                outline: 'none'
              }}>
                <option>상품명</option>
              </select>

              <div style={{ flex: 1, position: 'relative' }} ref={productSearchRef}>
                <input 
                  ref={productInputRef}
                  type="text"
                  placeholder="상품 입력"
                  value={searchItem}
                  onChange={(e) => {
                    setSearchItem(e.target.value);
                    setSelectedProduct(null);
                    setShowProductSuggestions(true);
                  }}
                  onFocus={() => searchItem && setShowProductSuggestions(true)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '2px solid #ea580c', // 주황색 오리지널 보더
                    borderRadius: '4px',
                    padding: '4px 6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    width: '100%',
                    height: '28px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                
                {showProductSuggestions && productSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto',
                    marginTop: '2px'
                  }}>
                    {productSuggestions.map((p, index) => (
                      <div
                        key={p.id}
                        onMouseDown={() => {
                          // Select product and automatically add 1 quantity
                          handleSelectProduct(p);
                          setSelectedProduct(p);
                          setPrice(p.salesPrice || 0);
                          setQty(1);
                          // Auto add trigger
                          setTimeout(() => {
                            const itemPrice = p.salesPrice || 0;
                            const newTotal = itemPrice;
                            const taxVal = Math.round(newTotal / 11);
                            const supplyVal = newTotal - taxVal;
                            const newItem = {
                              id: Date.now() + Math.random(),
                              productId: p.id,
                              name: p.name,
                              spec: p.spec || '',
                              qty: 1,
                              price: itemPrice,
                              supplyValue: supplyVal,
                              tax: taxVal,
                              total: newTotal
                            };
                            setInvoiceData(prev => ({ ...prev, items: [...prev.items, newItem] }));
                            setSearchItem('');
                            setShowProductSuggestions(false);
                          }, 50);
                        }}
                        style={{
                          padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem',
                          color: '#000000', borderBottom: '1px solid #f1f5f9',
                          display: 'flex', justifyContent: 'space-between',
                          backgroundColor: index === productSelectedIndex ? '#f0f9ff' : 'transparent'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{ color: '#ea580c', fontWeight: 700 }}>{(p.salesPrice || 0).toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button style={{
                backgroundColor: '#a8a8a8',
                border: '1px solid #787878',
                borderRadius: '4px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px'
              }}>
                <Search size={14} color="#000000" />
              </button>
            </div>
          </div>

          {/* 상품 테이블 리스트 헤더 */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f051c',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 8px',
            fontSize: '0.7rem',
            color: '#a78bfa',
            fontWeight: 800
          }}>
            <span style={{ width: '32px' }}>순번</span>
            <span style={{ flex: 1 }}>상품명</span>
            <span style={{ width: '60px', textAlign: 'right' }}>단가</span>
            <span style={{ width: '45px', textAlign: 'right' }}>수량</span>
            <span style={{ width: '70px', textAlign: 'right' }}>금액</span>
          </div>

          {/* 품목 스크롤 영역 (2줄 레이아웃 정밀 재현) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: '200px',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}>
            {invoiceData.items.map((item, idx) => (
              <div key={item.id} style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '6px 8px',
                fontSize: '0.78rem'
              }}>
                {/* 1행: 순번 상품명 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '32px', color: '#ffb74d', fontWeight: 800 }}>{idx + 1}</span>
                  <span style={{ flex: 1, color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </span>
                  <button 
                    onClick={() => {
                      const updated = invoiceData.items.filter(i => i.id !== item.id);
                      setInvoiceData({ ...invoiceData, items: updated });
                    }}
                    style={{ background: 'none', border: 'none', padding: '0 4px', color: '#ef4444', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
                {/* 2행: 단가 수량 금액 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '2px', color: '#cbd5e1', fontSize: '0.72rem', marginTop: '2px' }}>
                  <span style={{ width: '60px', textAlign: 'right' }}>{item.price.toLocaleString()}</span>
                  <span style={{ width: '45px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>{item.qty.toFixed(1)}</span>
                  <span style={{ width: '70px', textAlign: 'right', fontWeight: 800, color: '#ffffff' }}>{item.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {invoiceData.items.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                등록된 매출 품목이 없습니다.
              </div>
            )}
          </div>

          {/* 하단 요약 초록색 합계 바 */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderTop: '2px solid #047857',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#10b981',
            fontWeight: 800
          }}>
            <span>[합계]</span>
            <div style={{ display: 'flex', gap: '15px' }}>
              <span>총수량: {invoiceData.items.reduce((sum, item) => sum + item.qty, 0).toFixed(1)}</span>
              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 최하단 3단 액션 버튼 그룹 */}
          <div style={{
            backgroundColor: '#d8d8d8',
            padding: '6px 8px',
            display: 'flex',
            gap: '6px',
            borderTop: '1.5px solid #a8a8a8'
          }}>
            <button 
              onClick={() => {
                setInvoiceData({ 
                  ...invoiceData, 
                  id: Date.now(), 
                  partner: '', 
                  items: [], 
                  receivedAmount: 0, 
                  payments: { cash: 0, account: 0, card: 0, bill: 0 }, 
                  discount: 0, 
                  creator: currentUser?.name || '시스템',
                  manager: currentUser?.name || staffList[0]?.name || '',
                  warehouse: userWH
                });
                setCurrentIndex(-1);
              }}
              style={{
                flex: 1,
                backgroundColor: '#e6e6e6',
                border: '2px solid #b3b3b3',
                borderBottom: '3px solid #9c9c9c',
                borderRadius: '4px',
                color: '#1e293b',
                padding: '6px 4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer'
              }}
            >
              📄 새전표
            </button>

            <button 
              onClick={openPaymentModal}
              style={{
                flex: 1,
                backgroundColor: '#e6e6e6',
                border: '2px solid #b3b3b3',
                borderBottom: '3px solid #9c9c9c',
                borderRadius: '4px',
                color: '#1e293b',
                padding: '6px 4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer'
              }}
            >
              💵 입금
            </button>

            <button 
              onClick={() => {
                if (invoiceData.items.length === 0) {
                  alert('저장할 전표 품목이 없습니다.');
                  return;
                }
                onSave(invoiceData, false);
              }}
              style={{
                flex: 1,
                backgroundColor: '#e6e6e6',
                border: '2px solid #b3b3b3',
                borderBottom: '3px solid #9c9c9c',
                borderRadius: '4px',
                color: '#1e293b',
                padding: '6px 4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer'
              }}
            >
              🖨️ 영수증
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
                  <Wallet color="#10b981" /> 입금 처리
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>미결제 잔액</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{totalAmount.toLocaleString()}원</div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ef4444', fontWeight: 700 }}>현장 할인 (D.C)</label>
                  <input
                    type="text"
                    value={tempPaymentState.discount ? tempPaymentState.discount.toLocaleString() : ''}
                    onChange={(e) => handlePaymentChange('discount', e.target.value, tempPaymentState, setTempPaymentState)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', backgroundColor: '#fff5f5', textAlign: 'right' }}
                  />
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>
                {[
                  { id: 'card', label: '카드 입금', color: '#ef4444' },
                  { id: 'account', label: '계좌 이체', color: themeColor },
                  { id: 'bill', label: '어음 입금', color: '#f59e0b' },
                  { id: 'cash', label: '현금 입금 (차액 자동)', color: '#10b981' },
                ].map(item => (
                  <div key={item.id} className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: item.color }}>{item.label}</label>
                    <input
                      type="text"
                      value={tempPaymentState.payments[item.id] ? tempPaymentState.payments[item.id].toLocaleString() : ''}
                      onChange={(e) => handlePaymentChange(item.id, e.target.value, tempPaymentState, setTempPaymentState)}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      style={{ fontSize: '1rem', fontWeight: 600, textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, backgroundColor: '#10b981' }}
                  onClick={() => {
                    const totalReceived = Object.values(tempPaymentState.payments).reduce((a, b) => a + b, 0);
                    const updatedInvoice = { 
                      ...invoiceData, 
                      payments: tempPaymentState.payments, 
                      discount: tempPaymentState.discount,
                      receivedAmount: totalReceived 
                    };
                    setInvoiceData(updatedInvoice);
                    if (updatedInvoice.items.length > 0) {
                      handleAutoSave(updatedInvoice); // 입금 정보 실시간 저장
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
      
      {/* Hidden Print Layout */}
      <div className="print-only-container">
        <div className="print-statement">
          <div className="print-header">
            <h1>거래명세표 (전표)</h1>
            <div className="print-header-meta">
              <div className="date">{invoiceData.date}</div>
              <div className="partner-name">{invoiceData.partner} <span className="honorific">귀하</span></div>
              {!hideAmount && (
                <div className="top-total-amount">
                  <span className="label">합계금액</span>
                  <span className="value">{totalAmount.toLocaleString()}원</span>
                </div>
              )}
            </div>
          </div>

          <table className="print-item-table">
            <thead>
              <tr>
                <th>품목</th>
                <th>수량</th>
                {!hideAmount && <th>단가</th>}
                {!hideAmount && <th>금액</th>}
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map(item => (
                <tr key={item.id}>
                  <td className="item-name">{item.name}</td>
                  <td>{item.isBox ? ('1박스 (' + item.qty + ')') : item.qty}</td>
                  {!hideAmount && <td>{item.price.toLocaleString()}</td>}
                  {!hideAmount && <td className="item-total">{item.total.toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
            {!hideAmount && (
              <tfoot>
                <tr>
                  <td colSpan="3" className="footer-label">총 합계</td>
                  <td className="footer-value">{totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {!hideAmount && (
            <div className="print-payment-section">
              <h3>결제 내역 (입금)</h3>
              <div className="payment-grid">
                <div className="payment-box">
                  <span className="label">카드</span>
                  <span className="value">{(invoiceData.payments?.card || 0).toLocaleString()}</span>
                </div>
                <div className="payment-box">
                  <span className="label">계좌이체</span>
                  <span className="value">{(invoiceData.payments?.account || 0).toLocaleString()}</span>
                </div>
                <div className="payment-box">
                  <span className="label">현금</span>
                  <span className="value">{(invoiceData.payments?.cash || 0).toLocaleString()}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div className="payment-box">
                    <span className="label">현장할인</span>
                    <span className="value">{invoiceData.discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="balance-summary">
                <div className="balance-row">
                  <span className="label">전 미수금</span>
                  <span className="value">{previousBalance.toLocaleString()}원</span>
                </div>
                <div className="balance-row highlight">
                  <span className="label">누적 미수금</span>
                  <span className="value">{finalBalance.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="print-footer">
            <p>감사합니다. 상기 금액을 정히 영수함.</p>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      </div>
    </>
  );
};

const PRINT_STYLES = [
  "@media screen {",
  "  .print-only-container { display: none; }",
  "}",
  "@media print {",
  "  body * { ",
  "    display: none !important; ",
  "  }",
  "  .print-only-container, ",
  "  .print-only-container * { ",
  "    display: block !important; ",
  "    visibility: visible !important;",
  "  }",
  "  .print-only-container {",
  "    position: fixed;",
  "    left: 0;",
  "    top: 0;",
  "    width: 100%;",
  "    height: 100%;",
  "    padding: 20px;",
  "    background: white;",
  "    z-index: 99999;",
  "  }",
  "  .print-item-table { display: table !important; width: 100% !important; border-collapse: collapse; margin-top: 20px; }",
  "  .print-item-table thead { display: table-header-group !important; }",
  "  .print-item-table tbody { display: table-row-group !important; }",
  "  .print-item-table tr { display: table-row !important; }",
  "  .print-item-table th, .print-item-table td { display: table-cell !important; padding: 12px; border: 1px solid #e2e8f0; }",
  "  .print-statement {",
  "    max-width: 800px;",
  "    margin: 0 auto;",
  "    font-family: 'Inter', sans-serif;",
  "    color: #1e293b;",
  "  }",
  "  .print-header h1 {",
  "    font-size: 28px;",
  "    font-weight: 800;",
  "    margin-bottom: 30px;",
  "    text-align: center;",
  "    border-bottom: 2px solid #1e293b;",
  "    padding-bottom: 10px;",
  "  }",
  "  .print-header-meta {",
  "    display: flex;",
  "    justify-content: space-between;",
  "    align-items: flex-end;",
  "    margin-bottom: 30px;",
  "  }",
  "  .partner-name { font-size: 32px; font-weight: 800; }",
  "  .honorific { font-size: 18px; font-weight: 500; color: #64748b; }",
  "  .top-total-amount { text-align: right; }",
  "  .top-total-amount .label { display: block; font-size: 14px; color: #64748b; font-weight: 600; }",
  "  .top-total-amount .value { font-size: 36px; font-weight: 800; color: #2563eb; }",
  "  .print-item-table th { background: #f8fafc !important; -webkit-print-color-adjust: exact; }",
  "  .print-item-table td.item-name { text-align: left; font-weight: 700; }",
  "  .print-item-table tfoot td { font-weight: 800; font-size: 18px; }",
  "  .print-payment-section { margin-top: 40px; border: 2px solid #e2e8f0; padding: 24px; border-radius: 12px; }",
  "  .print-payment-section h3 { margin-top: 0; font-size: 18px; margin-bottom: 20px; }",
  "  .payment-grid { display: flex; gap: 20px; margin-bottom: 24px; }",
  "  .payment-box { flex: 1; border: 1px solid #e2e8f0; padding: 10px; text-align: center; border-radius: 8px; }",
  "  .payment-box .label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }",
  "  .payment-box .value { font-weight: 700; font-size: 16px; }",
  "  .balance-summary { border-top: 2px solid #e2e8f0; padding-top: 20px; }",
  "  .balance-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 18px; }",
  "  .balance-row.highlight { font-size: 28px; font-weight: 800; color: #ef4444 !important; }",
  "  .print-footer { margin-top: 50px; text-align: center; font-size: 16px; border-top: 1px solid #e2e8f0; padding-top: 20px; }",
  "}"
].join("\n");

export default SalesInvoice;
