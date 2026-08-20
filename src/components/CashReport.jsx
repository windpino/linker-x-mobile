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

  const tabs = [
    { id: '결산', label: '결산 보고' },
    { id: '일자별', label: '일자별' },
    { id: '직원별', label: '직원별' },
    { id: '계좌별', label: '계좌별' }
  ];

  return (
    <WindowModal title="입출금보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                입출금 결산 보고서
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

        {/* 4-Tab Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 2px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: activeTab === tab.id ? 800 : 600,
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
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

          {/* Warehouse Selector */}
          <select 
            value={filters.warehouse} 
            onChange={e => setFilters({...filters, warehouse: e.target.value})}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
          >
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Tab 1: 결산 보고서 */}
        {activeTab === '결산' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 3 Summary Badges Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>총 입금액</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>
                  {totalIncome.toLocaleString()}원
                </div>
              </div>

              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>총 지출액</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>
                  {totalExpense.toLocaleString()}원
                </div>
              </div>

              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>총 결산액</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
                  {totalBalance.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* Warehouse Settlement Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!reportData.some(d => d.income > 0 || d.expense > 0) ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  해당 기간에 입출금 내역이 없습니다.
                </div>
              ) : (
                reportData.map(d => (
                  <div key={d.name} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{d.name}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.95rem', color: d.balance >= 0 ? '#059669' : '#dc2626' }}>
                        결산: {d.balance.toLocaleString()}원
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                      <span>입금: <strong style={{ color: '#2563eb' }}>{d.income.toLocaleString()}원</strong></span>
                      <span>지출: <strong style={{ color: '#dc2626' }}>{d.expense.toLocaleString()}원</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: 직원별 현황 */}
        {activeTab === '직원별' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Staff Selector Pills */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['전체', ...staffList.map(s => s.name)].map(s => (
                <button 
                  key={s} 
                  onClick={() => setActiveStaff(s)}
                  style={{
                    padding: '5px 12px', borderRadius: '16px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: activeStaff === s ? '#3b82f6' : '#fff',
                    color: activeStaff === s ? '#fff' : '#475569',
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Staff Sales Card */}
            <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{activeStaff} 매출 성과</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#2563eb' }}>
                  {staffData[activeStaff]?.totalSales.toLocaleString()}원
                </span>
              </div>

              {/* Progress items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: '현금', value: staffData[activeStaff]?.cash, color: '#10b981' },
                  { label: '계좌이체', value: staffData[activeStaff]?.account, color: '#3b82f6' },
                  { label: '어음', value: staffData[activeStaff]?.bill, color: '#f59e0b' },
                  { label: '카드', value: staffData[activeStaff]?.card, color: '#8b5cf6' },
                  { label: '기타', value: staffData[activeStaff]?.other, color: '#94a3b8' },
                ].map(item => {
                  const percentage = staffData[activeStaff]?.totalSales > 0 ? (item.value / staffData[activeStaff].totalSales) * 100 : 0;
                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569' }}>
                        <span style={{ fontWeight: 700 }}>{item.label}</span>
                        <span>{item.value?.toLocaleString()}원 ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: item.color, borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 일자별 현황 */}
        {activeTab === '일자별' && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <Calendar size={32} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
            일자별 입출금 현황 내역이 준비 중입니다.
          </div>
        )}

        {/* Tab 4: 계좌별 현황 */}
        {activeTab === '계좌별' && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <Warehouse size={32} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
            계좌별 입출금 현황 내역이 준비 중입니다.
          </div>
        )}

      </div>
    </WindowModal>
  );
};

export default CashReport;
