import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, CreditCard, Calendar, AlertTriangle, CheckCircle2, Crown, Lock, 
  Sparkles, Smartphone, Zap, BarChart3, ShoppingBag, Boxes, Database, ArrowRight, 
  Copy, Check, Headphones, Award, TrendingUp, CheckCircle, Clock, ExternalLink
} from 'lucide-react';
import WindowModal from './WindowModal';
import './LicenseManager.css';

const LicenseManager = ({ onClose, currentUser, licenseData, onUpdateLicense, systemSettings }) => {
  const isMadmin = currentUser?.userId === 'madmin';
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'features' | 'benefits'
  const [copiedSerial, setCopiedSerial] = useState(false);
  
  const [adminDate, setAdminDate] = useState(licenseData?.expiryDate || '');
  const [adminLock, setAdminLock] = useState(licenseData?.isLockedOnExpiry || false);

  // Deterministic genuine serial key generation based on companyId
  const genuineSerialKey = useMemo(() => {
    const seed = currentUser?.companyId || 'LINKERX-OFFICIAL';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const numStr = Math.abs(hash).toString().padStart(12, '948210475193');
    return `LKX-${numStr.slice(0, 4)}-${numStr.slice(4, 8)}-${numStr.slice(8, 12)}-CERT`;
  }, [currentUser?.companyId]);

  const handleCopySerial = () => {
    navigator.clipboard?.writeText(genuineSerialKey);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
  };

  const calculateDaysLeft = () => {
    if (!licenseData?.expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(licenseData.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();

  const companyName = systemSettings?.company?.name || currentUser?.companyName || '링커엑스 파트너 사업장';
  const ceoName = systemSettings?.company?.ceo || currentUser?.name || '-';
  const businessNo = systemSettings?.company?.businessNumber || '인증 사업장';

  const plans = [
    { 
      id: '1month', 
      name: '1개월 사용권', 
      price: '33,000원', 
      period: 30,
      badge: null,
      desc: '월 결제형 기본 플랜',
      features: [
        '기본 1개 ID 무제한 사용',
        'PC / 스마트폰 / 태블릿 실시간 동기화',
        '거래처 B2B 모바일 발주몰 무료 연동',
        '미수금 3색 신호등 & 재고 관리',
        '기본 기술 지원 포함'
      ]
    },
    { 
      id: '3months', 
      name: '3개월 사용권', 
      price: '99,000원', 
      period: 90,
      badge: '안정적 운영',
      desc: '분기별 안정적 운영 추천',
      features: [
        '1개월 플랜 모든 기능 포함',
        '다중 창고 재고 이동 관리',
        '엑셀 일괄 등록 및 양식 맞춤 다운로드',
        '거래처 맞춤 특판가 자동 적용',
        '정기 클라우드 보안 백업'
      ]
    },
    { 
      id: '6months', 
      name: '6개월 사용권', 
      price: '180,000원', 
      originalPrice: '198,000원',
      discount: '9% 할인',
      period: 180,
      badge: '실속 플랜',
      desc: '반기 결제 18,000원 절약',
      features: [
        '3개월 플랜 모든 기능 포함',
        '미수금 소멸시효(Aging) 분석 리포트',
        '원격 기술 지원 우선 제공',
        '사용자 권한 세부 제어'
      ]
    },
    { 
      id: '1year', 
      name: '1년 사용권', 
      price: '330,000원', 
      originalPrice: '396,000원',
      discount: '17% 특별할인 (2개월 무료)',
      period: 365,
      badge: '★ BEST 인기 추천',
      isPopular: true,
      desc: '연간 66,000원 할인 (2개월 무료 상당)',
      features: [
        '링커엑스 전 기능 무제한 이용',
        'VIP 전담 원격 기술지원 및 데이터 가이드',
        '신규 기능 최우선 자동 업데이트',
        '정품 인증 공식 인증서 발급 보증',
        '데이터 영구 클라우드 보존'
      ]
    },
  ];

  const handlePurchase = (plan) => {
    if (window.confirm(`${plan.name} (${plan.price})을 결제하시겠습니까?\n이용 기간이 ${plan.period}일 연장됩니다.`)) {
      const today = new Date();
      const currentExpiry = new Date(licenseData?.expiryDate || today);
      const baseDate = today > currentExpiry ? today : currentExpiry;
      const newExpiry = new Date(baseDate.getTime() + (plan.period * 24 * 60 * 60 * 1000));
      
      onUpdateLicense({
        ...licenseData,
        expiryDate: newExpiry.toISOString().split('T')[0],
        plan: plan.name,
        lastPaymentDate: new Date().toISOString().split('T')[0]
      });
      alert(`🎉 ${plan.name} 결제가 완료되었습니다!\n이용 만료일: ${newExpiry.toISOString().split('T')[0]}까지 연장되었습니다.`);
    }
  };

  const extendLicense = (months) => {
    const today = new Date();
    const currentExpiry = new Date(licenseData?.expiryDate || today);
    const baseDate = today > currentExpiry ? today : currentExpiry;
    
    const daysToAdd = months * 30;
    const newExpiry = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    const newDateStr = newExpiry.toISOString().split('T')[0];
    
    setAdminDate(newDateStr);
    onUpdateLicense({
      ...licenseData,
      expiryDate: newDateStr
    });
    alert(`[Madmin] 사용 기간이 ${months}개월 연장되었습니다.`);
  };

  const handleAdminUpdate = () => {
    onUpdateLicense({
      ...licenseData,
      expiryDate: adminDate,
      isLockedOnExpiry: adminLock
    });
    alert('[Madmin] 시스템 라이선스 설정이 정상 업데이트되었습니다.');
  };

  return (
    <WindowModal title="정품등록 및 라이선스 센터" onClose={onClose} width="1050px">
      <div className="license-container">
        
        {/* 상단 타이틀 & 탭 바 */}
        <div className="license-header-row">
          <div className="license-main-title">
            <div className="title-icon-wrapper">
              <ShieldCheck size={28} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  정품등록 및 라이선스 센터
                </h2>
                <span className="genuine-tag-badge">
                  <Award size={13} /> 공식 정품 인증
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                LINKER-X 차세대 클라우드 실시간 ERP 시스템 정품 멤버십 및 도입 가치 안내
              </p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="license-nav-tabs">
            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              <CreditCard size={15} /> 라이선스 현황 및 결제
            </button>
            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              <Sparkles size={15} /> 링커엑스 핵심 강점 & 도입 효과
            </button>
            <button 
              type="button" 
              className={`nav-tab-btn ${activeTab === 'benefits' ? 'active' : ''}`}
              onClick={() => setActiveTab('benefits')}
            >
              <ShieldCheck size={15} /> 정품 혜택 & 고객지원
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: 라이선스 현황 및 결제 (status)
           ======================================================== */}
        {activeTab === 'status' && (
          <div className="tab-pane-content">
            {/* 정품 인증 보증서 스타일 카드 */}
            <div className="genuine-certificate-card">
              <div className="cert-top-bar">
                <div className="cert-badge">
                  <Award size={18} color="#f59e0b" />
                  <span>LINKER-X OFFICIAL GENUINE CERTIFICATE</span>
                </div>
                <div className={`cert-status-pill ${daysLeft > 7 ? 'active' : 'warning'}`}>
                  <span className="pulsing-dot" />
                  {daysLeft > 0 ? '정품 라이선스 정상 작동 중' : '라이선스 만료됨'}
                </div>
              </div>

              <div className="cert-body-grid">
                <div className="cert-meta-col">
                  <div className="cert-company-name">{companyName}</div>
                  <div className="cert-details-grid">
                    <div className="meta-item">
                      <span className="meta-label">대표자</span>
                      <span className="meta-value">{ceoName}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">사업자등록번호</span>
                      <span className="meta-value">{businessNo}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">적용 멤버십</span>
                      <span className="meta-value highlight-plan">
                        {licenseData?.plan || 'PRO 정품 라이선스'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">정품 시리얼 키</span>
                      <span className="meta-value serial-key-row">
                        <code>{genuineSerialKey}</code>
                        <button 
                          type="button" 
                          className="copy-serial-btn" 
                          onClick={handleCopySerial}
                          title="시리얼 키 복사"
                        >
                          {copiedSerial ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          <span>{copiedSerial ? '복사됨' : '복사'}</span>
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="cert-countdown-col">
                  <div className="countdown-box">
                    <div className="countdown-label">이용 만료까지 남은 기간</div>
                    <div className="countdown-number-row">
                      <span className="countdown-days">{daysLeft > 0 ? daysLeft : 0}</span>
                      <span className="countdown-unit">일 남음</span>
                    </div>
                    <div className="countdown-expiry-date">
                      <Calendar size={14} /> 만료 예정일: <strong>{licenseData?.expiryDate || '설정 필요'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 보증 칩 */}
              <div className="cert-chips-row">
                <div className="cert-chip"><CheckCircle2 size={13} color="#10b981" /> 24시간 실시간 클라우드 자동 백업</div>
                <div className="cert-chip"><CheckCircle2 size={13} color="#10b981" /> PC · 스마트폰 완벽 실시간 연동</div>
                <div className="cert-chip"><CheckCircle2 size={13} color="#10b981" /> 거래처 전용 B2B 모바일 발주몰 무료</div>
                <div className="cert-chip"><CheckCircle2 size={13} color="#10b981" /> 무상 기능 자동 업데이트 보증</div>
              </div>
            </div>

            {/* Plans Section */}
            <div className="plans-section-header">
              <div>
                <h3 className="section-title">
                  <Crown size={22} color="#f59e0b" />
                  정품 이용권 구매 및 기간 연장
                </h3>
                <p className="section-sub">
                  안정적인 비즈니스 운영을 위해 미리 이용권을 연장하세요. 1년 결제 시 <strong>17% 특별 할인(2개월 무료 상당)</strong> 혜택을 드립니다.
                </p>
              </div>
            </div>
            
            <div className="license-info-banner">
              <AlertTriangle size={18} color="#d97706" />
              <span>
                <strong>요금 안내:</strong> 기본 1개 ID 기준 (부가세 포함). 스마트폰/PC 무제한 동시 접속. 추가 ID당 월 1만원 추가 (5개 이상 무제한 사용 시 월 10만원 정액제).
              </span>
            </div>

            <div className="plans-grid">
              {plans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`plan-card ${plan.isPopular ? 'popular-plan' : ''}`}
                  onClick={() => handlePurchase(plan)}
                >
                  {plan.badge && (
                    <div className={`plan-badge ${plan.isPopular ? 'best-badge' : ''}`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-desc">{plan.desc}</div>

                  <div className="plan-price-wrapper">
                    {plan.originalPrice && (
                      <div className="original-price">{plan.originalPrice}</div>
                    )}
                    <div className="plan-price">{plan.price}</div>
                    {plan.discount && (
                      <div className="discount-tag">{plan.discount}</div>
                    )}
                  </div>

                  <ul className="plan-features">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`btn-buy-plan ${plan.isPopular ? 'btn-popular-buy' : ''}`}>
                    {plan.name} 결제하기
                  </button>
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
        )}

        {/* ========================================================
            TAB 2: 링커엑스 핵심 강점 & 도입 효과 (features)
           ======================================================== */}
        {activeTab === 'features' && (
          <div className="tab-pane-content">
            {/* 상단 프로모션 히어로 배너 */}
            <div className="features-hero-banner">
              <div className="hero-text-area">
                <div className="hero-badge">WHY LINKER-X?</div>
                <h3 className="hero-title">
                  수많은 유통·도소매·제조 기업들이 링커엑스를 선택하는 이유
                </h3>
                <p className="hero-desc">
                  기존의 비싸고 무거운 ERP와 복잡한 엑셀 장부의 한계를 넘어, 
                  <strong> 현장과 사무실을 하나로 잇는 초고속 실시간 스마트 ERP</strong>입니다.
                </p>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">PC·모바일 실시간 동기화</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">90%↓</div>
                  <div className="stat-label">주문 누락 및 오배송 감소</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">0원</div>
                  <div className="stat-label">초기 서버 구축 및 유지보수비</div>
                </div>
              </div>
            </div>

            {/* 6대 핵심 강점 그리드 */}
            <h4 className="features-subheading">링커엑스만의 6대 독보적 혁신 기능</h4>
            <div className="features-grid-6">
              
              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Smartphone size={24} />
                </div>
                <div className="f-title">PC & 스마트폰 실시간 완벽 연동</div>
                <div className="f-desc">
                  사무실 데스크톱과 외근·출장·매장 현장의 스마트폰이 1초의 지연 없이 동일한 데이터를 공유합니다. 이동 중에도 재고 확인, 거래처 원장 조회, 즉시 전표 발행이 가능합니다.
                </div>
                <div className="f-tag">#모바일PWA #언제어디서나접속</div>
              </div>

              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Zap size={24} />
                </div>
                <div className="f-title">초고속 거래처 초성 검색 & 원클릭 전표</div>
                <div className="f-desc">
                  수천 개의 거래처도 초성 2~3글자만 치면 즉각 추천됩니다. 거래처별 최근 거래 단가를 자동 기억하며, [견적서 ➔ 간편수주 ➔ 매출전표 ➔ 세금계산서]로 원클릭 자동 연계됩니다.
                </div>
                <div className="f-tag">#초성검색 #단가자동추적 #업무시간단축</div>
              </div>

              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <BarChart3 size={24} />
                </div>
                <div className="f-title">미수금 3색 신호등 & 소멸시효 사전 경보</div>
                <div className="f-desc">
                  업계 최초 미수금 안전·주의·위험 3색 신호등과 30/60/90일 경과 연령(Aging) 분석을 제공합니다. 상사채권 3년 법적 소멸시효 주의를 자동 경고하여 부실 채권을 100% 차단합니다.
                </div>
                <div className="f-tag">#미수금회수극대화 #약속일관리 #리스크차단</div>
              </div>

              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <ShoppingBag size={24} />
                </div>
                <div className="f-title">거래처 전용 B2B 모바일 발주몰 무료 제공</div>
                <div className="f-desc">
                  24시간 전화, 카카오톡, 문자 주문 지옥에서 완전 해방! 거래처가 직접 스마트폰으로 실시간 재고를 보며 주문하고, 거래처별 전용 공급단가(특판가)가 자동 계산됩니다.
                </div>
                <div className="f-tag">#주문누락Zero #B2B온라인몰 #전표자동등록</div>
              </div>

              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                  <Boxes size={24} />
                </div>
                <div className="f-title">다중 창고 실시간 재고 이동 & 엑셀 호환</div>
                <div className="f-desc">
                  본사 창고, 공장, 차량 창고 등 복수 창고 간 재고 이동 및 적정 재고 알림을 지원합니다. 엑셀 일괄 등록 및 양식 맞춤 다운로드, 바코드 스캐너 연동을 완벽 지원합니다.
                </div>
                <div className="f-tag">#다중창고 #적정재고 #바코드스캔</div>
              </div>

              <div className="feature-card">
                <div className="f-icon-box" style={{ background: '#f1f5f9', color: '#0f172a' }}>
                  <Database size={24} />
                </div>
                <div className="f-title">글로벌 클라우드 3중 보안 & 무중단 백업</div>
                <div className="f-desc">
                  PC 고장이나 랜섬웨어 감염 시에도 소중한 회사의 거래 장부가 100% 안전하게 보호됩니다. 구글 클라우드 인프라 기반의 무중단 자동 백업과 철저한 직원별 권한 통제를 제공합니다.
                </div>
                <div className="f-tag">#랜섬웨어안전 #자동백업 #권한제어</div>
              </div>

            </div>

            {/* Before vs After 비교 표 */}
            <div className="comparison-section">
              <h4 className="features-subheading">도입 전후 업무 혁신 비교 (Before vs After)</h4>
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>업무 항목</th>
                      <th style={{ width: '41%' }} className="before-th">기존 업무 방식 (Before)</th>
                      <th style={{ width: '41%' }} className="after-th">링커엑스 도입 후 (After)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="field-cell">주문 및 수주 접수</td>
                      <td className="before-cell">
                        전화, 카톡, 문자로 흩어져 수기 메모 ➔ 주문 누락 및 수량 오배송 빈번
                      </td>
                      <td className="after-cell">
                        <strong>거래처 전용 B2B 모바일 발주몰</strong>에서 거래처가 직접 주문 ➔ 자동 전표 생성으로 <strong>오배송 0%</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-cell">미수금 및 수금 관리</td>
                      <td className="before-cell">
                        엑셀 장부를 매번 열어 대조해야 파악 가능 ➔ 제때 수금 못해 장기 부실 채권 발생
                      </td>
                      <td className="after-cell">
                        <strong>3색 신호등 & 경과기간 소멸시효 자동 경고</strong> ➔ 입금 약속일 관리로 <strong>미수금 회수율 30% 이상 향상</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-cell">실시간 재고 파악</td>
                      <td className="before-cell">
                        사무실 PC를 켜거나 창고 직원에게 일일이 전화해야 재고 확인 가능
                      </td>
                      <td className="after-cell">
                        외근 중에도 <strong>스마트폰으로 전 창고 실시간 재고 1초 확인</strong> ➔ 즉시 납기 약속 가능
                      </td>
                    </tr>
                    <tr>
                      <td className="field-cell">시스템 도입 및 유지비</td>
                      <td className="before-cell">
                        초기 수백~수천만원의 서버 구축비 + 매월 비싼 유지보수비 부담
                      </td>
                      <td className="after-cell">
                        <strong>서버 구축비 0원!</strong> 월 3만원대의 정직한 이용료로 <strong>전 기능 무제한 이용</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 하단 전환 유도 버튼 */}
            <div className="features-cta-box">
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                  지금 링커엑스 정품 라이선스로 비즈니스 경쟁력을 높이세요!
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  공식 정품 멤버십 고객에게는 지속적인 신기능 무료 업데이트와 VIP 기술지원이 제공됩니다.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-cta-upgrade"
                onClick={() => setActiveTab('status')}
              >
                정품 이용권 결제하기 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: 정품 혜택 & 고객지원 (benefits)
           ======================================================== */}
        {activeTab === 'benefits' && (
          <div className="tab-pane-content">
            <div className="benefits-card-grid">
              
              <div className="benefit-feature-box">
                <div className="b-icon"><Award size={26} color="#2563eb" /></div>
                <div className="b-content">
                  <h5>1. 평생 무상 기능 자동 업그레이드</h5>
                  <p>
                    현장 고객님들의 실무 피드백을 반영한 편의 기능 개선 및 세법 개정 업데이트를 별도 비용 없이 평생 무상으로 자동 제공받으실 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="benefit-feature-box">
                <div className="b-icon"><Headphones size={26} color="#059669" /></div>
                <div className="b-content">
                  <h5>2. 1:1 전담 원격 기술지원 서비스</h5>
                  <p>
                    프로그램 사용 중 궁금증이나 오류 발생 시 전문 기술지원 엔지니어가 원격 접속을 통해 즉각 문제를 해결하고 올바른 사용법을 안내해 드립니다.
                  </p>
                </div>
              </div>

              <div className="benefit-feature-box">
                <div className="b-icon"><Database size={26} color="#7c3aed" /></div>
                <div className="b-content">
                  <h5>3. 금융권 수준 256비트 암호화 & 데이터 영구 보존</h5>
                  <p>
                    회사의 소중한 거래 내역, 단가, 고객 정보는 안전하게 3중 암호화되어 분산 저장되며, 기기 고장이나 분실에도 즉시 복원 가능합니다.
                  </p>
                </div>
              </div>

              <div className="benefit-feature-box">
                <div className="b-icon"><Smartphone size={26} color="#ea580c" /></div>
                <div className="b-content">
                  <h5>4. 설치 없이 모든 스마트폰 · 태블릿 멀티 접속</h5>
                  <p>
                    별도의 복잡한 앱 스토어 설치 과정 없이 바로가기 추가만으로 모든 모바일 기기(iOS, Android)에서 동일하게 쾌적한 업무가 가능합니다.
                  </p>
                </div>
              </div>

              <div className="benefit-feature-box">
                <div className="b-icon"><Zap size={26} color="#f59e0b" /></div>
                <div className="b-content">
                  <h5>5. 업종 맞춤형 환경설정 및 엑셀 데이터 이관 지원</h5>
                  <p>
                    기존에 사용하시던 엑셀 거래처, 품목 데이터를 링커엑스 양식으로 손쉽게 일괄 이관하실 수 있도록 초기 세팅을 적극 지원해 드립니다.
                  </p>
                </div>
              </div>

              <div className="benefit-feature-box">
                <div className="b-icon"><ShieldCheck size={26} color="#0284c7" /></div>
                <div className="b-content">
                  <h5>6. 전자세금계산서 및 법적 서식 완벽 지원</h5>
                  <p>
                    국세청 표준 규격의 거래명세표, 세금계산서 양식 출력 및 PDF 저장, 카카오톡/이메일 간편 전송 기능을 원스톱으로 지원합니다.
                  </p>
                </div>
              </div>

            </div>

            {/* 고객지원 안내 카드 */}
            <div className="support-info-card">
              <div className="support-header">
                <Headphones size={22} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                  링커엑스 고객만족 기술지원 센터
                </h4>
              </div>

              <div className="support-grid">
                <div className="support-col">
                  <div className="s-label">고객지원 운영 시간</div>
                  <div className="s-value">평일 09:00 ~ 18:00 (주말 및 공휴일 휴무)</div>
                  <div className="s-desc">점심시간: 12:00 ~ 13:00 / 긴급 장애 24시간 모니터링</div>
                </div>

                <div className="support-col">
                  <div className="s-label">원격 기술지원 안내</div>
                  <div className="s-value">전화 및 원격 제어를 통한 실시간 상담</div>
                  <div className="s-desc">전문 상담원이 화면을 함께 보며 신속하게 문제 해결을 도와드립니다.</div>
                </div>

                <div className="support-col">
                  <div className="s-label">세금계산서 발행 안내</div>
                  <div className="s-value">결제 시 사업자 등록증 기준 전자세금계산서 익일 일괄 발행</div>
                  <div className="s-desc">계좌이체 및 세금계산서 관련 문의는 고객센터로 연락 바랍니다.</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </WindowModal>
  );
};

export default LicenseManager;
