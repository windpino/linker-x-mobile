import React from 'react';
import AuthGate from '../auth/AuthGate';

// Legacy entry points share Firebase identity verification and server membership approval.
export default function AgencySignup({ onNavigateToLogin }) {
  return <AuthGate>{session => <main className="auth-shell"><section className="auth-card">
    <h1>계정 및 회사 승인 확인 완료</h1>
    <p>{session.companyId} 소속으로 승인됐습니다.</p>
    {onNavigateToLogin && <button onClick={() => onNavigateToLogin(session.email || '')}>업무 화면으로 돌아가기</button>}
  </section></main>}</AuthGate>;
}
