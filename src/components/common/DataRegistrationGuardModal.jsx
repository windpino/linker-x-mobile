import React, { useState } from 'react';
import { Shield, AlertTriangle, FileText, CheckCircle2, Lock, ArrowRight, X } from 'lucide-react';
import { callAuth } from '../../auth/client';
import LegalDocumentModal from './LegalDocumentModal';
import { 
  PRIVACY_POLICY_TEXT, 
  PRIVACY_POLICY_VERSION, 
  DPA_TEXT, 
  DPA_VERSION 
} from '../../constants/legalDocuments';

/**
 * 모바일 실제 데이터 최초 등록 가드 모달
 */
const DataRegistrationGuardModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentUser,
  targetActionName = '업무 데이터 등록'
}) => {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewerModal, setViewerModal] = useState({ open: false, title: '', text: '', version: '' });

  if (!isOpen) return null;

  const isManager = Boolean(
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === '대표' ||
    currentUser?.role === '슈퍼관리자' ||
    currentUser?.isCompanyAdmin ||
    currentUser?.allowAllEditDelete ||
    currentUser?.allowMasterEdit
  );

  const handleAgreeAndContinue = async () => {
    if (!agreed) {
      alert('개인정보 처리위탁 합의서에 동의해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await callAuth('recordDpaAgreement', {
        companyId: currentUser?.companyId,
        agreedByUid: currentUser?.uid,
        agreedByEmail: currentUser?.email,
        dpaVersion: DPA_VERSION
      });
      if (onConfirm) onConfirm();
    } catch (err) {
      alert('처리위탁 합의 기록 실패: ' + (err.message || '오류가 발생했습니다.'));
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
        padding: '12px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 18px',
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
                <Shield size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  실제 업무 데이터를 등록하기 전에
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {targetActionName} 전 위탁 기준 안내
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

          {/* Body */}
          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 4대 기준 요약 (한 열 모바일 구성) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '2px' }}>
                  <span style={{ color: '#2563eb' }}>1.</span> 어떤 정보를 어떤 업무에 쓰는지
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.45' }}>
                  직원 명부 및 거래처 정보는 B2B 발주/수주, 상차·배송 검수, 전자전표, 재고/정산 업무에 한정 처리됩니다.
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '2px' }}>
                  <span style={{ color: '#2563eb' }}>2.</span> 운영자가 원본을 열람할 수 있는 경우
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.45' }}>
                  원칙적으로 열람하지 않으며, 회원사의 명시적 기술지원 요청이나 법령상 의무 발생 시 감사 로그 하에 최소 접근합니다.
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '2px' }}>
                  <span style={{ color: '#2563eb' }}>3.</span> 회원사 간 공유 범위
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.45' }}>
                  멀티테넌트로 완전 격리됩니다. 링커 연결된 거래처와 합의된 전표/주문에 한정 공유되며 내부 원가/재고는 차단됩니다.
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '2px' }}>
                  <span style={{ color: '#2563eb' }}>4.</span> 보관 및 종료 후 반환·삭제 기준
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.45' }}>
                  이용 중 안전하게 암호화 보관되며, 해지 시 30일간의 엑셀/백업 내보내기 기간 경과 후 영구 파기됩니다.
                </div>
              </div>
            </div>

            {/* 전문 보기 링크 영역 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              fontSize: '0.78rem'
            }}>
              <button
                type="button"
                onClick={() => setViewerModal({ open: true, title: '개인정보 처리방침 [초안]', text: PRIVACY_POLICY_TEXT, version: PRIVACY_POLICY_VERSION })}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, textAlign: 'left', padding: 0 }}
              >
                📄 개인정보 처리방침 보기
              </button>
              <button
                type="button"
                onClick={() => setViewerModal({ open: true, title: '개인정보 처리위탁 합의서 [초안]', text: DPA_TEXT, version: DPA_VERSION })}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, textAlign: 'left', padding: 0 }}
              >
                📑 개인정보 처리위탁 합의서 전문 보기
              </button>
            </div>

            {/* 권한별 동의 영역 */}
            {isManager ? (
              <div style={{
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
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
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                      [필수] 개인정보 처리위탁 합의서에 동의합니다
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                      ※ 본 합의는 회사 차원의 처리위탁 절차이며, 직원/거래처 개인 동의를 대신하는 것이 아닙니다.
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#991b1b' }}>
                    회원사 관리자에게 데이터 등록 설정을 요청해 주세요
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '2px' }}>
                    회사의 처리위탁 합의는 관리자만 체결할 수 있습니다. 관리자 합의 후 일반 직원도 등록 가능합니다.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            {isManager && (
              <button
                type="button"
                disabled={!agreed || submitting}
                onClick={handleAgreeAndContinue}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: agreed ? '#2563eb' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: agreed ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {submitting ? '저장 중...' : '동의하고 계속'}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <LegalDocumentModal
        isOpen={viewerModal.open}
        onClose={() => setViewerModal({ open: false, title: '', text: '', version: '' })}
        title={viewerModal.title}
        documentText={viewerModal.text}
        version={viewerModal.version}
      />
    </>
  );
};

export default DataRegistrationGuardModal;
