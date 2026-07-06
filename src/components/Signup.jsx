import React, { useState } from 'react';
import { Package, User, Lock, Building2, Phone, Mail, MapPin, FileText, BadgeCheck, Eye, EyeOff } from 'lucide-react';
import './Login.css'; // Reusing base layout styles
import './Signup.css';

const Signup = ({ onNavigateToLogin, onSignup, staffList = [], currentUser }) => {
  const [formData, setFormData] = useState({
    type: currentUser?.type || '매출처',
    manager: currentUser?.manager || '-',
    loginId: currentUser?.loginId || '',
    password: currentUser?.password || '',
    name: currentUser?.name || '',
    ceo: currentUser?.ceo || '',
    businessNo: currentUser?.businessNo || '',
    phone: currentUser?.phone || '',
    mobile: currentUser?.mobile || '',
    email: currentUser?.email || '',
    address: currentUser?.address || '',
    memo: currentUser?.memo || '',
    receivables: currentUser?.receivables || 0,
    creditLimit: currentUser?.creditLimit || 0
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSignup) {
      onSignup(formData);
    }
    
    if (currentUser) {
      alert('거래처 정보 등록이 완료되었습니다!');
    } else {
      alert('신규 거래처 가입이 완료되었습니다. 로그인해주세요.');
      onNavigateToLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-card signup-card">
        {/* Left Side (Reused from Login) */}
        <div className="login-left">
          <div className="logo-circle">
            <Package size={40} color="#ffffff" strokeWidth={1.5} />
          </div>
          <h1 className="login-title">Link X</h1>
          <h2 className="login-subtitle">동명크릴</h2>
          
          <div className="login-desc-container">
            <p className="login-desc-primary">스마트한 물류 관리의 시작</p>
            <p className="login-desc-secondary">
              재고, 입출고, 정산까지<br />
              한 번에 관리하세요.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="login-right signup-right">
          <div className="signup-link">
            이미 계정이 있으신가요? <span onClick={onNavigateToLogin} style={{ cursor: 'pointer', color: '#3b82f6' }}>로그인</span>
          </div>
          
          <div className="login-form-container signup-form-container">
            <h2 className="form-title">회원가입</h2>
            
            <form onSubmit={handleSubmit} className="signup-form">

              {/* Type and Staff Selection */}
              <div className="form-row">
                <div className="input-group">
                  <label>거래처 구분</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="signup-input" style={{ padding: '10px' }}>
                    <option value="매출처">매출처</option>
                    <option value="매입처">매입처</option>
                    <option value="매입매출처">매입매출처</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>담당 직원 연결 (선택)</label>
                  <select name="manager" value={formData.manager} onChange={handleChange} className="signup-input" style={{ padding: '10px' }}>
                    <option value="-">선택안함</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name} {staff.warehouse ? `(${staff.warehouse})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ID & Password */}
              <div className="form-row">
                <div className="input-group">
                  <label>접속 아이디</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input 
                      type="text" 
                      name="loginId" 
                      value={formData.loginId} 
                      onChange={handleChange} 
                      className="signup-input" 
                      autoComplete="off"
                      required 
                    />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>패스워드</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" style={{ zIndex: 1 }} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="signup-input pr-10" 
                      style={{ paddingLeft: '36px' }}
                      autoComplete="new-password"
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
            </div>

              {/* Company & CEO */}
              <div className="form-row">
                <div className="input-group">
                  <label>상호명</label>
                  <div className="input-wrapper">
                    <Building2 size={16} className="input-icon" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>대표자</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input type="text" name="ceo" value={formData.ceo} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>사업자번호</label>
                  <div className="input-wrapper">
                    <BadgeCheck size={16} className="input-icon" />
                    <input type="text" name="businessNo" value={formData.businessNo} onChange={handleChange} placeholder="000-00-00000" />
                  </div>
                </div>
                <div className="input-group">
                  <label>일반전화</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>휴대전화</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} />
                  </div>
                </div>
                <div className="input-group">
                  <label>이메일주소</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="input-group">
                <label>소재지주소</label>
                <div className="input-wrapper">
                  <MapPin size={16} className="input-icon" />
                  <input type="text" name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>

              {/* Memo */}
              <div className="input-group">
                <label>메모</label>
                <div className="input-wrapper memo-wrapper">
                  <FileText size={16} className="input-icon memo-icon" />
                  <textarea name="memo" value={formData.memo} onChange={handleChange} rows="2" className="signup-textarea"></textarea>
                </div>
              </div>

              <button type="submit" className="login-submit-btn signup-submit-btn">
                가입하기
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
