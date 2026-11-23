import React, { useState, useEffect } from 'react';
import {
  Headphones,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  LogOut,
  RefreshCw,
  FileText,
  ShieldCheck,
  Activity,
  Layers,
  Lock,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { subscribeErrorLogs } from '../../utils/errorLogger';

export default function PlatformOpsPortal({ currentUser, onLogout, onSwitchWorkspace }) {
  const role = currentUser?.role || 'support';
  const isSupport = role === 'support';
  const isSubscription = role === 'subscription';
  const isDeveloper = role === 'developer';

  const [activeTab, setActiveTab] = useState(isSubscription ? 'subscriptions' : 'tickets');
  const [errorLogs, setErrorLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatusList, setSyncStatusList] = useState([]);
  const [inquiries, setInquiries] = useState([
    {
      id: 'ticket_101',
      companyId: 'no1dmkr',
      companyName: '동명크릴 (제1물류)',
      author: '김물류 대리',
      title: '영남권 낚시점 주문서 일괄 엑셀 전송 시 속도 지연 문의',
      status: '처리중',
      priority: '보통',
      createdAt: '2026-11-23 09:15',
      content: '새벽 상차 전 전표 50건을 한 번에 생성할 때 약 3초 정도 지연이 발생합니다.'
    },
    {
      id: 'ticket_102',
      companyId: 'c_haesong',
      companyName: '해송피싱 유통',
      author: '박대표',
      title: '거래처 B2B 모바일 주문 링크 초대장 수신 확인 요청',
      status: '대기',
      priority: '높음',
      createdAt: '2026-11-23 11:30',
      content: '신규 거래처에 보낸 카카오/SMS 초대 링크 수락 여부가 화면에 아직 미반영 상태입니다.'
    },
    {
      id: 'ticket_103',
      companyId: 'c_ocean_kr',
      companyName: '오션마린 종합물류',
      author: '최과장',
      title: '모바일 바코드 스캔 시 간헐적 카메라 초점 흐림',
      status: '완료',
      priority: '낮음',
      createdAt: '2026-11-22 17:40',
      content: '특정 안드로이드 기종에서 오토포커스가 1~2초 늦는 현상이 해결되었습니다.'
    }
  ]);

  const [subscriptionsList, setSubscriptionsList] = useState([
    {
      companyId: 'no1dmkr',
      companyName: '동명크릴 (제1물류)',
      plan: '스탠다드 플랜',
      price: '55,000원 / 월',
      status: '구독중',
      trialDaysLeft: 0,
      billingCycle: '매월 15일',
      nextBillingDate: '2026-12-15',
      dpaSigned: true,
      lastPaymentStatus: '정상 승인'
    },
    {
      companyId: 'c_haesong',
      companyName: '해송피싱 유통',
      plan: '30일 무료 체험',
      price: '0원 (체험)',
      status: '체험중',
      trialDaysLeft: 21,
      billingCycle: '체험 종료 후 전환',
      nextBillingDate: '2026-12-14',
      dpaSigned: true,
      lastPaymentStatus: '체험 적용'
    },
    {
      companyId: 'c_ocean_kr',
      companyName: '오션마린 종합물류',
      plan: '프리미엄 엔터프라이즈',
      price: '120,000원 / 월',
      status: '구독중',
      trialDaysLeft: 0,
      billingCycle: '매월 1일',
      nextBillingDate: '2026-12-01',
      dpaSigned: true,
      lastPaymentStatus: '정상 승인'
    },
    {
      companyId: 'c_fisher_seoul',
      companyName: '서울경기 피싱클럽',
      plan: '베이직 플랜',
      price: '33,000원 / 월',
      status: '결제 대기',
      trialDaysLeft: 0,
      billingCycle: '매월 20일',
      nextBillingDate: '2026-11-25',
      dpaSigned: false,
      lastPaymentStatus: '카드 한도 초과'
    }
  ]);

  // 실시간 에러 로그 구독
  useEffect(() => {
    const unsub = subscribeErrorLogs((logs) => {
      setErrorLogs(logs || []);
    }, 100);
    return () => unsub();
  }, []);

  // 동기화 상태 샘플 로드
  useEffect(() => {
    setSyncStatusList([
      { companyId: 'no1dmkr', companyName: '동명크릴', status: '정상', latencyMs: 42, lastSync: '방금 전' },
      { companyId: 'c_haesong', companyName: '해송피싱 유통', status: '정상', latencyMs: 38, lastSync: '1분 전' },
      { companyId: 'c_ocean_kr', companyName: '오션마린 종합물류', status: '정상', latencyMs: 51, lastSync: '3분 전' },
      { companyId: 'c_fisher_seoul', companyName: '서울경기 피싱클럽', status: '지연 주의', latencyMs: 180, lastSync: '12분 전' }
    ]);
  }, []);

  const getRoleBadge = () => {
    if (isSupport) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
          <Headphones size={13} /> 고객지원 담당자 (CS)
        </span>
      );
    }
    if (isSubscription) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
          <CreditCard size={13} /> 구독관리 담당자 (Billing)
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
        <Activity size={13} /> 플랫폼 개발자 (Engineer)
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', color: '#0f172a', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' }}>
      {/* ── Top Header Bar ── */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/assets/linker-x-horizontal.png"
            alt="Linker X"
            style={{ height: '32px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
              본사 운영 포털 <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#38bdf8', marginLeft: '6px' }}>Platform Ops</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
              {currentUser?.name || currentUser?.displayName || '운영팀 직원'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {currentUser?.email || ''}
            </div>
          </div>

          {getRoleBadge()}

          {onSwitchWorkspace && (
            <button
              onClick={onSwitchWorkspace}
              title="작업공간 전환"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Layers size={14} /> 작업공간 전환
            </button>
          )}

          <button
            onClick={onLogout}
            title="로그아웃"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </header>

      {/* ── Strict Principle of Least Privilege Banner ── */}
      <div style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #fef3c7',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.8rem',
        color: '#92400e'
      }}>
        <Lock size={16} color="#d97706" style={{ flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 800 }}>최소 권한 원칙(Principle of Least Privilege) 적용 안내:</span> 본사 운영팀 계정은 회원사의 주문·전표·재고 원본 데이터를 열람할 수 없도록 기본 통제됩니다. 기술 지원을 위한 원본 조회가 필요한 경우, 회원사 관리자의 '건별 지원 동의 승인 절차'를 통해서만 접근할 수 있습니다.
        </div>
      </div>

      {/* ── Main Container ── */}
      <div style={{ flex: 1, padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Navigation Tabs based on Role */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
          {(isSupport || isDeveloper) && (
            <>
              <button
                onClick={() => setActiveTab('tickets')}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'tickets' ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'tickets' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'tickets' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={16} /> 고객 문의 및 지원 내역
                <span style={{ fontSize: '0.72rem', backgroundColor: activeTab === 'tickets' ? '#dbeafe' : '#f1f5f9', color: activeTab === 'tickets' ? '#1d4ed8' : '#64748b', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                  {inquiries.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('errors')}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'errors' ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'errors' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'errors' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} /> 시스템 오류 로그
                <span style={{ fontSize: '0.72rem', backgroundColor: errorLogs.length > 0 ? '#fee2e2' : '#f1f5f9', color: errorLogs.length > 0 ? '#b91c1c' : '#64748b', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                  {errorLogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sync')}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'sync' ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'sync' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'sync' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} /> 동기화 & 트래픽 현황
              </button>
            </>
          )}

          {(isSubscription || isDeveloper) && (
            <>
              <button
                onClick={() => setActiveTab('subscriptions')}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'subscriptions' ? '2px solid #16a34a' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'subscriptions' ? '#16a34a' : '#64748b',
                  fontWeight: activeTab === 'subscriptions' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CreditCard size={16} /> 회원사 요금제 및 구독 현황
                <span style={{ fontSize: '0.72rem', backgroundColor: activeTab === 'subscriptions' ? '#dcfce7' : '#f1f5f9', color: activeTab === 'subscriptions' ? '#15803d' : '#64748b', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                  {subscriptionsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: activeTab === 'billing' ? '2px solid #16a34a' : '2px solid transparent',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  color: activeTab === 'billing' ? '#16a34a' : '#64748b',
                  fontWeight: activeTab === 'billing' ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Building2 size={16} /> 결제 및 매출 통계
              </button>
            </>
          )}
        </div>

        {/* ── TAB 1: TICKETS / INQUIRIES (Support) ── */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>고객 지원 및 문의 접수</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  회원사 관리자 및 작업자로부터 인입된 기술 지원, 장애 문의, 기능 요청 내역입니다.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="회원사명, 문의 제목 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '240px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {inquiries.filter(t => !searchTerm || t.companyName.includes(searchTerm) || t.title.includes(searchTerm)).map((ticket) => (
                <div key={ticket.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                      {ticket.companyName}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: ticket.status === '완료' ? '#dcfce7' : ticket.status === '처리중' ? '#fef3c7' : '#fee2e2',
                      color: ticket.status === '완료' ? '#15803d' : ticket.status === '처리중' ? '#b45309' : '#b91c1c'
                    }}>
                      {ticket.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '6px 0', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                    {ticket.title}
                  </h3>
                  <p style={{ margin: '4px 0 12px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                    {ticket.content}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span>작성자: {ticket.author}</span>
                    <span>{ticket.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: SYSTEM ERRORS (Support & Developer) ── */}
        {activeTab === 'errors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>실시간 시스템 예외 및 오류 로그</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                프론트엔드 및 API 호출 중 발생한 예외 로그입니다. 회원사 개인 식별 정보 및 원본 비즈니스 데이터는 마스킹 처리됩니다.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  최근 감지된 로그 ({errorLogs.length}건)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  상태: 실시간 수신 활성
                </span>
              </div>

              {errorLogs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                  현재 감지된 시스템 오류가 없습니다. 모든 서비스가 정상 작동 중입니다.
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {errorLogs.map((log, idx) => (
                    <div key={idx} style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#b91c1c' }}>{log.message || log.error || '알 수 없는 오류'}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '방금 전'}</span>
                        </div>
                        {log.stack && (
                          <pre style={{ margin: 0, padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.72rem', color: '#475569', overflowX: 'auto' }}>
                            {log.stack.slice(0, 300)}...
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: SYNC & TRAFFIC (Support & Developer) ── */}
        {activeTab === 'sync' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>회원사 동기화 & 트래픽 현황</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                회원사별 실시간 데이터베이스 동기화 상태, 네트워크 지연(Latency), 마지막 연결 시각입니다.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>회원사 ID</th>
                    <th style={{ padding: '12px 16px' }}>회원사명</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>동기화 상태</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>네트워크 지연</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>최종 동기화</th>
                  </tr>
                </thead>
                <tbody>
                  {syncStatusList.map((item) => (
                    <tr key={item.companyId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>
                        {item.companyId}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1e293b' }}>
                        {item.companyName}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: item.status === '정상' ? '#dcfce7' : '#fef3c7',
                          color: item.status === '정상' ? '#15803d' : '#b45309'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: item.latencyMs > 100 ? '#b45309' : '#059669' }}>
                        {item.latencyMs} ms
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        {item.lastSync}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: SUBSCRIPTIONS (Subscription & Billing) ── */}
        {activeTab === 'subscriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>회원사 요금제 및 구독 현황</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                회원사별 이용 요금제, 30일 무료 체험 잔여일, 결제 주기 및 차기 결제 예정일 목록입니다.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>회원사명</th>
                    <th style={{ padding: '12px 16px' }}>가입 요금제</th>
                    <th style={{ padding: '12px 16px' }}>금액 / 주기</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>구독 상태</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>체험 잔여일</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>차기 결제일</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>개인정보 위탁합의</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionsList.map((sub) => (
                    <tr key={sub.companyId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1e293b' }}>
                        <div>{sub.companyName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{sub.companyId}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                        {sub.plan}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {sub.price}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: sub.status === '구독중' ? '#dcfce7' : sub.status === '체험중' ? '#eff6ff' : '#fee2e2',
                          color: sub.status === '구독중' ? '#15803d' : sub.status === '체험중' ? '#1d4ed8' : '#b91c1c'
                        }}>
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: sub.trialDaysLeft > 0 ? '#1d4ed8' : '#94a3b8' }}>
                        {sub.trialDaysLeft > 0 ? `${sub.trialDaysLeft}일 남음` : '전환 완료'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>
                        {sub.nextBillingDate}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {sub.dpaSigned ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d', fontSize: '0.74rem', fontWeight: 700 }}>
                            <CheckCircle2 size={13} /> 체결 완료
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: '0.74rem', fontWeight: 700 }}>
                            <Clock size={13} /> 미체결
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: BILLING STATS (Subscription & Billing) ── */}
        {activeTab === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>결제 및 매출 통계</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                전체 유료 구독 회원사의 월간 반복 매출(MRR), 결제 성공률, 유료 전환율 지표입니다.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>월간 반복 매출 (MRR)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>208,000원</div>
                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '4px', fontWeight: 700 }}>전월 대비 +15.4% 증가</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>유료 구독 회원사</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>3개 사</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>무료 체험 중: 1개 사</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>결제 성공률</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>98.2%</div>
                <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: '4px', fontWeight: 700 }}>결제 재시도 대기: 1건</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>체험 종료 후 유료 전환율</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c3aed' }}>75.0%</div>
                <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '4px', fontWeight: 700 }}>평균 24일차 전환 완료</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
