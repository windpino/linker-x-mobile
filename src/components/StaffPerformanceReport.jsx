import React, { useState, useMemo } from 'react';
import { UserCheck, Printer, Download, TrendingUp, FileText } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';

const StaffPerformanceReport = ({ onClose, staffList = [], salesInvoices = [] }) => {
  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    endDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })()
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

  const performanceData = useMemo(() => {
    return staffList.map(staff => {
      const staffInvoices = salesInvoices.filter(inv => inv.manager === staff.name);
      // Filter by date range
      const periodInvoices = staffInvoices.filter(inv => inv.date >= filters.startDate && inv.date <= filters.endDate);
      const totalSales = periodInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const count = periodInvoices.length;
      return {
        name: staff.name,
        count,
        totalSales,
        contribution: 0
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [staffList, salesInvoices, filters]);

  const totalPeriodSales = performanceData.reduce((sum, d) => sum + d.totalSales, 0);
  const totalPeriodCount = performanceData.reduce((sum, d) => sum + d.count, 0);

  const handleExcelExport = () => {
    const dataToExport = performanceData.map((d, idx) => ({
      '순위': idx + 1,
      '직원명': d.name,
      '처리전표수': d.count,
      '총매출액': d.totalSales,
      '매출기여도': totalPeriodSales > 0 ? (d.totalSales / totalPeriodSales * 100).toFixed(1) + '%' : '0%'
    }));
    exportToExcel(dataToExport, '직원실적보고서');
  };

  return (
    <WindowModal title="직원 실적 보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                직원 실적 보고서
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
          {/* Date Picker */}
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

        {/* 2 Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700 }}>
              <TrendingUp size={14} />
              <span>기간 내 총 매출액</span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1d4ed8' }}>
              {totalPeriodSales.toLocaleString()}원
            </div>
          </div>

          <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 700 }}>
              <FileText size={14} />
              <span>총 처리 전표 수</span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6d28d9' }}>
              {totalPeriodCount.toLocaleString()}건
            </div>
          </div>
        </div>

        {/* Ranked Staff Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              직원별 실적 순위 ({performanceData.length}명)
            </span>
          </div>

          {performanceData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              등록된 직원 실적 데이터가 없습니다.
            </div>
          ) : (
            performanceData.map((d, idx) => {
              const contribution = totalPeriodSales > 0 ? (d.totalSales / totalPeriodSales * 100).toFixed(1) : 0;
              const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#cbd5e1';
              const rankBg = idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#ffedd5' : '#f8fafc';

              return (
                <div key={d.name} style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Row 1: Rank, Name & Total Sales */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: rankBg, color: rankColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 900, border: `1px solid ${rankColor}`
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                        {d.name}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#2563eb' }}>
                      {d.totalSales.toLocaleString()}원
                    </span>
                  </div>

                  {/* Row 2: Invoices Count & Contribution Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                      <span>처리 전표: <strong style={{ color: '#1e293b' }}>{d.count.toLocaleString()}건</strong></span>
                      <span>기여도: <strong style={{ color: '#2563eb' }}>{contribution}%</strong></span>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${contribution}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default StaffPerformanceReport;
