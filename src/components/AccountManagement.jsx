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
      <WindowModal title="계좌 관리" onClose={onClose} width="100%" contentPadding="0" noScroll>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
          
          {/* Header: Title & Add Account Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} color="#3b82f6" strokeWidth={2.5} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                  계좌 관리
                </h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                  총 <strong style={{ color: '#3b82f6' }}>{filteredAccounts.length}</strong>개 계좌 등록됨
                </p>
              </div>
            </div>

            <button 
              onClick={handleAddAccount}
              style={{
                padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem',
                fontWeight: 700, boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Plus size={14} /> 계좌 추가
            </button>
          </div>

          {/* Search Box & Utilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="은행명, 계좌번호, 계좌명 검색..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => window.print()} 
                style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
              >
                <Printer size={12} /> 인쇄
              </button>
              <button 
                onClick={handleExcelExport} 
                style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
              >
                <Download size={12} /> 엑셀
              </button>
            </div>
          </div>

          {/* Account Card List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1', margin: '8px 0' }}>
                등록된 계좌가 없습니다. 상단의 '+ 계좌 추가' 버튼을 눌러 등록하세요.
              </div>
            ) : (
              filteredAccounts.map(account => (
                <div key={account.id} style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Row 1: Bank Name Badge, Alias & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: '#eff6ff', color: '#2563eb',
                        fontWeight: 800, fontSize: '0.75rem',
                        border: '1px solid #bfdbfe'
                      }}>
                        {account.bankName}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                        {account.accountAlias}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={() => handleEditAccount(account)} 
                        style={{ padding: '3px 6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: 700 }}
                      >
                        <Edit2 size={12} /> 수정
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(account.id)} 
                        style={{ padding: '3px 6px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', fontWeight: 700 }}
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Account Number */}
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', letterSpacing: '0.5px' }}>
                    {account.accountNumber}
                  </div>

                  {/* Row 3: Depositor & Memo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                    <span>예금주: <strong style={{ color: '#1e293b' }}>{account.depositor || '미지정'}</strong></span>
                    {account.memo && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{account.memo}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

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
