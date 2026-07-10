import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Trash2, Printer, Save, Wallet, BookOpen, RefreshCw, X, Info } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound, convertEnToKo } from '../utils/koreanUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const SalesInvoice = ({ isMobileMode, onClose, products, partners, staffList, onSave, salesInvoices = [], editingInvoice = null, onOpenLedger, onDeleteInvoice, onPrintTaxInvoice, zIndex, selectedDate, currentUser, warehouses = [], specialPrices = [], inventory = [], warnNoStock = true, saveMode = 'auto', themeColor: propThemeColor }) => {
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

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [partnerDayInvoices, setPartnerDayInvoices] = useState([]);

  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState(true);

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

  return (
    <>
      <style>{`
        .sales-header { background-color: ${themeColor} !important; border-top: none !important; }
        .invoice-title svg { color: white !important; }
        .window-modal-title { border-bottom: 2px solid ${themeColor} !important; }
        .form-group input:focus, .form-group select:focus, .partner-input:focus { border-color: ${themeColor} !important; box-shadow: 0 0 0 3px ${themeColor}20 !important; }

        /* 매출전표 반응형 레이아웃 */
        .sales-invoice-scroll-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          min-width: 0;
        }
        .sales-invoice-inner {
          min-width: 680px;  /* 이 너비 이하로 줄어지면 가로 스크롤 활성화 */
        }
        /* 헤더 필드 4칸 반응형 그리드 */
        .invoice-main-fields-responsive {
          display: grid;
          grid-template-columns: repeat(4, minmax(140px, 1fr));
          gap: 12px 20px;
          background-color: #ffffff;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        /* 품목 검색 그리드 반응형 */
        .item-search-grid-responsive {
          display: grid;
          grid-template-columns: minmax(160px, 3fr) minmax(70px, 1fr) minmax(90px, 1fr) 100px;
          gap: 10px;
          align-items: flex-end;
        }
        /* 요약 카드 너비 제한 */
        .invoice-body-flex {
          display: flex;
          gap: 16px;
          background-color: #ffffff;
          align-items: flex-start;
          padding: 20px;
        }
        .invoice-body-flex > .invoice-left-part {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .invoice-body-flex > .invoice-summary-card {
          flex-shrink: 0;
          width: 300px;
          min-width: 220px;
        }

        /* 매출전표 모바일 최적화 오버라이드 */
        @media (max-width: 768px), .mobile-view-active {
          .sales-invoice-inner {
            min-width: 100% !important;
          }
          .invoice-body-flex {
            flex-direction: column !important;
            padding: 10px !important;
            gap: 12px !important;
          }
          .invoice-body-flex > .invoice-left-part {
            width: 100% !important;
          }
          .invoice-body-flex > .invoice-summary-card {
            width: 100% !important;
            min-width: 100% !important;
            margin-left: 0 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            padding: 16px !important;
          }
          .invoice-main-fields-responsive {
            grid-template-columns: 1fr 1fr !important;
            padding: 10px 12px !important;
            gap: 8px !important;
          }
          .item-search-grid-responsive {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .invoice-table-container {
            overflow-x: auto !important;
            width: 100% !important;
            margin-top: 10px !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
          }
          .invoice-table {
            min-width: 650px !important;
          }
          .sales-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 10px 12px !important;
            gap: 6px !important;
          }
          .invoice-header-btns {
            display: flex !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            width: 100% !important;
            padding: 6px 4px !important;
            gap: 6px !important;
            border-bottom: none !important;
          }
          .invoice-header-btns::-webkit-scrollbar {
            display: none !important;
          }
          .header-btn {
            flex-shrink: 0 !important;
            padding: 6px 10px !important;
            font-size: 0.78rem !important;
          }
        }
      `}</style>
      <WindowModal title="매출전표" onClose={onClose} width="1100px" zIndex={zIndex}>
        <div className="sales-header">
          <div className="invoice-title">
            <FileText size={28} />
            매출전표 등록
            {invoiceData.partner && (
              <span style={{ display: 'flex', alignItems: 'center', marginLeft: '12px', fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>
                {invoiceData.items.length === 0 && partnerDayInvoices.length === 0 ? (
                  '해당일 전표 0 / 0'
                ) : partnerDayInvoices.length > 0 || invoiceData.items.length > 0 ? (
                  <>
                    <button 
                      disabled={currentIndex <= 0}
                      onClick={(e) => { e.stopPropagation(); const prev = partnerDayInvoices[currentIndex - 1]; setInvoiceData({...prev}); setCurrentIndex(currentIndex - 1); }}
                      style={{ background: 'none', border: 'none', cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer', padding: '0 4px', color: currentIndex <= 0 ? '#94a3b8' : '#334155' }}
                    >◀</button>
                    해당일 전표 {currentIndex + 1} / {Math.max(partnerDayInvoices.length, currentIndex + 1)}
                    <button 
                      disabled={currentIndex === -1 || currentIndex >= partnerDayInvoices.length - 1}
                      onClick={(e) => { e.stopPropagation(); const nxt = partnerDayInvoices[currentIndex + 1]; setInvoiceData({...nxt}); setCurrentIndex(currentIndex + 1); }}
                      style={{ background: 'none', border: 'none', cursor: (currentIndex === -1 || currentIndex >= partnerDayInvoices.length - 1) ? 'not-allowed' : 'pointer', padding: '0 4px', color: (currentIndex === -1 || currentIndex >= partnerDayInvoices.length - 1) ? '#94a3b8' : '#334155' }}
                    >▶</button>
                  </>
                ) : (
                  '신규 전표'
                )}
              </span>
            )}
          </div>
          <div className="invoice-header-btns">
            <button className="header-btn" onClick={() => {
              if (invoiceData.partner) {
                // Creating a NEW invoice in the stack for the same partner
                // IMPORTANT: Generate a new ID so it doesn't overwrite the previous one
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
                setCurrentIndex(partnerDayInvoices.length); // New position (denominator will increase on first item add)
              } else {
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
              }
            }}>
              <RefreshCw size={16} /> 새전표
            </button>
            <button 
              className="header-btn highlight" 
              style={{ backgroundColor: '#10b981' }}
              onClick={openPaymentModal}
            >
              <Wallet size={16} /> 입금
            </button>
            <button className="header-btn" onClick={() => onOpenLedger(invoiceData.partner, invoiceData.date)}>
              <BookOpen size={16} /> 매출원장
            </button>
            <button className="header-btn" onClick={() => onPrintTaxInvoice(invoiceData, false)}>
              <FileText size={16} /> 세금계산서
            </button>
            <button className="header-btn" onClick={() => onPrintTaxInvoice(invoiceData, true)}>
              <FileText size={16} /> 계산서
            </button>
            <button className="header-btn" onClick={() => window.print()}>
              <Printer size={16} /> 인쇄
            </button>
          </div>
        </div>

        {/* 매출전표 본문 영역 - 가로 스크롤 래퍼 */}
        <div className="sales-invoice-scroll-wrapper">
        <div className="sales-invoice-inner">
        <div className="invoice-body invoice-body-flex">
          <div className="invoice-left-part" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="so-card" style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <h3 className="so-card-title" 
                  onClick={() => setIsBasicInfoCollapsed(!isBasicInfoCollapsed)}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', userSelect: 'none', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={16} color={themeColor} /> 상세 설정 (전표일자/담당자/창고)</span>
                <span style={{ fontSize: '0.78rem', color: themeColor, fontWeight: 800 }}>
                  {isBasicInfoCollapsed ? "▼ 펼치기" : "▲ 접기"}
                </span>
              </h3>
              
              {!isBasicInfoCollapsed && (
                <div className="invoice-main-fields-responsive" style={{ border: 'none', padding: 0, borderRadius: 0, gap: '12px', marginBottom: '8px', animation: 'so-fade-in 0.2s' }}>
                  <div className="form-group">
                    <label>전표 일자</label>
                    <input type="date" value={invoiceData.date} onChange={(e) => {
                      const updatedInvoice = {...invoiceData, date: e.target.value};
                      setInvoiceData(updatedInvoice);
                      if (updatedInvoice.items.length > 0) {
                        handleAutoSave(updatedInvoice);
                      }
                    }} />
                  </div>
                  <div className="form-group">
                    <label>출고 창고</label>
                    <select value={invoiceData.warehouse} onChange={(e) => {
                      const updatedInvoice = {...invoiceData, warehouse: e.target.value};
                      setInvoiceData(updatedInvoice);
                      if (updatedInvoice.items.length > 0) {
                        handleAutoSave(updatedInvoice);
                      }
                    }}>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                      {invoiceData.warehouse && !warehouses.some(w => w.name === invoiceData.warehouse) && (
                        <option value={invoiceData.warehouse}>{invoiceData.warehouse}</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>담당자</label>
                    <select 
                      value={invoiceData.manager} 
                      onChange={(e) => {
                        const newManager = e.target.value;
                        const updatedInvoice = {
                          ...invoiceData,
                          manager: newManager,
                          creator: currentUser?.name || invoiceData.creator || '시스템'
                        };
                        setInvoiceData(updatedInvoice);
                        if (updatedInvoice.items.length > 0) {
                          handleAutoSave(updatedInvoice);
                        }
                      }}
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      {invoiceData.manager && !staffList.some(s => s.name === invoiceData.manager) && (
                        <option value={invoiceData.manager}>{invoiceData.manager}</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: isBasicInfoCollapsed ? 0 : '8px' }}>
                <label style={{ fontWeight: 700 }}>거래처명</label>
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
                    const stack = mySalesInvoices.filter(inv => inv.partner === partner.name && inv.date === invoiceData.date);
                    if (stack.length > 0 && !editingInvoice) {
                      // Explicitly find the latest invoice by ID to ensure it's the 'last' one
                      const latestInvoice = [...stack].sort((a, b) => b.id - a.id)[0];
                      setInvoiceData({ ...latestInvoice });
                      setCurrentIndex(stack.findIndex(inv => inv.id === latestInvoice.id));
                      handleAutoSave(latestInvoice);
                    } else {
                      setInvoiceData(prev => ({ 
                        ...prev, 
                        id: Date.now(), 
                        partner: partner.name, 
                        manager: currentUser?.name || prev.manager,
                        warehouse: userWH, // 출고 창고는 로그인한 사용자의 담당 창고로 자동선택
                        items: [], 
                        receivedAmount: 0,
                        creator: currentUser?.name || '시스템'
                      }));
                      setCurrentIndex(0);
                    }
                    productInputRef.current?.focus();
                  }}
                  typeFilter="매출처"
                  autoFocus={true}
                />
              </div>
            </div>

            <div className="item-search-section">
              <div className="item-search-grid-responsive">
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={productSearchRef}>
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
                      style={{ paddingLeft: '28px', paddingRight: searchItem ? '28px' : '8px' }}
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
                      {productSuggestions.map((p, index) => {
                          const sq = getStockQty(p.id, invoiceData.warehouse);
                          const badge = getStockBadge(sq);
                          return (
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {sq !== null && (
                                  <span style={{
                                    fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px',
                                    borderRadius: '10px', border: `1px solid ${badge.color}30`,
                                    backgroundColor: badge.bg, color: badge.color,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    재고 {sq}개
                                  </span>
                                )}
                                <span style={{ fontSize: '0.78rem', color: themeColor, fontWeight: 600 }}>
                                  {(p.salesPrice || 0).toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {showProductSuggestions && searchItem.trim() && productSuggestions.length === 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                      padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: '4px'
                    }}>
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>수량</label>
                  <input 
                    ref={qtyInputRef}
                    type="text" 
                    value={qty ? qty.toLocaleString() : ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setQty(val === '' ? 0 : Number(val));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddItem();
                    }}
                    style={{ textAlign: 'right' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>단가</label>
                  <input 
                    type="text" 
                    value={price ? price.toLocaleString() : ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPrice(val === '' ? 0 : Number(val));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddItem();
                    }}
                    style={{ textAlign: 'right' }}
                  />
                </div>
                <button className="btn-primary" onClick={handleAddItem} style={{ height: '40px', backgroundColor: themeColor }}>
                  <Plus size={18} /> 추가
                </button>
              </div>
            </div>

            {/* 선택된 품목의 현재 창고 재고 표시 */}
            {selectedProduct && (() => {
              const sq = getStockQty(selectedProduct.id, invoiceData.warehouse);
              const badge = getStockBadge(sq);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                  padding: '8px 16px', backgroundColor: badge.bg,
                  borderRadius: '8px', border: `1px solid ${badge.color}40`,
                  fontSize: '0.83rem', marginTop: '-8px'
                }}>
                  <span style={{ fontSize: '1rem' }}>📦</span>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>선택 품목:</span>
                  <span style={{ color: '#1e293b', fontWeight: 700 }}>{selectedProduct.name}</span>
                  <span style={{ color: '#94a3b8' }}>|</span>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>출고 창고:</span>
                  <span style={{ color: '#334155', fontWeight: 700 }}>{invoiceData.warehouse || '-'}</span>
                  <span style={{ color: '#94a3b8' }}>|</span>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>현재고:</span>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: badge.color }}>
                    {sq !== null ? `${sq}개` : '-'}
                  </span>
                  {badge.label && (
                    <span style={{
                      backgroundColor: badge.color, color: 'white',
                      fontSize: '0.72rem', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '10px'
                    }}>{badge.label}</span>
                  )}
                </div>
              );
            })()}

            <div className="invoice-table-container" style={{ overflowX: 'auto' }}>
              <table className="invoice-table" ref={tableRef} style={{ tableLayout: 'fixed', minWidth: isMobileMode ? '100%' : '700px' }}>
                <colgroup>
                  <col style={{ width: (isMobileMode ? '40%' : (colWidths.name + 'px')) }} />
                  {!isMobileMode && <col style={{ width: colWidths.spec + 'px' }} />}
                  <col style={{ width: (isMobileMode ? '18%' : (colWidths.qty + 'px')) }} />
                  {!isMobileMode && <col style={{ width: colWidths.stock + 'px' }} />}
                  <col style={{ width: (isMobileMode ? '22%' : (colWidths.price + 'px')) }} />
                  {!isMobileMode && <col style={{ width: colWidths.supply + 'px' }} />}
                  {!isMobileMode && <col style={{ width: colWidths.tax + 'px' }} />}
                  <col style={{ width: (isMobileMode ? '20%' : (colWidths.total + 'px')) }} />
                  <col style={{ width: (isMobileMode ? '40px' : (colWidths.del + 'px')) }} />
                </colgroup>
                <thead>
                  <tr>
                    {[
                      { key: 'name',   label: '품목명',  align: 'center', pl: undefined },
                      !isMobileMode && { key: 'spec',   label: '규격',    align: 'center', pl: undefined },
                      { key: 'qty',    label: '수량',    align: 'center', pl: undefined },
                      !isMobileMode && { key: 'stock',  label: '현재고',  align: 'center', pl: undefined, color: '#3b82f6' },
                      { key: 'price',  label: '단가',    align: 'center', pl: undefined },
                      !isMobileMode && { key: 'supply', label: '공급가',  align: 'center', pl: undefined },
                      !isMobileMode && { key: 'tax',    label: '세액',    align: 'center', pl: undefined },
                      { key: 'total',  label: '합계',    align: 'center', pl: undefined },
                    ].filter(Boolean).map(col => (
                      <th key={col.key} style={{
                        position: 'relative', userSelect: 'none', overflow: 'hidden',
                        textAlign: col.align, paddingLeft: col.pl || '8px',
                        color: col.color || undefined,
                        whiteSpace: 'nowrap',
                      }}>
                        {col.label}
                        {/* 드래그 리사이즈 핸들 */}
                        {!isMobileMode && (
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
                              borderLeft: resizingCol.current === col.key ? `2px dotted ${themeColor}` : '1px dotted #cbd5e1',
                              transition: 'border-color 0.15s, border-width 0.15s',
                            }} />
                          </span>
                        )}
                      </th>
                    ))}
                    <th style={{ width: isMobileMode ? '40px' : (colWidths.del + 'px') }}>
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
                      <td style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobileMode ? '120px' : (colWidths.name + 'px') }}>{item.name}</td>
                      {!isMobileMode && <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.spec}</td>}
                      <td>
                        {item.isBox ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: themeColor }}>1박스</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({item.qty}개)</span>
                          </div>
                        ) : item.qty}
                      </td>
                      {/* 현재고 셀 */}
                      {!isMobileMode && (
                        <td>
                          {(() => {
                            const isAlreadySaved = salesInvoices.some(si => String(si.id) === String(invoiceData.id));
                            const baseSq = getStockQty(item.productId, invoiceData.warehouse);
                            const sq = baseSq !== null ? (baseSq - (isAlreadySaved ? 0 : item.qty)) : null;
                            const badge = getStockBadge(sq);
                            return (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 7px', borderRadius: '10px',
                                backgroundColor: badge.bg,
                                color: badge.color, fontWeight: 700,
                                fontSize: '0.78rem', border: `1px solid ${badge.color}30`,
                                whiteSpace: 'nowrap'
                              }}>
                                {sq !== null ? `${sq}개` : '-'}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                       <td>
                         <input
                           type="text"
                           value={item.price ? item.price.toLocaleString() : ''}
                           onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                           onBlur={() => handleItemPriceBlur(item)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               e.target.blur();
                             }
                           }}
                           style={{
                             width: '100%',
                             textAlign: 'right',
                             padding: '4px 6px',
                             border: '1px solid #cbd5e1',
                             borderRadius: '6px',
                             fontSize: '0.85rem',
                             fontWeight: 600,
                             backgroundColor: '#f8fafc',
                             color: '#1e293b'
                           }}
                         />
                       </td>
                      {!isMobileMode && <td>{item.supplyValue.toLocaleString()}</td>}
                      {!isMobileMode && <td>{item.tax.toLocaleString()}</td>}
                      <td style={{ fontWeight: 700 }}>{item.total.toLocaleString()}</td>
                      <td><button className="icon-btn" onClick={() => {
                        const updatedItems = invoiceData.items.filter(i => i.id !== item.id);
                        if (updatedItems.length === 0) {
                          if (currentIndex >= 0 && partnerDayInvoices[currentIndex]) {
                            onDeleteInvoice(partnerDayInvoices[currentIndex].id);
                          }
                          if (currentIndex > 0) {
                            const prevIdx = currentIndex - 1;
                            const prevInv = partnerDayInvoices[prevIdx];
                            if (prevInv) {
                              setInvoiceData({ ...prevInv });
                              setCurrentIndex(prevIdx);
                            }
                          } else {
                            setInvoiceData({ ...invoiceData, id: Date.now(), items: [], receivedAmount: 0, payments: { cash: 0, account: 0, card: 0, bill: 0 }, discount: 0, creator: currentUser?.name || '시스템' });
                            setCurrentIndex(-1);
                          }
                        } else {
                          const updatedInvoice = { ...invoiceData, items: updatedItems };
                          setInvoiceData(updatedInvoice);
                          handleAutoSave(updatedInvoice);
                        }
                      }}><Trash2 size={14} color="#ef4444" /></button></td>
                    </tr>
                  ))}
                  {invoiceData.items.length === 0 && (
                    <tr>
                      <td colSpan={isMobileMode ? 5 : 9} style={{ padding: '60px', color: '#94a3b8' }}>우측 검색상자에서 품목을 추가하세요.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="total-footer">
              <div className="total-label">총 합계 (VAT 포함)</div>
              <div className="total-amount" style={{ color: themeColor }}>{totalAmount.toLocaleString()}원</div>
            </div>
          </div>

          <div className="invoice-summary-card">
            <div className="summary-title"><BookOpen size={18} color={themeColor} />결제 요약</div>
            <div className="summary-row"><span className="label">총 합계</span><span className="value">{totalAmount.toLocaleString()}원</span></div>
            {invoiceData.discount > 0 && (
              <div className="summary-row"><span className="label" style={{ color: '#ef4444' }}>현장 할인</span><span className="value" style={{ color: '#ef4444' }}>-{invoiceData.discount.toLocaleString()}원</span></div>
            )}
            <div className="summary-row"><span className="label">입금액</span><span className="value" style={{ color: '#10b981' }}>{invoiceData.receivedAmount.toLocaleString()}원</span></div>
            
            {invoiceData.receivedAmount > 0 && (
              <div className="payment-breakdown" style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '10px', marginTop: '-4px', marginBottom: '8px', borderLeft: '2px solid #e2e8f0' }}>
                {invoiceData.payments.cash > 0 && <div>현금: {invoiceData.payments.cash.toLocaleString()}원</div>}
                {invoiceData.payments.account > 0 && <div>계좌: {invoiceData.payments.account.toLocaleString()}원</div>}
                {invoiceData.payments.card > 0 && <div>카드: {invoiceData.payments.card.toLocaleString()}원</div>}
                {invoiceData.payments.bill > 0 && <div>어음: {invoiceData.payments.bill.toLocaleString()}원</div>}
              </div>
            )}

            <div style={{ margin: '10px 0', borderTop: '1px solid #f1f5f9' }}></div>
            <div className="summary-row"><span className="label">전 미수금</span><span className="value">{previousBalance.toLocaleString()}원</span></div>
            <div className="summary-row"><span className="label">금회 미수금</span><span className="value">{outstandingBalance.toLocaleString()}원</span></div>
            <div className="summary-row total" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span className="label">누적 미수금</span>
              <span className="value" style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 800 }}>{finalBalance.toLocaleString()}원</span>
            </div>

              <button 
                className="btn-primary" 
                style={{ 
                  marginTop: '16px', 
                  width: '100%', 
                  backgroundColor: themeColor, 
                  border: 'none', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: '#fff'
                }}
                onClick={() => {
                  if (invoiceData.items.length === 0) {
                    alert('등록된 품목이 없습니다.');
                    return;
                  }
                  onSave(invoiceData, false);
                }}
              >
                {editingInvoice ? '전표 수정하기' : '전표 저장하기'}
              </button>
          </div>{/* invoice-summary-card end */}
        </div>{/* invoice-body invoice-body-flex end */}
        </div>{/* sales-invoice-inner end */}
        </div>{/* sales-invoice-scroll-wrapper end */}

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
                  <td>{item.isBox ? `1박스 (${item.qty})` : item.qty}</td>
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

        <style>{`
          @media screen {
            .print-only-container { display: none; }
          }
          @media print {
            /* Hide everything by default */
            body * { 
              display: none !important; 
            }
            /* Show only the print container and its children */
            .print-only-container, 
            .print-only-container * { 
              display: block !important; 
              visibility: visible !important;
            }
            
            .print-only-container {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              padding: 20px;
              background: white;
              z-index: 99999;
            }
            
            /* Table specifics need table display, not block */
            .print-item-table { display: table !important; width: 100% !important; border-collapse: collapse; margin-top: 20px; }
            .print-item-table thead { display: table-header-group !important; }
            .print-item-table tbody { display: table-row-group !important; }
            .print-item-table tr { display: table-row !important; }
            .print-item-table th, .print-item-table td { display: table-cell !important; padding: 12px; border: 1px solid #e2e8f0; }

            .print-statement {
              max-width: 800px;
              margin: 0 auto;
              font-family: 'Inter', sans-serif;
              color: #1e293b;
            }
            .print-header h1 {
              font-size: 28px;
              font-weight: 800;
              margin-bottom: 30px;
              text-align: center;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 10px;
            }
            .print-header-meta {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-bottom: 30px;
            }
            .partner-name { font-size: 32px; font-weight: 800; }
            .honorific { font-size: 18px; font-weight: 500; color: #64748b; }
            .top-total-amount { text-align: right; }
            .top-total-amount .label { display: block; font-size: 14px; color: #64748b; font-weight: 600; }
            .top-total-amount .value { font-size: 36px; font-weight: 800; color: #2563eb; }
            
            .print-item-table th { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
            .print-item-table td.item-name { text-align: left; font-weight: 700; }
            .print-item-table tfoot td { font-weight: 800; font-size: 18px; }

            .print-payment-section { margin-top: 40px; border: 2px solid #e2e8f0; padding: 24px; border-radius: 12px; }
            .print-payment-section h3 { margin-top: 0; font-size: 18px; margin-bottom: 20px; }
            .payment-grid { display: flex; gap: 20px; margin-bottom: 24px; }
            .payment-box { flex: 1; border: 1px solid #e2e8f0; padding: 10px; text-align: center; border-radius: 8px; }
            .payment-box .label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
            .payment-box .value { font-weight: 700; font-size: 16px; }

            .balance-summary { border-top: 2px solid #e2e8f0; padding-top: 20px; }
            .balance-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 18px; }
            .balance-row.highlight { font-size: 28px; font-weight: 800; color: #ef4444 !important; }
            
            .print-footer { margin-top: 50px; text-align: center; font-size: 16px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          }
        `}</style>
      </div>
    </>
  );
};

export default SalesInvoice;
