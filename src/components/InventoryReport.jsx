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

  return (
    <WindowModal 
      title="재고보고서" 
      onClose={onClose} 
      width="1150px"
      className={isMobile ? "dark-report-window" : ""}
      style={isMobile ? { backgroundColor: '#0b0f19', border: '1px solid #1e293b' } : {}}
    >
      <div className="report-v2-header">
        <div className="report-v2-title-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={24} color="#3b82f6" />
            <h2 className="report-v2-title" style={{ margin: 0, color: isMobile ? '#f8fafc' : '#1e293b' }}>재고 보고서</h2>
          </div>
        </div>
        <div className="report-v2-actions">
          <button className="btn-v2-action" onClick={() => window.print()}><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
          <button className="btn-v2-action" onClick={() => setIsCategoryModalOpen(true)}><Package size={16} /> 카테고리 설정</button>
        </div>
      </div>

      <div className="report-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="report-v2-filters" style={{ marginBottom: '20px' }}>
        <div 
          className="filter-card inventory-filter" 
          style={{ 
            background: isMobile ? 'linear-gradient(145deg, #111827, #0f172a)' : '#fff', 
            border: isMobile ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '20px' 
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            {activeTab === 'daily' && (
              <>
                <div className="form-group-v3" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>조회 기간</span>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => handleQuickDate(btn)}
                          style={{
                            padding: '1px 5px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            border: '1px solid #cbd5e1',
                            borderRadius: '3px',
                            background: isMobile ? '#1f2937' : '#f8fafc',
                            color: isMobile ? '#cbd5e1' : '#475569',
                            cursor: 'pointer'
                          }}
                        >{btn}</button>
                      ))}
                    </div>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="date" 
                      value={filters.startDate} 
                      onChange={e => setFilters({...filters, startDate: e.target.value})} 
                      className="input-v3" 
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#94a3b8', fontWeight: 700 }}>~</span>
                    <input 
                      type="date" 
                      value={filters.endDate} 
                      onChange={e => setFilters({...filters, endDate: e.target.value})} 
                      className="input-v3" 
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group-v3">
                  <label>출고 창고</label>
                  <select value={filters.fromWarehouse} onChange={e => setFilters({...filters, fromWarehouse: e.target.value})} className="select-v3">
                    <option>전체 창고</option>
                    {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group-v3">
                  <label>입고 창고</label>
                  <select value={filters.toWarehouse} onChange={e => setFilters({...filters, toWarehouse: e.target.value})} className="select-v3">
                    <option>전체 창고</option>
                    {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                  </select>
                </div>
              </>
            )}
            
            {activeTab === 'final' && (
              <div className="form-group-v3">
                <label>조회 창고</label>
                <select value={filters.selectedWarehouse} onChange={e => setFilters({...filters, selectedWarehouse: e.target.value})} className="select-v3">
                  <option>전체 창고</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            )}

            {activeTab === 'partner' && (
              <div className="form-group-v3">
                <label>매입처 선택</label>
                <select value={filters.selectedSupplier} onChange={e => setFilters({...filters, selectedSupplier: e.target.value})} className="select-v3">
                  <option>전체 매입처</option>
                  {partners.filter(p => p.type === '매입처' || p.type === '공통').map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group-v3" style={{ gridColumn: activeTab === 'daily' ? 'span 1' : 'span 3' }}>
              <label>품목명 검색</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="품목명 또는 초성 검색" 
                    value={filters.searchTerm} 
                    onChange={e => setFilters({...filters, searchTerm: e.target.value})} 
                    className="input-v3"
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
                <button className="btn-search-blue" style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <Search size={14} /> 검색
                </button>
              </div>
            </div>

            <div className="form-group-v3">
              <label>대분류</label>
              <select value={filters.categoryLarge} onChange={e => setFilters({...filters, categoryLarge: e.target.value, categoryMedium: '전체', categorySmall: '전체'})} className="select-v3">
                <option value="전체">대분류 전체</option>
                {categories.filter(c => c.level === 1 || !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="form-group-v3">
              <label>중분류</label>
              <select value={filters.categoryMedium} onChange={e => setFilters({...filters, categoryMedium: e.target.value, categorySmall: '전체'})} disabled={filters.categoryLarge === '전체'} className="select-v3">
                <option value="전체">중분류 전체</option>
                {categories.filter(c => {
                  const large = categories.find(l => l.name === filters.categoryLarge);
                  return large && c.parentId === large.id && c.level === 2;
                }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="form-group-v3">
              <label>소분류</label>
              <select value={filters.categorySmall} onChange={e => setFilters({...filters, categorySmall: e.target.value})} disabled={filters.categoryMedium === '전체'} className="select-v3">
                <option value="전체">소분류 전체</option>
                {categories.filter(c => {
                  const medium = categories.find(m => m.name === filters.categoryMedium);
                  return medium && c.parentId === medium.id && c.level === 3;
                }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            
            {(activeTab === 'final' || activeTab === 'partner') && (
              <div className="form-group-v3" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', margin: 0, fontWeight: 700, color: isMobile ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={filters.hideZeroStock} 
                    onChange={e => setFilters({...filters, hideZeroStock: e.target.checked})} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  재고가 0인 품목 가리기
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="report-v2-content">
        <div className="report-v2-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="report-v2-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              {activeTab === 'daily' && (
                <tr>
                  <th width="10%">이동일자</th>
                  <th width="12%">출고창고</th>
                  <th width="12%">입고창고</th>
                  <th width="22%">품목명 (규격)</th>
                  <th width="8%">이동수량</th>
                  <th width="10%">시간</th>
                  <th width="10%">담당자</th>
                  <th width="16%">비고</th>
                </tr>
              )}
              {activeTab === 'final' && (
                <tr>
                  <th width="15%">카테고리</th>
                  <th width="35%">품목명</th>
                  <th width="15%">규격</th>
                  <th width="15%">기초 재고</th>
                  <th width="20%">현재 재고 ({filters.selectedWarehouse})</th>
                </tr>
              )}
              {activeTab === 'partner' && (
                <tr>
                  <th width="15%">매입처</th>
                  <th width="15%">카테고리</th>
                  <th width="30%">품목명 (규격)</th>
                  <th width="15%">현재 재고</th>
                  <th width="15%">적정 재고</th>
                  <th width="10%">상태</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'daily' && (
                filteredDailyData.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>해당 조건의 재고 이동 내역이 없습니다.</td></tr>
                ) : (
                  filteredDailyData.map(row => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: isMobile ? '#f8fafc' : '#1e293b' }}>{row.date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '100px', background: `${getWarehouseColor(row.from)}15`, color: getWarehouseColor(row.from), fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${getWarehouseColor(row.from)}40` }}>{row.from}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '100px', background: `${getWarehouseColor(row.to)}15`, color: getWarehouseColor(row.to), fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${getWarehouseColor(row.to)}40` }}>{row.to}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: isMobile ? '#f8fafc' : '#1e293b' }}>{row.item}</div>
                        <div style={{ fontSize: '0.75rem', color: isMobile ? '#94a3b8' : '#64748b' }}>{row.spec}</div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 900, color: '#3b82f6', fontSize: '1.05rem' }}>{row.qty.toLocaleString()}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem', color: isMobile ? '#cbd5e1' : '#64748b' }}>{row.processedAt}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: isMobile ? '#f8fafc' : '#1e293b' }}>{row.operator}</td>
                      <td style={{ fontSize: '0.8rem', paddingLeft: '12px' }}>
                        {row.memo ? (
                          <span 
                            onClick={() => handleMemoClick(row)}
                            className="clickable-memo"
                            style={{ 
                              color: isMobile ? '#60a5fa' : '#3b82f6', 
                              cursor: 'pointer', 
                              textDecoration: 'underline',
                              fontWeight: 700 
                            }}
                            title="클릭하여 상세 내역 창 열기"
                          >
                            {row.memo}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )
              )}
              {activeTab === 'final' && (
                filteredFinalData.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>품목 정보가 없습니다.</td></tr>
                ) : (
                  filteredFinalData.map(p => {
                    const baseStock = p.initialStock || 0;
                    const finalStock = baseStock + p.displayStock;
                    return (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'center', color: isMobile ? '#94a3b8' : '#64748b', fontSize: '0.8rem' }}>{[p.categoryLarge, p.categoryMedium, p.categorySmall].filter(c => c && c !== '전체').join(' > ')}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: isMobile ? '#f8fafc' : '#1e293b' }}>{p.name}</td>
                        <td style={{ textAlign: 'center', color: isMobile ? '#94a3b8' : '#64748b' }}>{p.spec}</td>
                        <td style={{ textAlign: 'right', paddingRight: '30px', fontWeight: 600, color: isMobile ? '#cbd5e1' : '#475569' }}>{baseStock.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', paddingRight: '30px', fontWeight: 900, color: finalStock > 0 ? '#059669' : '#ef4444', fontSize: '1.1rem' }}>{finalStock.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )
              )}
              {activeTab === 'partner' && (
                filteredPartnerData.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
                ) : (
                  filteredPartnerData.map(p => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: isMobile ? '#f8fafc' : '#1e293b' }}>{p.displaySupplier}</td>
                      <td style={{ textAlign: 'center', color: isMobile ? '#94a3b8' : '#64748b', fontSize: '0.8rem' }}>{[p.categoryLarge, p.categoryMedium, p.categorySmall].filter(c => c && c !== '전체').join(' > ')}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: isMobile ? '#f8fafc' : '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: isMobile ? '#94a3b8' : '#64748b' }}>{p.spec}</div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 900, fontSize: '1.05rem', color: isMobile ? '#f8fafc' : '#1e293b' }}>{p.totalStock.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', color: isMobile ? '#cbd5e1' : '#64748b' }}>{p.optimal.toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status === 'shortage' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#ef4444', fontWeight: 800, fontSize: '0.85rem' }}>
                            <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 10px #ef4444', animation: 'pulse 1.5s infinite' }}></div>
                            재고부족
                          </div>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>정상</span>
                        )}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        /* Desktop Light styles (Default) */
        .report-v2-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }
        .btn-v2-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-v2-action:hover {
          background-color: #e2e8f0;
        }
        .report-tabs { display: flex; gap: 4px; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding: 0 5px; }
        .tab-btn { padding: 10px 20px; background: none; border: none; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
        .tab-btn:hover { color: #1e293b; }
        .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }
        .form-group-v3 label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; }
        .input-v3, .select-v3 { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.9rem; background-color: #fff; color: #1e293b; transition: all 0.2s; }
        .input-v3:focus, .select-v3:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        .report-v2-table th { background: #f8fafc; padding: 12px; font-size: 0.85rem; font-weight: 800; color: #1e293b; border-bottom: 2px solid #e2e8f0; }
        .report-v2-table td { border-bottom: 1px solid #f1f5f9; padding: 8px; color: #1e293b; }
        .report-v2-table tr:hover { background-color: #f8fafc; }

        /* Mobile Dark styles (Scoped under .dark-report-window) */
        .dark-report-window .window-content-area {
          background-color: #0b0f19 !important;
          color: #f8fafc !important;
        }
        .dark-report-window .report-v2-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .dark-report-window .btn-v2-action {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }
        .dark-report-window .btn-v2-action:hover {
          background: #3b82f6;
          color: #fff;
          border-color: #3b82f6;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
        }
        .dark-report-window .report-tabs { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .dark-report-window .tab-btn { font-weight: 700; color: #94a3b8; }
        .dark-report-window .tab-btn:hover { color: #f8fafc; }
        .dark-report-window .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; text-shadow: 0 0 8px rgba(59, 130, 246, 0.3); }
        .dark-report-window .form-group-v3 label { color: #94a3b8; }
        .dark-report-window .input-v3, .dark-report-window .select-v3 { border: 1px solid rgba(255, 255, 255, 0.1); background-color: #1f2937; color: #f8fafc; }
        .dark-report-window .input-v3:focus, .dark-report-window .select-v3:focus { border-color: #3b82f6; }
        .dark-report-window .report-v2-table th { background: #1f2937; color: #e2e8f0; border-bottom: 2px solid rgba(255, 255, 255, 0.08); }
        .dark-report-window .report-v2-table td { border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #f8fafc; }
        .dark-report-window .report-v2-table tr:hover { background-color: rgba(255, 255, 255, 0.02); }
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
  );
};

export default InventoryReport;
