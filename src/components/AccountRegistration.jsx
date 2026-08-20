import React, { useState } from 'react';
import { CreditCard, Landmark, User, FileText, Save, X } from 'lucide-react';
import WindowModal from './WindowModal';

const AccountRegistration = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    accountNumber: '',
    bankName: '',
    accountAlias: '',
    depositor: '',
    memo: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.accountNumber || !formData.bankName || !formData.accountAlias) {
      alert('필수 항목(* 표시)을 모두 입력해주세요.');
      return;
    }
    onSave(formData);
  };

  return (
    <WindowModal title={initialData ? "계좌 정보 수정" : "신규 계좌 등록"} onClose={onClose} width="100%" contentPadding="0" noScroll>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              1. 계좌번호 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              name="accountNumber" 
              placeholder="예: 123-456-789012" 
              value={formData.accountNumber}
              onChange={handleChange}
              required
              style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              2. 은행명 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              name="bankName" 
              placeholder="예: 국민은행, 신한은행" 
              value={formData.bankName}
              onChange={handleChange}
              required
              style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              3. 계좌(별칭) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              name="accountAlias" 
              placeholder="예: 메인 법인통장, 수금계좌" 
              value={formData.accountAlias}
              onChange={handleChange}
              required
              style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              4. 예금주
            </label>
            <input 
              type="text" 
              name="depositor" 
              placeholder="예: (주)링크엑스" 
              value={formData.depositor}
              onChange={handleChange}
              style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              5. 메모
            </label>
            <textarea 
              name="memo" 
              rows="3" 
              placeholder="비고 사항 입력..." 
              value={formData.memo}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
            ></textarea>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ flex: 1, padding: '11px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            취소
          </button>
          <button 
            type="submit" 
            style={{ flex: 2, padding: '11px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
          >
            <Save size={16} /> 저장하기
          </button>
        </div>
      </form>
    </WindowModal>
  );
};

export default AccountRegistration;
