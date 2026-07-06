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
    <WindowModal title="세금신고 지원 보고서" onClose={onClose} width="1100px">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
        {/* Toolbar */}
        <div style={{ padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', marginRight: '16px' }}>
              {[1, 2, 3, 4].map(q => (
                <button key={q} onClick={() => setQuarter(q)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>{q}분기</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <span>~</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <div style={{ display: 'flex', gap: '3px', marginLeft: '8px' }}>
                {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.1s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={e => e.currentTarget.style.background = '#fff'}
                  >{btn}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              <FileSpreadsheet size={18} /> 엑셀 다운로드
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>총 매출액 (공급가액)</span>
              <TrendingUp size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.salesNet.toLocaleString()}원</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>부가세: {stats.salesVat.toLocaleString()}원</div>
          </div>
          
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>총 매입액 (공급가액)</span>
              <TrendingDown size={20} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.purchaseNet.toLocaleString()}원</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>부가세: {stats.purchaseVat.toLocaleString()}원</div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>예상 납부 부가세</span>
              <Calculator size={20} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.vatToPay >= 0 ? '#ef4444' : '#3b82f6' }}>
              {Math.abs(stats.vatToPay).toLocaleString()}원 {stats.vatToPay >= 0 ? '납부' : '환급'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>매출세액 - 매입세액</div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>영업 경비 합계</span>
              <PieChart size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.expTotal.toLocaleString()}원</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>소득세 증빙용 자료</div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div style={{ flex: 1, padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '20px' }}>
            <button onClick={() => setReportType('summary')} style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: reportType === 'summary' ? 'white' : 'transparent', color: reportType === 'summary' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} /> 거래 유형별 요약
            </button>
            <button onClick={() => setReportType('partners')} style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: reportType === 'partners' ? 'white' : 'transparent', color: reportType === 'partners' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> 거래처별 합계표
            </button>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {reportType === 'summary' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>구분</th>
                    <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>건수</th>
                    <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>공급가액</th>
                    <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>세액</th>
                    <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>합계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '16px', fontWeight: 600 }}>매출 (과세)</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{filteredData.sales.length}건</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{stats.salesNet.toLocaleString()}원</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{stats.salesVat.toLocaleString()}원</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{stats.salesTotal.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px', fontWeight: 600 }}>매입 (과세)</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{filteredData.purchases.length}건</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{stats.purchaseNet.toLocaleString()}원</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{stats.purchaseVat.toLocaleString()}원</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{stats.purchaseTotal.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '16px', fontWeight: 600 }}>기타 경비</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{filteredData.exps.length}건</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>-</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>-</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700 }}>{stats.expTotal.toLocaleString()}원</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>거래처명</th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>사업자번호</th>
                      <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>매출 합계</th>
                      <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>매입 합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerStats.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '16px', color: '#64748b' }}>{p.bizNum}</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{p.sales.toLocaleString()}원</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{p.purchases.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </WindowModal>
  );
};

export default TaxReport;
