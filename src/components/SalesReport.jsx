import React, { useState, useMemo } from 'react';
import { BarChart3, Printer, Download, Search, Calendar, Package, Users, Home } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './SalesReport.css';

const SalesReport = ({ onClose, salesInvoices = [], salesOrders = [], products = [] }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
    warehouse: '전체창고매출',
    searchTerm: ''
  });
  const [activeQuick, setActiveQuick] = useState('오늘');
  const [activeTab, setActiveTab] = useState('period'); // 'period', 'product', 'partner', 'staff', 'warehouse', 'month', 'category'

  // Extract unique warehouses dynamically
  const warehouses = useMemo(() => {
    const list = new Set(salesInvoices.map(inv => inv.warehouse).filter(Boolean));
    return ['전체창고매출', ...list];
  }, [salesInvoices]);

  const applyQuickFilter = (opt) => {
    setActiveQuick(opt);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDate(today);

    switch (opt) {
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
        end = formatDate(today);
        break;
      case '1주일':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        start = formatDate(lastWeek);
        end = formatDate(today);
        break;
      default:
        start = formatDate(today);
        end = formatDate(today);
    }

    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  // 1. Daily Status calculations based on startDate
  const dailyMetrics = useMemo(() => {
    const dateStr = filters.startDate;
    const dayOrders = salesOrders.filter(o => o.date === dateStr);
    
    const amount = dayOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const count = dayOrders.length;
    const completed = dayOrders.filter(o => o.status === '완료').length;

    // Calculate scaling maximums
    const dailyAmountSums = {};
    const dailyOrderCounts = {};
    salesOrders.forEach(o => {
      dailyAmountSums[o.date] = (dailyAmountSums[o.date] || 0) + (Number(o.totalPrice) || 0);
      dailyOrderCounts[o.date] = (dailyOrderCounts[o.date] || 0) + 1;
    });

    const maxAmount = Math.max(...Object.values(dailyAmountSums), 1000000);
    const maxCount = Math.max(...Object.values(dailyOrderCounts), 5);

    return {
      amount,
      count,
      completed,
      amountPercent: Math.min((amount / maxAmount) * 100, 100),
      countPercent: Math.min((count / maxCount) * 100, 100),
      completePercent: Math.min((completed / maxCount) * 100, 100),
    };
  }, [filters.startDate, salesOrders]);

  // 2. Period trend data (Daily total sales over selected range)
  const periodTrendData = useMemo(() => {
    const dailySums = {};
    let cur = new Date(filters.startDate);
    const end = new Date(filters.endDate);

    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      dailySums[dStr] = 0;
      cur.setDate(cur.getDate() + 1);
    }

    salesInvoices
      .filter(inv => {
        if (inv.date < filters.startDate || inv.date > filters.endDate) return false;
        if (filters.warehouse !== '전체창고매출' && inv.warehouse !== filters.warehouse) return false;
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          const matchesPartner = inv.partner?.toLowerCase().includes(term);
          const matchesStaff = inv.manager?.toLowerCase().includes(term);
          const matchesItem = inv.items?.some(item => item.name?.toLowerCase().includes(term));
          if (!matchesPartner && !matchesStaff && !matchesItem) return false;
        }
        return true;
      })
      .forEach(inv => {
        if (dailySums[inv.date] !== undefined) {
          dailySums[inv.date] += Number(inv.totalAmount) || 0;
        }
      });

    const list = Object.entries(dailySums).map(([date, amount]) => ({ date, amount }));
    const maxVal = Math.max(...list.map(item => item.amount), 100000);

    return list.map(item => ({
      ...item,
      percent: Math.min((item.amount / maxVal) * 100, 100)
    }));
  }, [filters, salesInvoices]);

  // 3. Categorized summary computations (Period / Products / Partners / Staff / Warehouses / Months / Categories)
  const summaryInsights = useMemo(() => {
    const productMap = {};
    const partnerMap = {};
    const staffMap = {};
    const warehouseMap = {};
    const monthMap = {};
    const categoryMap = {};
    const periodMap = {};
    
    let totalSalesVal = 0;
    let totalQtyVal = 0;

    // Initialize daily map in period
    let cur = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      periodMap[dStr] = { amount: 0, qty: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    salesInvoices
      .filter(inv => {
        if (inv.date < filters.startDate || inv.date > filters.endDate) return false;
        if (filters.warehouse !== '전체창고매출' && inv.warehouse !== filters.warehouse) return false;
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          const matchesPartner = inv.partner?.toLowerCase().includes(term);
          const matchesStaff = inv.manager?.toLowerCase().includes(term);
          const matchesItem = inv.items?.some(item => item.name?.toLowerCase().includes(term));
          if (!matchesPartner && !matchesStaff && !matchesItem) return false;
        }
        return true;
      })
      .forEach(inv => {
        const invDiscount = inv.discount || 0;
        const netAmt = (inv.totalAmount || 0) - invDiscount;
        totalSalesVal += netAmt;

        // Period (기간별 일자)
        if (periodMap[inv.date]) {
          periodMap[inv.date].amount += netAmt;
        }

        // Partner (업체별)
        const pName = inv.partner || '미지정 거래처';
        if (!partnerMap[pName]) partnerMap[pName] = { amount: 0, qty: 0 };
        partnerMap[pName].amount += netAmt;

        // Staff (담당별)
        const sName = inv.manager || '미지정 담당자';
        if (!staffMap[sName]) staffMap[sName] = { amount: 0, qty: 0 };
        staffMap[sName].amount += netAmt;

        // Warehouse (창고별)
        const wName = inv.warehouse || '기본창고';
        if (!warehouseMap[wName]) warehouseMap[wName] = { amount: 0, qty: 0 };
        warehouseMap[wName].amount += netAmt;

        // Month (월별)
        const mStr = inv.date.substring(0, 7); // YYYY-MM
        if (!monthMap[mStr]) monthMap[mStr] = { amount: 0, qty: 0 };
        monthMap[mStr].amount += netAmt;

        inv.items?.forEach(item => {
          const qty = Number(item.qty || 0);
          const amt = Number(item.total) || (qty * Number(item.price || 0));
          totalQtyVal += qty;

          // Product (상품별)
          const prName = item.name || '알 수 없음';
          if (!productMap[prName]) productMap[prName] = { amount: 0, qty: 0 };
          productMap[prName].qty += qty;
          productMap[prName].amount += amt;

          partnerMap[pName].qty += qty;
          staffMap[sName].qty += qty;
          warehouseMap[wName].qty += qty;
          monthMap[mStr].qty += qty;
          if (periodMap[inv.date]) {
            periodMap[inv.date].qty += qty;
          }

          // Category (카테고리별)
          const productItem = products.find(p => p.name === prName);
          const catName = productItem?.categoryLarge || productItem?.category || '미분류 카테고리';
          if (!categoryMap[catName]) categoryMap[catName] = { amount: 0, qty: 0 };
          categoryMap[catName].qty += qty;
          categoryMap[catName].amount += amt;
        });
      });

    const formatList = (map) => {
      return Object.entries(map)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          qty: data.qty,
          percent: totalSalesVal > 0 ? Math.min((data.amount / totalSalesVal) * 100, 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    // Period list sorted by date
    const periodList = Object.entries(periodMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        qty: data.qty,
        percent: totalSalesVal > 0 ? Math.min((data.amount / totalSalesVal) * 100, 100) : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      period: periodList,
      product: formatList(productMap),
      partner: formatList(partnerMap),
      staff: formatList(staffMap),
      warehouse: formatList(warehouseMap),
      month: formatList(monthMap).sort((a, b) => a.name.localeCompare(b.name)),
      category: formatList(categoryMap),
      totalSales: totalSalesVal,
      totalQty: totalQtyVal
    };
  }, [filters, salesInvoices, products]);

  const activeReportData = useMemo(() => {
    return summaryInsights[activeTab] || [];
  }, [summaryInsights, activeTab]);

  const handleExcelExport = () => {
    const dataToExport = activeReportData.map(row => ({
      '구분': row.name,
      '판매수량': row.qty,
      '순매출액': row.amount,
      '매출 점유율(%)': `${row.percent.toFixed(1)}%`
    }));
    exportToExcel(dataToExport, `매출보고서_${activeTab}`);
  };

  const formatCurrency = (num) => {
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(0)}만`;
    return `${num.toLocaleString()}`;
  };

  const tabConfig = [
    { id: 'period',    label: '기간별 매출현황', icon: <Calendar size={14} /> },
    { id: 'product',   label: '상품별',        icon: <Package size={14} /> },
    { id: 'partner',   label: '업체별',        icon: <Users size={14} /> },
    { id: 'staff',     label: '담당별',        icon: <Users size={14} /> },
    { id: 'warehouse', label: '창고별',        icon: <Home size={14} /> },
    { id: 'month',     label: '월별',          icon: <Calendar size={14} /> },
    { id: 'category',  label: '카테고리별',    icon: <Package size={14} /> }
  ];

  return (
    <WindowModal title="매출보고서" onClose={onClose} width="1250px">
      
      {/* Header Info Panel */}
      <div className="report-v2-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div className="report-v2-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <BarChart3 size={22} color="#3b82f6" />
          <h2 className="report-v2-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>종합 매출 보고서</h2>
          {/* Date Pickers next to title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Calendar size={13} color="#475569" />
            <input
              type="date"
              value={filters.startDate}
              onChange={e => { setFilters({...filters, startDate: e.target.value}); setActiveQuick(''); }}
              style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', outline: 'none' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800 }}>~</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => { setFilters({...filters, endDate: e.target.value}); setActiveQuick(''); }}
              style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', outline: 'none' }}
            />
          </div>
        </div>
        <div className="report-v2-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-v2-action" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.78rem' }}>
            <Printer size={14} /> 인쇄
          </button>
          <button className="btn-v2-action" onClick={handleExcelExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.78rem' }}>
            <Download size={14} /> 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Filter Options Row */}
      <div className="report-v2-filters" style={{ marginBottom: '16px' }}>
        <div className="filter-card" style={{ padding: '12px' }}>
          <div className="filter-row top" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Quick Filters */}
            <div className="quick-filters" style={{ display: 'flex', gap: '4px' }}>
              {['오늘', '1주일', '한달', '상반기', '하반기', '1년'].map(opt => (
                <button
                  key={opt}
                  className={`btn-quick ${activeQuick === opt ? 'active' : ''}`}
                  onClick={() => applyQuickFilter(opt)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    ...(activeQuick === opt ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : {})
                  }}
                >{opt}</button>
              ))}
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />

            {/* Warehouse Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>출고창고:</span>
              <select 
                className="select-v2" 
                value={filters.warehouse} 
                onChange={e => setFilters({...filters, warehouse: e.target.value})}
                style={{ fontSize: '0.75rem', padding: '4px 10px', minWidth: '130px' }}
              >
                {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }} />

            {/* Search Box */}
            <div className="search-input-v2" style={{ flex: 1, display: 'flex', gap: '6px', minWidth: '220px', position: 'relative', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input 
                type="text" 
                placeholder="업체명, 담당자명, 품목명 검색..." 
                value={filters.searchTerm} 
                onChange={e => setFilters({...filters, searchTerm: e.target.value})} 
                style={{ flex: 1, fontSize: '0.75rem', padding: '6px 12px 6px 30px', height: 'auto' }} 
              />
              <button className="btn-search-main" style={{ padding: '6px 14px', fontSize: '0.75rem', flexShrink: 0 }}>
                검색
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="report-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Visualizations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: 당일(시작일) 수주 및 완료 현황 (Widget Mimic) */}
          <div className="report-viz-card" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
              시작일 ({filters.startDate}) 당일 수주/완료 현황
            </h4>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '110px', padding: '10px 0 6px', borderBottom: '1px solid #e2e8f0' }}>
              
              {/* Bar 1: 수주 금액 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} title={`수주금액: ${dailyMetrics.amount.toLocaleString()}원`}>
                <div style={{ width: '18px', height: '80px', backgroundColor: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${dailyMetrics.amountPercent}%`, background: 'linear-gradient(to top, #3b82f6, #6366f1)', borderRadius: '8px', transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(dailyMetrics.amount)}원</span>
              </div>

              {/* Bar 2: 주문 건수 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} title={`수주 주문건수: ${dailyMetrics.count}건`}>
                <div style={{ width: '18px', height: '80px', backgroundColor: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${dailyMetrics.countPercent}%`, background: 'linear-gradient(to top, #10b981, #059669)', borderRadius: '8px', transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981' }}>{dailyMetrics.count}건</span>
              </div>

              {/* Bar 3: 완료 건수 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }} title={`매출전표 전송 완료건수: ${dailyMetrics.completed}건`}>
                <div style={{ width: '18px', height: '80px', backgroundColor: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${dailyMetrics.completePercent}%`, background: 'linear-gradient(to top, #f59e0b, #d97706)', borderRadius: '8px', transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b' }}>{dailyMetrics.completed}건</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', textAlign: 'center', marginTop: '10px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>수주금액</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>주문건수</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>완료건수</div>
            </div>
          </div>

          {/* Card 2: 선택 기간별 일자 매출 추이 그래프 */}
          <div className="report-viz-card" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
              선택 기간 내 일자별 매출 추이
            </h4>
            
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '110px', minWidth: `${periodTrendData.length * 30}px`, padding: '10px 4px 6px', borderBottom: '1px solid #e2e8f0' }}>
                {periodTrendData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '22px', flexShrink: 0 }} title={`${item.date}: ${item.amount.toLocaleString()}원`}>
                    <div style={{ width: '10px', height: '70px', backgroundColor: '#e2e8f0', borderRadius: '5px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: `${item.percent}%`, background: 'linear-gradient(to top, #3b82f6, #93c5fd)', borderRadius: '5px', transition: 'height 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {item.date.split('-')[2]}일
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
              (일자를 마우스 오버하면 상세 매출액이 팝업됩니다)
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Tabbed Analysis & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Tab Selector */}
          <div 
            style={{ 
              display: 'flex', 
              backgroundColor: '#f1f5f9', 
              borderRadius: '10px', 
              padding: '4px',
              gap: '4px',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {tabConfig.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Top 3 Gauge Visualization */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
              매출 비중 점유율 (상위 3위)
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeReportData.slice(0, 3).map((item, idx) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                      <span>{item.name}</span>
                      <span>{item.percent.toFixed(1)}% ({item.amount.toLocaleString()}원)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.percent}%`, backgroundColor: colors[idx] || '#64748b', borderRadius: '3px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
              {activeReportData.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>
                  해당 조건의 매출 데이터가 존재하지 않습니다.
                </div>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="report-v2-table-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <table className="report-v2-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th style={{ textAlign: 'left', fontSize: '0.72rem', padding: '8px 12px' }}>구분</th>
                  <th style={{ textAlign: 'center', fontSize: '0.72rem', padding: '8px 12px', width: '90px' }}>판매수량</th>
                  <th style={{ textAlign: 'right', fontSize: '0.72rem', padding: '8px 12px', width: '150px' }}>순매출액</th>
                  <th style={{ textAlign: 'right', fontSize: '0.72rem', padding: '8px 12px', width: '90px' }}>점유율</th>
                </tr>
              </thead>
              <tbody>
                {activeReportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ textAlign: 'left', fontSize: '0.72rem', padding: '8px 12px', fontWeight: 600, color: '#334155' }}>
                      {row.name}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.72rem', padding: '8px 12px', color: '#475569' }}>
                      {row.qty.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.72rem', padding: '8px 12px', color: '#1e293b', fontWeight: 700 }}>
                      {row.amount.toLocaleString()} 원
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.72rem', padding: '8px 12px', color: '#3b82f6', fontWeight: 700 }}>
                      {row.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                {activeReportData.length > 0 && (
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', position: 'sticky', bottom: 0 }}>
                    <td style={{ textAlign: 'left', fontSize: '0.72rem', padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>합계</td>
                    <td style={{ textAlign: 'center', fontSize: '0.72rem', padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                      {summaryInsights.totalQty.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.72rem', padding: '10px 12px', fontWeight: 800, color: '#3b82f6' }}>
                      {summaryInsights.totalSales.toLocaleString()} 원
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.72rem', padding: '10px 12px', fontWeight: 800, color: '#3b82f6' }}>100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </WindowModal>
  );
};

export default SalesReport;
