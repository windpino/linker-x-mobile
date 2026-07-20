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

  return (
    <WindowModal title="경비출금" onClose={onClose} width="1100px">
      <div className="report-v2-header">
        <div className="report-v2-title-group">
          <Wallet size={24} color="#ef4444" />
          <h2 className="report-v2-title">경비출금 등록</h2>
        </div>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="expense-body">
        <div className="expense-form-section">
          <div className="form-group-v3">
            <label>날짜</label>
            <input type="date" value={expenseData.date} onChange={e => setExpenseData({...expenseData, date: e.target.value})} />
          </div>

          <div className="form-group-v3">
            <label>과목 (카테고리)</label>
            <div className="category-input-group">
              <select value={expenseData.category} onChange={e => setExpenseData({...expenseData, category: e.target.value})}>
                <option value="">선택하세요</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn-icon-v3"><Plus size={16} /></button>
              <button className="btn-icon-v3"><Settings size={16} /></button>
            </div>
          </div>

          <div className="form-group-v3">
            <label>내역 (상세내역)</label>
            <input type="text" placeholder="지출 내역을 입력하세요" value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} />
          </div>

          <div className="form-group-v3">
            <label>금액</label>
            <div className="amount-input-wrapper">
              <input type="number" value={expenseData.amount} onChange={e => setExpenseData({...expenseData, amount: Number(e.target.value)})} />
              <span className="currency-label">원</span>
            </div>
          </div>

          <div className="form-group-v3">
            <label>결제 수단</label>
            <div className="payment-method-group">
              <button className={`pay-btn ${expenseData.paymentMethod === '현금' ? 'active' : ''}`} onClick={() => setExpenseData({...expenseData, paymentMethod: '현금'})}>
                <Banknote size={16} /> 현금
              </button>
              <button className={`pay-btn ${expenseData.paymentMethod === '계좌이체' ? 'active' : ''}`} onClick={() => setExpenseData({...expenseData, paymentMethod: '계좌이체'})}>
                <Landmark size={16} /> 계좌이체
              </button>
              <button className={`pay-btn ${expenseData.paymentMethod === '카드' ? 'active' : ''}`} onClick={() => setExpenseData({...expenseData, paymentMethod: '카드'})}>
                <CreditCard size={16} /> 카드
              </button>
              <button className={`pay-btn ${expenseData.paymentMethod === '어음' ? 'active' : ''}`} onClick={() => setExpenseData({...expenseData, paymentMethod: '어음'})}>
                <FileText size={16} /> 어음
              </button>
            </div>
          </div>

          <div className="form-group-v3">
            <label>담당자</label>
            <select value={expenseData.manager} onChange={e => setExpenseData({...expenseData, manager: e.target.value})}>
              {staffList.map(s => <option key={s.id || s.userId} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <button className="btn-expense-save" onClick={handleSave}>
            <Wallet size={18} /> 경비 출금 저장
          </button>
        </div>

        <div className="expense-history-section">
          <div className="history-header">
            <Calendar size={18} />
            {expenseData.date} 지출 내역 ({currentDayExpenses.length}건)
          </div>
          <div className="history-list">
            {currentDayExpenses.length > 0 ? (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>과목</th>
                    <th>내역</th>
                    <th>금액</th>
                    <th>결제</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDayExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.category}</td>
                      <td>{exp.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{exp.amount.toLocaleString()}원</td>
                      <td>{exp.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="history-empty">
                등록된 지출 내역이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </WindowModal>
  );
};

export default ExpenseRegistration;
