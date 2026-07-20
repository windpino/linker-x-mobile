import React, { useState } from 'react';
import { Building2, User, Lock, Phone, Mail, BadgeCheck, MapPin, ArrowRight, Save, CheckCircle2 } from 'lucide-react';
import './Login.css';

const AgencyOnboarding = ({ currentUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const [agencyData, setAgencyData] = useState({
    name: '',
    businessNo: '',
    ceo: '',
    address: '',
    tel: ''
  });
  const [managerData, setManagerData] = useState({
    name: '',
    userId: currentUser?.email || '',
    password: '',
    jobTitle: '관리자',
    phone: '',
    email: currentUser?.email || ''
  });

  const handleComplete = () => {
    onComplete({ agency: agencyData, manager: managerData });
  };

  return (
    <div className="login-container" style={{ 
      background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' 
    }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '40px' }}>
        {/* Progress Stepper */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: step >= 1 ? '#3b82f6' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</div>
            <span style={{ fontWeight: step === 1 ? 800 : 500, color: step === 1 ? '#1e293b' : '#94a3b8' }}>기본 정보 입력</span>
          </div>
          <div style={{ width: '50px', height: '2px', backgroundColor: '#cbd5e1', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: step >= 2 ? '#3b82f6' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</div>
            <span style={{ fontWeight: step === 2 ? 800 : 500, color: step === 2 ? '#1e293b' : '#94a3b8' }}>담당자 프로필 설정</span>
          </div>
        </div>

        <div className="login-card" style={{ 
          backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '50px' 
        }}>
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>기관 기본 정보</h2>
                <p style={{ color: '#64748b' }}>회원사 운영에 필요한 기본 비즈니스 정보를 입력해주세요.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>회원사명 (상호)</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="예: 동명 물류" value={agencyData.name} onChange={e => setAgencyData({...agencyData, name: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>사업자 등록번호</label>
                  <div style={{ position: 'relative' }}>
                    <BadgeCheck size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="000-00-00000" value={agencyData.businessNo} onChange={e => setAgencyData({...agencyData, businessNo: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>대표자명</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="대표자 성함" value={agencyData.ceo} onChange={e => setAgencyData({...agencyData, ceo: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>대표 전화번호</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="tel" placeholder="02-1234-5678" value={agencyData.tel} onChange={e => setAgencyData({...agencyData, tel: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>사업장 주소</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="전체 주소를 입력하세요" value={agencyData.address} onChange={e => setAgencyData({...agencyData, address: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
              </div>

              <button onClick={() => setStep(2)} style={{ 
                marginTop: '30px', width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}>
                다음 단계로 <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>담당자 프로필 설정</h2>
                <p style={{ color: '#64748b' }}>시스템을 관리할 마스터 계정 정보를 설정합니다.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>이름</label>
                  <input type="text" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>직급</label>
                  <input type="text" value={managerData.jobTitle} onChange={e => setManagerData({...managerData, jobTitle: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>아이디 (이메일 권장)</label>
                  <input type="text" value={managerData.userId} onChange={e => setManagerData({...managerData, userId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>비밀번호 설정</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="password" placeholder="비밀번호 입력" value={managerData.password} onChange={e => setManagerData({...managerData, password: e.target.value})} style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>연락처 (휴대폰)</label>
                  <input type="tel" value={managerData.phone} onChange={e => setManagerData({...managerData, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>이메일</label>
                  <input type="email" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontWeight: 800, cursor: 'pointer' }}>이전 단계</button>
                <button onClick={handleComplete} style={{ flex: 2, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  설정 완료 <Save size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyOnboarding;
