import React, { useState } from 'react';
import { Mail, UserCheck, UserPlus, AlertCircle, CheckCircle2, Clock, X, Link, ArrowRight, ShieldCheck } from 'lucide-react';
import { callAuth } from '../../auth/client';

export default function StaffAccountLinkModal({
  isOpen,
  onClose,
  mode, // 'invite' | 'requests'
  targetStaff,
  requests = [],
  staffList = [],
  currentUser,
  onInviteSuccess,
  onConnectSuccess,
  onOpenNewStaffRegistration
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedStaffMap, setSelectedStaffMap] = useState({});
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initial invite email
  React.useEffect(() => {
    if (targetStaff) {
      setInviteEmail(targetStaff.email || targetStaff.invitationEmail || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [targetStaff]);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    if (e) e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('유효한 직원 이메일 주소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const cid = currentUser?.companyId || 'no1dmkr';
      const staffId = targetStaff?.id || targetStaff?.userId;
      const res = await callAuth('createStaffInvitation', {
        companyId: cid,
        companyName: currentUser?.companyName || cid,
        staffId,
        staffName: targetStaff?.name,
        targetEmail: email,
        phone: targetStaff?.phone || '',
        permissions: targetStaff?.permissions || {}
      });
      setSuccessMsg(`[${targetStaff?.name}] 직원에게 로그인 초대장이 발송되었습니다.`);
      if (onInviteSuccess) {
        onInviteSuccess(staffId, email);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || '초대 발송 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleConnectExisting = async (req) => {
    const staffId = selectedStaffMap[req.uid];
    if (!staffId) {
      alert('연결할 기존 직원 카드를 선택해 주세요.');
      return;
    }
    const staffObj = staffList.find(s => String(s.id) === String(staffId) || String(s.userId) === String(staffId));
    if (!staffObj) {
      alert('선택한 직원을 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm(`[${req.applicantEmail}] 계정을 [${staffObj.name} (${staffObj.jobTitle || '사원'})] 직원 카드에 연결하시겠습니까?\n\n기존 업무 기록(전표·상차 등)은 그대로 보존되며, 로그인 시 해당 직원의 권한이 즉시 적용됩니다.`)) {
      return;
    }

    setBusy(true);
    try {
      const cid = currentUser?.companyId || 'no1dmkr';
      await callAuth('connectStaffAccount', {
        companyId: cid,
        staffId,
        applicantUid: req.uid,
        applicantEmail: req.applicantEmail
      });
      alert(`[${staffObj.name}] 직원 카드와 [${req.applicantEmail}] 계정이 성공적으로 연결되었습니다.`);
      if (onConnectSuccess) {
        onConnectSuccess(staffId, req.uid, req.applicantEmail);
      }
    } catch (err) {
      alert('직원 계정 연결 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10500,
      padding: '16px',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: mode === 'invite' ? '460px' : '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'invite' ? (
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail color="#2563eb" size={18} />
              </div>
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck color="#d97706" size={18} />
              </div>
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {mode === 'invite' ? '로그인 계정 초대' : '직원 계정 연결 요청 목록'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                {mode === 'invite'
                  ? '직원 이메일로 초대를 발송하여 기존 직원 카드와 계정을 연결합니다.'
                  : '로그인 화면에서 대표 이메일로 연결을 신청한 직원 명단입니다.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {mode === 'invite' ? (
            <div>
              {/* Target Staff Card Summary */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                    {targetStaff?.name} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>({targetStaff?.jobTitle || '사원'})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    담당창고: {targetStaff?.warehouse || '미지정'} | 전화: {targetStaff?.phone || '-'}
                  </div>
                </div>
                <div>
                  {targetStaff?.accountStatus === 'linked' ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      연결 완료
                    </span>
                  ) : targetStaff?.accountStatus === 'invited' ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                      초대 발송됨
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#64748b' }}>
                      계정 미연결
                    </span>
                  )}
                </div>
              </div>

              {targetStaff?.accountStatus === 'linked' && targetStaff?.linkedEmail && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  fontSize: '0.78rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ShieldCheck size={16} />
                  <span>현재 <strong>{targetStaff.linkedEmail}</strong> 계정에 안전하게 연결되어 있습니다.</span>
                </div>
              )}

              <form onSubmit={handleSendInvite}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  초대받을 직원 이메일 주소 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="example@company.com"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  lineHeight: '1.5',
                  marginBottom: '16px'
                }}>
                  • 직원이 이메일로 가입/로그인하면 대표 이메일 재입력 없이 이 직원 카드에 즉시 연결됩니다.<br />
                  • 기존 직원 ID 및 상차·전표·주문 등 과거 업무 기록의 연결 관계는 영구 보존됩니다.<br />
                  • 초대 유효기간은 14일이며, 수락 즉시 지정된 업무 권한이 활성화됩니다.
                </div>

                {errorMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px' }}>
                    {successMsg}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Mail size={15} />
                    <span>{busy ? '발송 중...' : '로그인 초대장 발송'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                  <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#475569' }}>현재 대기 중인 연결 요청이 없습니다.</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>직원이 로그인 화면에서 대표 이메일로 요청하면 여기에 표시됩니다.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {requests.map((req, idx) => {
                    const unlinkedStaffList = staffList.filter(s => s.accountStatus !== 'linked');
                    const selectedStaffId = selectedStaffMap[req.uid] || '';

                    return (
                      <div
                        key={req.uid || idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                              {req.applicantEmail}
                            </span>
                            <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                              신청일: {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ko-KR') : '최근'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#fffbeb',
                            color: '#d97706',
                            border: '1px solid #fde68a'
                          }}>
                            연결 대기중
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'center',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e2e8f0'
                        }}>
                          {/* 1. 기존 직원에 연결 */}
                          <div style={{ display: 'flex', gap: '6px', flex: '1 1 280px', alignItems: 'center' }}>
                            <select
                              value={selectedStaffId}
                              onChange={(e) => setSelectedStaffMap(prev => ({ ...prev, [req.uid]: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                backgroundColor: '#ffffff',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- 기존 직원 선택 (미연결) --</option>
                              {unlinkedStaffList.map(s => (
                                <option key={s.id || s.userId} value={s.id || s.userId}>
                                  {s.name} ({s.jobTitle || '사원'} | {s.warehouse || '창고'})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleConnectExisting(req)}
                              disabled={!selectedStaffId || busy}
                              style={{
                                padding: '7px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: selectedStaffId ? '#2563eb' : '#94a3b8',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: selectedStaffId && !busy ? 'pointer' : 'not-allowed',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              기존 직원에 연결
                            </button>
                          </div>

                          {/* 2. 직원 등록 후 연결 */}
                          <button
                            type="button"
                            onClick={() => onOpenNewStaffRegistration && onOpenNewStaffRegistration(req)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: '6px',
                              border: '1px solid #3b82f6',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <UserPlus size={14} />
                            <span>직원 등록 후 연결</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
