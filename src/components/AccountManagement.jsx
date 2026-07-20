import React, { useState } from 'react';
import { CreditCard, Printer, Download, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import WindowModal from './WindowModal';
import AccountRegistration from './AccountRegistration';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import './Account.css';

const AccountManagement = ({ onClose, accounts, setAccounts, currentUser }) => {
  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddAccount = () => {
    setEditingAccount(null);
    setIsRegistrationOpen(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setIsRegistrationOpen(true);
  };

  const handleSaveAccount = async (accountData) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const accountId = editingAccount ? String(editingAccount.id) : String(Date.now());
      
      const finalData = {
        ...accountData,
        id: Number(accountId),
        companyId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'accounts', accountId), finalData);
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Account save error:', err);
      alert('계좌 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 이 계좌를 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      await deleteDoc(doc(db, 'companies', companyId, 'accounts', String(id)));
    } catch (err) {
      console.error('Account delete error:', err);
      alert('계좌 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExcelExport = () => {
    const columnMap = {
      bankName: '은행명',
      accountNumber: '계좌번호',
      accountAlias: '계좌명',
      depositor: '예금주',
      memo: '메모'
    };
    const formattedData = formatDataForExcel(accounts, columnMap);
    exportToExcel(formattedData, '계좌목록');
  };

  const filteredAccounts = accounts.filter(a => 
    a.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.accountAlias.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <WindowModal title="계좌 관리" onClose={onClose} width="1000px">
        <div className="account-header">
          <div className="acc-title-section">
            <h2 className="acc-title">
              <CreditCard color="#3b82f6" size={24} strokeWidth={2} />
              계좌 관리
            </h2>
            <p className="acc-desc">입출금 계좌 정보를 등록하고 관리합니다.</p>
          </div>
          
          <div className="acc-actions">
            <button className="btn-outline" onClick={() => window.print()}>
              <Printer size={16} /> 인쇄
            </button>
            <button className="btn-outline" onClick={handleExcelExport}>
              <Download size={16} /> 엑셀
            </button>
            
            <div className="acc-search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="은행명, 계좌명 검색" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button className="btn-primary" onClick={handleAddAccount}>
              <Plus size={16} /> 계좌 추가
            </button>
          </div>
        </div>

        <div className="account-table-container">
          <table className="account-table">
            <thead>
              <tr>
                <th width="120px">은행명</th>
                <th width="200px">계좌번호</th>
                <th>계좌명(예금주)</th>
                <th>메모</th>
                <th width="100px" className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(account => (
                <tr key={account.id}>
                  <td>
                    <span className="bank-badge">{account.bankName}</span>
                  </td>
                  <td>
                    <span className="acc-number">{account.accountNumber}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{account.accountAlias}</span>
                      {account.depositor && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{account.depositor}</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{account.memo || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button className="icon-btn" onClick={() => handleEditAccount(account)}><Edit2 size={16} /></button>
                      <button className="icon-btn" onClick={() => handleDeleteAccount(account.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    등록된 계좌가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </WindowModal>

      {isRegistrationOpen && (
        <AccountRegistration 
          onClose={() => setIsRegistrationOpen(false)}
          onSave={handleSaveAccount}
          initialData={editingAccount}
        />
      )}
    </>
  );
};

export default AccountManagement;
