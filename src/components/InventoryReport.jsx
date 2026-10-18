import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart3, Printer, Download, Search, Calendar, Warehouse, ArrowLeftRight, ArrowRight, Package, AlertCircle, X, User, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Save, Edit3, Check } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';
import ProductCategoryModal from './ProductCategoryModal';
import { db } from '../firebase';
import { doc, writeBatch, setDoc } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import { getProductWarehouseInitialStock, getProductTotalInitialStock } from '../utils/productStockUtils';
import { BatchWarehouseInitialStockModal } from './WarehouseInitialStockModal';
import './InventoryReport.css';

const InventoryReport = ({ 
  onClose, products = [], setProducts, categories = [], warehouses = [], partners = [], 
  inventory = {}, purchaseInvoices = [], historyData = [], defaultTab = 'daily',
  salesInvoices = [], salesOrders = [], onOpenSalesInvoice, onOpenSalesOrder,
  onOpenPurchaseInvoice, onOpenInventoryTransfer,
  setCategories, currentUser,
  staffList = [], schedules = [], setSchedules, onMoveStock
}) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobile = true;

  const getNormalizedTab = (tab) => {
    if (tab === '일자별' || tab === 'daily' || tab === '일자별 재고현황(창고별이동현황)') return 'daily';
    if (tab === '최종' || tab === 'final' || tab === '최종 재고 현황(창고별 최종재고현황)') return 'final';
    if (tab === '매입처별' || tab === 'partner') return 'partner';
    return 'daily';
  };

  const [activeTab, setActiveTab] = useState(getNormalizedTab(defaultTab));
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  React.useEffect(() => {
    setActiveTab(getNormalizedTab(defaultTab));
  }, [defaultTab]);
  
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const firstDayOfMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  const [filters, setFilters] = useState(() => {
    const savedHideZero = localStorage.getItem('linkerx_inventory_report_hide_zero');
    return {
      startDate: today,
      endDate: today,
      fromWarehouse: '전체 창고',
      toWarehouse: '전체 창고',
      selectedWarehouse: '전체 창고',
      selectedSupplier: '전체 매입처',
      categoryLarge: '전체',
      categoryMedium: '전체',
      categorySmall: '전체',
      searchTerm: '',
      hideZeroStock: savedHideZero !== null ? savedHideZero === 'true' : false
    };
  });
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierSelectedIndex, setSupplierSelectedIndex] = useState(0);
  const supplierDropdownRef = useRef(null);

  // ─── 창고별 기초 재고 편집 및 일괄 설정 상태 ───
  const [editedStocks, setEditedStocks] = useState({}); // { [productId]: { [warehouseName]: number } }
  const [isSavingStocks, setIsSavingStocks] = useState(false);
  const [selectedProductForWarehouseModal, setSelectedProductForWarehouseModal] = useState(null);
  const [isBatchWarehouseModalOpen, setIsBatchWarehouseModalOpen] = useState(false);

  const handleStockInputChange = (productId, warehouseName, rawValue) => {
    const cleanValue = rawValue.replace(/[^0-9]/g, '');
    const numValue = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
    setEditedStocks(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [warehouseName]: numValue
      }
    }));
  };

  const handleSaveInitialStocks = async (specificEdits = null) => {
    const editsToSave = specificEdits || editedStocks;
    const productIds = Object.keys(editsToSave);
    if (productIds.length === 0) return;

    setIsSavingStocks(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      const updatedMap = new Map();

      productIds.forEach(id => {
        const prod = products.find(p => String(p.id) === String(id));
        if (!prod) return;

        const currentWhStock = { ...(prod.warehouseInitialStock || {}) };
        
        // 기존 단일 warehouse/initialStock 데이터가 있으면 초기 맵에 반영
        if (Object.keys(currentWhStock).length === 0 && (prod.initialStock || prod.warehouse)) {
          const mainWh = warehouses[0]?.name || '본사창고';
          const defaultWh = prod.warehouse || mainWh;
          currentWhStock[defaultWh] = Number(prod.initialStock) || 0;
        }

        const newWhChanges = editsToSave[id];
        Object.entries(newWhChanges).forEach(([wh, val]) => {
          currentWhStock[wh] = Number(val) || 0;
        });

        const totalInitial = Object.values(currentWhStock).reduce((sum, v) => sum + (Number(v) || 0), 0);

        const updatedProd = {
          ...prod,
          warehouseInitialStock: currentWhStock,
          initialStock: totalInitial,
          companyId,
          updatedAt: new Date().toISOString()
        };

        updatedMap.set(String(id), updatedProd);
        batch.set(doc(db, 'companies', companyId, 'products', String(id)), updatedProd, { merge: true });
      });

      await batch.commit();

      const nextProducts = products.map(p => updatedMap.get(String(p.id)) || p);
      if (setProducts) setProducts(nextProducts);
      await saveBundle(companyId, 'products', nextProducts);

      if (!specificEdits) {
        setEditedStocks({});
      }
      alert('기초 재고가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Error saving initial stocks:', err);
      alert('기초 재고 저장 중 오류가 발생했습니다: ' + err.message);
      throw err;
    } finally {
      setIsSavingStocks(false);
    }
  };

  const handleSaveSingleProductWarehouseStocks = async (productId, newWarehouseStocks) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const prod = products.find(p => String(p.id) === String(productId));
      if (!prod) return;

      const currentWhStock = { ...(prod.warehouseInitialStock || {}) };
      Object.entries(newWarehouseStocks).forEach(([wh, val]) => {
        currentWhStock[wh] = Number(val) || 0;
      });
      const totalInitial = Object.values(currentWhStock).reduce((sum, v) => sum + (Number(v) || 0), 0);

      const updatedProd = {
        ...prod,
        warehouseInitialStock: currentWhStock,
        initialStock: totalInitial,
        companyId,
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'companies', companyId, 'products', String(productId)), updatedProd, { merge: true });
      await batch.commit();

      const nextProducts = products.map(p => String(p.id) === String(productId) ? updatedProd : p);
      if (setProducts) setProducts(nextProducts);
      await saveBundle(companyId, 'products', nextProducts);

      setSelectedProductForWarehouseModal(null);
      alert(`[${prod.name}] 창고별 기초 재고가 저장되었습니다.`);
    } catch (err) {
      console.error('Error saving single product warehouse stock:', err);
      alert('기초 재고 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const supplierPartners = useMemo(() => {
    return (partners || []).filter(p => p.type === '매입처' || p.type === '혼합' || p.type === '공통' || p.type === '매입매출처');
  }, [partners]);

  const suggestedSuppliers = useMemo(() => {
    const term = (filters.selectedSupplier === '전체 매입처' || filters.selectedSupplier === '전체' ? '' : filters.selectedSupplier || '').trim();
    if (!term) return supplierPartners;
    return supplierPartners.filter(p => 
      matchesInitialSound(p.name, term) || 
      p.name.toLowerCase().includes(term.toLowerCase())
    );
  }, [supplierPartners, filters.selectedSupplier]);

  const handleSupplierKeyDown = (e) => {
    if (!isSupplierDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsSupplierDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSupplierSelectedIndex(prev => (prev < suggestedSuppliers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSupplierSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (supplierSelectedIndex === -1) {
        setFilters(prev => ({ ...prev, selectedSupplier: '전체 매입처' }));
        setIsSupplierDropdownOpen(false);
      } else if (suggestedSuppliers[supplierSelectedIndex]) {
        setFilters(prev => ({ ...prev, selectedSupplier: suggestedSuppliers[supplierSelectedIndex].name }));
        setIsSupplierDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSupplierDropdownOpen(false);
    }
  };

  const handleQuickDate = (type) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDate(today);

    switch (type) {
      case '당일':
      case '오늘':
        start = formatDate(today);
        end = formatDate(today);
        break;
      case '1년':
        start = `${y}-01-01`;
        end = `${y}-12-31`;
        break;
      case '상반기':
        start = `${y}-01-01`;
        end = `${y}-06-30`;
        break;
      case '하반기':
        start = `${y}-07-01`;
        end = `${y}-12-31`;
        break;
      case '한달':
        start = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
      case '1주일':
        const day = today.getDay();
        const sun = new Date(today);
        sun.setDate(today.getDate() - day);
        start = formatDate(sun);
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }

    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  const handleShiftDay = (delta) => {
    const shift = (dateStr) => {
      const baseStr = dateStr || today;
      const parts = baseStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + delta);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      return dateStr;
    };
    setFilters(prev => ({
      ...prev,
      startDate: shift(prev.startDate),
      endDate: shift(prev.endDate)
    }));
  };

  const handleMemoClick = (row) => {
    // 1. 매출전표 (Sales Invoice)
    if (row.salesInvoiceId || row.memo?.includes('매출') || row.to === '매출출고') {
      let inv = null;
      if (row.salesInvoiceId) {
        inv = salesInvoices.find(i => String(i.id) === String(row.salesInvoiceId));
      }
      if (!inv) {
        inv = salesInvoices.find(i => 
          i.date === row.date && 
          i.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
        );
      }
      if (inv) {
        if (onOpenSalesInvoice) {
          onOpenSalesInvoice(inv);
          onClose();
        }
      } else {
        alert('매칭되는 매출전표를 찾을 수 없습니다.');
      }
    }
    // 2. 매입전표 (Purchase Invoice)
    else if (row.purchaseInvoiceId || row.memo?.includes('매입') || row.from === '매입입고') {
      let inv = null;
      if (row.purchaseInvoiceId) {
        inv = purchaseInvoices.find(i => String(i.id) === String(row.purchaseInvoiceId));
      }
      if (!inv) {
        inv = purchaseInvoices.find(i => 
          i.date === row.date && 
          i.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
        );
      }
      if (inv) {
        if (onOpenPurchaseInvoice) {
          onOpenPurchaseInvoice(inv);
          onClose();
        }
      } else {
        alert('매칭되는 매입전표를 찾을 수 없습니다.');
      }
    }
    // 3. 주문서 (Sales Order)
    else if (row.salesOrderId || row.memo?.includes('상차')) {
      let order = null;
      if (row.salesOrderId) {
        order = salesOrders.find(o => String(o.id) === String(row.salesOrderId));
      }
      if (!order) {
        const parseOrderItems = (text) => {
          if (!text) return [];
          const tokens = text.trim().split(/[\s\n]+/);
          return tokens.map(token => {
            const match = token.match(/^(.+?)(\d+)$/);
            return match ? { name: match[1], qty: parseInt(match[2], 10) } : { name: token, qty: 0 };
          });
        };
        order = salesOrders.find(o => 
          o.date === row.date && 
          parseOrderItems(o.itemsText).some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
        );
      }
      if (order) {
        if (onOpenSalesOrder) {
          onOpenSalesOrder(order);
          onClose();
        }
      } else {
        alert('매칭되는 주문서를 찾을 수 없습니다.');
      }
    }
    // 4. 수동이동 (Manual warehouse transfer)
    else if (row.memo === '수동이동' || row.memo === '창고이동' || (!row.salesInvoiceId && !row.purchaseInvoiceId && !row.salesOrderId)) {
      if (onOpenInventoryTransfer) {
        onOpenInventoryTransfer(row.date);
        onClose();
      }
    }
  };

  const tabs = [
    { id: 'daily', label: '일자별 재고현황(창고별이동현황)' },
    { id: 'final', label: '최종 재고 현황(창고별 최종재고현황)' },
    { id: 'partner', label: '매입처별 재고현황' }
  ];

  const getWarehouseColor = (name) => {
    const wh = warehouses.find(w => w.name === name);
    return wh?.color || '#64748b';
  };

  const filteredDailyData = useMemo(() => {
    return historyData.filter(item => {
      const matchesDate = item.date >= filters.startDate && item.date <= filters.endDate;
      const matchesFrom = filters.fromWarehouse === '전체 창고' || item.from === filters.fromWarehouse;
      const matchesTo = filters.toWarehouse === '전체 창고' || item.to === filters.toWarehouse;
      const product = products.find(p => p.name === item.item);
      const matchesLarge = filters.categoryLarge === '전체' || (product && product.categoryLarge === filters.categoryLarge);
      const matchesMedium = filters.categoryMedium === '전체' || (product && product.categoryMedium === filters.categoryMedium);
      const matchesSmall = filters.categorySmall === '전체' || (product && product.categorySmall === filters.categorySmall);
      const matchesSearch = !filters.searchTerm || 
        matchesInitialSound(item.item, filters.searchTerm) || 
        (product?.abbreviation && matchesInitialSound(product.abbreviation, filters.searchTerm));
      
      return matchesDate && matchesFrom && matchesTo && matchesLarge && matchesMedium && matchesSmall && matchesSearch;
    });
  }, [historyData, filters, products]);

  const filteredFinalData = useMemo(() => {
    return products.filter(p => {
      const matchesLarge = filters.categoryLarge === '전체' || p.categoryLarge === filters.categoryLarge;
      const matchesMedium = filters.categoryMedium === '전체' || p.categoryMedium === filters.categoryMedium;
      const matchesSmall = filters.categorySmall === '전체' || p.categorySmall === filters.categorySmall;
      const matchesSearch = !filters.searchTerm || 
        matchesInitialSound(p.name, filters.searchTerm) ||
        (p.abbreviation && matchesInitialSound(p.abbreviation, filters.searchTerm));
      return matchesLarge && matchesMedium && matchesSmall && matchesSearch;
    }).map(p => {
      let stock = 0;
      if (filters.selectedWarehouse === '전체 창고') {
        stock = Object.values(inventory).reduce((sum, whStocks) => sum + (whStocks[p.name] || 0), 0);
      } else {
        stock = inventory[filters.selectedWarehouse]?.[p.name] || 0;
      }
      return { ...p, displayStock: stock };
    }).filter(p => {
      const baseStock = filters.selectedWarehouse === '전체 창고'
        ? getProductTotalInitialStock(p, warehouses)
        : (editedStocks[p.id]?.[filters.selectedWarehouse] !== undefined
            ? (parseInt(editedStocks[p.id][filters.selectedWarehouse], 10) || 0)
            : getProductWarehouseInitialStock(p, filters.selectedWarehouse, warehouses));
      const finalStock = baseStock + p.displayStock;
      return !filters.hideZeroStock || finalStock !== 0;
    });
  }, [products, inventory, filters, warehouses, editedStocks]);

  const filteredPartnerData = useMemo(() => {
    // Determine which products belong to which supplier based on product master OR purchase history
    return products.filter(p => {
      const matchesLarge = filters.categoryLarge === '전체' || p.categoryLarge === filters.categoryLarge;
      const matchesMedium = filters.categoryMedium === '전체' || p.categoryMedium === filters.categoryMedium;
      const matchesSmall = filters.categorySmall === '전체' || p.categorySmall === filters.categorySmall;
      const matchesSearch = !filters.searchTerm || 
        matchesInitialSound(p.name, filters.searchTerm) ||
        (p.abbreviation && matchesInitialSound(p.abbreviation, filters.searchTerm));
      
      let matchesSupplier = !filters.selectedSupplier || filters.selectedSupplier === '전체 매입처' || filters.selectedSupplier === '전체';
      if (!matchesSupplier) {
        const sTerm = filters.selectedSupplier.trim();
        // 1. Check Product Master
        const masterSupplier = p.mainPartner || p.supplier;
        if (masterSupplier && (masterSupplier === sTerm || matchesInitialSound(masterSupplier, sTerm) || masterSupplier.toLowerCase().includes(sTerm.toLowerCase()))) {
          matchesSupplier = true;
        } else {
          // 2. Check Purchase History (Invoices)
          const hasPurchasedFromThisSupplier = purchaseInvoices.some(inv => 
            inv.partner && (inv.partner === sTerm || matchesInitialSound(inv.partner, sTerm) || inv.partner.toLowerCase().includes(sTerm.toLowerCase())) && 
            (inv.items || []).some(item => item.name === p.name)
          );
          if (hasPurchasedFromThisSupplier) matchesSupplier = true;
        }
      }
      
      return matchesLarge && matchesMedium && matchesSmall && matchesSearch && matchesSupplier;
    }).map(p => {
      const baseStock = getProductTotalInitialStock(p, warehouses);
      const totalStock = baseStock + Object.values(inventory).reduce((sum, whStocks) => sum + (whStocks[p.name] || 0), 0);
      const optimal = p.optimalStock || 0;
      const status = totalStock < optimal ? 'shortage' : 'normal';
      
      // Find the actual supplier name to display if "All" is selected
      let displaySupplier = p.mainPartner || p.supplier || '미지정';
      if (displaySupplier === '미지정') {
        const lastInv = [...purchaseInvoices].reverse().find(inv => (inv.items || []).some(item => item.name === p.name));
        if (lastInv) displaySupplier = lastInv.partner;
      }

      return { ...p, totalStock, optimal, status, displaySupplier };
    }).filter(p => {
      return !filters.hideZeroStock || p.totalStock !== 0;
    });
  }, [products, inventory, purchaseInvoices, filters, warehouses]);

  const handleExcelExport = () => {
    let data = [];
    let fileName = '';

    if (activeTab === 'daily') {
      data = filteredDailyData.map(row => ({
        '일자': row.date, '출고창고': row.from, '입고창고': row.to, '품목명': row.item, '규격': row.spec, '수량': row.qty, '시간': row.processedAt, '담당자': row.operator, '비고': row.memo || ''
      }));
      fileName = `일자별재고현황_${filters.startDate}_${filters.endDate}`;
    } else if (activeTab === 'final') {
      if (filters.selectedWarehouse === '전체 창고') {
        data = filteredFinalData.map(row => {
          const cat = [row.categoryLarge, row.categoryMedium, row.categorySmall].filter(c => c && c !== '전체').join(' > ');
          const rowData = {
            '카테고리': cat,
            '품목명': row.name,
            '규격': row.spec || '-'
          };
          (warehouses || []).forEach(w => {
            rowData[`기초재고_${w.name}`] = getProductWarehouseInitialStock(row, w.name, warehouses);
          });
          const totalBase = getProductTotalInitialStock(row, warehouses);
          const totalFinal = totalBase + row.displayStock;
          rowData['총 기초재고'] = totalBase;
          rowData['총 현재재고'] = totalFinal;
          return rowData;
        });
        fileName = `최종재고현황_전체창고`;
      } else {
        data = filteredFinalData.map(row => {
          const baseStock = editedStocks[row.id]?.[filters.selectedWarehouse] !== undefined
            ? (parseInt(editedStocks[row.id][filters.selectedWarehouse], 10) || 0)
            : getProductWarehouseInitialStock(row, filters.selectedWarehouse, warehouses);
          const finalStock = baseStock + row.displayStock;
          const cat = [row.categoryLarge, row.categoryMedium, row.categorySmall].filter(c => c && c !== '전체').join(' > ');
          return {
            '카테고리': cat,
            '품목명': row.name,
            '규격': row.spec || '-',
            [`기초재고 (${filters.selectedWarehouse})`]: baseStock,
            [`현재재고 (${filters.selectedWarehouse})`]: finalStock
          };
        });
        fileName = `최종재고현황_${filters.selectedWarehouse}`;
      }
    } else if (activeTab === 'partner') {
      data = filteredPartnerData.map(row => {
        const cat = [row.categoryLarge, row.categoryMedium, row.categorySmall].filter(c => c && c !== '전체').join(' > ');
        return {
          '매입처': row.displaySupplier, '카테고리': cat, '품목명': row.name, '현재재고': row.totalStock, '적정재고': row.optimal, '상태': row.status === 'shortage' ? '부족' : '정상'
        };
      });
      fileName = `매입처별재고현황_${filters.selectedSupplier}`;
    }
    
    if (data.length > 0) exportToExcel(data, fileName);
  };

  const currentTitle = activeTab === 'final' ? '최종재고' : activeTab === 'partner' ? '매입처별 재고' : '일자별 재고이동';

  return (
    <>
      <WindowModal 
        title={currentTitle} 
        onClose={onClose} 
        width="100%"
        contentPadding="0"
        noScroll
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                {currentTitle}
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                {activeTab === 'daily' ? `총 ${filteredDailyData.length}건 이동` : activeTab === 'final' ? `총 ${filteredFinalData.length}개 품목` : `총 ${filteredPartnerData.length}개 품목`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {activeTab === 'final' && (
              <>
                <button 
                  type="button" 
                  onClick={() => setIsBatchWarehouseModalOpen(true)}
                  style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                  title="창고별 기초재고 일괄 설정"
                >
                  <Warehouse size={12} /> 창고별설정
                </button>
                {Object.keys(editedStocks).length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => handleSaveInitialStocks()}
                    disabled={isSavingStocks}
                    style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #10b981', backgroundColor: '#10b981', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                  >
                    <Save size={12} /> 저장 ({Object.keys(editedStocks).length})
                  </button>
                )}
              </>
            )}
            <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Printer size={12} /> 인쇄
            </button>
            <button onClick={handleExcelExport} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Download size={12} /> 엑셀
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 4px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: activeTab === tab.id ? 800 : 600,
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'daily' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleShiftDay(-1)}
                  title="하루 전 (-1일)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#334155',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={e => setFilters({...filters, startDate: e.target.value})} 
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0, fontWeight: 600 }} 
                />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>~</span>
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={e => setFilters({...filters, endDate: e.target.value})} 
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0, fontWeight: 600 }} 
                />
                <button
                  type="button"
                  onClick={() => handleShiftDay(1)}
                  title="하루 후 (+1일)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#334155',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {['당일', '1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700,
                      border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff',
                      color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >{btn}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <select 
                  value={filters.fromWarehouse} 
                  onChange={e => setFilters({...filters, fromWarehouse: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, outline: 'none' }}
                >
                  <option value="전체 창고">출고: 전체 창고</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>

                <select 
                  value={filters.toWarehouse} 
                  onChange={e => setFilters({...filters, toWarehouse: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, outline: 'none' }}
                >
                  <option value="전체 창고">입고: 전체 창고</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'final' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>창고 선택</label>
                <select 
                  value={filters.selectedWarehouse} 
                  onChange={e => setFilters({...filters, selectedWarehouse: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                >
                  <option value="전체 창고">전체 창고 (총 합계)</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#334155', fontWeight: 700, marginTop: '2px' }}>
                <input 
                  type="checkbox" 
                  checked={filters.hideZeroStock} 
                  onChange={e => {
                    const checked = e.target.checked;
                    localStorage.setItem('linkerx_inventory_report_hide_zero', String(checked));
                    setFilters(prev => ({ ...prev, hideZeroStock: checked }));
                  }} 
                  style={{ width: '15px', height: '15px' }}
                />
                재고가 0인 품목 가리기
              </label>
            </div>
          )}

          {activeTab === 'partner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ position: 'relative' }} ref={supplierDropdownRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>매입처 검색 / 선택</label>
                  {filters.selectedSupplier && filters.selectedSupplier !== '전체 매입처' && (
                    <span 
                      onClick={() => {
                        setFilters(prev => ({ ...prev, selectedSupplier: '전체 매입처' }));
                        setIsSupplierDropdownOpen(false);
                      }}
                      style={{ fontSize: '0.68rem', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                    >
                      초기화
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="매입처 검색 (초성 가능)"
                    value={filters.selectedSupplier === '전체 매입처' ? '' : filters.selectedSupplier}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, selectedSupplier: e.target.value }));
                      setIsSupplierDropdownOpen(true);
                      setSupplierSelectedIndex(0);
                    }}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    onKeyDown={handleSupplierKeyDown}
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {filters.selectedSupplier && filters.selectedSupplier !== '전체 매입처' && (
                    <X 
                      size={14} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters(prev => ({ ...prev, selectedSupplier: '전체 매입처' }));
                      }}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                    />
                  )}
                </div>

                {isSupplierDropdownOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
                      zIndex: 50,
                      marginTop: '3px'
                    }}
                  >
                    <div
                      onClick={() => {
                        setFilters(prev => ({ ...prev, selectedSupplier: '전체 매입처' }));
                        setIsSupplierDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#2563eb',
                        backgroundColor: supplierSelectedIndex === -1 ? '#eff6ff' : 'transparent',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      ✓ 전체 매입처
                    </div>
                    {suggestedSuppliers.length === 0 ? (
                      <div style={{ padding: '8px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                        일치하는 매입처가 없습니다.
                      </div>
                    ) : (
                      suggestedSuppliers.map((p, idx) => (
                        <div
                          key={p.id || p.name}
                          onClick={() => {
                            setFilters(prev => ({ ...prev, selectedSupplier: p.name }));
                            setIsSupplierDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            backgroundColor: idx === supplierSelectedIndex ? '#f1f5f9' : 'transparent',
                            color: '#1e293b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #f8fafc'
                          }}
                          onMouseEnter={() => setSupplierSelectedIndex(idx)}
                        >
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px' }}>{p.type || '매입처'}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#334155', fontWeight: 700, marginTop: '2px' }}>
                <input 
                  type="checkbox" 
                  checked={filters.hideZeroStock} 
                  onChange={e => {
                    const checked = e.target.checked;
                    localStorage.setItem('linkerx_inventory_report_hide_zero', String(checked));
                    setFilters(prev => ({ ...prev, hideZeroStock: checked }));
                  }} 
                  style={{ width: '15px', height: '15px' }}
                />
                재고가 0인 품목 가리기
              </label>
            </div>
          )}

          {/* Collapsible Category selection (대/중/소분류) */}
          {showCategoryFilter && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
              <select 
                value={filters.categoryLarge} 
                onChange={e => setFilters({...filters, categoryLarge: e.target.value, categoryMedium: '전체', categorySmall: '전체'})}
                style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none' }}
              >
                <option value="전체">대: 전체</option>
                {categories.filter(c => c.level === 1 || !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              <select 
                value={filters.categoryMedium} 
                onChange={e => setFilters({...filters, categoryMedium: e.target.value, categorySmall: '전체'})}
                disabled={filters.categoryLarge === '전체'}
                style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', backgroundColor: filters.categoryLarge === '전체' ? '#f1f5f9' : '#fff' }}
              >
                <option value="전체">중: 전체</option>
                {categories.filter(c => {
                  const large = categories.find(l => l.name === filters.categoryLarge);
                  return large && c.parentId === large.id && c.level === 2;
                }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              <select 
                value={filters.categorySmall} 
                onChange={e => setFilters({...filters, categorySmall: e.target.value})}
                disabled={filters.categoryMedium === '전체'}
                style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', backgroundColor: filters.categoryMedium === '전체' ? '#f1f5f9' : '#fff' }}
              >
                <option value="전체">소: 전체</option>
                {categories.filter(c => {
                  const medium = categories.find(m => m.name === filters.categoryMedium);
                  return medium && c.parentId === medium.id && c.level === 3;
                }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: showCategoryFilter ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                backgroundColor: showCategoryFilter ? '#eff6ff' : '#f8fafc',
                color: showCategoryFilter ? '#2563eb' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {showCategoryFilter ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              카테고리 {showCategoryFilter ? '접기' : '선택'}
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="품목명 검색..." 
                value={filters.searchTerm} 
                onChange={e => setFilters({...filters, searchTerm: e.target.value})}
                style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'daily' && (
            filteredDailyData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                해당 조건의 재고 이동 내역이 없습니다.
              </div>
            ) : (
              filteredDailyData.map((row, idx) => (
                <div key={idx} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{row.date} {row.processedAt && `(${row.processedAt})`}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb' }}>{row.qty?.toLocaleString()}개</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: `${getWarehouseColor(row.from)}18`, color: getWarehouseColor(row.from), fontSize: '0.75rem' }}>{row.from}</span>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: `${getWarehouseColor(row.to)}18`, color: getWarehouseColor(row.to), fontSize: '0.75rem' }}>{row.to}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#475569' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{row.item}</span>
                      {row.spec && <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '4px' }}>({row.spec})</span>}
                    </div>
                    {row.operator && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{row.operator}</span>}
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'final' && (
            filteredFinalData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                해당 조건의 재고 현황 데이터가 없습니다.
              </div>
            ) : (
              filteredFinalData.map(p => {
                const isAllWarehouses = filters.selectedWarehouse === '전체 창고';
                const baseStock = isAllWarehouses
                  ? getProductTotalInitialStock(p, warehouses)
                  : (editedStocks[p.id]?.[filters.selectedWarehouse] !== undefined
                      ? (parseInt(editedStocks[p.id][filters.selectedWarehouse], 10) || 0)
                      : getProductWarehouseInitialStock(p, filters.selectedWarehouse, warehouses));
                const finalStock = baseStock + p.displayStock;
                const isCellEdited = !isAllWarehouses && editedStocks[p.id]?.[filters.selectedWarehouse] !== undefined;

                return (
                  <div key={p.id} style={{ backgroundColor: isCellEdited ? '#f0fdf4' : '#fff', border: isCellEdited ? '1.5px solid #10b981' : '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{p.categoryLarge || '-'} {p.categoryMedium && `> ${p.categoryMedium}`} {p.spec && `| ${p.spec}`}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: finalStock <= 0 ? '#ef4444' : '#2563eb' }}>
                          {finalStock.toLocaleString()}개
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>현재 재고</div>
                      </div>
                    </div>

                    {/* 창고별 재고 현황 보기 버튼 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                        창고별 재고 현황
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProductForWarehouseModal(p)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="각 창고별 해당 품목의 재고 내역 보기"
                      >
                        <Warehouse size={12} />
                        창고별내역
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'partner' && (
            filteredPartnerData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                해당 조건의 매입처별 재고 데이터가 없습니다.
              </div>
            ) : (
              filteredPartnerData.map(p => (
                <div key={p.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                        {p.displaySupplier}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', marginTop: '4px' }}>{p.name}</div>
                      {p.spec && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.spec}</div>}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: p.status === 'shortage' ? '#ef4444' : '#2563eb' }}>
                        {p.totalStock.toLocaleString()}개
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, backgroundColor: p.status === 'shortage' ? '#fee2e2' : '#ecfdf5', color: p.status === 'shortage' ? '#ef4444' : '#10b981' }}>
                        {p.status === 'shortage' ? '부족' : '정상'} (적정:{p.optimal})
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>

      </div>
      <style>{`
        .clickable-memo:hover {
          color: #2563eb !important;
        }
        .dark-report-window .clickable-memo:hover {
          color: #93c5fd !important;
        }
      `}</style>
      {isCategoryModalOpen && (
        <ProductCategoryModal 
          onClose={() => setIsCategoryModalOpen(false)} 
          categories={categories} 
          setCategories={setCategories} 
          currentUser={currentUser} 
        />
      )}
      {selectedProductForWarehouseModal && (
        <SingleProductWarehouseModal
          product={selectedProductForWarehouseModal}
          warehouses={warehouses}
          inventory={inventory}
          currentUser={currentUser}
          staffList={staffList}
          schedules={schedules}
          setSchedules={setSchedules}
          onMoveStock={onMoveStock}
          onClose={() => setSelectedProductForWarehouseModal(null)}
        />
      )}
      {isBatchWarehouseModalOpen && (
        <BatchWarehouseInitialStockModal
          products={products}
          setProducts={setProducts}
          warehouses={warehouses}
          categories={categories}
          currentUser={currentUser}
          onClose={() => setIsBatchWarehouseModalOpen(false)}
          onSaveAll={handleSaveInitialStocks}
        />
      )}
    </WindowModal>
  </>
  );
};

// ─────────────────────────────────────────────────────────────
// 단일 품목 창고별 재고 내역 및 내 창고로 이동 모달 (모바일)
// ─────────────────────────────────────────────────────────────
function SingleProductWarehouseModal({ 
  product, 
  warehouses = [], 
  inventory = {}, 
  currentUser,
  staffList = [],
  schedules = [],
  setSchedules,
  onMoveStock,
  onClose 
}) {
  const userAssignedWh = (currentUser?.warehouse && currentUser.warehouse !== '-')
    ? currentUser.warehouse
    : (staffList?.find(s => s.name === currentUser?.name)?.warehouse || '');

  const [myWh, setMyWh] = useState(() => {
    if (userAssignedWh && warehouses.some(w => w.name === userAssignedWh)) return userAssignedWh;
    return warehouses[0]?.name || '';
  });

  const [moveQuantities, setMoveQuantities] = useState({});
  const [isMoving, setIsMoving] = useState({});

  const handleQtyChange = (whName, val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setMoveQuantities(prev => ({ ...prev, [whName]: clean }));
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTimeStr = (offsetHours = 0) => {
    const d = new Date(Date.now() + offsetHours * 3600000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const totalCurrent = (warehouses || []).reduce((sum, w) => {
    const init = getProductWarehouseInitialStock(product, w.name, warehouses);
    const move = inventory[w.name]?.[product.name] || 0;
    return sum + init + move;
  }, 0);

  const handleExecuteMove = async (sourceWarehouse) => {
    const fromWh = sourceWarehouse.name;
    const toWh = myWh;
    const rawVal = moveQuantities[fromWh];
    const qty = Number(rawVal);

    if (!qty || qty <= 0) {
      alert('이동할 수량을 1개 이상 입력해 주세요.');
      return;
    }

    if (fromWh === toWh) {
      alert('출고 창고와 도착 창고가 동일합니다.');
      return;
    }

    const targetManager = sourceWarehouse.manager || 
      staffList?.find(s => s.warehouse === fromWh)?.name || 
      '담당자';

    const initVal = getProductWarehouseInitialStock(product, fromWh, warehouses);
    const moveVal = inventory[fromWh]?.[product.name] || 0;
    const currentStock = initVal + moveVal;

    let confirmMsg = `[${product.name}] ${qty.toLocaleString()}개를 [${fromWh}]에서 [${toWh}]으로 이동하시겠습니까?\n\n출고 창고 담당자(${targetManager})의 일정에 개인 알림으로 등록됩니다.`;
    if (qty > currentStock) {
      confirmMsg = `⚠️ 주의: 이동 수량(${qty}개)이 현재 재고(${currentStock}개)보다 많습니다.\n\n계속 진행하시겠습니까?\n출고 창고 담당자(${targetManager})의 일정에 개인 알림으로 등록됩니다.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setIsMoving(prev => ({ ...prev, [fromWh]: true }));
    try {
      const companyId = currentUser?.companyId || 'default';
      const todayStr = getTodayStr();
      const nowTime = getTimeStr(0);
      const endTime = getTimeStr(1);

      // 1. 재고 이동 실행
      if (onMoveStock) {
        await onMoveStock(fromWh, toWh, product.name, qty, false, todayStr, null, currentUser?.name);
      }

      // 2. 출고 창고 담당자 개인 알림 일정 등록
      const schedId = Date.now();
      const schedDoc = {
        id: schedId,
        title: `[재고이동 알림] ${product.name} ${qty}개 (${fromWh} ➔ ${toWh})`,
        description: `[재고 이동 상세 내역]\n- 출고 창고: ${fromWh} (담당자: ${targetManager})\n- 도착 창고: ${toWh}\n- 품목명: ${product.name} ${product.spec ? `(${product.spec})` : ''}\n- 이동 수량: ${qty}개\n- 처리자: ${currentUser?.name || '시스템'}\n- 처리 일시: ${new Date().toLocaleString()}`,
        type: '재고이동',
        category: '재고이동',
        date: todayStr,
        startDate: todayStr,
        endDate: todayStr,
        startTime: nowTime,
        endTime: endTime,
        time: nowTime,
        author: currentUser?.name || '시스템',
        manager: targetManager,
        targetUser: targetManager,
        isPublic: true,
        viewers: [currentUser?.name].filter(Boolean),
        companyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'schedules', String(schedId)), schedDoc);

      if (setSchedules) {
        const nextSchedules = [...(schedules || []), schedDoc];
        setSchedules(nextSchedules);
        await saveBundle(companyId, 'schedules', nextSchedules);
      }

      setMoveQuantities(prev => ({ ...prev, [fromWh]: '' }));
      alert(`[${product.name}] ${qty.toLocaleString()}개가 [${toWh}](으)로 이동되었습니다.\n${fromWh} 담당자(${targetManager})의 일정에 개인 알림이 등록되었습니다.`);
    } catch (err) {
      console.error('Mobile single product warehouse move error:', err);
      alert('재고 이동 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsMoving(prev => ({ ...prev, [fromWh]: false }));
    }
  };

  return (
    <WindowModal title={`[${product.name}] 창고별 재고 / 내 창고로 이동`} onClose={onClose} width="96%" maxWidth="540px">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 상단 품목 및 입고지 정보 */}
        <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {[product.categoryLarge, product.categoryMedium, product.categorySmall].filter(Boolean).join(' > ')}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                {product.name} {product.spec && <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>({product.spec})</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>전체 재고</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: totalCurrent > 0 ? '#1d4ed8' : (totalCurrent < 0 ? '#ef4444' : '#64748b') }}>
                {totalCurrent.toLocaleString()}개
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              내 창고 (입고지):
            </span>
            <select
              value={myWh}
              onChange={(e) => setMyWh(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1.5px solid #3b82f6',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#1e40af',
                backgroundColor: '#eff6ff'
              }}
            >
              {warehouses.map(w => (
                <option key={w.id || w.name} value={w.name}>
                  {w.name} {w.name === userAssignedWh ? '(내 담당)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 창고별 재고 및 이동 테이블 */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '8px 10px', fontSize: '0.74rem', color: '#475569' }}>창고/담당자</th>
                <th style={{ padding: '8px 8px', fontSize: '0.74rem', color: '#1e40af', textAlign: 'right', width: '90px', fontWeight: 800 }}>현재재고</th>
                <th style={{ padding: '8px 8px', fontSize: '0.74rem', color: '#475569', textAlign: 'center', width: '135px' }}>내 창고로 이동</th>
              </tr>
            </thead>
            <tbody>
              {(warehouses || []).map(w => {
                const initVal = getProductWarehouseInitialStock(product, w.name, warehouses);
                const moveVal = inventory[w.name]?.[product.name] || 0;
                const currentVal = initVal + moveVal;
                const isTargetWh = w.name === myWh;
                const manager = w.manager || staffList?.find(s => s.warehouse === w.name)?.name || '미지정';

                return (
                  <tr key={w.id || w.name} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isTargetWh ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: w.color || '#3b82f6', flexShrink: 0 }}></span>
                        {w.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                        담당: {manager}
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: currentVal > 0 ? '#1d4ed8' : (currentVal < 0 ? '#ef4444' : '#64748b') }}>
                        {currentVal.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        기초 {initVal}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      {isTargetWh ? (
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                          도착 창고
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="수량"
                            value={moveQuantities[w.name] ?? ''}
                            onChange={(e) => handleQtyChange(w.name, e.target.value)}
                            disabled={isMoving[w.name]}
                            style={{
                              width: '46px',
                              height: '28px',
                              textAlign: 'right',
                              padding: '0 4px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleExecuteMove(w)}
                            disabled={isMoving[w.name] || !moveQuantities[w.name] || Number(moveQuantities[w.name]) <= 0}
                            style={{
                              height: '28px',
                              padding: '0 7px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                              opacity: isMoving[w.name] || !moveQuantities[w.name] || Number(moveQuantities[w.name]) <= 0 ? 0.6 : 1,
                              cursor: isMoving[w.name] || !moveQuantities[w.name] || Number(moveQuantities[w.name]) <= 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowRight size={11} />
                            이동
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
              <tr>
                <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e293b', fontSize: '0.78rem' }}>합계</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: totalCurrent > 0 ? '#1d4ed8' : (totalCurrent < 0 ? '#ef4444' : '#64748b'), fontSize: '0.88rem' }}>
                  {totalCurrent.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            * 이동 시 출고 창고 담당자의 일정에 개인 알림이 등록됩니다.
          </div>
          <button type="button" className="btn-outline" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
            닫기
          </button>
        </div>
      </div>
    </WindowModal>
  );
}

export default InventoryReport;

