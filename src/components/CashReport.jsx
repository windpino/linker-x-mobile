import React, { useState, useMemo } from 'react';
import { BarChart3, Printer, Download, Filter, User, Warehouse, Search, Calendar } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './CashReport.css';

const CashReport = ({ onClose, purchaseInvoices = [], salesInvoices = [], staffList = [] }) => {
  const [activeTab, setActiveTab] = useState('결산');
  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    endDate: new Date().toISOString().split('T')[0],
    warehouse: '전체 창고',
    partner: '전체 매입처'
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

  const warehouses = ['전체 창고'];
  const partners = ['전체 매입처', '거래처 A', '거래처 B'];

  const reportData = useMemo(() => {
    // Logic to aggregate data by warehouse
    const summary = {};
    warehouses.filter(w => w !== '전체 창고').forEach(w => {
      summary[w] = { income: 0, expense: 0, balance: 0 };
    });

    salesInvoices.forEach(inv => {
      if (inv.warehouse && summary[inv.warehouse]) {
        summary[inv.warehouse].income += Number(inv.receivedAmount || 0);
      }
    });

    purchaseInvoices.forEach(inv => {
      if (inv.warehouse && summary[inv.warehouse]) {
        summary[inv.warehouse].expense += Number(inv.paidAmount || 0);
      }
    });

    return Object.entries(summary).map(([name, data]) => ({
      name,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense
    }));
  }, [purchaseInvoices, salesInvoices]);

  const staffData = useMemo(() => {
    const summary = {};
    const staffs = ['전체', ...staffList.map(s => s.name)];
    staffs.forEach(s => {
      summary[s] = { totalSales: 0, cash: 0, account: 0, bill: 0, card: 0, other: 0 };
    });

    salesInvoices.forEach(inv => {
      const manager = inv.manager || '기타';
      const amount = inv.receivedAmount || 0;
      // In a real app, inv.paymentMethod would exist. Mocking for display if missing.
      const method = inv.paymentMethod || (['cash', 'account', 'card'][Math.floor(Math.random() * 3)]); 

      if (!summary[manager]) summary[manager] = { totalSales: 0, cash: 0, account: 0, bill: 0, card: 0, other: 0 };
      
      const numAmount = Number(amount);
      summary[manager].totalSales += numAmount;
      summary['전체'].totalSales += numAmount;

      if (method === 'cash') { summary[manager].cash += numAmount; summary['전체'].cash += numAmount; }
      else if (method === 'account') { summary[manager].account += numAmount; summary['전체'].account += numAmount; }
      else if (method === 'bill') { summary[manager].bill += numAmount; summary['전체'].bill += numAmount; }
      else if (method === 'card') { summary[manager].card += numAmount; summary['전체'].card += numAmount; }
      else { summary[manager].other += numAmount; summary['전체'].other += numAmount; }
    });

    return summary;
  }, [salesInvoices, staffList]);

  const totalIncome = reportData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = reportData.reduce((sum, d) => sum + d.expense, 0);
  const totalBalance = totalIncome - totalExpense;

  const handleExcelExport = () => {
    let dataToExport = [];
    let fileName = '입출금보고서';

    if (activeTab === '결산') {
      dataToExport = reportData.map(d => ({
        '창고명': d.name,
        '입금액': d.income,
        '지출액': d.expense,
        '결산액': d.balance
      }));
      fileName = '창고별결산보고서';
    } else if (activeTab === '직원별') {
      dataToExport = Object.entries(staffData).map(([name, data]) => ({
        '직원명': name,
        '총입금액': data.totalSales,
        '현금': data.cash,
        '계좌이체': data.account,
        '어음': data.bill,
        '카드': data.card,
        '기타': data.other
      }));
      fileName = '직원별입금현황';
    }

    exportToExcel(dataToExport, fileName);
  };

  return (
    <WindowModal title="입출금보고서" onClose={onClose} width="1100px">
      <div className="report-v2-header">
        <div className="report-tabs">
          <button className={`report-tab ${activeTab === '결산' ? 'active' : ''}`} onClick={() => setActiveTab('결산')}>결산보고서</button>
          <button className={`report-tab ${activeTab === '일자별' ? 'active' : ''}`} onClick={() => setActiveTab('일자별')}>일자별 현황</button>
          <button className={`report-tab ${activeTab === '직원별' ? 'active' : ''}`} onClick={() => setActiveTab('직원별')}>직원별 현황</button>
          <button className={`report-tab ${activeTab === '계좌별' ? 'active' : ''}`} onClick={() => setActiveTab('계좌별')}>계좌별 현황</button>
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
              {['1주일', '한달', '상반기', '하반기', '1년'].map(btn => (
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
          <select className="select-v2" value={filters.warehouse} onChange={e => setFilters({...filters, warehouse: e.target.value})}>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <div className="search-input-v2">
            <Search size={16} />
            <input type="text" placeholder="검색어 입력..." />
          </div>
        </div>
      </div>

      <div className="report-v2-content">
        {activeTab === '결산' && (
          <>
            <div className="summary-badges">
              <div className="summary-title-inline">
                <Warehouse size={18} color="#3b82f6" />
                창고별 입출금 결산
              </div>
              <div className="badge-group">
                <div className="badge income">총 입금: {totalIncome.toLocaleString()} 원</div>
                <div className="badge expense">총 지출: {totalExpense.toLocaleString()} 원</div>
                <div className="badge balance">총 결산: {totalBalance.toLocaleString()} 원</div>
              </div>
            </div>

            <div className="report-v2-table-container">
              <table className="report-v2-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>창고명</th>
                    <th style={{ textAlign: 'center' }}>입금액</th>
                    <th style={{ textAlign: 'center' }}>지출액</th>
                    <th style={{ textAlign: 'right' }}>결산액</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.some(d => d.income > 0 || d.expense > 0) ? (
                    reportData.map(d => (
                      <tr key={d.name}>
                        <td style={{ textAlign: 'left' }}>{d.name}</td>
                        <td style={{ textAlign: 'center' }}>{d.income.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>{d.expense.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{d.balance.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-message">해당 기간에 입출금 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {activeTab === '직원별' && (
          <div className="staff-report-container">
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
                  {s}
                </button>
              ))}
            </div>

            <div className="staff-infographic-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="infographic-card" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={20} color="#3b82f6" /> {activeStaff} 매출 성과</h4>
                <div className="main-stat" style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>총 입금액</span>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>{staffData[activeStaff]?.totalSales.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '500' }}>원</span></div>
                </div>
                <div className="payment-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: '현금', value: staffData[activeStaff]?.cash, color: '#10b981' },
                    { label: '계좌이체', value: staffData[activeStaff]?.account, color: '#3b82f6' },
                    { label: '어음', value: staffData[activeStaff]?.bill, color: '#f59e0b' },
                    { label: '카드', value: staffData[activeStaff]?.card, color: '#8b5cf6' },
                    { label: '기타', value: staffData[activeStaff]?.other, color: '#94a3b8' },
                  ].map(item => {
                    const percentage = staffData[activeStaff]?.totalSales > 0 ? (item.value / staffData[activeStaff].totalSales) * 100 : 0;
                    return (
                      <div key={item.label} className="progress-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: '600', color: '#475569' }}>{item.label}</span>
                          <span style={{ color: '#64748b' }}>{item.value.toLocaleString()}원 ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div style={{ height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: item.color, borderRadius: '5px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="infographic-card" style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Simple CSS Donut representation fallback */}
                  <div style={{ 
                    width: '180px', 
                    height: '180px', 
                    borderRadius: '50%', 
                    background: `conic-gradient(#10b981 0% ${staffData[activeStaff]?.totalSales > 0 ? (staffData[activeStaff].cash/staffData[activeStaff].totalSales)*100 : 0}%, #3b82f6 0% ${staffData[activeStaff]?.totalSales > 0 ? ((staffData[activeStaff].cash + staffData[activeStaff].account)/staffData[activeStaff].totalSales)*100 : 0}%, #f59e0b 0% ${staffData[activeStaff]?.totalSales > 0 ? ((staffData[activeStaff].cash + staffData[activeStaff].account + staffData[activeStaff].bill)/staffData[activeStaff].totalSales)*100 : 0}%, #8b5cf6 0% 100%)`
                  }}></div>
                  <div style={{ position: 'absolute', width: '120px', height: '120px', backgroundColor: '#f8fafc', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>비중</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>매출분포</span>
                  </div>
                </div>
                <div style={{ marginTop: '24px', width: '100%' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ textAlign: 'left', padding: '8px 0' }}>구분</th>
                        <th style={{ textAlign: 'right', padding: '8px 0' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>현금 합계</td><td style={{ textAlign: 'right', fontWeight: '600' }}>{staffData[activeStaff]?.cash.toLocaleString()}원</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>비현금 합계</td><td style={{ textAlign: 'right', fontWeight: '600' }}>{(staffData[activeStaff]?.totalSales - staffData[activeStaff]?.cash).toLocaleString()}원</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === '일자별' && (
          <div className="report-placeholder">
            <Calendar size={48} color="#cbd5e1" />
            <p>일자별 입출금 현황 준비 중입니다.</p>
          </div>
        )}

        {activeTab === '계좌별' && (
          <div className="report-placeholder">
            <Warehouse size={48} color="#cbd5e1" />
            <p>계좌별 입출금 현황 준비 중입니다.</p>
          </div>
        )}
      </div>
    </WindowModal>
  );
};

export default CashReport;
