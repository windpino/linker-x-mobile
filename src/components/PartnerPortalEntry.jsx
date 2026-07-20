import React, { useState } from 'react';
import { Package, Mail, Lock, ArrowRight, User, Building2, Phone, MapPin, FileText, BadgeCheck, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import './Login.css';
import './Signup.css';

const PartnerPortalEntry = ({ companyInfo, onCheckEmail, onLogin, onSignup, staffList = [] }) => {
  const [step, setStep] = useState('email'); // 'email', 'login', 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState(null); // 'partner' or 'staff'
  const [error, setError] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    type: '매출처',
    manager: '-',
    name: '',
    ceo: '',
    businessNo: '',
    phone: '',
    mobile: '',
    address: '',
    memo: ''
  });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    setError('');
    
    // Check if user exists via callback
    const result = await onCheckEmail(email);
    if (result.exists) {
      setUserType(result.type);
      setStep('login');
    } else {
      setStep('signup');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password, userType);
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    onSignup({ ...signupData, email, loginId: email, password });
  };

  const brandingColor = companyInfo?.theme?.primaryColor || '#3b82f6';

  return (
    <div className="login-container" style={{ 
      background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' 
    }}>
      <div className="login-card" style={{ 
        maxWidth: '1100px', width: '95%', height: '85vh', display: 'flex', overflow: 'hidden', borderRadius: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', backgroundColor: '#2d3748'
      }}>
        {/* Left Side: Branding (from User's Image) */}
        <div style={{ 
          flex: 1, backgroundColor: brandingColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '60px', textAlign: 'center'
        }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '24px', borderRadius: '50%', marginBottom: '30px' }}>
            <Package size={60} color="white" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '10px', letterSpacing: '-0.02em' }}>Link X</h1>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '40px', opacity: 0.9 }}>비즈니스 파트너</h2>
          
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>스마트한 주문 관리의 시작</p>
            <p style={{ fontSize: '1rem', opacity: 0.8, lineHeight: 1.6 }}>
              Link X와 함께<br />
              간편하게 주문하고 정산하세요.
            </p>
          </div>
        </div>

        {/* Right Side: Flow */}
        <div style={{ flex: 1.2, backgroundColor: '#1a202c', padding: '60px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {step !== 'email' && (
            <button onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', fontSize: '1rem' }}>
              <ChevronLeft size={20} /> 뒤로가기
            </button>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {step === 'email' && (
              <div style={{ maxWidth: '450px', width: '100%', margin: '0 auto' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>반갑습니다!</h2>
                <p style={{ color: '#94a3b8', marginBottom: '40px' }}>이메일을 입력하여 시작하세요.</p>
                
                <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>이메일 주소</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#718096' }} />
                      <input 
                        type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '18px 18px 18px 52px', borderRadius: '16px', border: '2px solid #2d3748', backgroundColor: '#2d3748', color: 'white', fontSize: '1.1rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  {error && <p style={{ color: '#fc8181', fontSize: '0.9rem' }}>{error}</p>}
                  <button type="submit" style={{ 
                    marginTop: '10px', padding: '18px', borderRadius: '16px', border: 'none', backgroundColor: brandingColor, color: 'white', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                  }}>
                    계속하기 <ArrowRight size={22} />
                  </button>
                </form>
              </div>
            )}

            {step === 'login' && (
              <div style={{ maxWidth: '450px', width: '100%', margin: '0 auto' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>다시 오셨군요!</h2>
                <p style={{ color: '#94a3b8', marginBottom: '40px' }}>{email} 계정으로 로그인합니다.</p>
                
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>비밀번호</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#718096' }} />
                      <input 
                        type={showPassword ? "text" : "password"} placeholder="비밀번호를 입력하세요" value={password} onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '18px 18px 18px 52px', borderRadius: '16px', border: '2px solid #2d3748', backgroundColor: '#2d3748', color: 'white', fontSize: '1.1rem', outline: 'none' }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#718096', cursor: 'pointer' }}>
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" style={{ 
                    marginTop: '10px', padding: '18px', borderRadius: '16px', border: 'none', backgroundColor: brandingColor, color: 'white', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer'
                  }}>
                    로그인
                  </button>
                </form>
              </div>
            )}

            {step === 'signup' && (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>회원가입</h2>
                  <span style={{ color: '#718096', fontSize: '0.9rem' }}>{email}</span>
                </div>
                
                <form onSubmit={handleSignupSubmit} className="signup-form dark">
                  <div className="form-row">
                    <div className="input-group">
                      <label>거래처 구분</label>
                      <select value={signupData.type} onChange={e => setSignupData({...signupData, type: e.target.value})}>
                        <option value="매출처">매출처</option>
                        <option value="매입처">매입처</option>
                        <option value="매입매출처">매입매출처</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>담당 직원 연결 (선택)</label>
                      <select value={signupData.manager} onChange={e => setSignupData({...signupData, manager: e.target.value})}>
                        <option value="-">선택안함</option>
                        {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>비밀번호 설정</label>
                      <div className="input-wrapper">
                        <Lock size={16} className="input-icon" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>상호명</label>
                      <div className="input-wrapper">
                        <Building2 size={16} className="input-icon" />
                        <input type="text" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} required />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>대표자</label>
                      <div className="input-wrapper">
                        <User size={16} className="input-icon" />
                        <input type="text" value={signupData.ceo} onChange={e => setSignupData({...signupData, ceo: e.target.value})} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>사업자번호</label>
                      <div className="input-wrapper">
                        <BadgeCheck size={16} className="input-icon" />
                        <input type="text" value={signupData.businessNo} onChange={e => setSignupData({...signupData, businessNo: e.target.value})} placeholder="000-00-00000" />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>휴대전화</label>
                      <div className="input-wrapper">
                        <Phone size={16} className="input-icon" />
                        <input type="tel" value={signupData.mobile} onChange={e => setSignupData({...signupData, mobile: e.target.value})} required />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>소재지주소</label>
                      <div className="input-wrapper">
                        <MapPin size={16} className="input-icon" />
                        <input type="text" value={signupData.address} onChange={e => setSignupData({...signupData, address: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginTop: '10px' }}>
                    <label>메모</label>
                    <textarea rows="2" value={signupData.memo} onChange={e => setSignupData({...signupData, memo: e.target.value})} style={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '10px', color: 'white', padding: '12px', width: '100%' }}></textarea>
                  </div>

                  <button type="submit" style={{ 
                    marginTop: '30px', width: '100%', padding: '18px', borderRadius: '16px', border: 'none', backgroundColor: brandingColor, color: 'white', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer'
                  }}>
                    가입하기
                  </button>
                </form>
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} {companyInfo?.name || 'Link X'} Business Partner. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPortalEntry;
