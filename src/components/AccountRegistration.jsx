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
    <WindowModal title={initialData ? "계좌 정보 수정" : "신규 계좌 등록"} onClose={onClose} width="600px">
      <form onSubmit={handleSubmit}>
        <div className="acc-registration-container">
          <div className="acc-form-group">
            <label>1. 계좌번호 <span>*</span></label>
            <div className="acc-input-wrapper no-icon">
              <input 
                type="text" 
                name="accountNumber" 
                placeholder="예: 123-456-789012" 
                value={formData.accountNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="acc-form-group">
            <label>2. 은행명 <span>*</span></label>
            <div className="acc-input-wrapper">
              <Landmark size={16} className="icon" />
              <input 
                type="text" 
                name="bankName" 
                placeholder="예: 국민은행" 
                value={formData.bankName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="acc-form-group">
            <label>3. 계좌(별칭) <span>*</span></label>
            <div className="acc-input-wrapper no-icon">
              <input 
                type="text" 
                name="accountAlias" 
                placeholder="예: 메인 법인통장" 
                value={formData.accountAlias}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="acc-form-group">
            <label>예금주</label>
            <div className="acc-input-wrapper">
              <User size={16} className="icon" />
              <input 
                type="text" 
                name="depositor" 
                placeholder="예: (주)링크엑스" 
                value={formData.depositor}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="acc-form-group">
            <label>4. 메모</label>
            <div className="acc-input-wrapper">
              <FileText size={16} className="icon" style={{ top: '14px' }} />
              <textarea 
                name="memo" 
                rows="3" 
                placeholder="비고 사항" 
                value={formData.memo}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="acc-form-footer">
          <button type="button" className="btn-outline" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>취소</button>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
            <Save size={18} /> 저장하기
          </button>
        </div>
      </form>
    </WindowModal>
  );
};

export default AccountRegistration;
