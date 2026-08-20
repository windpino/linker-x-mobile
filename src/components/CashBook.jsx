import React, { useState } from 'react';
import { BookOpen, Printer, Download, Plus, Calendar, Filter } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './CashBook.css';

const CashBook = ({ onClose }) => {
  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    endDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    driver: '전체 기사',
    region: '전체 지역',
    payment: '전체 결제수단'
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

  const handleExcelExport = () => {
    alert('금전출납부 데이터를 엑셀로 내보냅니다.');
    // Currently empty data, so we export an empty array or dummy for structure
    exportToExcel([], '금전출납부');
  };

  return (
    <WindowModal title="금전출납부" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                금전출납부
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                {filters.startDate} ~ {filters.endDate}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => alert('비용/출금 입력 기능 준비 중입니다.')} 
              style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
            >
              <Plus size={13} /> 입력
            </button>
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

          {/* 3 Filters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <select 
              value={filters.driver} 
              onChange={e => setFilters({...filters, driver: e.target.value})}
              style={{ padding: '6px 4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option>전체 기사</option>
            </select>
            <select 
              value={filters.region} 
              onChange={e => setFilters({...filters, region: e.target.value})}
              style={{ padding: '6px 4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option>전체 지역</option>
            </select>
            <select 
              value={filters.payment} 
              onChange={e => setFilters({...filters, payment: e.target.value})}
              style={{ padding: '6px 4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option>전체 결제</option>
            </select>
          </div>
        </div>

        {/* 3 Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>수금 총액</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>0원</div>
          </div>

          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>비용 총액</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>0원</div>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>순이익</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>0원</div>
          </div>
        </div>

        {/* Transactions Empty State / Card list */}
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          <BookOpen size={32} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
          해당 기간에 금전출납 거래 내역이 없습니다.
        </div>

      </div>
    </WindowModal>
  );
};

export default CashBook;
