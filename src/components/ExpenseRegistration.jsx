import React, { useState } from 'react';
import { Wallet, Printer, Download, Plus, Settings, CreditCard, Banknote, Landmark, FileText, Calendar } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './ExpenseRegistration.css';

const ExpenseRegistration = ({ onClose, staffList = [], expenses = [], onSave }) => {
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: 0,
    paymentMethod: '현금',
    manager: staffList[0]?.name || ''
  });

  const categories = ['식대', '교통비', '소모품비', '통신비', '수도광열비', '차량유지비', '임차료', '급여', '세금과공과', '기타'];

  const handleSave = () => {
    if (!expenseData.category || !expenseData.description || expenseData.amount <= 0) {
      alert('과목, 내역, 금액을 정확히 입력해주세요.');
      return;
    }
    onSave(expenseData);
    setExpenseData({
      ...expenseData,
      description: '',
      amount: 0
    });
    alert('경비 지출이 등록되었습니다.');
  };

  const handleExcelExport = () => {
    const dataToExport = expenses.map(exp => ({
      '날짜': exp.date,
      '과목': exp.category,
      '상세내역': exp.description,
      '금액': exp.amount,
      '결제수단': exp.paymentMethod,
      '담당자': exp.manager
    }));
    exportToExcel(dataToExport, '경비지출내역');
  };

  const currentDayExpenses = expenses.filter(exp => exp.date === expenseData.date);

  const totalDayExpense = currentDayExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  return (
    <WindowModal title="경비출금" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="#ef4444" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                경비출금 등록
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                지출 경비를 간편하게 기록합니다.
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

        {/* Input Form Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: Date & Manager */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>날짜</label>
              <input 
                type="date" 
                value={expenseData.date} 
                onChange={e => setExpenseData({...expenseData, date: e.target.value})} 
                style={{ width: '100%', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>담당자</label>
              <select 
                value={expenseData.manager} 
                onChange={e => setExpenseData({...expenseData, manager: e.target.value})}
                style={{ width: '100%', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                {staffList.map(s => <option key={s.id || s.userId} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>과목 (카테고리)</label>
            <select 
              value={expenseData.category} 
              onChange={e => setExpenseData({...expenseData, category: e.target.value})}
              style={{ width: '100%', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
            >
              <option value="">선택하세요</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Row 3: Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>상세 내역</label>
            <input 
              type="text" 
              placeholder="지출 내역을 입력하세요 (예: 거래처 미팅 식대)" 
              value={expenseData.description} 
              onChange={e => setExpenseData({...expenseData, description: e.target.value})} 
              style={{ width: '100%', height: '34px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Row 4: Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>금액</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={expenseData.amount ? expenseData.amount.toLocaleString() : ''} 
                placeholder="0"
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setExpenseData({...expenseData, amount: val === '' ? 0 : Number(val)});
                }} 
                onFocus={e => e.target.select()}
                style={{ width: '100%', height: '36px', paddingRight: '28px', paddingLeft: '10px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 800, color: '#ef4444', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>원</span>
            </div>
          </div>

          {/* Row 5: Payment Method 4-Grid */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>결제 수단</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {[
                { id: '현금', label: '현금', icon: Banknote },
                { id: '계좌이체', label: '계좌', icon: Landmark },
                { id: '카드', label: '카드', icon: CreditCard },
                { id: '어음', label: '어음', icon: FileText },
              ].map(item => {
                const Icon = item.icon;
                const isActive = expenseData.paymentMethod === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExpenseData({...expenseData, paymentMethod: item.id})}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: isActive ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: isActive ? '#fef2f2' : '#fff',
                      color: isActive ? '#dc2626' : '#475569',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} color={isActive ? '#dc2626' : '#64748b'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            style={{
              width: '100%', padding: '11px', backgroundColor: '#ef4444', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)', marginTop: '4px'
            }}
          >
            <Wallet size={16} /> 경비 출금 저장
          </button>
        </div>

        {/* Daily Expenses Section (Vertical Stack) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              {expenseData.date} 지출 내역 ({currentDayExpenses.length}건)
            </span>
            {currentDayExpenses.length > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444' }}>
                합계: {totalDayExpense.toLocaleString()}원
              </span>
            )}
          </div>

          {currentDayExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              해당 일자에 등록된 지출 내역이 없습니다.
            </div>
          ) : (
            currentDayExpenses.map((exp, idx) => (
              <div key={exp.id || idx} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 800 }}>
                      {exp.category}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                      {exp.description}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ef4444' }}>
                    {Number(exp.amount || 0).toLocaleString()}원
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                  <span>결제: <strong style={{ color: '#1e293b' }}>{exp.paymentMethod}</strong></span>
                  <span>담당자: {exp.manager || '-'}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default ExpenseRegistration;
