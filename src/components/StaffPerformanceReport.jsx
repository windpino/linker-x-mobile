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
    <WindowModal title="직원 실적 보고서" onClose={onClose} width="1000px">
      <div className="report-v2-header">
        <h2 className="report-v2-title">직원 실적 보고서</h2>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="report-v2-filters">
        <div className="filter-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="date-range-picker" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px' }}>
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ border: 'none', outline: 'none' }} />
              <span>~</span>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ border: 'none', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
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
                    borderRadius: '8px',
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
      </div>

      <div className="report-v2-content">
        <div className="summary-badges" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="badge-card blue" style={{ padding: '24px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: '50%' }}><TrendingUp color="#3b82f6" /></div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>기간 내 총 매출액</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{totalPeriodSales.toLocaleString()}원</div>
            </div>
          </div>
          <div className="badge-card purple" style={{ padding: '24px', borderRadius: '12px', background: '#f5f3ff', border: '1px solid #ede9fe', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: '50%' }}><FileText color="#8b5cf6" /></div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>기간 내 총 처리 전표 수</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{totalPeriodCount.toLocaleString()}건</div>
            </div>
          </div>
        </div>

        <div className="report-v2-table-container" style={{ marginTop: '24px' }}>
          <table className="report-v2-table">
            <thead>
              <tr>
                <th width="80px">순위</th>
                <th style={{ textAlign: 'left' }}>직원명</th>
                <th style={{ textAlign: 'center' }}>처리 전표 수</th>
                <th style={{ textAlign: 'center' }}>총 매출액</th>
                <th width="200px">매출 기여도</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.map((d, idx) => {
                const contribution = totalPeriodSales > 0 ? (d.totalSales / totalPeriodSales * 100).toFixed(1) : 0;
                return (
                  <tr key={d.name}>
                    <td>{idx + 1}</td>
                    <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={14} color="#94a3b8" /> {d.name}</td>
                    <td style={{ textAlign: 'center' }}>{d.count.toLocaleString()}건</td>
                    <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>{d.totalSales.toLocaleString()}원</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', minWidth: '40px' }}>{contribution}%</span>
                        <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${contribution}%`, height: '100%', background: '#3b82f6' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default StaffPerformanceReport;
