import React, { useState } from 'react';
import { Package, Mail, Lock, CheckCircle2, ArrowLeft, Eye, EyeOff, ChevronDown } from 'lucide-react';
import emailjs from '@emailjs/browser';
import './Login.css';

const AgencySignup = ({ onSignup, onNavigateToLogin, agencyCategories = ['본사', '직영점', '대리점'] }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState(agencyCategories[0] || '본사');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  React.useEffect(() => {
    if (agencyCategories && agencyCategories.length > 0) {
      setCategory(agencyCategories[0]);
    }
  }, [agencyCategories]);

  const handleSendCode = async () => {
    if (!email) return setError('이메일을 입력해주세요.');
    setIsLoading(true);
    
    // 임시로 인증번호를 123456으로 고정
    const code = '123456';
    setVerificationCode(code);

    try {
      // NOTE: User must replace these with their actual EmailJS credentials inside the .env file
      // Service ID, Template ID, Public Key (Vite environment variables fallback to placeholders)
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_linkerx';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_verification';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'user_your_public_key';

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: email,
          to_name: companyName || '사용자',
          verification_code: code,
          app_name: 'Link X'
        },
        publicKey
      );

      setIsCodeSent(true);
      setError('');
      alert(`인증번호가 ${email}로 발송되었습니다.`);
    } catch (err) {
      console.error('EmailJS Error:', err);
      // Fallback for development/testing if EmailJS is not set up
      setError('실제 메일 발송을 위해서는 EmailJS 설정이 필요합니다. (테스트용 번호: ' + code + ')');
      setIsCodeSent(true); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (inputCode === verificationCode) {
      setIsEmailVerified(true);
      setError('');
      alert('인증되었습니다. 비밀번호를 설정해주세요.');
    } else {
      setError('인증번호가 일치하지 않습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEmailVerified) return setError('이메일 인증을 먼저 완료해주세요.');
    if (password !== confirmPassword) return setError('비밀번호가 일치하지 않습니다.');
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다.');

    setIsLoading(true);
    try {
      // Create a unique ID for the agency/company based on email
      const agencyId = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4);
      
      await onSignup({
        email,
        password,
        name: companyName,
        id: agencyId,
        category,
        status: 'pending_setup'
      });
      setIsSuccess(true);
    } catch (err) {
      setError('가입 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ 
          width: '450px', 
          height: 'auto',
          minHeight: '400px',
          padding: '40px', 
          textAlign: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '50%', display: 'inline-flex' }}>
              <CheckCircle2 size={48} color="#16a34a" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>회원사 생성 완료!</h2>
          <p style={{ color: '#475569', marginBottom: '32px', lineHeight: '1.7', fontSize: '1.05rem' }}>
            <strong style={{ color: '#3b82f6' }}>{email}</strong> 계정으로<br />
            회원사 기반이 성공적으로 마련되었습니다.
          </p>
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '32px', width: '100%' }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              이제 로그인을 통해 회원사의 상세 정보와<br />직원 정보를 등록하여 시스템을 시작하세요.
            </p>
          </div>
          <button 
            onClick={() => onNavigateToLogin(email)}
            className="login-submit-btn"
            style={{ width: '100%', height: '50px' }}
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-left">
          <div className="logo-circle">
            <Package size={40} color="#ffffff" strokeWidth={1.5} />
          </div>
          <h1 className="login-title">Link X</h1>
          <h2 className="login-subtitle">스마트 회원사 솔루션</h2>
          <div className="login-desc-container">
            <p className="login-desc-primary">새로운 회원사를 시작하세요</p>
            <p className="login-desc-secondary">
              이메일 인증만으로 간편하게 시작하고<br />
              모든 업무를 전산화하세요.
            </p>
          </div>
        </div>

        <div className="login-right">
          <button 
            onClick={onNavigateToLogin}
            className="back-btn"
            style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> 돌아가기
          </button>

          <div className="login-form-container" style={{ marginTop: '40px' }}>
            <h2 className="form-title">회원사 가입</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>회원사 상호명</label>
                <div className="input-wrapper">
                  <Package size={16} className="input-icon" />
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="회사명을 입력하세요" 
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>회원사 구분 (카테고리)</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Package size={16} className="input-icon" />
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      background: '#334155',
                      height: '100%',
                      fontSize: '0.9rem',
                      padding: '8px 36px 8px 36px',
                      color: '#e2e8f0',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      borderRadius: '6px'
                    }}
                  >
                    {agencyCategories.map(cat => (
                      <option key={cat} value={cat} style={{ backgroundColor: '#334155', color: '#e2e8f0' }}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} style={{ position: 'absolute', right: '10px', color: '#94a3b8', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="input-group">
                <label>관리자 이메일 주소</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <Mail size={16} className="input-icon" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com" 
                      disabled={isCodeSent && !isEmailVerified}
                      required
                    />
                  </div>
                  {!isEmailVerified && (
                    <button 
                      type="button" 
                      onClick={handleSendCode}
                      style={{ padding: '0 16px', borderRadius: '8px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      {isCodeSent ? '재전송' : '인증번호'}
                    </button>
                  )}
                </div>
              </div>

              {isCodeSent && !isEmailVerified && (
                <div className="input-group" style={{ animation: 'slideDown 0.3s ease' }}>
                  <label>인증번호 입력 (6자리)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="input-wrapper" style={{ flex: 1 }}>
                      <Lock size={16} className="input-icon" />
                      <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="6자리 숫자 입력"
                        maxLength={6}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleVerifyCode}
                      style={{ padding: '0 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      확인
                    </button>
                  </div>
                </div>
              )}

              {isEmailVerified && (
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <CheckCircle2 size={16} /> 인증되었습니다.
                </div>
              )}
              
              <div className="input-group" style={{ opacity: isEmailVerified ? 1 : 0.5, pointerEvents: isEmailVerified ? 'auto' : 'none' }}>
                <label>관리자 비밀번호 설정</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상 입력"
                    required={isEmailVerified}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group" style={{ opacity: isEmailVerified ? 1 : 0.5, pointerEvents: isEmailVerified ? 'auto' : 'none' }}>
                <label>비밀번호 확인</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
                    required={isEmailVerified}
                  />
                </div>
              </div>

              {error && <div className="login-error-message">{error}</div>}

              <button type="submit" className="login-submit-btn" disabled={isLoading || !isEmailVerified}>
                {isLoading ? '생성 중...' : '회원사 생성'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AgencySignup;
