import React, { useState, useEffect } from 'react';
import { callAuth, logout } from './client';

export default function MembershipAdmin({ session, onBack }) {
  const isPlatform = session.authRole === 'platform_admin';
  const [companyId, setCompanyId] = useState(session.companyId === 'linker_x_hq' ? '' : session.companyId);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [createCompany, setCreateCompany] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadRequests = async (targetCid = companyId) => {
    setBusy(true);
    setMessage('');
    try {
      const list = await callAuth('listMembershipRequests', { companyId: targetCid || 'linker_x_hq' });
      setRequests(list || []);
      setSelected(null);
      setConfirmed(false);
      if (!list || list.length === 0) {
        setMessage('대기 중인 신청 건이 없습니다.');
      }
    } catch {
      setMessage('신청 목록을 불러오지 못했습니다. 권한 또는 네트워크를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async () => {
    if (!selected || !confirmed) return;
    setBusy(true);
    setMessage('');
    try {
      const targetCid = selected.companyId || companyId;
      await callAuth('approveMembership', {
        companyId: targetCid,
        uid: selected.uid,
        confirmLegacyLink: confirmed,
        permissions,
        createCompany
      });
      setMessage(`[${selected.profile?.name || selected.uid}] 승인이 완료되었습니다.`);
      setSelected(null);
      await loadRequests(companyId);
    } catch {
      setMessage('승인 처리 중 오류가 발생했습니다. 권한 및 대상 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: '640px' }}>
        <div className="auth-badge-status prod-verify" style={{ marginBottom: '12px' }}>
          {isPlatform ? '👑 플랫폼 슈퍼관리자 (최고권한)' : '회원사 관리자'}
        </div>
        <h1>{isPlatform ? '링커엑스 플랫폼 관리자' : '소속 승인 관리'}</h1>
        <p className="auth-subtext" style={{ marginBottom: '20px' }}>
          {isPlatform
            ? `최고관리자(${session.email || session.authUid}) 권한으로 접속 중입니다. 신규 회원사 개설 신청 및 각 회원사의 소속 요청을 승인할 수 있습니다.`
            : `[${session.companyId}] 회사 관리자 권한으로 소속 신청을 관리합니다.`}
        </p>

        <div className="auth-form" style={{ gap: '12px', marginBottom: '16px' }}>
          <label>
            대상 회사 ID {isPlatform && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>(비워두면 전체 회원사 조회)</span>}
            <input
              value={companyId}
              disabled={!isPlatform}
              placeholder={isPlatform ? '전체 조회 또는 특정 회사 ID 입력' : session.companyId}
              onChange={e => setCompanyId(e.target.value.trim())}
            />
          </label>
          <button
            type="button"
            className="auth-btn-primary"
            disabled={busy || (!isPlatform && !companyId)}
            onClick={() => loadRequests(companyId)}
          >
            {busy ? '조회 중...' : '신청 목록 새로고침'}
          </button>
        </div>

        {requests.length > 0 ? (
          <div style={{ margin: '16px 0', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 8px 0', color: '#1e293b' }}>대기 신청 목록 ({requests.length}건)</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requests.map(r => (
                <li key={`${r.uid}_${r.companyId}`}>
                  <button
                    type="button"
                    className="auth-btn-secondary"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'space-between',
                      background: selected?.uid === r.uid ? '#e0e7ff' : '#ffffff',
                      borderColor: selected?.uid === r.uid ? '#6366f1' : '#cbd5e1'
                    }}
                    disabled={r.status !== 'pending'}
                    onClick={() => { setSelected(r); setConfirmed(false); setPermissions({}); setCreateCompany(r.role === 'tenant_admin'); }}
                  >
                    <span><strong>{r.profile?.name || '신청자'}</strong> ({r.profile?.companyName || r.companyId})</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {r.role === 'tenant_admin' ? '🏢 대표(신규개설)' : r.role === 'partner' ? '🤝 거래처' : '👤 직원'} · {r.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            대기 중인 가입/소속 신청이 없습니다.
          </div>
        )}

        {selected && (
          <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>신청 상세 및 승인</h3>
            <div className="auth-user-info-box" style={{ marginBottom: '12px' }}>
              <p><strong>신청 회사 ID:</strong> <code>{selected.companyId}</code></p>
              <p><strong>회사명 / 사업자번호:</strong> {selected.profile?.companyName || '미입력'} ({selected.profile?.businessNo || '미입력'})</p>
              <p><strong>신청자 / 연락처:</strong> {selected.profile?.name} ({selected.profile?.phone || '연락처 없음'})</p>
              <p><strong>계정 UID / 이메일:</strong> <code>{selected.uid}</code> ({selected.email || '미확인'})</p>
              <p><strong>신청 구분:</strong> {selected.role === 'tenant_admin' ? '대표 (신규 회사 개설)' : selected.role === 'partner' ? '거래처' : '직원'}</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '12px 0' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span style={{ fontSize: '0.88rem' }}>본인·회사 소속·기존 문서 연결 대상을 별도 확인했습니다.</span>
            </label>

            {isPlatform && selected.role === 'tenant_admin' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '8px 0 12px 0', color: '#4338ca', fontWeight: 600 }}>
                <input type="checkbox" checked={createCompany} onChange={e => setCreateCompany(e.target.checked)} />
                <span style={{ fontSize: '0.88rem' }}>신규 회원사 생성을 정식 승인합니다.</span>
              </label>
            )}

            {selected.role === 'tenant_staff' && (
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>부여할 업무 권한 선택:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {['orders', 'loading', 'delivery', 'invoices', 'inventory', 'catalog', 'reports'].map(k => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                      <input
                        type="checkbox"
                        checked={!!permissions[k]}
                        onChange={e => setPermissions(p => ({ ...p, [k]: e.target.checked }))}
                      />
                      {({ orders: '주문', loading: '상차', delivery: '납품', invoices: '전표', inventory: '재고', catalog: '품목·창고', reports: '보고서' })[k]}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="auth-btn-primary"
              disabled={busy || !confirmed}
              onClick={handleApprove}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {busy ? '승인 처리 중...' : '확인한 계정의 소속 승인'}
            </button>
          </div>
        )}

        {message && (
          <p role="status" style={{ marginTop: '12px', fontSize: '0.88rem', color: message.includes('완료') ? '#16a34a' : '#dc2626' }}>
            {message}
          </p>
        )}

        <div className="auth-button-group" style={{ marginTop: '20px' }}>
          {onBack && (
            <button type="button" className="auth-btn-secondary" onClick={onBack}>
              업무 화면으로
            </button>
          )}
          <button type="button" className="auth-btn-ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
