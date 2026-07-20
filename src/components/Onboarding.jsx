import React, { useState } from 'react';
import { Building2, User, Mail, Phone, MapPin, ShieldCheck, CheckCircle2, UserPlus, Package } from 'lucide-react';
import './Login.css';
import './Signup.css';

const Onboarding = ({ currentUser, onComplete, staffList = [], warehouses = [] }) => {
  const [activeTab, setActiveTab] = useState('company'); // 'company' or 'staff'
  const [companyData, setCompanyData] = useState({
    name: currentUser?.name || '',
    ceo: '',
    businessNo: '',
    phone: '',
    email: currentUser?.email || '',
    address: '',
    type: '매출처'
  });

  const [staffData, setStaffData] = useState({
    name: currentUser?.name || '',
    userId: 'admin',
    password: '123456',
    jobTitle: '관리자',
    role: 'admin',
    phone: '',
    email: currentUser?.email || '',
    permissions: {
      '재고이동': true, '직원관리': true, '창고관리': true, '거래처등록': true, '거래처관리': true,
      '품목등록': true, '품목관리': true, '계좌관리': true, '특별단가관리': true, '일정': true,
      '매입전표': true, '매입원장': true, '발주': true,
      '매출전표': true, '매출원장': true, '수주': true,
      '입출금보고서': true, '매출보고서': true, '재고보고서': true, '전표수정/삭제 보고서': true,
      '금전출납부': true, '경비출금': true, '직원 실적 보고서': true,
      '데이터 전체 저장/불러오기': true, '엑셀파일로 거래처저장/불러오기': true,
      '엑셀파일로 품목저장/불러오기': true, '매출처원장 저장/불러오기': true,
      '매입처원장 저장/불러오기': true, '구글스프레드시트 연동': true
    },
    viewAllInventoryMovements: true

  });

  const [isCompleted, setIsCompleted] = useState({
    company: false,
    staff: false
  });

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    setIsCompleted(prev => ({ ...prev, company: true }));
    setActiveTab('staff');
    // Sync company name to staff name if staff name is empty or matched previous default
    setStaffData(prev => ({
      ...prev,
      name: prev.name === (currentUser?.name || '') ? (companyData.name || currentUser?.name || '') : prev.name
    }));
  };

  const handleStaffSubmit = (e) => {
    e.preventDefault();
    if (!companyData.name || !companyData.ceo || !companyData.address) {
      alert('회원사 기본 정보(상호명, 대표자, 주소)를 먼저 입력해주세요.');
      setActiveTab('company');
      return;
    }
    // 즉시 최종 제출 수행
    onComplete({ company: companyData, staff: staffData });
  };

  const handleFinalSubmit = () => {
    if (!isCompleted.company || !isCompleted.staff) {
      alert('거래처 정보와 직원 등록을 모두 완료해주세요.');
      return;
    }
    onComplete({ company: companyData, staff: staffData });
  };

  return (
    <div className="login-container">
      <div className="login-card onboarding-card" style={{ 
        maxWidth: '850px', 
        width: '95%', 
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
        minHeight: '550px'
      }}>
        <div className="onboarding-header" style={{ padding: '40px 40px 20px' }}>
          <h2 className="form-title" style={{ color: '#0f172a', fontSize: '1.8rem', marginBottom: '8px' }}>회원사 초기 설정</h2>
          <p className="form-subtitle" style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '32px' }}>서비스 이용을 위해 회원사 정보와 최초 관리자(직원)를 등록해주세요.</p>
          
          <div className="onboarding-steps" style={{ marginBottom: '30px' }}>
            <div className={`step-item ${activeTab === 'company' ? 'active' : ''} ${isCompleted.company ? 'done' : ''}`} onClick={() => setActiveTab('company')}>
              <div className="step-number" style={{ 
                borderColor: activeTab === 'company' ? '#3b82f6' : (isCompleted.company ? '#059669' : '#e2e8f0'),
                backgroundColor: activeTab === 'company' ? '#eff6ff' : (isCompleted.company ? '#ecfdf5' : '#f8fafc'),
                color: activeTab === 'company' ? '#3b82f6' : (isCompleted.company ? '#059669' : '#94a3b8')
              }}>
                {isCompleted.company ? <CheckCircle2 size={16} /> : '1'}
              </div>
              <span style={{ color: activeTab === 'company' ? '#1e40af' : '#64748b', fontWeight: activeTab === 'company' ? 700 : 500 }}>거래처(회원사) 정보</span>
            </div>
            <div className="step-line" style={{ backgroundColor: '#e2e8f0' }}></div>
            <div className={`step-item ${activeTab === 'staff' ? 'active' : ''} ${isCompleted.staff ? 'done' : ''}`} onClick={() => setActiveTab('staff')}>
              <div className="step-number" style={{ 
                borderColor: activeTab === 'staff' ? '#3b82f6' : (isCompleted.staff ? '#059669' : '#e2e8f0'),
                backgroundColor: activeTab === 'staff' ? '#eff6ff' : (isCompleted.staff ? '#ecfdf5' : '#f8fafc'),
                color: activeTab === 'staff' ? '#3b82f6' : (isCompleted.staff ? '#059669' : '#94a3b8')
              }}>
                {isCompleted.staff ? <CheckCircle2 size={16} /> : '2'}
              </div>
              <span style={{ color: activeTab === 'staff' ? '#1e40af' : '#64748b', fontWeight: activeTab === 'staff' ? 700 : 500 }}>관리자(직원) 등록</span>
            </div>
          </div>
        </div>

        <div className="onboarding-content" style={{ padding: '0 40px 40px', flex: 1 }}>
          {activeTab === 'company' ? (
            <form onSubmit={handleCompanySubmit} className="signup-form">
              <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>상호명 (회원사명)</label>
                  <div className="input-wrapper">
                    <Building2 size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={companyData.name} 
                      onChange={e => setCompanyData({...companyData, name: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                      required 
                    />
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>대표자 성명</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={companyData.ceo} 
                      onChange={e => setCompanyData({...companyData, ceo: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>사업자등록번호</label>
                  <div className="input-wrapper">
                    <ShieldCheck size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      placeholder="000-00-00000"
                      value={companyData.businessNo} 
                      onChange={e => setCompanyData({...companyData, businessNo: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>회원사 전화번호</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="tel" 
                      value={companyData.phone} 
                      onChange={e => setCompanyData({...companyData, phone: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '30px' }}>
                <label style={{ color: '#475569', fontWeight: 600 }}>회원사 주소</label>
                <div className="input-wrapper">
                  <MapPin size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    value={companyData.address} 
                    onChange={e => setCompanyData({...companyData, address: e.target.value})} 
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" style={{ height: '50px' }}>
                다음 단계로 (직원 등록)
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffSubmit} className="signup-form">
              <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>관리자(본인) 성명</label>
                  <div className="input-wrapper">
                    <UserPlus size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={staffData.name} 
                      onChange={e => setStaffData({...staffData, name: e.target.value})} 
                      placeholder="실명을 입력하세요"
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                      required 
                    />
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>로그인 아이디</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={staffData.userId} 
                      onChange={e => setStaffData({...staffData, userId: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>직위</label>
                  <div className="input-wrapper">
                    <Package size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={staffData.jobTitle} 
                      onChange={e => setStaffData({...staffData, jobTitle: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ color: '#475569', fontWeight: 600 }}>연락처</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" style={{ color: '#94a3b8' }} />
                    <input 
                      type="tel" 
                      value={staffData.phone} 
                      onChange={e => setStaffData({...staffData, phone: e.target.value})} 
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe', marginBottom: '24px' }}>
                <p style={{ fontSize: '0.85rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ShieldCheck size={16} /> 여기에는 관리자 권한이 자동부여됩니다.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-outline" style={{ flex: 1, height: '50px', borderColor: '#e2e8f0', color: '#64748b' }} onClick={() => setActiveTab('company')}>이전으로</button>
                <button type="submit" className="login-submit-btn" style={{ flex: 2, height: '50px' }}>직원 등록 완료</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .onboarding-card { padding: 40px; }
        .form-subtitle { color: #64748b; margin-bottom: 32px; font-size: 0.95rem; }
        .onboarding-steps { display: flex; align-items: center; justify-content: center; margin-bottom: 40px; gap: 16px; }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: #94a3b8; transition: all 0.3s; }
        .step-item.active { color: #3b82f6; font-weight: 700; }
        .step-item.done { color: #059669; }
        .step-number { width: 32px; height: 32px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 700; }
        .step-line { width: 60px; height: 2px; background-color: #e2e8f0; margin-bottom: 24px; }
        .signup-form { text-align: left; }
      `}</style>
    </div>
  );
};

export default Onboarding;
