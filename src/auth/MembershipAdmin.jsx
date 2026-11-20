import React, { useState, useEffect } from 'react';
import { callAuth, logout } from './client';

export default function MembershipAdmin({ session, onBack, embedded = false }) {
  const isPlatform = session.authRole === 'platform_admin' || session.isPlatformAdmin === true;
  const [companyId, setCompanyId] = useState(session.companyId === 'linker_x_hq' ? '' : session.companyId);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [approvalType, setApprovalType] = useState('link_existing'); // 'link_existing' | 'create_new'
  const [targetExistingCompanyId, setTargetExistingCompanyId] = useState('no1dmkr');
  const [existingCompanies, setExistingCompanies] = useState([
    { id: 'no1dmkr', name: '동명크릴 (기존 회원사)' }
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dev_companies') || '[]');
      const list = stored.map(c => ({ id: c.id, name: `${c.name || c.id} (${c.id})` }));
      if (!list.some(c => c.id === 'no1dmkr')) {
        list.unshift({ id: 'no1dmkr', name: '동명크릴 (no1dmkr)' });
      }
      setExistingCompanies(list);
    } catch {}
  }, []);

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
      const isCreateNew = approvalType === 'create_new';
      const targetCid = isCreateNew ? 'pending' : (targetExistingCompanyId || 'no1dmkr');
      const res = await callAuth('approveMembership', {
        companyId: targetCid,
        targetCompanyId: isCreateNew ? undefined : targetCid,
        uid: selected.uid,
        confirmLegacyLink: confirmed,
        permissions,
        createCompany: isCreateNew
      });
      const modeLabel = isCreateNew ? `새 회원사 개설 [${res.companyId}]` : `기존 회원사 연결 [${res.companyId}]`;
      setMessage(`[${selected.profile?.name || selected.uid}] ${modeLabel} 승인이 완료되었습니다.`);
      setSelected(null);
      await loadRequests(companyId);
    } catch {
      setMessage('승인 처리 중 오류가 발생했습니다. 권한 및 대상 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const cardContent = (
    <section className="auth-card" style={{ maxWidth: embedded ? '100%' : '640px', boxShadow: embedded ? 'none' : undefined, border: embedded ? 'none' : undefined, padding: embedded ? '8px' : undefined }}>
      <div className="auth-badge-status prod-verify" style={{ marginBottom: '12px' }}>
        {isPlatform ? '👑 플랫폼 슈퍼관리자 (최고권한)' : '회원사 관리자'}
      </div>
      <h1 style={{ fontSize: embedded ? '1.3rem' : undefined }}>
        {isPlatform ? '신규 회원사 및 소속 승인 관리' : '소속 승인 관리'}
      </h1>
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
            <div style={{ margin: '14px 0', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>
                회원사 승인 방식 선택:
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: approvalType === 'link_existing' ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="approvalType"
                    value="link_existing"
                    checked={approvalType === 'link_existing'}
                    onChange={() => setApprovalType('link_existing')}
                  />
                  기존 회원사에 연결 (동명크릴 등)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: approvalType === 'create_new' ? 700 : 400 }}>
                  <input
                    type="radio"
                    name="approvalType"
                    value="create_new"
                    checked={approvalType === 'create_new'}
                    onChange={() => setApprovalType('create_new')}
                  />
                  새 회원사 개설 (서버 자동 ID 발급)
                </label>
              </div>

              {approvalType === 'link_existing' ? (
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    연결할 대상 회원사 선택:
                  </label>
                  <select
                    value={targetExistingCompanyId}
                    onChange={e => setTargetExistingCompanyId(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    {existingCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    * 슈퍼관리자가 지정한 기존 회원사(동명크릴) 관리자로 연결되며, 주문·재고·전표 조회 권한이 부여됩니다. (이메일/회사명 자동 연결 차단)
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#4338ca', background: '#e0e7ff', padding: '8px 10px', borderRadius: '6px' }}>
                  * 서버에서 내부 회사 ID(comp_...)를 자동 발급하고, 기존 회원사 데이터와 분리된 0-state 업무 공간을 개설합니다. (희망 회사 ID 미입력)
                </div>
              )}
            </div>
          )}

          {selected.role === 'tenant_staff' && (
            <div style={{ margin: '12px 0', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#334155' }}>부여할 초기 권한</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                {['orders', 'loading', 'delivery', 'invoices', 'inventory', 'catalog', 'reports'].map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions[p])}
                      onChange={e => setPermissions(prev => ({ ...prev, [p]: e.target.checked }))}
                    />
                    {{ orders: '주문', loading: '상차', delivery: '배송', invoices: '전표', inventory: '재고', catalog: '품목/기초', reports: '보고서' }[p]}
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
            {busy ? '승인 처리 중...' : selected.role === 'tenant_admin' ? (approvalType === 'create_new' ? '새 회원사 개설 및 대표 승인 완료' : '기존 회원사 관리자 권한 연결 승인 완료') : '확인한 계정의 소속 승인'}
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
            이전 화면으로
          </button>
        )}
        {!embedded && (
          <button type="button" className="auth-btn-ghost" onClick={logout}>
            로그아웃
          </button>
        )}
      </div>
    </section>
  );

  if (embedded) return cardContent;
  return (
    <main className="auth-shell">
      {cardContent}
    </main>
  );
}
