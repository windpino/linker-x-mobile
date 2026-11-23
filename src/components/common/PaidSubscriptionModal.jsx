import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, AlertCircle, FileText, CheckCircle2, ChevronRight, X, Clock, Download, Printer } from 'lucide-react';
import { callAuth } from '../../auth/client';
import LegalDocumentModal from './LegalDocumentModal';
import { 
  SUBSCRIPTION_TERMS_TEXT, 
  SUBSCRIPTION_TERMS_VERSION 
} from '../../constants/legalDocuments';

/**
 * 모바일 링커엑스 유료 구독 계약 및 결제 모달 (한 열 구성: 요약 -> 전문 보기 -> 체크박스 -> 실행 버튼)
 */
const PaidSubscriptionModal = ({
  isOpen,
  onClose,
  currentUser,
  currentLicense,
  onUpdateLicense,
  isMobile = true
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState('1month');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [existingContract, setExistingContract] = useState(null);

  const plans = [
    { 
      id: '1month', 
      name: '스탠다드 플랜 (1개월)', 
      periodDays: 30,
      price: 33000, 
      priceLabel: '33,000원', 
      billingCycle: '월간 결제',
      autoRenew: '자동 갱신 (확정 필요)',
      desc: '월 단위 유연한 구독'
    },
    { 
      id: '3months', 
      name: '분기 플랜 (3개월)', 
      periodDays: 90,
      price: 99000, 
      priceLabel: '99,000원', 
      billingCycle: '3개월 일괄 결제',
      autoRenew: '자동 갱신 (확정 필요)',
      desc: '분기별 안정 운영'
    },
    { 
      id: '6months', 
      name: '반기 플랜 (6개월)', 
      periodDays: 180,
      price: 180000, 
      priceLabel: '180,000원', 
      billingCycle: '6개월 일괄 결제',
      discount: '9% 할인 (확정 필요)',
      autoRenew: '자동 갱신 (확정 필요)',
      desc: '반기 할인'
    },
    { 
      id: '1year', 
      name: '연간 플랜 (1년)', 
      periodDays: 365,
      price: 330000, 
      priceLabel: '330,000원', 
      billingCycle: '연간 일괄 결제',
      discount: '17% 특별할인 (확정 필요)',
      autoRenew: '자동 갱신 (확정 필요)',
      desc: '연간 2개월 무료 상당'
    }
  ];

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const isManager = Boolean(
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === '대표' ||
    currentUser?.role === '슈퍼관리자' ||
    currentUser?.isCompanyAdmin
  );

  const companyName = currentUser?.companyName || '링커엑스 파트너 회원사';
  const nextBillingDate = new Date(Date.now() + selectedPlan.periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    if (!currentUser?.companyId) return;
    try {
      const local = localStorage.getItem(`subscriptionAgreement_${currentUser.companyId}`);
      if (local) {
        setExistingContract(JSON.parse(local));
      }
    } catch (e) {
      console.warn('Error loading contract:', e);
    }
  }, [currentUser?.companyId]);

  if (!isOpen) return null;

  const handleExecutePayment = async () => {
    if (!isManager) {
      alert('유료 구독 계약 체결 및 결제는 회사 관리자만 가능합니다.');
      return;
    }
    if (!agreed) {
      alert('유료 구독 계약 조건에 동의해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const pricingSnapshot = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.priceLabel,
        vatIncluded: true,
        periodDays: selectedPlan.periodDays,
        billingCycle: selectedPlan.billingCycle,
        nextBillingDate,
        autoRenew: selectedPlan.autoRenew
      };

      const res = await callAuth('recordSubscriptionAgreement', {
        companyId: currentUser?.companyId,
        companyName,
        planName: selectedPlan.name,
        price: selectedPlan.priceLabel,
        billingCycle: selectedPlan.billingCycle,
        contractVersion: SUBSCRIPTION_TERMS_VERSION,
        pricingSnapshot
      });

      setExistingContract(res.record);

      if (onUpdateLicense) {
        onUpdateLicense({
          ...(currentLicense || {}),
          plan: selectedPlan.name,
          expiryDate: nextBillingDate,
          isSubscribed: true,
          contractVersion: SUBSCRIPTION_TERMS_VERSION,
          lastPaymentDate: new Date().toISOString().split('T')[0]
        });
      }

      alert(`🎉 [${selectedPlan.name}] 유료 구독 계약이 체결되었습니다!\n(현재는 검토용 계약 기록이 저장되었습니다)`);
    } catch (err) {
      alert('계약 체결 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999990,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    유료 구독 계약 및 결제
                  </h2>
                  <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                    검토용
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {companyName} ({SUBSCRIPTION_TERMS_VERSION})
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* 기존 체결 계약 안내 */}
          {existingContract && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.76rem'
            }}>
              <span style={{ color: '#166534', fontWeight: 700 }}>
                ✓ 체결된 계약: {existingContract.planName}
              </span>
              <button
                type="button"
                onClick={() => setContractViewerOpen(true)}
                style={{ background: 'none', border: 'none', color: '#15803d', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer' }}
              >
                계약서 보기
              </button>
            </div>
          )}

          {/* 모바일 1열 구성: 요약 -> 전문 보기 -> 체크박스 -> 실행 버튼 */}
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* 1. 요금제 선택 */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                1. 구독 요금제 선택
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {plans.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: selectedPlanId === p.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedPlanId === p.id ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>{p.priceLabel}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{p.billingCycle}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 결제 조건 요약 */}
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>계약 기간:</span>
                <strong>{selectedPlan.periodDays}일 (다음 결제: {nextBillingDate})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>해지·환불 조건:</span>
                <span style={{ color: '#b45309', fontWeight: 600 }}>7일 내 전액 / 잔여일 일할 (확정 필요)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>종료 후 데이터:</span>
                <span style={{ color: '#b45309', fontWeight: 600 }}>30일 내보내기 후 삭제 (확정 필요)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>총 결제액 (VAT 포함):</span>
                <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{selectedPlan.priceLabel}</strong>
              </div>
            </div>

            {/* 3. 계약서 전문 보기 */}
            <button
              type="button"
              onClick={() => setContractViewerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileText size={15} /> 계약서 전문 보기
            </button>

            {/* 4. 필수 동의 체크박스 */}
            {isManager ? (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#ffffff',
                border: agreed ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                      [필수] 유료 구독 계약 조건에 동의합니다
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                      요금 조건 및 해지·환불, 데이터 보존 기준(확정 필요)을 확인하였습니다.
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '0.76rem',
                color: '#991b1b'
              }}>
                ⚠️ 유료 구독 계약 체결은 회사 관리자(대표자)만 가능합니다.
              </div>
            )}

            {/* 5. 실행 버튼 */}
            <button
              type="button"
              disabled={!agreed || submitting || !isManager}
              onClick={handleExecutePayment}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (agreed && isManager) ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: (agreed && isManager) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {submitting ? '결제 중...' : `₩${selectedPlan.price.toLocaleString()} 결제하기 (검토용)`}
            </button>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8', textAlign: 'center' }}>
              ※ PG 연동 준비 중으로 검토용 계약 체결로 진행됩니다.
            </div>
          </div>
        </div>
      </div>

      <LegalDocumentModal
        isOpen={contractViewerOpen}
        onClose={() => setContractViewerOpen(false)}
        title="유료 구독 계약 조건 [초안]"
        documentText={SUBSCRIPTION_TERMS_TEXT}
        version={SUBSCRIPTION_TERMS_VERSION}
      />
    </>
  );
};

export default PaidSubscriptionModal;
