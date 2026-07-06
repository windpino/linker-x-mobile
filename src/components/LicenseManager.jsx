import React, { useState } from 'react';
import { ShieldCheck, CreditCard, Calendar, AlertTriangle, CheckCircle2, Crown, Lock } from 'lucide-react';
import WindowModal from './WindowModal';
import './LicenseManager.css';

const LicenseManager = ({ onClose, currentUser, licenseData, onUpdateLicense }) => {
  const isMadmin = currentUser?.userId === 'madmin';
  
  const [adminDate, setAdminDate] = useState(licenseData.expiryDate);
  const [adminLock, setAdminLock] = useState(licenseData.isLockedOnExpiry);

  const calculateDaysLeft = () => {
    const today = new Date();
    const expiry = new Date(licenseData.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();

  const plans = [
    { id: '1month', name: '1개월 사용권', price: '33,000원', period: 30 },
    { id: '3months', name: '3개월 사용권', price: '99,000원', period: 90 },
    { id: '6months', name: '6개월 사용권', price: '180,000원', period: 180 },
    { id: '1year', name: '1년 사용권', price: '330,000원', period: 365 },
  ];

  const handlePurchase = (plan) => {
    if (window.confirm(`${plan.name}을 결제하시겠습니까?`)) {
      const today = new Date();
      const currentExpiry = new Date(licenseData.expiryDate);
      // If expired, start from today. If not, add to current expiry.
      const baseDate = today > currentExpiry ? today : currentExpiry;
      const newExpiry = new Date(baseDate.getTime() + (plan.period * 24 * 60 * 60 * 1000));
      
      onUpdateLicense({
        ...licenseData,
        expiryDate: newExpiry.toISOString().split('T')[0],
        plan: plan.name,
        lastPaymentDate: new Date().toISOString().split('T')[0]
      });
      alert(`${plan.name} 결제가 완료되었습니다. 이용 기간이 연장되었습니다.`);
    }
  };

  const extendLicense = (months) => {
    const today = new Date();
    const currentExpiry = new Date(licenseData.expiryDate);
    const baseDate = today > currentExpiry ? today : currentExpiry;
    
    // Simple month addition (30 days per month for consistency)
    const daysToAdd = months * 30;
    const newExpiry = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    const newDateStr = newExpiry.toISOString().split('T')[0];
    
    setAdminDate(newDateStr);
    onUpdateLicense({
      ...licenseData,
      expiryDate: newDateStr
    });
    alert(`사용 기간이 ${months}개월 연장되었습니다.`);
  };

  const handleAdminUpdate = () => {
    onUpdateLicense({
      ...licenseData,
      expiryDate: adminDate,
      isLockedOnExpiry: adminLock
    });
    alert('시스템 라이선스 설정이 업데이트되었습니다.');
  };

  return (
    <WindowModal title="정품등록 및 라이선스 관리" onClose={onClose} width="950px">
      <div className="license-container">
        {/* Status Header */}
        <div className="license-status-card">
          <div className="status-info">
            <h2>현재 라이선스 상태</h2>
            <div className="expiry-date">
              {licenseData.plan} - {licenseData.expiryDate}까지
            </div>
          </div>
          <div className="days-left">
            <div className="number">{daysLeft > 0 ? daysLeft : 0}</div>
            <div className="unit">남은 일수</div>
          </div>
        </div>

        {/* Plans Section */}
        <div className="license-plans-title">
          <Crown size={24} color="#fb923c" />
          이용권 구매 및 연장
        </div>
        
        <div className="license-info-banner">
          <AlertTriangle size={18} />
          <span>기본 1개 ID 기준 (부가세 포함). 모바일 추가 ID당 1만원 추가. 5개 이상 무제한 사용 시 월 10만원 정액제.</span>
        </div>

        <div className="plans-grid">
          {plans.map(plan => (
            <div key={plan.id} className="plan-card" onClick={() => handlePurchase(plan)}>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">{plan.price}</div>
              <ul className="plan-features">
                <li><CheckCircle2 size={14} color="#10b981" /> 1개 ID 무제한 사용</li>
                <li><CheckCircle2 size={14} color="#10b981" /> PC/웹 동시 접속</li>
                <li><CheckCircle2 size={14} color="#10b981" /> 기술 지원 포함</li>
              </ul>
              <button className="btn-buy-plan">결제하기</button>
            </div>
          ))}
        </div>

        {/* Master Admin Section */}
        {isMadmin && (
          <div className="admin-settings-section">
            <div className="admin-settings-title">
              <ShieldCheck size={20} />
              마스터 관리자 시스템 설정 (Madmin 전용)
            </div>
            <div className="admin-controls">
              <div className="control-group">
                <label>기간 강제 연장</label>
                <div className="admin-btn-row">
                  <button className="btn-admin-ext" onClick={() => extendLicense(1)}>+1개월</button>
                  <button className="btn-admin-ext" onClick={() => extendLicense(6)}>+6개월</button>
                  <button className="btn-admin-ext" onClick={() => extendLicense(12)}>+1년</button>
                </div>
              </div>
              <div className="control-group">
                <label>시스템 만료일 직접 수정</label>
                <input 
                  type="date" 
                  value={adminDate} 
                  onChange={e => setAdminDate(e.target.value)} 
                />
              </div>
              <div className="control-group" style={{ paddingBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={adminLock} 
                    onChange={e => setAdminLock(e.target.checked)} 
                  />
                  만료 시 로그인 차단 활성화
                </label>
              </div>
              <button className="btn-admin-save" onClick={handleAdminUpdate}>설정 저장</button>
            </div>
          </div>
        )}
      </div>
    </WindowModal>
  );
};

export default LicenseManager;
