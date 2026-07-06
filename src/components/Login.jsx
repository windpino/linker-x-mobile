import React, { useState } from 'react';
import { Package, Lock, Check, Eye, EyeOff, Mail, Building2, UserCheck, ArrowLeft, Users } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin, onNavigateToSignup, onFindAgency, prefilledAgencyId, onNavigateToUserSignup, onBackToHome }) => {
  const [step, setStep] = useState(1); // 1: Agency Find, 2: User Login
  const [agencyInput, setAgencyInput] = useState('');
  const [agencyPassword, setAgencyPassword] = useState('');
  const [selectedAgency, setSelectedAgency] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAgencyPassword, setShowAgencyPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    // If there's a prefilled ID from signup, use it and don't skip to step 2
    if (prefilledAgencyId && typeof prefilledAgencyId === 'string') {
      setAgencyInput(prefilledAgencyId);
      setStep(1);
      return;
    }

    const isAutoSave = localStorage.getItem('autoSaveLogin') === 'true';
    const isAutoLogin = localStorage.getItem('autoLogin') === 'true';
    setAutoSave(isAutoSave);
    setAutoLogin(isAutoLogin);

    if (isAutoSave) {
      const savedAgencyInput = localStorage.getItem('savedAgencyInput');
      const savedAgencyPw = localStorage.getItem('savedAgencyPw');
      if (savedAgencyInput) setAgencyInput(savedAgencyInput);
      if (savedAgencyPw) setAgencyPassword(savedAgencyPw);

      const savedAgency = localStorage.getItem('savedAgency');
      if (savedAgency) {
        const agency = JSON.parse(savedAgency);
        setSelectedAgency(agency);
        setStep(2);
        
        const savedEmail = localStorage.getItem('savedLoginId');
        const savedPw = localStorage.getItem('savedLoginPw');
        if (savedEmail) setEmail(savedEmail);
        if (savedPw) setPassword(savedPw);

        // Auto Login Trigger
        if (isAutoLogin && savedAgencyInput && savedAgencyPw && savedEmail && savedPw) {
          const performAutoLogin = async () => {
            const agencyData = await onFindAgency(savedAgencyInput, savedAgencyPw);
            if (agencyData) {
              await onLogin(savedEmail, savedPw, agencyData.id);
            }
          };
          performAutoLogin();
        }
      }
    }
  }, []);

  const handleAgencySubmit = async (e) => {
    e.preventDefault();
    if (!agencyInput || !agencyPassword) return setError('회원사 아이디와 비밀번호를 모두 입력해 주세요.');
    
    setIsLoading(true);
    setError('');
    
    const agency = await onFindAgency(agencyInput, agencyPassword);
    if (agency) {
      if (agency.isMaster) return; 
      setSelectedAgency(agency);
      setStep(2);
      if (autoSave) {
        localStorage.setItem('autoSaveLogin', 'true');
        localStorage.setItem('savedAgencyInput', agencyInput);
        localStorage.setItem('savedAgencyPw', agencyPassword);
        localStorage.setItem('savedAgency', JSON.stringify(agency));
      }
    } else {
      setError('회원사 정보를 찾을 수 없거나 비밀번호가 틀렸습니다.');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('이메일과 비밀번호를 모두 입력해 주세요.');
    
    setIsLoading(true);
    setError('');
    
    if (autoSave) {
      localStorage.setItem('savedLoginId', email);
      localStorage.setItem('savedLoginPw', password);
      localStorage.setItem('autoSaveLogin', 'true');
      localStorage.setItem('autoLogin', autoLogin ? 'true' : 'false');
      localStorage.setItem('savedAgencyInput', agencyInput);
      localStorage.setItem('savedAgencyPw', agencyPassword);
      localStorage.setItem('savedAgency', JSON.stringify(selectedAgency));
    } else {
      localStorage.removeItem('savedLoginId');
      localStorage.removeItem('savedLoginPw');
      localStorage.removeItem('autoLogin');
      localStorage.removeItem('savedAgencyInput');
      localStorage.removeItem('savedAgencyPw');
      localStorage.removeItem('savedAgency');
      localStorage.setItem('autoSaveLogin', 'false');
    }

    const success = await onLogin(email, password, selectedAgency?.id);
    if (!success) {
      setError('아이디 또는 비밀번호가 틀렸습니다.');
    }
    setIsLoading(false);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Side */}
        <div className="login-left" style={{ 
          background: step === 1 
            ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' 
            : 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
          transition: 'all 0.5s ease'
        }}>
          <div className="logo-circle" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            {step === 1 ? <Building2 size={40} color="#ffffff" strokeWidth={1.5} /> : <Users size={40} color="#ffffff" strokeWidth={1.5} />}
          </div>
          <h1 className="login-title">Link X</h1>
          <h2 className="login-subtitle">
            {step === 1 ? '회원사(사업장) 인증' : '사용자(구성원) 접속'}
          </h2>
          
          <div className="login-desc-container">
            <p className="login-desc-primary">
              {step === 1 ? '비즈니스 파트너 인증' : selectedAgency?.name || '시스템'}
            </p>
            <p className="login-desc-secondary">
              {step === 1 
                ? '재고, 물류, 정산을 한 번에\n회원사 계정으로 먼저 인증해 주세요.' 
                : '소속 직원 또는 거래처 계정으로\n로그인하여 업무를 시작하세요.'}
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="login-right">
          <div className="signup-link">
            {step === 1 ? (
              <>계정이 없으신가요? <span onClick={() => onNavigateToSignup()} style={{ cursor: 'pointer', color: '#3b82f6', marginLeft: '4px' }}>회원사 등록</span></>
            ) : (
              <span onClick={handleBackToStep1} style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Package size={14} /> 다른 회원사로 로그인
              </span>
            )}
          </div>
          <div className="login-form-container">
            {onBackToHome && (
              <button 
                type="button" 
                onClick={onBackToHome} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#94a3b8', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '0.85rem', 
                  marginBottom: '20px',
                  padding: 0,
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#ffffff'}
                onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >
                <ArrowLeft size={16} /> 홈페이지로 돌아가기
              </button>
            )}
            {step === 1 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>STEP 01</span>
                  <h2 className="form-title" style={{ marginBottom: 0 }}>회원사 식별</h2>
                </div>
                <p className="form-subtitle">로그인하시려는 회원사(사업장)의 정보를 입력하세요.</p>
                
                <form onSubmit={handleAgencySubmit}>
                  <div className="input-group">
                    <label>회원사 식별 아이디</label>
                    <div className="input-wrapper">
                      <Package size={16} className="input-icon" />
                      <input 
                        type="text" 
                        value={agencyInput}
                        onChange={(e) => {
                          setAgencyInput(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="회원사 아이디 또는 이메일" 
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>회원사 비밀번호</label>
                    <div className="input-wrapper">
                      <Lock size={16} className="input-icon" />
                      <input 
                        type={showAgencyPassword ? "text" : "password"}
                        value={agencyPassword}
                        onChange={(e) => {
                          setAgencyPassword(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="회원사 비밀번호를 입력하세요"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowAgencyPassword(!showAgencyPassword)}
                        className="password-toggle-btn"
                        tabIndex="-1"
                      >
                        {showAgencyPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {error && <div className="login-error-message">{error}</div>}

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div className="checkbox-group" onClick={() => setAutoSave(!autoSave)}>
                      <div className={`custom-checkbox ${autoSave ? 'checked' : ''}`}>
                        {autoSave && <Check size={12} color="#fff" strokeWidth={4} />}
                      </div>
                      <span>아이디 저장</span>
                    </div>
                    <div className="checkbox-group" onClick={() => {
                      if (!autoSave) setAutoSave(true);
                      setAutoLogin(!autoLogin);
                    }}>
                      <div className={`custom-checkbox ${autoLogin ? 'checked' : ''}`}>
                        {autoLogin && <Check size={12} color="#fff" strokeWidth={4} />}
                      </div>
                      <span>자동 로그인</span>
                    </div>
                  </div>

                  <button type="submit" className="login-submit-btn" disabled={isLoading}>
                    {isLoading ? '인증 중...' : '다음 단계'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="agency-badge">
                  <span className="agency-label">회사명</span>
                  <h2 className="agency-name">{selectedAgency?.name || '알 수 없는 회원사'}</h2>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>STEP 02</span>
                  <h2 className="form-title" style={{ marginBottom: 0 }}>사용자 로그인</h2>
                </div>
                <p className="form-subtitle" style={{ marginBottom: '8px' }}><b>{selectedAgency?.name}</b> 소속 직원 및 거래처 계정으로 로그인하세요.</p>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', display: 'flex', gap: '6px' }}>
                  아직 계정이 없으신가요? 
                  <span 
                    onClick={() => onNavigateToUserSignup(selectedAgency)} 
                    style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    회원가입
                  </span>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <label>사용자 ID</label>
                    <div className="input-wrapper">
                      <Mail size={16} className="input-icon" />
                      <input 
                        type="text" 
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="아이디 또는 이메일 입력" 
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>비밀번호</label>
                    <div className="input-wrapper">
                      <Lock size={16} className="input-icon" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="사용자 비밀번호를 입력하세요"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle-btn"
                        tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div className="checkbox-group" onClick={() => setAutoSave(!autoSave)}>
                      <div className={`custom-checkbox ${autoSave ? 'checked' : ''}`}>
                        {autoSave && <Check size={12} color="#fff" strokeWidth={4} />}
                      </div>
                      <span>아이디 저장</span>
                    </div>
                    <div className="checkbox-group" onClick={() => {
                      if (!autoSave) setAutoSave(true);
                      setAutoLogin(!autoLogin);
                    }}>
                      <div className={`custom-checkbox ${autoLogin ? 'checked' : ''}`}>
                        {autoLogin && <Check size={12} color="#fff" strokeWidth={4} />}
                      </div>
                      <span>자동 로그인</span>
                    </div>
                  </div>
                  
                  {error && <div className="login-error-message">{error}</div>}

                  <button type="submit" className="login-submit-btn" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '시스템 접속'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
