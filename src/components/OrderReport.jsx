import React, { useState, useMemo } from 'react';
import { ShoppingCart, Printer, Download, Search, Calendar, User, List } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './CashReport.css';

const OrderReport = ({ onClose, salesOrders = [], staffList = [], onEditOrder }) => {
  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; // Default to 1st of month
    })(),
    endDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
  });
  const [activeStaff, setActiveStaff] = useState('전체');

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

  const filteredOrders = useMemo(() => {
    return salesOrders.filter(order => {
      const dateMatch = order.date >= filters.startDate && order.date <= filters.endDate;
      const staffMatch = activeStaff === '전체' || order.manager === activeStaff;
      return dateMatch && staffMatch;
    });
  }, [salesOrders, filters, activeStaff]);

  const staffSummary = useMemo(() => {
    const summary = {};
    ['전체', ...staffList.map(s => s.name)].forEach(name => {
      summary[name] = { count: 0 };
    });

    salesOrders.forEach(order => {
      if (order.date >= filters.startDate && order.date <= filters.endDate) {
        summary['전체'].count += 1;
        if (summary[order.manager]) {
          summary[order.manager].count += 1;
        }
      }
    });
    return summary;
  }, [salesOrders, staffList, filters]);

  const handleExcelExport = () => {
    const dataToExport = filteredOrders.map(order => ({
      '수주일자': order.date,
      '담당자': order.manager,
      '거래처명': order.partner,
      '수주내역': order.itemsText,
      '출고창고': order.outWarehouse
    }));
    exportToExcel(dataToExport, '수주보고서');
  };

  return (
    <WindowModal title="수주보고서" onClose={onClose} width="1000px">
      <div className="report-v2-header">
        <div className="report-tabs">
          <div className="report-tab active">직원별 수주 현황</div>
        </div>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="report-v2-filters">
        <div className="filter-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="date-range-picker">
              <Calendar size={18} color="#64748b" />
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              <span>~</span>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['오늘', '1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleQuickDate(btn)}
                  style={{
                    padding: '4px 8px',
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
          <div className="search-input-v2">
            <Search size={16} />
            <input type="text" placeholder="거래처/품목 검색..." />
          </div>
        </div>
      </div>

      <div className="report-v2-content">
        <div className="staff-selector-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
          {['전체', ...staffList.map(s => s.name)].map(s => (
            <button 
              key={s} 
              className={`staff-select-btn ${activeStaff === s ? 'active' : ''}`}
              onClick={() => setActiveStaff(s)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: activeStaff === s ? '#3b82f6' : 'white',
                color: activeStaff === s ? 'white' : '#64748b',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {s} ({staffSummary[s]?.count || 0})
            </button>
          ))}
        </div>

        <div className="report-v2-table-container">
          <div className="summary-badges" style={{ marginBottom: '16px' }}>
            <div className="summary-title-inline">
              <ShoppingCart size={18} color="#3b82f6" />
              {activeStaff} 수주 내역 요약
            </div>
            <div className="badge-group">
              <div className="badge income">총 수주 건수: {filteredOrders.length} 건</div>
            </div>
          </div>

          <table className="report-v2-table">
            <thead>
              <tr>
                <th width="120px">수주일자</th>
                <th width="150px">담당자</th>
                <th width="200px">거래처명</th>
                <th style={{ textAlign: 'left' }}>수주내역</th>
                <th width="150px">출고창고</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.date}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <User size={14} color="#94a3b8" />
                        {order.manager}
                      </div>
                    </td>
                    <td 
                      style={{ fontWeight: 600, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        if (onEditOrder) {
                          onEditOrder(order);
                        }
                      }}
                      title="클릭 시 간편수주 수정창 열기"
                    >
                      {order.partner}
                    </td>
                    <td style={{ textAlign: 'left' }}>{order.itemsText}</td>
                    <td>{order.outWarehouse}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-message">수주 내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default OrderReport;
