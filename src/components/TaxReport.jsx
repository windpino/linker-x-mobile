import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Download, Calculator, TrendingUp, TrendingDown, Users, FileText, Calendar as CalendarIcon, PieChart } from 'lucide-react';
import WindowModal from './WindowModal';

const TaxReport = ({ onClose, salesInvoices = [], purchaseInvoices = [], expenses = [] }) => {
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  const [reportType, setReportType] = useState('summary'); // 'summary', 'partners', 'expenses'

  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filterFn = (item) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    };

    const sales = salesInvoices.filter(filterFn);
    const purchases = purchaseInvoices.filter(filterFn);
    const exps = expenses.filter(filterFn);

    return { sales, purchases, exps };
  }, [salesInvoices, purchaseInvoices, expenses, dateRange]);

  const stats = useMemo(() => {
    const { sales, purchases, exps } = filteredData;

    const salesTotal = sales.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const salesVat = sales.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    const salesNet = salesTotal - salesVat;

    const purchaseTotal = purchases.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const purchaseVat = purchases.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    const purchaseNet = purchaseTotal - purchaseVat;

    const expTotal = exps.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      salesTotal, salesVat, salesNet,
      purchaseTotal, purchaseVat, purchaseNet,
      expTotal,
      vatToPay: salesVat - purchaseVat
    };
  }, [filteredData]);

  const partnerStats = useMemo(() => {
    const { sales, purchases } = filteredData;
    const stats = {};

    sales.forEach(inv => {
      const name = inv.partnerName || '기타';
      if (!stats[name]) stats[name] = { name, sales: 0, purchases: 0, bizNum: inv.partnerBizNum || '-' };
      stats[name].sales += (inv.totalAmount || 0);
    });

    purchases.forEach(inv => {
      const name = inv.partnerName || '기타';
      if (!stats[name]) stats[name] = { name, sales: 0, purchases: 0, bizNum: inv.partnerBizNum || '-' };
      stats[name].purchases += (inv.totalAmount || 0);
    });

    return Object.values(stats).sort((a, b) => (b.sales + b.purchases) - (a.sales + a.purchases));
  }, [filteredData]);

  const setQuarter = (quarter) => {
    const year = new Date().getFullYear();
    if (quarter === 1) setDateRange({ start: `${year}-01-01`, end: `${year}-03-31` });
    if (quarter === 2) setDateRange({ start: `${year}-04-01`, end: `${year}-06-30` });
    if (quarter === 3) setDateRange({ start: `${year}-07-01`, end: `${year}-09-30` });
    if (quarter === 4) setDateRange({ start: `${year}-10-01`, end: `${year}-12-31` });
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

    setDateRange({ start, end });
  };

  return (
    <WindowModal title="세금신고 지원 보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={18} color="#10b981" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                세금신고 지원 보고서
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                부가세 및 소득세 증빙 지원
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              인쇄
            </button>
            <button style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <FileSpreadsheet size={12} /> 엑셀
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Quarter Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {[1, 2, 3, 4].map(q => (
              <button 
                key={q} 
                onClick={() => setQuarter(q)} 
                style={{ 
                  padding: '5px 0', border: 'none', borderRadius: '6px', 
                  backgroundColor: '#fff', color: '#334155', fontSize: '0.72rem', 
                  fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {q}분기
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({...dateRange, start: e.target.value})} 
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>~</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({...dateRange, end: e.target.value})} 
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', minWidth: 0 }} 
            />
          </div>

          {/* Quick Date Chips */}
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
        </div>

        {/* 2x2 Tax Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Card 1: Sales */}
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#059669', fontSize: '0.7rem', fontWeight: 800 }}>
              <span>총 매출액 (공급가액)</span>
              <TrendingUp size={14} />
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#065f46' }}>
              {stats.salesNet.toLocaleString()}원
            </div>
            <div style={{ fontSize: '0.68rem', color: '#059669' }}>
              부가세: {stats.salesVat.toLocaleString()}원
            </div>
          </div>

          {/* Card 2: Purchases */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#2563eb', fontSize: '0.7rem', fontWeight: 800 }}>
              <span>총 매입액 (공급가액)</span>
              <TrendingDown size={14} />
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#1e40af' }}>
              {stats.purchaseNet.toLocaleString()}원
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb' }}>
              부가세: {stats.purchaseVat.toLocaleString()}원
            </div>
          </div>

          {/* Card 3: VAT To Pay */}
          <div style={{ backgroundColor: stats.vatToPay >= 0 ? '#fef2f2' : '#eff6ff', border: stats.vatToPay >= 0 ? '1px solid #fecaca' : '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: stats.vatToPay >= 0 ? '#dc2626' : '#2563eb', fontSize: '0.7rem', fontWeight: 800 }}>
              <span>예상 {stats.vatToPay >= 0 ? '납부' : '환급'} 부가세</span>
              <Calculator size={14} />
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: stats.vatToPay >= 0 ? '#b91c1c' : '#1e40af' }}>
              {Math.abs(stats.vatToPay).toLocaleString()}원
            </div>
            <div style={{ fontSize: '0.68rem', color: stats.vatToPay >= 0 ? '#ef4444' : '#3b82f6' }}>
              {stats.vatToPay >= 0 ? '납부 예정 세액' : '환급 예정 세액'}
            </div>
          </div>

          {/* Card 4: Operating Expenses */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d97706', fontSize: '0.7rem', fontWeight: 800 }}>
              <span>영업 경비 합계</span>
              <PieChart size={14} />
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#92400e' }}>
              {stats.expTotal.toLocaleString()}원
            </div>
            <div style={{ fontSize: '0.68rem', color: '#b45309' }}>
              소득세 증빙용 자료
            </div>
          </div>
        </div>

        {/* 2-Tab Segment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button 
            onClick={() => setReportType('summary')}
            style={{
              padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.78rem',
              fontWeight: reportType === 'summary' ? 800 : 600,
              backgroundColor: reportType === 'summary' ? '#fff' : 'transparent',
              color: reportType === 'summary' ? '#2563eb' : '#64748b',
              cursor: 'pointer', boxShadow: reportType === 'summary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            거래 유형별 요약
          </button>
          <button 
            onClick={() => setReportType('partners')}
            style={{
              padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.78rem',
              fontWeight: reportType === 'partners' ? 800 : 600,
              backgroundColor: reportType === 'partners' ? '#fff' : 'transparent',
              color: reportType === 'partners' ? '#2563eb' : '#64748b',
              cursor: 'pointer', boxShadow: reportType === 'partners' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            거래처별 합계표
          </button>
        </div>

        {/* Tab Content */}
        {reportType === 'summary' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Sales Card */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#059669' }}>
                  매출 (과세)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {filteredData.sales.length}건
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                <span>공급가: <strong>{stats.salesNet.toLocaleString()}원</strong></span>
                <span>세액: <strong>{stats.salesVat.toLocaleString()}원</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 900, color: '#059669', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                <span>합계</span>
                <span>{stats.salesTotal.toLocaleString()}원</span>
              </div>
            </div>

            {/* Purchase Card */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2563eb' }}>
                  매입 (과세)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {filteredData.purchases.length}건
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                <span>공급가: <strong>{stats.purchaseNet.toLocaleString()}원</strong></span>
                <span>세액: <strong>{stats.purchaseVat.toLocaleString()}원</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 900, color: '#2563eb', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                <span>합계</span>
                <span>{stats.purchaseTotal.toLocaleString()}원</span>
              </div>
            </div>

            {/* Expense Card */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#d97706' }}>
                  기타 경비
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {filteredData.exps.length}건
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 900, color: '#d97706', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                <span>합계</span>
                <span>{stats.expTotal.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        ) : (
          /* Partner List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {partnerStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                거래 내역이 없습니다.
              </div>
            ) : (
              partnerStats.map((p, idx) => (
                <div key={idx} style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {p.bizNum}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                    <span>매출: <strong style={{ color: '#059669' }}>{p.sales.toLocaleString()}원</strong></span>
                    <span>매입: <strong style={{ color: '#2563eb' }}>{p.purchases.toLocaleString()}원</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </WindowModal>
  );
};

export default TaxReport;
