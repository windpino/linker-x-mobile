import React, { useState, useMemo } from 'react';
import { BarChart3, Printer, Download, Search, Calendar } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './SalesReport.css';

const SalesReport = ({ onClose, salesInvoices = [] }) => {
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    warehouse: '전체창고매출',
    searchTerm: ''
  });
  const [activeQuick, setActiveQuick] = useState('');

  const warehouses = ['전체창고매출'];

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

  const reportData = useMemo(() => {
    const total = { qty: 0, amount: 0, discount: 0, netSales: 0 };
    const productTotals = {};

    salesInvoices
      .filter(inv => {
        if (inv.date < filters.startDate || inv.date > filters.endDate) return false;
        if (filters.searchTerm && !inv.partner?.includes(filters.searchTerm)) return false;
        if (filters.warehouse !== '전체창고매출' && inv.warehouse !== filters.warehouse) return false;
        return true;
      })
      .forEach(inv => {
        const invDiscount = inv.discount || 0;
        
        inv.items?.forEach(item => {
          const name = item.name || '알 수 없음';
          if (!productTotals[name]) {
            productTotals[name] = { qty: 0, amount: 0, discount: 0, netSales: 0 };
          }
          const itemQty = Number(item.qty || 0);
          const itemTotal = Number(item.total || itemQty * (item.price || 0));
          
          productTotals[name].qty += itemQty;
          productTotals[name].amount += itemTotal;
          productTotals[name].netSales += itemTotal;
        });

        total.qty += (inv.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0);
        total.amount += (inv.totalAmount || 0);
        total.discount += invDiscount;
        total.netSales += ((inv.totalAmount || 0) - invDiscount);
      });

    const sortedProducts = Object.entries(productTotals)
      .map(([name, data]) => ({ type: name, ...data }))
      .sort((a, b) => b.netSales - a.netSales);

    return [
      ...sortedProducts,
      { type: '합계', ...total }
    ];
  }, [salesInvoices, filters]);

  const handleExcelExport = () => {
    const dataToExport = reportData.map(row => ({
      '구분': row.type,
      '수량': row.qty,
      '총 금액': row.amount,
      '할인액': row.discount,
      '순매출액': row.netSales
    }));
    exportToExcel(dataToExport, '매출보고서');
  };

  return (
    <WindowModal title="매출보고서" onClose={onClose} width="1000px">
      <div className="report-v2-header">
        <div className="report-v2-title-group">
          <BarChart3 size={24} color="#3b82f6" />
          <h2 className="report-v2-title">매출 보고서</h2>
        </div>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="report-v2-filters">
        <div className="filter-card">
          <div className="filter-row top">
            <div className="date-range-picker">
              <Calendar size={18} color="#64748b" />
              <input type="date" value={filters.startDate} onChange={e => { setFilters({...filters, startDate: e.target.value}); setActiveQuick(''); }} />
              <span>~</span>
              <input type="date" value={filters.endDate} onChange={e => { setFilters({...filters, endDate: e.target.value}); setActiveQuick(''); }} />
            </div>
            <select className="select-v2" value={filters.warehouse} onChange={e => setFilters({...filters, warehouse: e.target.value})}>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <div className="search-input-v2" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="text" placeholder="업체명 검색..." value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})} />
              <button className="btn-search-main" style={{ whiteSpace: 'nowrap' }}><Search size={16} /> 검색</button>
            </div>
          </div>

          <div className="filter-row bottom">
            <div className="quick-filters">
              {['1주일', '한달', '상반기', '하반기', '1년'].map(opt => (
                <button
                  key={opt}
                  className={`btn-quick ${activeQuick === opt ? 'active' : ''}`}
                  onClick={() => applyQuickFilter(opt)}
                  style={activeQuick === opt ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' } : {}}
                >{opt}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="report-v2-content">
        <div className="report-v2-table-container">
          <table className="report-v2-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>구분</th>
                <th style={{ textAlign: 'center' }}>수량</th>
                <th style={{ textAlign: 'center' }}>총 금액</th>
                <th style={{ textAlign: 'center' }}>할인액</th>
                <th style={{ textAlign: 'right' }}>순매출액</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} className={row.type === '합계' ? 'row-total' : ''}>
                  <td style={{ textAlign: 'left', fontWeight: row.type === '합계' ? 700 : 400 }}>{row.type}</td>
                  <td style={{ textAlign: 'center' }}>{row.qty.toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>{row.amount.toLocaleString()} 원</td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>{row.discount.toLocaleString()} 원</td>
                  <td style={{ textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{row.netSales.toLocaleString()} 원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default SalesReport;
