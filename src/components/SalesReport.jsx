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
    <WindowModal title="매출보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                종합 매출 보고서
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                {filters.startDate} ~ {filters.endDate}
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

        {/* Filters Panel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={filters.startDate} 
              onChange={e => { setFilters({...filters, startDate: e.target.value}); setActiveQuick(''); }}
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>~</span>
            <input 
              type="date" 
              value={filters.endDate} 
              onChange={e => { setFilters({...filters, endDate: e.target.value}); setActiveQuick(''); }}
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
          </div>

          {/* Quick Date Chips */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['오늘', '1주일', '한달', '상반기', '하반기', '1년'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => applyQuickFilter(opt)}
                style={{
                  padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700,
                  border: activeQuick === opt ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  borderRadius: '4px',
                  background: activeQuick === opt ? '#eff6ff' : '#fff',
                  color: activeQuick === opt ? '#2563eb' : '#475569',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >{opt}</button>
            ))}
          </div>

          {/* Warehouse & Search */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '6px' }}>
            <select 
              value={filters.warehouse} 
              onChange={e => setFilters({...filters, warehouse: e.target.value})}
              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="업체/담당자/품목..." 
                value={filters.searchTerm} 
                onChange={e => setFilters({...filters, searchTerm: e.target.value})} 
                style={{ width: '100%', padding: '6px 6px 6px 26px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* Widget 1: 당일(시작일) 수주 및 완료 현황 (3열 대칭 카드) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>수주금액</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>
              {formatCurrency(dailyMetrics.amount)}원
            </div>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>주문건수</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
              {dailyMetrics.count}건
            </div>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 700 }}>완료건수</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>
              {dailyMetrics.completed}건
            </div>
          </div>
        </div>

        {/* Tab Selector for In-Depth Analysis */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {tabConfig.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: activeTab === tab.id ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                backgroundColor: activeTab === tab.id ? '#3b82f6' : '#fff',
                color: activeTab === tab.id ? '#fff' : '#475569',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 Share Gauge Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
            매출 비중 점유율 (상위 3위)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeReportData.slice(0, 3).map((item, idx) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b'];
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                    <span>{item.name}</span>
                    <span>{item.percent.toFixed(1)}% ({item.amount.toLocaleString()}원)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
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

        {/* Sales Breakdown Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              상세 내역 ({activeReportData.length}건)
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#2563eb' }}>
              총 {summaryInsights.totalSales.toLocaleString()}원
            </span>
          </div>

          {activeReportData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              해당 기간에 매출 내역이 없습니다.
            </div>
          ) : (
            activeReportData.map((row, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                    {row.name}
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#2563eb' }}>
                    {row.amount.toLocaleString()}원
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                  <span>판매수량: <strong style={{ color: '#1e293b' }}>{row.qty.toLocaleString()}</strong></span>
                  <span>점유율: <strong style={{ color: '#2563eb' }}>{row.percent.toFixed(1)}%</strong></span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default SalesReport;
