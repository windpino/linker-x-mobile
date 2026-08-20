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

  const [searchTerm, setSearchTerm] = useState('');

  const displayOrders = useMemo(() => {
    return filteredOrders.filter(order => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const matchPartner = order.partner?.toLowerCase().includes(term);
      const matchItems = order.itemsText?.toLowerCase().includes(term);
      const matchManager = order.manager?.toLowerCase().includes(term);
      return matchPartner || matchItems || matchManager;
    });
  }, [filteredOrders, searchTerm]);

  return (
    <WindowModal title="수주보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                직원별 수주 현황
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
            {['오늘', '1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
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

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="거래처/품목/담당자 검색..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
            />
          </div>
        </div>

        {/* Staff Selector Pills */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {['전체', ...staffList.map(s => s.name)].map(s => {
            const count = staffSummary[s]?.count || 0;
            const isActive = activeStaff === s;
            return (
              <button 
                key={s} 
                onClick={() => setActiveStaff(s)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: isActive ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  backgroundColor: isActive ? '#3b82f6' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{s}</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Summary Card & Order List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              {activeStaff} 수주 내역
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              총 {displayOrders.length}건
            </span>
          </div>

          {displayOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              해당 조건의 수주 내역이 없습니다.
            </div>
          ) : (
            displayOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => onEditOrder && onEditOrder(order)}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#2563eb' }}>
                    {order.partner}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {order.date}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  {order.itemsText || '수주 내역 없음'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} color="#94a3b8" />
                    <span>담당자: <strong style={{ color: '#1e293b' }}>{order.manager || '미지정'}</strong></span>
                  </div>
                  {order.outWarehouse && (
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.68rem' }}>
                      {order.outWarehouse}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default OrderReport;
