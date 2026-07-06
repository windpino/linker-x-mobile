import React, { useState } from 'react';
import { Package, User, Lock, Building2, Phone, Mail, MapPin, FileText, BadgeCheck, Eye, EyeOff, Briefcase, Home } from 'lucide-react';
import './Login.css';
import './Signup.css';

const UserSignup = ({ onNavigateToLogin, onSignup, agency, staffList = [], warehouses = [] }) => {
  const [regType, setRegType] = useState('partner'); // 'partner' or 'staff'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    // Shared fields
    loginId: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    
    // Partner specific
    type: '매출처',
    ceo: '',
    businessNo: '',
    address: '',
    manager: '-',
    
    // Staff specific
    jobTitle: '사원',
    warehouse: '-'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      regType,
      companyId: agency.id,
      createdAt: new Date().toISOString()
    };
    
    if (onSignup) {
      onSignup(submissionData);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card signup-card">
        <div className="login-left">
          <div className="logo-circle">
            <Package size={40} color="#ffffff" strokeWidth={1.5} />
          </div>
          <h1 className="login-title">Link X</h1>
          <h2 className="login-subtitle">{agency?.name || '시스템'}</h2>
          
          <div className="login-desc-container">
            <p className="login-desc-primary">새로운 시작을 환영합니다!</p>
            <p className="login-desc-secondary">
              회원사의 구성원 또는 파트너로<br />
              등록하여 서비스를 이용하세요.
            </p>
          </div>
        </div>

        <div className="login-right signup-right">
          <div className="signup-link">
            이미 계정이 있으신가요? <span onClick={onNavigateToLogin} style={{ cursor: 'pointer', color: '#3b82f6' }}>로그인</span>
          </div>
          
          <div className="login-form-container signup-form-container" style={{ maxHeight: '85vh', overflowY: 'auto', paddingRight: '10px' }}>
            <h2 className="form-title">회원가입</h2>
            
            <div className="registration-type-toggle" style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button 
                className={`type-toggle-btn ${regType === 'partner' ? 'active' : ''}`}
                onClick={() => setRegType('partner')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: regType === 'partner' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: regType === 'partner' ? '#eff6ff' : '#fff', color: regType === 'partner' ? '#1d4ed8' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
              >
                거래처 가입
              </button>
              <button 
                className={`type-toggle-btn ${regType === 'staff' ? 'active' : ''}`}
                onClick={() => setRegType('staff')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: regType === 'staff' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: regType === 'staff' ? '#eff6ff' : '#fff', color: regType === 'staff' ? '#1d4ed8' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
              >
                직원 등록
              </button>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              {/* ID & Password */}
              <div className="form-row">
                <div className="input-group">
                  <label>접속 아이디</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input type="text" name="loginId" value={formData.loginId} onChange={handleChange} required />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>패스워드</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" style={{ zIndex: 1 }} />
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Name & Contact */}
              <div className="form-row">
                <div className="input-group">
                  <label>{regType === 'partner' ? '상호명' : '이름'}</label>
                  <div className="input-wrapper">
                    {regType === 'partner' ? <Building2 size={16} className="input-icon" /> : <User size={16} className="input-icon" />}
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>휴대전화</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {regType === 'partner' ? (
                <>
                  <div className="form-row">
                    <div className="input-group">
                      <label>대표자</label>
                      <div className="input-wrapper">
                        <User size={16} className="input-icon" />
                        <input type="text" name="ceo" value={formData.ceo} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>사업자번호</label>
                      <div className="input-wrapper">
                        <BadgeCheck size={16} className="input-icon" />
                        <input type="text" name="businessNo" value={formData.businessNo} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>거래처 구분</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="signup-input" style={{ width: '100%', padding: '12px' }}>
                      <option value="매출처">매출처</option>
                      <option value="매입처">매입처</option>
                      <option value="매입매출처">매입매출처</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="input-group">
                  <label>직급</label>
                  <div className="input-wrapper">
                    <Briefcase size={16} className="input-icon" />
                    <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="예: 사원, 과장" />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>이메일주소</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <button type="submit" className="login-submit-btn signup-submit-btn">
                {regType === 'partner' ? '거래처로 가입하기' : '직원으로 등록하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSignup;
