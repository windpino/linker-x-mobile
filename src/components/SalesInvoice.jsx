import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, Search, Trash2, Printer, Save, Wallet, BookOpen, RefreshCw, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound, convertEnToKo } from '../utils/koreanUtils';
import { getStaffWarehouse, isMainWarehouse } from '../utils/warehouseUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { addDays, DateNavButton } from '../utils/dateNavigationUtils';
import { getMobileSettings } from '../utils/mobileSettings';
import { printMobileReceipt } from '../utils/receiptPrinter';

const SalesInvoice = ({ onClose, products, partners, staffList, onSave, salesInvoices = [], editingInvoice = null, onOpenLedger, onDeleteInvoice, onPrintTaxInvoice, zIndex, selectedDate, currentUser, warehouses = [], specialPrices = [], setSpecialPrices, inventory = [], warnNoStock = true, saveMode = 'auto', themeColor: propThemeColor }) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptSignature, setShowReceiptSignature] = useState(() => {
    try {
      const ms = getMobileSettings();
      return ms.showReceiptSignature !== false;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleSettingsChange = (e) => {
      if (e.detail && typeof e.detail.showReceiptSignature !== 'undefined') {
        setShowReceiptSignature(e.detail.showReceiptSignature !== false);
      }
    };
    window.addEventListener('linkerx_mobile_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('linkerx_mobile_settings_changed', handleSettingsChange);
  }, []);

  const companyInfo = (() => {
    try {
      const raw = localStorage.getItem('systemSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.company || parsed || {};
      }
    } catch (e) {}
    return {};
  })();
  const mainWH = warehouses.find(w => w.isMain)?.name || 
                 warehouses.find(w => w.name.includes('메인'))?.name || 
                 warehouses.find(w => w.name.includes('main'))?.name || 
                 warehouses[0]?.name || 
                 '메인창고';
  
  // Resolve user's assigned warehouse (vehicle or warehouse) safely
  const userWH = getStaffWarehouse(currentUser?.name, staffList, warehouses, currentUser);

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDateVehicle, setShowDateVehicle] = useState(false); // 날짜와 차량 선택 가리기/펼치기 (기본값: 가리기)
  const [searchType, setSearchType] = useState('name'); // 'name', 'abbr', 'code', 'all'

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

  const getInitialPaymentList = (inv) => {
    if (Array.isArray(inv?.paymentList) && inv.paymentList.length > 0) {
      return inv.paymentList;
    }
    const hasPayment = (Number(inv?.receivedAmount) > 0) || (Number(inv?.discount) > 0) ||
      (inv?.payments && (inv.payments.cash > 0 || inv.payments.account > 0 || inv.payments.card > 0 || inv.payments.bill > 0));
    if (hasPayment) {
      return [{
        id: inv?.id ? Number(inv.id) : Date.now(),
        date: inv?.date || format(new Date(), 'yyyy-MM-dd'),
        cash: Number(inv?.payments?.cash) || 0,
        account: Number(inv?.payments?.account) || 0,
        card: Number(inv?.payments?.card) || 0,
        bill: Number(inv?.payments?.bill) || 0,
        totalAmount: Number(inv?.receivedAmount) || 0,
        discount: Number(inv?.discount) || 0,
        memo: inv?.memo || (inv?.isDepositOnly ? '입금전표' : '수금'),
        createdAt: inv?.createdAt || new Date().toISOString(),
        creator: inv?.creator || '시스템'
      }];
    }
    return [];
  };

  const [invoiceData, setInvoiceData] = useState(() => {
    if (editingInvoice) {
      const initialPayments = editingInvoice.payments || { cash: 0, account: 0, card: 0, bill: 0 };
      const initialPaymentList = getInitialPaymentList(editingInvoice);
      const editingMgr = editingInvoice.manager || currentUser?.name || '';
      const matchedStaff = (staffList || []).find(s => s.name === editingMgr);
      const staffWH = matchedStaff?.warehouse;
      let initialWH = editingInvoice.warehouse || editingInvoice.outWarehouse || '';
      if (isMainWarehouse(staffWH, warehouses) || isMainWarehouse(initialWH, warehouses)) {
        initialWH = mainWH;
      } else if (!initialWH) {
        initialWH = userWH;
      }
      const rawItems = editingInvoice.items;
      const safeItems = Array.isArray(rawItems) ? rawItems : (rawItems && typeof rawItems === 'object' ? Object.values(rawItems) : []);
      return {
        ...editingInvoice,
        warehouse: initialWH,
        items: safeItems,
        payments: initialPayments,
        paymentList: initialPaymentList
      };
    }
    return {
      id: Date.now(),
      date: (() => {
        if (selectedDate && typeof selectedDate === 'string') return selectedDate;
        const d = (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) ? selectedDate : new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      partner: '',
      warehouse: userWH,
      manager: currentUser?.name || staffList[0]?.name || '',
      items: [],
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      paymentList: [],
      discount: 0,
      creator: currentUser?.name || '시스템'
    };
  });

  const currentPartner = partners.find(p => p.name === invoiceData.partner);
  const hideAmount = currentPartner?.hideAmountInInvoice || false;

  const isDepositOnly = Boolean(
    invoiceData?.isDepositOnly ||
    (!invoiceData?.items?.length && (invoiceData?.receivedAmount > 0 || invoiceData?.memo === '입금전표' || invoiceData?.type === 'deposit'))
  );

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPaymentSlipId, setEditingPaymentSlipId] = useState(null);
  const [tempPaymentState, setTempPaymentState] = useState(null);

  const openPaymentModal = (slipOrEvent = null) => {
    if (!invoiceData.partner) {
      alert('거래처를 먼저 선택해주세요.');
      return;
    }

    const isRealSlip = slipOrEvent && 
      typeof slipOrEvent === 'object' && 
      !slipOrEvent.nativeEvent && 
      !slipOrEvent._reactName && 
      !slipOrEvent.target && 
      (slipOrEvent.id !== undefined || slipOrEvent.cash !== undefined);

    const slipToEdit = isRealSlip ? slipOrEvent : null;

    if (slipToEdit) {
      setEditingPaymentSlipId(slipToEdit.id);
      const slipTotal = (Number(slipToEdit.totalAmount) || 0) + (Number(slipToEdit.discount) || 0);
      const defaultFullTotal = (previousBalance > 0 ? previousBalance : 0) + (totalAmount > 0 ? totalAmount : 0);
      const targetTotal = slipTotal > 0 ? slipTotal : (defaultFullTotal > 0 ? defaultFullTotal : 0);
      setTempPaymentState({
        date: slipToEdit.date || invoiceData.date,
        targetTotal: targetTotal,
        payments: {
          cash: Number(slipToEdit.cash) || 0,
          account: Number(slipToEdit.account) || 0,
          card: Number(slipToEdit.card) || 0,
          bill: Number(slipToEdit.bill) || 0
        },
        discount: Number(slipToEdit.discount) || 0,
        memo: slipToEdit.memo || ''
      });
      setIsPaymentModalOpen(true);
      return;
    }

    setEditingPaymentSlipId(null);
    const currentItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const currentTotal = currentItems.reduce((sum, item) => sum + (Number(item?.total) || 0), 0);
    const curPrevBalance = previousBalance > 0 ? previousBalance : 0;
    const curReceived = Number(invoiceData.receivedAmount) || 0;
    const curDiscount = Number(invoiceData.discount) || 0;

    // 전미수를 포함한 전체 금액 (이전 미수금 + 금회 총액 - 기입금액 - 할인액)
    const fullTargetTotal = Math.max(0, curPrevBalance + currentTotal - curReceived - curDiscount);
    const targetTotal = fullTargetTotal > 0 ? fullTargetTotal : (curPrevBalance + currentTotal);

    const initialCash = targetTotal;

    setTempPaymentState({
      date: invoiceData.date || format(new Date(), 'yyyy-MM-dd'),
      targetTotal: targetTotal,
      payments: {
        cash: initialCash,
        account: 0,
        card: 0,
        bill: 0
      },
      discount: 0,
      memo: isDepositOnly ? '입금전표' : '수금'
    });
    setIsPaymentModalOpen(true);
  };

  const editingInvoicePropRef = useRef(null);
  const editingInvoiceIdRef = useRef(editingInvoice?.id || null);

  useEffect(() => {
    if (editingInvoice) {
      if (editingInvoicePropRef.current === editingInvoice && String(editingInvoiceIdRef.current) === String(editingInvoice.id)) {
        return;
      }
      editingInvoicePropRef.current = editingInvoice;
      editingInvoiceIdRef.current = editingInvoice.id;

      const rawItems = editingInvoice.items;
      const safeItems = Array.isArray(rawItems) ? rawItems : (rawItems && typeof rawItems === 'object' ? Object.values(rawItems) : []);
      const isAlreadySaved = salesInvoices.some(si => String(si.id) === String(editingInvoice.id));
      const isDep = Boolean(
        editingInvoice.isDepositOnly || 
        (!safeItems.length && (editingInvoice.receivedAmount > 0 || editingInvoice.memo === '입금전표' || editingInvoice.type === 'deposit'))
      );
      const initialPayments = editingInvoice.payments || { cash: 0, account: 0, card: 0, bill: 0 };
      const initialPaymentList = getInitialPaymentList(editingInvoice);
      let nextData = { 
        ...editingInvoice, 
        items: safeItems,
        payments: initialPayments,
        paymentList: initialPaymentList,
        isDepositOnly: isDep,
        memo: isDep ? (editingInvoice.memo || '입금전표') : (editingInvoice.memo || '')
      };
      
      if (!isAlreadySaved) {
        const targetMgr = currentUser?.name || editingInvoice.manager || '';
        nextData = {
          ...nextData,
          manager: targetMgr,
          warehouse: editingInvoice.warehouse || getStaffWarehouse(targetMgr, staffList, warehouses, currentUser),
          creator: currentUser?.name || editingInvoice.creator || '시스템'
        };
      }
      setInvoiceData(nextData);

      if (isDep && editingInvoice.partner) {
        setEditingPaymentSlipId(initialPaymentList[0]?.id || null);
        const slip = initialPaymentList[0] || {};
        const slipTotal = (Number(slip.totalAmount) || 0) + (Number(slip.discount) || 0);
        const currentPayTotal = (Number(editingInvoice.receivedAmount) || 0) + (Number(editingInvoice.discount) || 0);
        const targetTotal = slipTotal > 0 ? slipTotal : (currentPayTotal > 0 ? currentPayTotal : 0);
        setTempPaymentState({
          date: editingInvoice.date || format(new Date(), 'yyyy-MM-dd'),
          targetTotal: targetTotal,
          payments: {
            cash: Number(editingInvoice.payments?.cash || slip.cash) || 0,
            account: Number(editingInvoice.payments?.account || slip.account) || 0,
            card: Number(editingInvoice.payments?.card || slip.card) || 0,
            bill: Number(editingInvoice.payments?.bill || slip.bill) || 0
          },
          discount: Number(editingInvoice.discount || slip.discount) || 0,
          memo: editingInvoice.memo || '입금전표'
        });
        setIsPaymentModalOpen(true);
      }

      if (editingInvoice.autoSave && !isAlreadySaved) {
        setTimeout(() => {
          const saveCopy = { ...nextData };
          delete saveCopy.autoSave;
          onSave(saveCopy);
        }, 100);
      }
    } else {
      editingInvoicePropRef.current = null;
      editingInvoiceIdRef.current = null;
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
    return Number(currentPartner.receivables || 0);
  };

  const previousBalance = getPreviousBalance();
  const currentItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
  const totalAmount = currentItems.reduce((sum, item) => sum + (Number(item?.total) || 0), 0);
  const totalQty = currentItems.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0);
  const finalBalance = previousBalance + totalAmount - (Number(invoiceData.receivedAmount) || 0) - (Number(invoiceData.discount) || 0);
  const outstandingBalance = totalAmount - (Number(invoiceData.receivedAmount) || 0) - (Number(invoiceData.discount) || 0);

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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleCloseMenu = () => setIsMenuOpen(false);
    const timer = setTimeout(() => {
      document.addEventListener('click', handleCloseMenu);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleCloseMenu);
    };
  }, [isMenuOpen]);

  const matchQty = searchItem.match(/\s*(\d+)$/);
  const searchQty = matchQty ? parseInt(matchQty[1], 10) : 1;
  const baseSearch = (matchQty && matchQty.index > 0 ? searchItem.substring(0, matchQty.index) : searchItem).trim();
  const cleanSearch = baseSearch;
  const convertedSearch = convertEnToKo(cleanSearch);

  const productSuggestions = cleanSearch
    ? (products || []).filter(p => {
        if (searchType === 'abbr') {
          return (p.abbreviation && matchesInitialSound(p.abbreviation, cleanSearch)) ||
                 matchesInitialSound(p.name, cleanSearch);
        }
        if (searchType === 'code') {
          return (p.barcode && String(p.barcode).includes(cleanSearch)) ||
                 (p.code && String(p.code).includes(cleanSearch));
        }
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
    const partnerName = (invoiceData?.partner || '').trim();
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

  const hasSpecialPricePermission = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.userId === 'admin' || currentUser.isAdmin) {
      return true;
    }
    if (currentUser.permissions?.['특별단가관리'] || currentUser.permissions?.특별단가관리) {
      return true;
    }
    const staff = staffList.find(s => s.userId === currentUser.userId || s.name === currentUser.name);
    if (staff && (staff.allowSpecialPriceSave || staff.permissions?.['특별단가관리'] || staff.permissions?.특별단가관리)) {
      return true;
    }
    if (currentUser.allowSpecialPriceSave) {
      return true;
    }
    return false;
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const canIssuePastDateSlip = (() => {
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
  })();

  const canIssuePastDateDeposit = (() => {
    if (currentUser?.role === 'super_admin' || currentUser?.userId === 'admin') return true;
    const staff = (staffList || []).find(s => 
      (currentUser?.userId && s.userId === currentUser.userId) ||
      (currentUser?.id && String(s.id) === String(currentUser.id)) ||
      (currentUser?.name && s.name === currentUser.name)
    ) || currentUser;
    if (staff?.allowPastDateDeposit !== undefined) return Boolean(staff.allowPastDateDeposit);
    if (currentUser?.allowPastDateDeposit !== undefined) return Boolean(currentUser.allowPastDateDeposit);
    if (staff?.permissions?.['과거일자 입금전표발행'] !== undefined) return Boolean(staff.permissions['과거일자 입금전표발행']);
    if (currentUser?.permissions?.['과거일자 입금전표발행'] !== undefined) return Boolean(currentUser.permissions['과거일자 입금전표발행']);
    if (currentUser?.role === 'admin') return true;
    return false;
  })();

  const autoSaveSpecialPrice = async (targetPartner, targetProduct, newPrice, sourceName = '매출전표') => {
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
      memo: `${sourceName}에서 자동 등록됨`,
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
    // 수주로부터 전송되어 와서 아직 사용자가 [전표저장]을 누르지 않은 신규 전표는 자동저장하지 않음
    if (updatedInv?.isFromOrder || invoiceData?.isFromOrder) {
      return;
    }
    if (!canIssuePastDateSlip && updatedInv?.date && updatedInv.date < todayStr && (!editingInvoice || updatedInv.date !== editingInvoice.date)) {
      alert('과거일자 전표발행 권한이 없습니다. 당일 또는 미래일자만 발행할 수 있습니다.');
      return;
    }
    const saved = await onSave(updatedInv, true);
    if (saved && saved.id) {
      setInvoiceData(saved);
    }
  };

  const handleManualSave = async () => {
    if (isSaving) return;
    if (!invoiceData.partner) {
      alert('거래처를 선택해주세요.');
      return;
    }
    if (!canIssuePastDateSlip && invoiceData?.date && invoiceData.date < todayStr && (!editingInvoice || invoiceData.date !== editingInvoice.date)) {
      alert('과거일자 전표발행 권한이 없습니다. 당일 또는 미래일자만 발행할 수 있습니다.');
      return;
    }
    const hasItems = Array.isArray(invoiceData.items) && invoiceData.items.length > 0;
    const hasReceived = (Number(invoiceData.receivedAmount) || 0) > 0;
    const hasPaymentList = Array.isArray(invoiceData.paymentList) && invoiceData.paymentList.length > 0;
    const hasPayments = Boolean(invoiceData.payments && (
      (Number(invoiceData.payments.cash) || 0) > 0 ||
      (Number(invoiceData.payments.account) || 0) > 0 ||
      (Number(invoiceData.payments.card) || 0) > 0 ||
      (Number(invoiceData.payments.bill) || 0) > 0
    ));
    if (!hasItems && !hasReceived && !hasPaymentList && !hasPayments) {
      alert('품목 또는 입금액을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      // 특별단가 자동 저장: 백그라운드 비동기 처리
      if (invoiceData.partner && Array.isArray(invoiceData.items)) {
        Promise.all(invoiceData.items.map(item => {
          const prod = products?.find(p => String(p.id) === String(item.productId) || p.name === item.name);
          if (prod && item.price !== undefined && item.price !== null) {
            return autoSaveSpecialPrice(invoiceData.partner, prod, item.price, '매출전표');
          }
          return Promise.resolve();
        })).catch(console.warn);
      }

      const saveInv = { ...invoiceData };
      await onSave(saveInv, false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewInvoice = () => {
    if (invoiceData.partner) {
      setInvoiceData({ 
        ...invoiceData, 
        id: Date.now(), 
        items: [], 
        receivedAmount: 0, 
        payments: { cash: 0, account: 0, card: 0, bill: 0 }, 
        paymentList: [],
        discount: 0, 
        creator: currentUser?.name || '시스템', 
        manager: currentUser?.name || staffList[0]?.name || '', 
        warehouse: userWH 
      });
      setCurrentIndex(partnerDayInvoices.length);
    } else {
      setInvoiceData({ 
        ...invoiceData, 
        id: Date.now(), 
        partner: '', 
        items: [], 
        receivedAmount: 0, 
        payments: { cash: 0, account: 0, card: 0, bill: 0 }, 
        paymentList: [],
        discount: 0, 
        creator: currentUser?.name || '시스템', 
        manager: currentUser?.name || staffList[0]?.name || '', 
        warehouse: userWH 
      });
      setCurrentIndex(-1);
    }
  };

  const handleSavePaymentModal = async () => {
    if (!invoiceData.partner) {
      alert('거래처를 먼저 선택해주세요.');
      return;
    }
    const paymentsObj = tempPaymentState?.payments || { cash: 0, account: 0, card: 0, bill: 0 };
    const slipCash = Number(paymentsObj.cash) || 0;
    const slipAccount = Number(paymentsObj.account) || 0;
    const slipCard = Number(paymentsObj.card) || 0;
    const slipBill = Number(paymentsObj.bill) || 0;
    const slipTotal = slipCash + slipAccount + slipCard + slipBill;
    const slipDiscount = Number(tempPaymentState?.discount) || 0;
    const slipDate = tempPaymentState?.date || invoiceData.date;
    const slipMemo = tempPaymentState?.memo || (isDepositOnly ? '입금전표' : '수금');

    if (slipTotal <= 0 && slipDiscount <= 0) {
      alert('수금액 또는 할인 금액을 1원 이상 입력해주세요.');
      return;
    }

    if (!canIssuePastDateDeposit && slipDate < todayStr) {
      alert('과거일자 입금전표발행 권한이 없습니다. 당일 또는 미래일자만 발행할 수 있습니다.');
      return;
    }

    const currentList = Array.isArray(invoiceData.paymentList) ? [...invoiceData.paymentList] : [];
    let nextList = [];

    if (editingPaymentSlipId) {
      nextList = currentList.map(item => {
        if (item.id === editingPaymentSlipId) {
          return {
            ...item,
            date: slipDate,
            cash: slipCash,
            account: slipAccount,
            card: slipCard,
            bill: slipBill,
            totalAmount: slipTotal,
            discount: slipDiscount,
            memo: slipMemo,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      if (!nextList.some(item => item.id === editingPaymentSlipId)) {
        nextList.push({
          id: editingPaymentSlipId,
          date: slipDate,
          cash: slipCash,
          account: slipAccount,
          card: slipCard,
          bill: slipBill,
          totalAmount: slipTotal,
          discount: slipDiscount,
          memo: slipMemo,
          createdAt: new Date().toISOString(),
          creator: currentUser?.name || '시스템'
        });
      }
    } else {
      const newSlip = {
        id: Date.now(),
        date: slipDate,
        cash: slipCash,
        account: slipAccount,
        card: slipCard,
        bill: slipBill,
        totalAmount: slipTotal,
        discount: slipDiscount,
        memo: slipMemo,
        createdAt: new Date().toISOString(),
        creator: currentUser?.name || '시스템'
      };
      nextList = [...currentList, newSlip];
    }

    const aggregatedPayments = {
      cash: nextList.reduce((sum, p) => sum + (p.cash || 0), 0),
      account: nextList.reduce((sum, p) => sum + (p.account || 0), 0),
      card: nextList.reduce((sum, p) => sum + (p.card || 0), 0),
      bill: nextList.reduce((sum, p) => sum + (p.bill || 0), 0),
    };
    const aggregatedReceived = nextList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const aggregatedDiscount = nextList.reduce((sum, p) => sum + (p.discount || 0), 0);
    const currentItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const isDep = currentItems.length === 0 || invoiceData.isDepositOnly;

    const updatedInvoice = {
      ...invoiceData,
      items: currentItems,
      paymentList: nextList,
      payments: aggregatedPayments,
      receivedAmount: aggregatedReceived,
      discount: aggregatedDiscount,
      totalAmount: currentItems.reduce((sum, item) => sum + (Number(item?.total) || 0), 0),
      isDepositOnly: isDep,
      memo: isDep ? (invoiceData.memo || '입금전표') : (invoiceData.memo || '')
    };

    setInvoiceData(updatedInvoice);
    setIsPaymentModalOpen(false);
    setEditingPaymentSlipId(null);

    await handleAutoSave(updatedInvoice);

    if (isDep) {
      alert(`[입금전표] ${invoiceData.partner} 거래처에 입금(${slipTotal.toLocaleString()}원)이 정상적으로 발행 및 저장되었습니다.`);
    } else {
      alert(`[수금전표] ${invoiceData.partner} 거래처에 수금(${slipTotal.toLocaleString()}원)이 정상적으로 등록되었습니다.`);
    }
  };

  const handleDeletePaymentSlip = async (slipId) => {
    if (!window.confirm('해당 입금/수금 전표 내역을 삭제하시겠습니까?')) return;
    const currentList = Array.isArray(invoiceData.paymentList) ? invoiceData.paymentList : [];
    const nextList = currentList.filter(p => p.id !== slipId);

    const hasNoItems = !invoiceData.items || invoiceData.items.length === 0;

    // 품목도 없고(입금전표), 남은 입금내역도 전혀 없다면 -> 전표 자체를 완전 삭제 처리!
    if (hasNoItems && nextList.length === 0) {
      if (invoiceData.id && onDeleteInvoice) {
        await onDeleteInvoice(invoiceData.id);
      }
      alert('입금전표가 완전히 삭제되었습니다.');
      onClose && onClose();
      return;
    }

    const aggregatedPayments = {
      cash: nextList.reduce((sum, p) => sum + (p.cash || 0), 0),
      account: nextList.reduce((sum, p) => sum + (p.account || 0), 0),
      card: nextList.reduce((sum, p) => sum + (p.card || 0), 0),
      bill: nextList.reduce((sum, p) => sum + (p.bill || 0), 0),
    };
    const aggregatedReceived = nextList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const aggregatedDiscount = nextList.reduce((sum, p) => sum + (p.discount || 0), 0);

    const updatedInvoice = {
      ...invoiceData,
      paymentList: nextList,
      payments: aggregatedPayments,
      receivedAmount: aggregatedReceived,
      discount: aggregatedDiscount,
    };

    setInvoiceData(updatedInvoice);
    await handleAutoSave(updatedInvoice);
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

    // 특별단가 자동 저장: 입력한 단가가 기존 단가와 다르거나 지정된 경우 해당 거래처의 특별단가로 자동 저장
    const defaultPrice = getProductDefaultPrice(selectedProduct);
    if (finalPrice !== defaultPrice) {
      autoSaveSpecialPrice(invoiceData.partner, selectedProduct, finalPrice, '매출전표');
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
    
    const updatedItems = (invoiceData.items || []).map(item => {
      if (item.id === itemId) {
        const product = products?.find(p => String(p.id) === String(item.productId));
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
    const product = products?.find(p => String(p.id) === String(item.productId));
    if (!product) return;
    const numPrice = Number(item.price);
    if (isNaN(numPrice) || numPrice < 0) return;
    autoSaveSpecialPrice(invoiceData.partner, product, numPrice, '매출전표');
  };

  const handleUpdateItemQty = (itemId, val) => {
    const cleanVal = String(val).replace(/[^0-9]/g, '');
    const newQty = cleanVal === '' ? 0 : Number(cleanVal);
    
    const updatedItems = (invoiceData.items || []).map(item => {
      if (item.id === itemId) {
        const product = products?.find(p => String(p.id) === String(item.productId));
        const isTaxFree = item.taxType === '면세' || product?.taxType === '면세';
        const total = Math.floor(newQty * (item.price || 0));
        const supplyValue = isTaxFree ? total : Math.floor(total / 1.1);
        const tax = isTaxFree ? 0 : total - supplyValue;
        return {
          ...item,
          qty: newQty,
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

  const handleDeleteItem = (itemId) => {
    const updatedItems = (invoiceData.items || []).filter(i => i.id !== itemId);
    if (updatedItems.length === 0) {
      if (currentIndex >= 0 && partnerDayInvoices[currentIndex]) {
        onDeleteInvoice && onDeleteInvoice(partnerDayInvoices[currentIndex].id);
      }
      if (currentIndex > 0) {
        const prevIdx = currentIndex - 1;
        const prevInv = partnerDayInvoices[prevIdx];
        if (prevInv) {
          setInvoiceData({ ...prevInv });
          setCurrentIndex(prevIdx);
        }
      } else {
        setInvoiceData({
          ...invoiceData,
          id: Date.now(),
          items: [],
          receivedAmount: 0,
          payments: { cash: 0, account: 0, card: 0, bill: 0 },
          discount: 0,
          creator: currentUser?.name || '시스템'
        });
        setCurrentIndex(-1);
      }
    } else {
      const updatedInvoice = { ...invoiceData, items: updatedItems };
      setInvoiceData(updatedInvoice);
      handleAutoSave(updatedInvoice);
    }
  };

  const handleQuickAddProduct = (prod, customQty = 1) => {
    if (!invoiceData.partner) {
      alert('거래처를 먼저 선택해주세요.');
      return;
    }
    const finalQty = Number(customQty) > 0 ? Number(customQty) : 1;
    const finalPrice = getProductDefaultPrice(prod);
    const isTaxFree = prod.taxType === '면세';
    const itemTotal = Math.floor(finalQty * finalPrice);
    const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
    const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;

    const existingIndex = (invoiceData.items || []).findIndex(it => String(it.productId) === String(prod.id));
    let updatedItems;
    if (existingIndex >= 0) {
      updatedItems = invoiceData.items.map((it, idx) => {
        if (idx === existingIndex) {
          const newQ = it.qty + finalQty;
          const newTot = Math.floor(newQ * it.price);
          const newSup = isTaxFree ? newTot : Math.floor(newTot / 1.1);
          const newTax = isTaxFree ? 0 : newTot - newSup;
          return { ...it, qty: newQ, total: newTot, supplyValue: newSup, tax: newTax };
        }
        return it;
      });
    } else {
      const newItem = {
        id: Date.now(),
        productId: prod.id,
        name: prod.name,
        spec: prod.spec || '',
        qty: finalQty,
        price: finalPrice,
        taxType: prod.taxType || '과세',
        supplyValue: itemSupplyValue,
        tax: itemTax,
        total: itemTotal,
        isBox: false
      };
      updatedItems = [...(invoiceData.items || []), newItem];
    }

    const updatedInvoice = { ...invoiceData, items: updatedItems };
    setInvoiceData(updatedInvoice);
    handleAutoSave(updatedInvoice);

    if (currentIndex === -1) setCurrentIndex(0);
    setSearchItem('');
    setSelectedProduct(null);
    setShowProductSuggestions(false);
  };

  // Note: Auto-syncing of payments removed as per user request to only process on 'Confirm'

  const handlePaymentChange = (type, value) => {
    const cleanStr = String(value).replace(/[^0-9]/g, '');
    const val = cleanStr === '' ? 0 : Number(cleanStr);

    setTempPaymentState(prev => {
      if (!prev) return prev;
      const defaultTarget = (previousBalance > 0 ? previousBalance : 0) + (totalAmount > 0 ? totalAmount : 0);
      const target = (prev.targetTotal !== undefined)
        ? prev.targetTotal
        : defaultTarget;

      if (type === 'cash') {
        const others = (Number(prev.payments?.account) || 0) + 
                       (Number(prev.payments?.card) || 0) + 
                       (Number(prev.payments?.bill) || 0) + 
                       (Number(prev.discount) || 0);
        return {
          ...prev,
          targetTotal: val + others,
          payments: {
            ...(prev.payments || {}),
            cash: val
          }
        };
      }

      if (type === 'discount') {
        const others = (Number(prev.payments?.account) || 0) + 
                       (Number(prev.payments?.card) || 0) + 
                       (Number(prev.payments?.bill) || 0);
        const newCash = Math.max(0, target - val - others);
        return {
          ...prev,
          discount: val,
          payments: {
            ...(prev.payments || {}),
            cash: newCash
          }
        };
      }

      const newPayments = {
        ...(prev.payments || {}),
        [type]: val
      };
      const others = (Number(newPayments.account) || 0) + 
                     (Number(newPayments.card) || 0) + 
                     (Number(newPayments.bill) || 0);
      const curDiscount = Number(prev.discount) || 0;
      newPayments.cash = Math.max(0, target - curDiscount - others);

      return {
        ...prev,
        payments: newPayments
      };
    });
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
          overflow-x: hidden !important;
          overflow-y: auto;
          min-width: 0;
          flex: 1;
        }
        .sales-invoice-inner {
          min-width: auto !important;
          width: 100% !important;
          display: flex;
          flex-direction: column;
          height: 100%;
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
          grid-template-columns: minmax(100px, 3.5fr) minmax(55px, 1fr) minmax(75px, 1.2fr) auto;
          gap: 6px;
          align-items: flex-end;
        }
        /* 요약 카드 너비 제한 */
        .invoice-body-flex {
          display: flex;
          gap: 12px;
          background-color: #ffffff;
          align-items: flex-start;
          padding: 8px 12px 12px 12px !important;
        }
        .invoice-body-flex > .invoice-left-part {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .invoice-body-flex > .invoice-summary-card {
          flex-shrink: 0;
          width: 260px;
          min-width: 220px;
          padding: 12px !important;
          border: 1px solid #cbd5e1 !important;
          background-color: #f8fafc !important;
          border-radius: 8px !important;
        }
        .invoice-table-container {
          max-height: 480px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .invoice-table th, .invoice-table td {
          padding: 6px 8px !important;
          font-size: 0.82rem !important;
        }
      `}</style>
      <WindowModal 
        title={isDepositOnly ? "💰 입금전표 발행" : "매출전표"} 
        onClose={onClose} 
        width="100%" 
        height="100%"
        zIndex={zIndex}
        contentPadding="0"
        noScroll={true}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          position: 'relative'
        }}>
          {/* TOP CONTROLS (flexShrink: 0) - 짙은 배경에 흰색 입력칸 */}
          <div style={{
            flexShrink: 0,
            padding: '8px 10px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #0f172a',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Row 1: [ 메뉴 ] | ◀ 2026-11-06 ▶ | [3] 통영9183 ▼ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {/* [ 메뉴 ] Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  메뉴
                </button>
                {isMenuOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      zIndex: 10000,
                      minWidth: '150px',
                      padding: '6px 0',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <button
                      onClick={() => { setIsMenuOpen(false); handleNewInvoice(); }}
                      style={{ padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <RefreshCw size={14} color="#3b82f6" /> 새전표
                    </button>
                    {onOpenLedger && (
                      <button
                        onClick={() => { setIsMenuOpen(false); onOpenLedger(invoiceData.partner, invoiceData.date); }}
                        style={{ padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <BookOpen size={14} color="#059669" /> 원장조회
                      </button>
                    )}
                    <button
                      onClick={() => { setIsMenuOpen(false); openPaymentModal(null); }}
                      style={{ padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Wallet size={14} color="#10b981" /> 입금 입력
                    </button>
                    <button
                      onClick={() => { setIsMenuOpen(false); setShowReceiptModal(true); }}
                      style={{ padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Printer size={14} color="#64748b" /> 영수증 출력
                    </button>
                    {partnerDayInvoices.length > 1 && (
                      <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 14px', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>당일 전표: {currentIndex + 1}/{partnerDayInvoices.length}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            disabled={currentIndex <= 0}
                            onClick={() => {
                              const prev = partnerDayInvoices[currentIndex - 1];
                              if (prev) { setInvoiceData({ ...prev }); setCurrentIndex(currentIndex - 1); }
                            }}
                            style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer' }}
                          >◀</button>
                          <button
                            disabled={currentIndex >= partnerDayInvoices.length - 1}
                            onClick={() => {
                              const nxt = partnerDayInvoices[currentIndex + 1];
                              if (nxt) { setInvoiceData({ ...nxt }); setCurrentIndex(currentIndex + 1); }
                            }}
                            style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: currentIndex >= partnerDayInvoices.length - 1 ? 'not-allowed' : 'pointer' }}
                          >▶</button>
                        </div>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                      <button
                        onClick={async () => {
                          setIsMenuOpen(false);
                          if (!window.confirm('현재 전표를 완전히 삭제하시겠습니까?')) return;
                          if (invoiceData.id && onDeleteInvoice) {
                            await onDeleteInvoice(invoiceData.id);
                            onClose && onClose();
                          } else {
                            onClose && onClose();
                          }
                        }}
                        style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Trash2 size={14} color="#ef4444" /> 전표 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 1: [메뉴] + [📅 2026-11-06 · [3] 통영9183 ▼ 펼치기] */}
              <button
                type="button"
                onClick={() => setShowDateVehicle(prev => !prev)}
                style={{
                  flex: 1,
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: showDateVehicle ? '#eff6ff' : '#ffffff',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
                title={showDateVehicle ? "일자/차량설정 가리기" : "일자/차량설정 펼치기"}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <Calendar size={14} color="#3b82f6" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {invoiceData.date} · {invoiceData.warehouse?.startsWith('[') ? invoiceData.warehouse : `[${invoiceData.warehouse || '차량/창고'}]`}
                  </span>
                </span>
                <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 800, flexShrink: 0 }}>
                  {showDateVehicle ? '▲ 가리기' : '▼ 펼치기'}
                </span>
              </button>
            </div>

            {/* Collapsible Date Navigation & Vehicle Selection (기본값: 가리기) */}
            {showDateVehicle && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 8px',
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: '1px solid #334155',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <DateNavButton
                    direction="prev"
                    onClick={() => {
                      const newDate = addDays(invoiceData.date, -1);
                      if (!canIssuePastDateSlip && newDate < todayStr) {
                        alert('과거일자 전표발행 권한이 없습니다.');
                        return;
                      }
                      const updatedInvoice = { ...invoiceData, date: newDate };
                      setInvoiceData(updatedInvoice);
                      if (updatedInvoice.items?.length > 0) handleAutoSave(updatedInvoice);
                    }}
                  />
                  <input 
                    type="date"
                    value={invoiceData.date}
                    min={!canIssuePastDateSlip ? todayStr : undefined}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      if (!canIssuePastDateSlip && newDate < todayStr) {
                        alert('과거일자 전표발행 권한이 없습니다.');
                        return;
                      }
                      const updatedInvoice = { ...invoiceData, date: newDate };
                      setInvoiceData(updatedInvoice);
                      if (updatedInvoice.items?.length > 0) handleAutoSave(updatedInvoice);
                    }}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      height: '34px',
                      textAlign: 'center',
                      outline: 'none',
                      flex: 1
                    }}
                  />
                  <DateNavButton
                    direction="next"
                    onClick={() => {
                      const newDate = addDays(invoiceData.date, 1);
                      const updatedInvoice = { ...invoiceData, date: newDate };
                      setInvoiceData(updatedInvoice);
                      if (updatedInvoice.items?.length > 0) handleAutoSave(updatedInvoice);
                    }}
                  />
                </div>

                <select
                  value={invoiceData.warehouse}
                  onChange={(e) => {
                    const updatedInvoice = { ...invoiceData, warehouse: e.target.value };
                    setInvoiceData(updatedInvoice);
                    if (updatedInvoice.items?.length > 0) handleAutoSave(updatedInvoice);
                  }}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    height: '34px',
                    maxWidth: '150px',
                    outline: 'none'
                  }}
                >
                  {warehouses.map((w, idx) => (
                    <option key={w.id || idx} value={w.name}>
                      [{w.code || idx + 1}] {w.name}
                    </option>
                  ))}
                  {invoiceData.warehouse && !warehouses.some(w => w.name === invoiceData.warehouse) && (
                    <option value={invoiceData.warehouse}>{invoiceData.warehouse}</option>
                  )}
                </select>
              </div>
            )}

            {/* Row 2: 거래처명 검색 (미수금은 아래쪽 합계줄로 이동하여 100% 전체 너비 확보) */}
            <div style={{ width: '100%' }}>
              <PartnerSearchInput 
                partners={partners} 
                currentUser={currentUser}
                typeFilter="매출처"
                value={invoiceData.partner} 
                nameOnly={true}
                hideReceivables={true}
                placeholder="거래처 검색..."
                onChange={(val) => {
                  const updatedInvoice = { ...invoiceData, partner: val };
                  setInvoiceData(updatedInvoice);
                  if (updatedInvoice.items && updatedInvoice.items.length > 0) {
                    handleAutoSave(updatedInvoice);
                  }
                }} 
                onSelect={(partner) => {
                  const stack = mySalesInvoices.filter(inv => inv.partner === partner.name && inv.date === invoiceData.date);
                  if (stack.length > 0 && !editingInvoice) {
                    const latestInvoice = [...stack].sort((a, b) => b.id - a.id)[0];
                    setInvoiceData({ ...latestInvoice });
                    setCurrentIndex(stack.findIndex(inv => inv.id === latestInvoice.id));
                    handleAutoSave(latestInvoice);
                  } else {
                    const targetMgr = currentUser?.name || invoiceData.manager;
                    setInvoiceData(prev => ({ 
                      ...prev, 
                      id: Date.now(), 
                      partner: partner.name, 
                      manager: targetMgr,
                      warehouse: getStaffWarehouse(targetMgr, staffList, warehouses, currentUser),
                      items: [], 
                      receivedAmount: 0, 
                      creator: currentUser?.name || '시스템'
                    }));
                    setCurrentIndex(0);
                  }
                  productInputRef.current?.focus();
                }}
                autoFocus={!invoiceData.partner}
              />
            </div>

            {/* Row 3: [ 상품명 ▼ ] [ 상품 입력 (오렌지 테두리) ] [ 🔍 ] */}
            <div style={{ position: 'relative', width: '100%' }} ref={productSearchRef}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  style={{
                    height: '36px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    padding: '0 6px',
                    color: '#1e293b',
                    outline: 'none',
                    flexShrink: 0
                  }}
                >
                  <option value="name">상품명</option>
                  <option value="abbr">초성</option>
                  <option value="code">바코드</option>
                  <option value="all">전체</option>
                </select>

                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={productInputRef}
                    type="text"
                    lang="ko"
                    autoComplete="off"
                    placeholder="상품 입력"
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
                          handleQuickAddProduct(productSuggestions[productSelectedIndex], searchQty);
                        } else if (productSuggestions.length === 1) {
                          e.preventDefault();
                          handleQuickAddProduct(productSuggestions[0], searchQty);
                        }
                      } else if (e.key === 'Escape') {
                        setShowProductSuggestions(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '36px',
                      border: '2px solid #f97316',
                      borderRadius: '6px',
                      padding: '0 10px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      outline: 'none',
                      boxShadow: '0 0 0 1px rgba(249, 115, 22, 0.2)'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (searchItem.trim()) {
                      setShowProductSuggestions(true);
                    } else {
                      productInputRef.current?.focus();
                    }
                  }}
                  style={{
                    height: '36px',
                    width: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <Search size={16} color="#0f172a" />
                </button>
              </div>

              {/* Autocomplete Suggestions Dropdown */}
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div
                  ref={productListRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  {productSuggestions.map((p, idx) => {
                    const sq = getStockQty(p.id, invoiceData.warehouse);
                    const badge = getStockBadge(sq);
                    const defaultP = getProductDefaultPrice(p);
                    return (
                      <div
                        key={p.id || idx}
                        onMouseDown={() => handleQuickAddProduct(p, searchQty)}
                        onMouseEnter={() => setProductSelectedIndex(idx)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx === productSelectedIndex ? '#fef3c7' : '#ffffff'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{p.name}</div>
                          {p.spec && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.spec}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {sq !== null && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '10px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.color}30`
                            }}>
                              재고 {sq}
                            </span>
                          )}
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: themeColor }}>
                            {(defaultP || 0).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* TABLE HEADER (flexShrink: 0) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e293b',
            color: '#cbd5e1',
            padding: '6px 8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            flexShrink: 0,
            userSelect: 'none'
          }}>
            <div style={{ width: '32px', textAlign: 'center', color: '#eab308' }}>순번</div>
            <div style={{ flex: 1, paddingLeft: '4px' }}>상품명</div>
            <div style={{ width: '74px', textAlign: 'right' }}>단가</div>
            <div style={{ width: '46px', textAlign: 'right' }}>수량</div>
            <div style={{ width: '85px', textAlign: 'right', paddingRight: '4px' }}>금액</div>
            <div style={{ width: '28px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleClearAllItems}
                title="전체 삭제"
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* ITEM LIST (flex: 1, minHeight: 0, overflowY: 'auto') */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            backgroundColor: '#f8fafc'
          }}>
            {(!invoiceData.items || invoiceData.items.length === 0) ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '120px',
                color: '#94a3b8',
                fontSize: '0.82rem',
                padding: '20px'
              }}>
                <div>등록된 품목이 없습니다.</div>
                <div style={{ fontSize: '0.74rem', marginTop: '4px', color: '#cbd5e1' }}>상단 검색창에서 상품을 입력하여 추가하세요.</div>
              </div>
            ) : (
              invoiceData.items.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                    padding: '6px 8px'
                  }}
                >
                  {/* Line 1: 순번(노란색) + 상품명 + 삭제버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ color: '#eab308', fontWeight: 900, fontSize: '0.92rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {item.spec && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', flexShrink: 0 }}>
                          ({item.spec})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Line 2: 우측 정렬 단가, 수량, 금액 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>단가:</span>
                      <input
                        type="text"
                        value={item.price !== undefined && item.price !== null ? Number(item.price).toLocaleString() : ''}
                        onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                        onBlur={() => handleItemPriceBlur(item)}
                        style={{
                          width: '74px',
                          textAlign: 'right',
                          padding: '2px 4px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>수량:</span>
                      <input
                        type="text"
                        value={item.qty !== undefined && item.qty !== null ? item.qty : ''}
                        onChange={(e) => handleUpdateItemQty(item.id, e.target.value)}
                        style={{
                          width: '46px',
                          textAlign: 'right',
                          padding: '2px 4px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: '85px', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                        {(Number(item.total) || 0).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>원</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SUMMARY ROW (flexShrink: 0) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '7px 12px',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}>
            {/* 1행: [합계] · 총수량 ---------------- 합계금액 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                }}>
                  [합계]
                </span>
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                  총수량: <strong style={{ color: '#38bdf8' }}>{totalQty}</strong>
                </span>
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap' }}>
                {totalAmount.toLocaleString()}원
              </span>
            </div>

            {/* 2행: 미수금 (하단에 줄바꿈 없이 깔끔하게 분리 표시) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '3px',
              marginTop: '1px'
            }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                거래처 총 미수금:
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
                {finalBalance.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* BOTTOM ACTION BAR (flexShrink: 0) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            padding: '8px 10px',
            backgroundColor: '#f1f5f9',
            borderTop: '1px solid #cbd5e1',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              onClick={handleNewInvoice}
              style={{
                height: '42px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <FileText size={15} color="#3b82f6" /> 새전표
            </button>

            <button
              type="button"
              onClick={() => openPaymentModal(null)}
              style={{
                height: '42px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Wallet size={15} color="#10b981" /> 입금
            </button>

            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              style={{
                height: '42px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Printer size={15} color="#64748b" /> 영수증
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleManualSave}
              style={{
                height: '42px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isSaving ? '#94a3b8' : themeColor,
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <Save size={15} /> {isSaving ? '저장중' : '전표저장'}
            </button>
          </div>


        {isPaymentModalOpen && tempPaymentState && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10001, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: 'white', borderRadius: '16px', width: '420px', maxWidth: '92vw',
              padding: '20px 22px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 800 }}>
                  <Wallet color="#10b981" />
                  {editingPaymentSlipId 
                    ? '✏️ 수금전표 수정' 
                    : ((!invoiceData.items || invoiceData.items.length === 0) ? '💰 입금전표 발행 (수금/입금 입력)' : '💰 수금전표 발행 (수금 입력)')}
                </h3>
                <button onClick={() => { setIsPaymentModalOpen(false); setEditingPaymentSlipId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>전미수금 (이전 미수금):</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>
                    {previousBalance.toLocaleString()}원
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>당일 출고금액 (금일 합계):</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: themeColor }}>
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>수금 대상 총액 (기준):</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                    {(tempPaymentState.targetTotal || 0).toLocaleString()}원
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>수금 일자</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <DateNavButton
                        direction="prev"
                        size={11}
                        style={{ width: '20px', height: '20px', minWidth: '20px' }}
                        onClick={() => {
                          const cur = tempPaymentState.date || invoiceData.date;
                          const newDate = addDays(cur, -1);
                          if (!canIssuePastDateDeposit && newDate < todayStr) {
                            alert('과거일자 입금전표발행 권한이 없습니다.');
                            return;
                          }
                          setTempPaymentState(prev => ({ ...prev, date: newDate }));
                        }}
                      />
                      <input 
                        type="date"
                        value={tempPaymentState.date || invoiceData.date}
                        min={!canIssuePastDateDeposit ? todayStr : undefined}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          if (!canIssuePastDateDeposit && newDate < todayStr) {
                            alert('과거일자 입금전표발행 권한이 없습니다. 당일 또는 미래일자만 선택할 수 있습니다.');
                            return;
                          }
                          setTempPaymentState(prev => ({ ...prev, date: newDate }));
                        }}
                        style={{ flex: 1, minWidth: 0, padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.78rem' }}
                      />
                      <DateNavButton
                        direction="next"
                        size={11}
                        style={{ width: '20px', height: '20px', minWidth: '20px' }}
                        onClick={() => {
                          const cur = tempPaymentState.date || invoiceData.date;
                          const newDate = addDays(cur, 1);
                          setTempPaymentState(prev => ({ ...prev, date: newDate }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, display: 'block', marginBottom: '4px' }}>현장 할인 (D.C)</label>
                    <input
                      type="text"
                      value={tempPaymentState.discount ? tempPaymentState.discount.toLocaleString() : ''}
                      onChange={(e) => handlePaymentChange('discount', e.target.value)}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', backgroundColor: '#fff5f5', textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'cash', label: '현금 수금 (입금)', color: '#047857' },
                    { id: 'account', label: '계좌 이체', color: themeColor },
                    { id: 'card', label: '카드 결제', color: '#ef4444' },
                    { id: 'bill', label: '어음 수금', color: '#f59e0b' },
                  ].map(item => (
                    <div key={item.id} className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem', color: item.color, fontWeight: 700, display: 'block', marginBottom: '4px' }}>{item.label}</label>
                      <input
                        type="text"
                        value={tempPaymentState?.payments?.[item.id] ? tempPaymentState.payments[item.id].toLocaleString() : ''}
                        onChange={(e) => handlePaymentChange(item.id, e.target.value)}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'right' }}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>수금 비고 / 메모</label>
                  <input 
                    type="text"
                    value={tempPaymentState.memo || ''}
                    placeholder="예: 1차 수금, 무통장입금 등"
                    onChange={(e) => setTempPaymentState({ ...tempPaymentState, memo: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>입금 합계 (현금+계좌+카드+어음):</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                      {((Number(tempPaymentState?.payments?.cash) || 0) + 
                        (Number(tempPaymentState?.payments?.account) || 0) + 
                        (Number(tempPaymentState?.payments?.card) || 0) + 
                        (Number(tempPaymentState?.payments?.bill) || 0)).toLocaleString()}원
                    </span>
                    {(Number(tempPaymentState?.discount) || 0) > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '6px', fontWeight: 700 }}>
                        (할인 -{Number(tempPaymentState.discount).toLocaleString()}원)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => { setIsPaymentModalOpen(false); setEditingPaymentSlipId(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  취소
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                  onClick={handleSavePaymentModal}
                >
                  {editingPaymentSlipId 
                    ? '수금전표 수정 완료' 
                    : '💰 입금 저장'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </WindowModal>

      {/* 영수증 미리보기 모달 및 모바일 프린터 직접 인쇄 (화면 표시 & 출력) */}
      {showReceiptModal && createPortal(
        <div className="receipt-print-portal">
          <div className="receipt-modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* 상단 툴바 (인쇄 시 숨김) */}
              <div className="receipt-modal-header receipt-modal-no-print">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}>
                  <Printer size={18} color="#38bdf8" />
                  <span>거래명세표(전표) 영수증 미리보기</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={15} />
                    <span>프린터 출력</span>
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* 영수증 본문 (스크롤 가능 / 인쇄 영역) */}
              <div className="receipt-scroll-body">
                <div className="print-statement" style={{ maxWidth: '480px', margin: '0 auto', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif' }}>
                  
                  {/* 1. Header Title & Date */}
                  <div style={{ marginBottom: '10px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: '900', letterSpacing: '4px', margin: '0 0 8px 0', borderBottom: '2px solid #0f172a', paddingBottom: '6px' }}>
                      거래명세표(전표)
                    </h1>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <strong>일 자 :</strong> <span>{invoiceData.date}</span>
                      </div>
                      <div style={{ color: '#64748b' }}>
                        전표번호 : {invoiceData.id || '-'}
                      </div>
                    </div>
                  </div>

                  {/* 2. 기본 정보: 공급받는자 & 공급자 */}
                  {(() => {
                    const partnerObj = (partners || []).find(p => p.name === invoiceData.partner || String(p.id) === String(invoiceData.partnerId)) || {};
                    return (
                      <table className="print-info-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                        <tbody>
                          <tr>
                            <th style={{ width: '4%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center', padding: '4px 2px' }} rowSpan="4">
                              공<br/>급<br/>받<br/>는<br/>자
                            </th>
                            <th style={{ width: '16%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>상호(거래처명)</th>
                            <td style={{ width: '30%', border: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: '800' }}>
                              {partnerObj.name || invoiceData.partner || '-'} <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b' }}>귀하</span>
                            </td>
                            <th style={{ width: '4%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center', padding: '4px 2px' }} rowSpan="4">
                              공<br/>급<br/>자
                            </th>
                            <th style={{ width: '16%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>상호(회사명)</th>
                            <td style={{ width: '30%', border: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: '800' }}>
                              {companyInfo.companyName || companyInfo.name || '본사'}
                            </td>
                          </tr>
                          <tr>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>대표자</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {partnerObj.ceo || partnerObj.representative || partnerObj.owner || '-'}
                            </td>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>대표자</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {companyInfo.representative || companyInfo.ceo || '-'}
                            </td>
                          </tr>
                          <tr>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>전화번호</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {partnerObj.phone || partnerObj.mobile || partnerObj.tel || '-'}
                            </td>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>전화번호</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {companyInfo.phone || companyInfo.tel || '-'}
                            </td>
                          </tr>
                          <tr>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>사업자번호</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {partnerObj.businessNo || partnerObj.businessNumber || partnerObj.bizNo || '-'}
                            </td>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>사업자번호</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {companyInfo.bizNumber || companyInfo.businessNo || '-'}
                            </td>
                          </tr>
                          <tr>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }} colSpan="2">업태 / 종목</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {[partnerObj.businessType || partnerObj.uptae, partnerObj.businessItem || partnerObj.jongmok].filter(Boolean).join(' / ') || '-'}
                            </td>
                            <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }} colSpan="2">업태 / 종목</th>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>
                              {[companyInfo.businessType, companyInfo.businessCategory || companyInfo.businessItem].filter(Boolean).join(' / ') || '-'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* 3. 품목 / 수량 / 단가 / 금액 목록 */}
                  <table className="print-item-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #334155', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', width: '45%' }}>품목</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '15%' }}>수량</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', width: '20%' }}>단가</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', width: '20%' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoiceData.items || []).map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600' }}>
                            {item.name}
                            {item.spec && <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>({item.spec})</span>}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            {item.isBox ? `1박스 (${item.qty})` : item.qty}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            {(Number(item.price) || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                            {(Number(item.total) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #334155', borderBottom: '2px solid #334155' }}>
                        <td style={{ padding: '7px 8px', fontWeight: '800', textAlign: 'left' }}>합 계</td>
                        <td style={{ padding: '7px 4px', fontWeight: '800', textAlign: 'center' }}>
                          {(invoiceData.items || []).reduce((acc, it) => acc + (Number(it.qty) || 0), 0)}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '11px', color: '#64748b' }}>공급가 총계</td>
                        <td style={{ padding: '7px 8px', fontWeight: '900', textAlign: 'right', fontSize: '13.5px', color: '#0f172a' }}>
                          {totalAmount.toLocaleString()}원
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* 4. 입금합계 및 입금종류별 합계금액, 전미수/입금합계/현미수 */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px', backgroundColor: '#ffffff' }}>
                    {/* 4-1. 입금종류별 합계금액 */}
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                        ■ 입금 내역 (입금종류별)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 2px', backgroundColor: '#f8fafc' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>현금</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700' }}>{(invoiceData.payments?.cash || 0).toLocaleString()}원</span>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 2px', backgroundColor: '#f8fafc' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>계좌</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700' }}>{(invoiceData.payments?.account || 0).toLocaleString()}원</span>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 2px', backgroundColor: '#f8fafc' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>카드</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700' }}>{(invoiceData.payments?.card || 0).toLocaleString()}원</span>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '4px 2px', backgroundColor: '#f8fafc' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>어음</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700' }}>{(invoiceData.payments?.bill || 0).toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>

                    {/* 4-2. 전미수, 입금합계, 현미수 순 정산 바 */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                      <div style={{ padding: '5px 4px', backgroundColor: '#f8fafc', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>전미수</span>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e293b' }}>
                          {previousBalance.toLocaleString()}원
                        </span>
                      </div>
                      <div style={{ padding: '5px 4px', backgroundColor: '#f0fdf4', borderRadius: '5px', border: '1px solid #bbf7d0' }}>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#15803d', marginBottom: '2px' }}>입금합계</span>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#16a34a' }}>
                          {(invoiceData.receivedAmount || 0).toLocaleString()}원
                        </span>
                      </div>
                      <div style={{ padding: '5px 4px', backgroundColor: '#fef2f2', borderRadius: '5px', border: '1px solid #fecaca' }}>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#b91c1c', marginBottom: '2px' }}>현미수</span>
                        <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#dc2626' }}>
                          {finalBalance.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. 서명란 (모바일 설정에 따라 토글) */}
                  {showReceiptSignature && (
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', backgroundColor: '#ffffff' }}>
                      <div style={{ fontSize: '11px', color: '#475569' }}>
                        상기 물품을 정히 영수(인수)함.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700' }}>
                        <span>인수자 :</span>
                        <span style={{ display: 'inline-block', width: '100px', borderBottom: '1px solid #334155', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                          ( 서 명 )
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="print-footer" style={{ marginTop: '10px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                    <p style={{ margin: 0 }}>감사합니다. 귀사의 일익 번창하심을 기원합니다.</p>
                  </div>
                </div>
              </div>

              {/* 하단 툴바 (인쇄 시 숨김) */}
              <div className="receipt-modal-footer receipt-modal-no-print">
                <button
                  onClick={() => window.print()}
                  style={{
                    flex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={18} />
                  <span>🖨️ 영수증 인쇄 (프린터 출력)</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#64748b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Hidden Print Layout (거래명세표(전표) 영수증 인쇄) */}
      <div className="print-only-container">
        <div className="print-statement" style={{ maxWidth: '800px', margin: '0 auto', color: '#1e293b' }}>
          
          {/* 1. Header Title & Date */}
          <div className="print-header" style={{ marginBottom: '10px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '26px', fontWeight: '900', letterSpacing: '4px', margin: '0 0 10px 0', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
              거래명세표(전표)
            </h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
              <div>
                <strong>일 자 :</strong> <span>{invoiceData.date}</span>
              </div>
              <div style={{ color: '#64748b' }}>
                전표번호 : {invoiceData.id || '-'}
              </div>
            </div>
          </div>

          {/* 2. 기본 정보: 공급받는자 & 공급자 */}
          {(() => {
            const partnerObj = (partners || []).find(p => p.name === invoiceData.partner || String(p.id) === String(invoiceData.partnerId)) || {};
            return (
              <table className="print-info-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <th style={{ width: '3%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center', padding: '4px 2px' }} rowSpan="4">
                      공<br/>급<br/>받<br/>는<br/>자
                    </th>
                    <th style={{ width: '15%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>상호(거래처명)</th>
                    <td style={{ width: '32%', border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: '800' }}>
                      {partnerObj.name || invoiceData.partner || '-'} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>귀하</span>
                    </td>
                    <th style={{ width: '3%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center', padding: '4px 2px' }} rowSpan="4">
                      공<br/>급<br/>자
                    </th>
                    <th style={{ width: '15%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>상호(회사명)</th>
                    <td style={{ width: '32%', border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: '800' }}>
                      {companyInfo.companyName || companyInfo.name || '본사'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>대표자</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {partnerObj.ceo || partnerObj.representative || partnerObj.owner || '-'}
                    </td>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>대표자</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {companyInfo.representative || companyInfo.ceo || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>전화번호</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {partnerObj.phone || partnerObj.mobile || partnerObj.tel || '-'}
                    </td>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>전화번호</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {companyInfo.phone || companyInfo.tel || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>사업자번호</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {partnerObj.businessNo || partnerObj.businessNumber || partnerObj.bizNo || '-'}
                    </td>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>사업자번호</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {companyInfo.bizNumber || companyInfo.businessNo || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }} colSpan="2">업태 / 종목</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {[partnerObj.businessType || partnerObj.uptae, partnerObj.businessItem || partnerObj.jongmok].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <th style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }} colSpan="2">업태 / 종목</th>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      {[companyInfo.businessType, companyInfo.businessCategory || companyInfo.businessItem].filter(Boolean).join(' / ') || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}

          {/* 3. 품목 / 수량 / 단가 / 금액 목록 */}
          <table className="print-item-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #334155', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', width: '45%' }}>품목</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', width: '15%' }}>수량</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', width: '20%' }}>단가</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', width: '20%' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {(invoiceData.items || []).map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '600' }}>
                    {item.name}
                    {item.spec && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({item.spec})</span>}
                  </td>
                  <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                    {item.isBox ? `1박스 (${item.qty})` : item.qty}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {(Number(item.price) || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700' }}>
                    {(Number(item.total) || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #334155', borderBottom: '2px solid #334155' }}>
                <td style={{ padding: '8px 10px', fontWeight: '800', textAlign: 'left' }}>합 계</td>
                <td style={{ padding: '8px 6px', fontWeight: '800', textAlign: 'center' }}>
                  {(invoiceData.items || []).reduce((acc, it) => acc + (Number(it.qty) || 0), 0)}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>공급가액 총계</td>
                <td style={{ padding: '8px 10px', fontWeight: '900', textAlign: 'right', fontSize: '15px', color: '#0f172a' }}>
                  {totalAmount.toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          </table>

          {/* 4. 입금합계 및 입금종류별 합계금액, 전미수/입금합계/현미수 */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', backgroundColor: '#ffffff' }}>
            {/* 4-1. 입금종류별 합계금액 */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>
                ■ 입금 내역 (입금종류별)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 4px', backgroundColor: '#f8fafc' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>현금</span>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{(invoiceData.payments?.cash || 0).toLocaleString()}원</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 4px', backgroundColor: '#f8fafc' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>계좌</span>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{(invoiceData.payments?.account || 0).toLocaleString()}원</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 4px', backgroundColor: '#f8fafc' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>카드</span>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{(invoiceData.payments?.card || 0).toLocaleString()}원</span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 4px', backgroundColor: '#f8fafc' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>어음</span>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{(invoiceData.payments?.bill || 0).toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* 4-2. 전미수, 입금합계, 현미수 순 정산 바 */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>전미수</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {previousBalance.toLocaleString()}원
                </span>
              </div>
              <div style={{ padding: '6px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#15803d', marginBottom: '2px' }}>입금합계</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a' }}>
                  {(invoiceData.receivedAmount || 0).toLocaleString()}원
                </span>
              </div>
              <div style={{ padding: '6px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#b91c1c', marginBottom: '2px' }}>현미수</span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626' }}>
                  {finalBalance.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 5. 서명란 (모바일 설정에 따라 토글) */}
          {showReceiptSignature && (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                상기 물품을 정히 영수(인수)함.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700' }}>
                <span>인수자 :</span>
                <span style={{ display: 'inline-block', width: '120px', borderBottom: '1px solid #334155', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                  ( 서 명 )
                </span>
              </div>
            </div>
          )}

          <div className="print-footer" style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
            <p style={{ margin: 0 }}>감사합니다. 귀사의 일익 번창하심을 기원합니다.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesInvoice;
