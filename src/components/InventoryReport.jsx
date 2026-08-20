import React, { useState, useMemo } from 'react';
import { BarChart3, Printer, Download, Search, Calendar, Warehouse, ArrowLeftRight, Package, AlertCircle } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';
import ProductCategoryModal from './ProductCategoryModal';
import './InventoryReport.css';

const InventoryReport = ({ 
  onClose, products = [], categories = [], warehouses = [], partners = [], 
  inventory = {}, purchaseInvoices = [], historyData = [], defaultTab = 'daily',
  salesInvoices = [], salesOrders = [], onOpenSalesInvoice, onOpenSalesOrder,
  onOpenPurchaseInvoice, onOpenInventoryTransfer,
  setCategories, currentUser
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
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth,
    endDate: today,
    fromWarehouse: '전체 창고',
    toWarehouse: '전체 창고',
    selectedWarehouse: '전체 창고',
    selectedSupplier: '전체 매입처',
    categoryLarge: '전체',
    categoryMedium: '전체',
    categorySmall: '전체',
    searchTerm: '',
    hideZeroStock: false
  });

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
      const finalStock = (p.initialStock || 0) + p.displayStock;
      return !filters.hideZeroStock || finalStock !== 0;
    });
  }, [products, inventory, filters]);

  const filteredPartnerData = useMemo(() => {
    // Determine which products belong to which supplier based on product master OR purchase history
    return products.filter(p => {
      const matchesLarge = filters.categoryLarge === '전체' || p.categoryLarge === filters.categoryLarge;
      const matchesMedium = filters.categoryMedium === '전체' || p.categoryMedium === filters.categoryMedium;
      const matchesSmall = filters.categorySmall === '전체' || p.categorySmall === filters.categorySmall;
      const matchesSearch = !filters.searchTerm || 
        matchesInitialSound(p.name, filters.searchTerm) ||
        (p.abbreviation && matchesInitialSound(p.abbreviation, filters.searchTerm));
      
      let matchesSupplier = filters.selectedSupplier === '전체 매입처';
      if (!matchesSupplier) {
        // 1. Check Product Master
        const masterSupplier = p.mainPartner || p.supplier;
        if (masterSupplier === filters.selectedSupplier) {
          matchesSupplier = true;
        } else {
          // 2. Check Purchase History (Invoices)
          const hasPurchasedFromThisSupplier = purchaseInvoices.some(inv => 
            inv.partner === filters.selectedSupplier && 
            (inv.items || []).some(item => item.name === p.name)
          );
          if (hasPurchasedFromThisSupplier) matchesSupplier = true;
        }
      }
      
      return matchesLarge && matchesMedium && matchesSmall && matchesSearch && matchesSupplier;
    }).map(p => {
      const baseStock = p.initialStock || 0;
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
  }, [products, inventory, purchaseInvoices, filters]);

  const handleExcelExport = () => {
    let data = [];
    let fileName = '';

    if (activeTab === 'daily') {
      data = filteredDailyData.map(row => ({
        '일자': row.date, '출고창고': row.from, '입고창고': row.to, '품목명': row.item, '규격': row.spec, '수량': row.qty, '시간': row.processedAt, '담당자': row.operator, '비고': row.memo || ''
      }));
      fileName = `일자별재고현황_${filters.startDate}_${filters.endDate}`;
    } else if (activeTab === 'final') {
      data = filteredFinalData.map(row => {
        const baseStock = row.initialStock || 0;
        const finalStock = baseStock + row.displayStock;
        const cat = [row.categoryLarge, row.categoryMedium, row.categorySmall].filter(c => c && c !== '전체').join(' > ');
        return {
          '카테고리': cat, '품목명': row.name, '규격': row.spec, '기초재고': baseStock, '현재재고': finalStock
        };
      });
      fileName = `최종재고현황_${filters.selectedWarehouse}`;
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

          <div style={{ display: 'flex', gap: '4px' }}>
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
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={e => setFilters({...filters, startDate: e.target.value})} 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>~</span>
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={e => setFilters({...filters, endDate: e.target.value})} 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700,
                      border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff',
                      color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >{btn}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <select 
                  value={filters.fromWarehouse} 
                  onChange={e => setFilters({...filters, fromWarehouse: e.target.value})}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
                >
                  <option value="전체 창고">출고: 전체</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>

                <select 
                  value={filters.toWarehouse} 
                  onChange={e => setFilters({...filters, toWarehouse: e.target.value})}
                  style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
                >
                  <option value="전체 창고">입고: 전체</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'final' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>창고 선택</label>
              <select 
                value={filters.selectedWarehouse} 
                onChange={e => setFilters({...filters, selectedWarehouse: e.target.value})}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, outline: 'none' }}
              >
                <option value="전체 창고">전체 창고 (총 합계)</option>
                {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'partner' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>매입처 선택</label>
              <select 
                value={filters.selectedSupplier} 
                onChange={e => setFilters({...filters, selectedSupplier: e.target.value})}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, outline: 'none' }}
              >
                <option value="전체 매입처">전체 매입처</option>
                {partners.filter(p => p.type === '매입처' || p.type === '혼합' || p.type === '매입매출처').map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select 
              value={filters.categoryLarge} 
              onChange={e => setFilters({...filters, categoryLarge: e.target.value, categoryMedium: '전체', categorySmall: '전체'})}
              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="전체">대분류: 전체</option>
              {categories.filter(c => c.level === 1 || !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select 
              value={filters.categoryMedium} 
              onChange={e => setFilters({...filters, categoryMedium: e.target.value, categorySmall: '전체'})}
              disabled={filters.categoryLarge === '전체'}
              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', backgroundColor: filters.categoryLarge === '전체' ? '#f1f5f9' : '#fff' }}
            >
              <option value="전체">중분류: 전체</option>
              {categories.filter(c => {
                const large = categories.find(l => l.name === filters.categoryLarge);
                return large && c.parentId === large.id && c.level === 2;
              }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="품목명 검색..." 
              value={filters.searchTerm} 
              onChange={e => setFilters({...filters, searchTerm: e.target.value})}
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {(activeTab === 'final' || activeTab === 'partner') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={filters.hideZeroStock} 
                onChange={e => setFilters({...filters, hideZeroStock: e.target.checked})} 
                style={{ width: '14px', height: '14px' }}
              />
              재고가 0인 품목 숨기기
            </label>
          )}
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
                const baseStock = p.initialStock || 0;
                const finalStock = baseStock + p.displayStock;
                return (
                  <div key={p.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{p.categoryLarge || '-'} {p.categoryMedium && `> ${p.categoryMedium}`} {p.spec && `| ${p.spec}`}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: finalStock <= 0 ? '#ef4444' : '#2563eb' }}>
                          {finalStock.toLocaleString()}개
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>기초: {baseStock.toLocaleString()}개</div>
                      </div>
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
    </WindowModal>
  </>
  );
};

export default InventoryReport;
