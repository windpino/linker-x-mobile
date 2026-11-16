import React, { useEffect, useState } from 'react';
import { callAuth, logout } from './client';
import MembershipAdmin from './MembershipAdmin';

const count = value => typeof value === 'number' ? value.toLocaleString() : '미수집';

export default function PlatformConsole({ session }) {
  const [manage, setManage] = useState(false);
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nextAfter, setNextAfter] = useState(null);

  async function load(after = null) {
    setBusy(true);
    setError('');
    try {
      const result = await callAuth('platformOverview', { after });
      setPages(previous => after ? [...previous, result] : [result]);
      setNextAfter(result.nextAfter);
    } catch {
      setPages([]);
      setNextAfter(null);
      setError('관리자 권한과 서버 연결을 확인해 주세요. 사용량을 조회하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);
  if (manage) return <MembershipAdmin session={session} onBack={() => setManage(false)} />;

  const companies = pages.flatMap(page => page.companies);
  return <main className="auth-shell"><section className="auth-card" style={{ maxWidth: 920 }}>
    <h1>플랫폼 관리자</h1>
    <button onClick={() => setManage(true)}>회사·직원 소속 승인</button>
    <button disabled={busy} onClick={() => load()}>새로고침</button>
    <button onClick={logout}>로그아웃</button>
    <p>앱에서 수집한 일부 사용량입니다. Firebase 전체 사용량과 청구량은 별도 확인이 필요합니다.</p>
    {pages[0] && <p>{pages[0].date} · 한국 시간 기준</p>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">조회 중…</p>}
    <table style={{ width: '100%', textAlign: 'left' }}>
      <thead><tr><th>회사</th><th>상태</th><th>읽기</th><th>쓰기</th><th>수집 범위</th></tr></thead>
      <tbody>{companies.map(company => <tr key={company.id}>
        <td>{company.name}<br /><small>{company.id}</small></td>
        <td>{company.status}</td><td>{count(company.reads)}</td><td>{count(company.writes)}</td>
        <td>{company.collectionStatus === 'uncollected' ? '미수집' : '부분 수집'}</td>
      </tr>)}</tbody>
    </table>
    {pages.some(page => page.telemetryLimited) && <p>수집 조회 한도에 도달했습니다. 일부 회사의 수치는 표시되지 않을 수 있습니다.</p>}
    {nextAfter && <button disabled={busy} onClick={() => load(nextAfter)}>다음 회사 보기</button>}
  </section></main>;
}
