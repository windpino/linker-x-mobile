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
    <WindowModal title="금전출납부" onClose={onClose} width="1100px">
      <div className="report-v2-header">
        <h2 className="report-v2-title">금전출납부</h2>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
          <button className="btn-v2-action primary-action"><Plus size={16} /> 비용/출금 입력</button>
        </div>
      </div>

      <div className="report-v2-filters">
        <div className="filter-row-simple" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="date-range-simple" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px' }}>
              <Calendar size={16} />
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
          <div className="filter-select-group">
            <div className="select-with-icon"><Filter size={14} /> <select><option>전체 기사</option></select></div>
            <div className="select-with-icon"><Filter size={14} /> <select><option>전체 지역</option></select></div>
            <div className="select-with-icon"><Filter size={14} /> <select><option>전체 결제수단</option></select></div>
          </div>
        </div>
      </div>

      <div className="report-v2-content">
        <div className="cashbook-summary-cards">
          <div className="cb-card blue">
            <div className="cb-label">수금 총액</div>
            <div className="cb-value">0원</div>
          </div>
          <div className="cb-card red">
            <div className="cb-label">비용 총액</div>
            <div className="cb-value">0원</div>
          </div>
          <div className="cb-card green">
            <div className="cb-label">순이익</div>
            <div className="cb-value">0원</div>
          </div>
        </div>

        <div className="report-v2-table-container">
          <table className="report-v2-table">
            <thead>
              <tr>
                <th>일자</th>
                <th>기사/지역</th>
                <th>구분/결제수단</th>
                <th>적요</th>
                <th style={{ color: '#3b82f6' }}>수입</th>
                <th style={{ color: '#ef4444' }}>지출</th>
                <th>잔액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="7" className="empty-message">해당 기간에 거래 내역이 없습니다.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="footer-row">
                <td colSpan="4">합계</td>
                <td style={{ color: '#3b82f6' }}>0</td>
                <td style={{ color: '#ef4444' }}>0</td>
                <td>0</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default CashBook;
