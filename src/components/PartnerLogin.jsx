import React, { useState } from 'react';
import { Package, Lock, User, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import './Login.css'; // Reuse some styles but we'll add custom portal styles

const PartnerLogin = ({ companyInfo, onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    onLogin(userId, password);
  };

  const brandingColor = companyInfo?.theme?.primaryColor || '#3b82f6';

  return (
    <div className="login-container" style={{ 
      background: `linear-gradient(135deg, ${brandingColor}dd 0%, #0f172a 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw'
    }}>
      <div className="login-card" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '50px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '30px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '16px', 
            backgroundColor: brandingColor, 
            borderRadius: '20px',
            marginBottom: '20px',
            boxShadow: `0 10px 20px ${brandingColor}44`
          }}>
            <Package size={40} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
            {companyInfo?.name || 'Link X'} Partner Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {companyInfo?.portalWelcome || '거래처 전용 주문 시스템에 오신 것을 환영합니다.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', marginLeft: '4px' }}>Partner ID</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="거래처 아이디를 입력하세요" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{ 
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: '14px', border: '1.5px solid #e2e8f0',
                  fontSize: '1rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc'
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', marginLeft: '4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="비밀번호를 입력하세요" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: '14px', border: '1.5px solid #e2e8f0',
                  fontSize: '1rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc'
                }}
              />
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}

          <button 
            type="submit"
            style={{ 
              marginTop: '10px', width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              backgroundColor: brandingColor, color: 'white', fontSize: '1.1rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: `0 10px 15px -3px ${brandingColor}44`, transition: 'all 0.2s'
            }}
          >
            접속하기 <ArrowRight size={20} />
          </button>
        </form>

        <div style={{ marginTop: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>
            <ShieldCheck size={14} />
            <span>Secure Enterprise Connection</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '30px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', display: 'flex', gap: '20px' }}>
        <span>Privacy Policy</span>
        <span>Terms of Service</span>
        <span>Contact Agency</span>
      </div>
    </div>
  );
};

export default PartnerLogin;
