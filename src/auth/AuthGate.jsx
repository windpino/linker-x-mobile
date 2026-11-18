import React, { useCallback, useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db, authTargetMode } from '../firebase';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { login, register, googleLogin, verifyEmail, resetPassword, refreshIdentity, logout, callAuth } from './client';
import { clearLegacyCredentials, withoutSecrets } from './sanitize';
import './auth.css';
import MembershipAdmin from './MembershipAdmin';
import { prepareSessionScope, clearSessionScope } from './sessionScope';

function PartnerOrders({session}) {
  const [orders,setOrders] = useState([]), [item,setItem] = useState(''), [error,setError] = useState('');
  const load = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(collection(db,'companies',session.companyId,'partnerOrders'),where('companyId','==',session.companyId),where('partnerId','==',session.partnerId)));
      setOrders(snapshot.docs.map(d=>({id:d.id,...d.data()})));
    } catch { setError('주문 조회 권한 또는 연결을 확인해 주세요.'); }
  },[session.companyId,session.partnerId]);
  useEffect(()=>{load();},[load]);
  return <main className="auth-shell"><section className="auth-card"><h1>거래처 주문</h1><p>{session.companyId} · 본인 거래처 주문만 표시합니다.</p>
    <form onSubmit={async e=>{e.preventDefault(); try {await addDoc(collection(db,'companies',session.companyId,'partnerOrders'),{companyId:session.companyId,partnerId:session.partnerId,items:[{description:item}],note:'',status:'submitted',createdAt:serverTimestamp()});setItem('');await load();}catch{setError('주문을 저장하지 못했습니다.');}}}><label>주문 요청<input required value={item} onChange={e=>setItem(e.target.value)}/></label><button>주문 요청 보내기</button></form>
    <p role="alert">{error}</p><ul>{orders.map(o=><li key={o.id}>{o.items?.map(i=>i.description).join(', ')} · {o.status}</li>)}</ul><button onClick={logout}>로그아웃</button></section></main>;
}

export default function AuthGate({children}) {
  const [manage, setManage] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'error' | 'success' | 'warning'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    companyName: '',
    businessNo: '',
    companyId: '',
    legacyId: '',
    contactId: 'primary',
    role: 'tenant_staff'
  });

  const change = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const showMsg = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  useEffect(() => {
    clearLegacyCredentials(localStorage);
    clearLegacyCredentials(sessionStorage);
    return onIdTokenChanged(auth, u => {
      clearSessionScope();
      localStorage.removeItem('currentUser');
      setIdentity(u ? {
        uid: u.uid,
        email: u.email,
        emailVerified: u.emailVerified,
        displayName: u.displayName
      } : null);
      setSession(null);
      setBusy(false);
      setForm(f => ({
        ...f,
        password: '',
        passwordConfirm: '',
        email: u?.email || f.email,
        name: u?.displayName || f.name
      }));
    });
  }, []);

  const enter = async () => {
    if (!form.companyId.trim()) {
      showMsg('입장할 회사 ID를 입력해 주세요.', 'error');
      return;
    }
    setSession(null);
    setBusy(true);
    showMsg('');
    try {
      await refreshIdentity();
      if (!auth.currentUser?.emailVerified) {
        showMsg('회사 입장 전 이메일 인증이 필요합니다.', 'error');
        setIdentity(prev => prev ? ({ ...prev, emailVerified: false }) : null);
        return;
      }
      const approved = withoutSecrets(await callAuth('authSession', { companyId: form.companyId.trim() }));
      await prepareSessionScope(approved);
      localStorage.setItem('currentUser', JSON.stringify(approved));
      setSession(approved);
    } catch {
      localStorage.removeItem('currentUser');
      showMsg('회사 소속 승인 대기 중이거나 서버 연결에 실패했습니다. 관리자 승인을 확인해 주세요. (동명크릴 업무 데이터는 미승인 계정에 공개되지 않습니다)', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sessionCompanyId = session?.companyId;
  const sessionUid = session?.authUid;
  useEffect(() => {
    if (!sessionCompanyId || !sessionUid) return;
    let live = true;
    const timer = setInterval(async () => {
      try {
        const next = withoutSecrets(await callAuth('authSession', { companyId: sessionCompanyId }));
        if (live) {
          await prepareSessionScope(next);
          setSession(next);
          localStorage.setItem('currentUser', JSON.stringify(next));
        }
      } catch {
        if (live) {
          setSession(null);
          localStorage.removeItem('currentUser');
          showMsg('소속 승인 상태가 변경되었거나 유효하지 않습니다.', 'error');
        }
      }
    }, 60000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [sessionCompanyId, sessionUid]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (busy) return;
    const email = form.email.trim();
    const pw = form.password;
    const pwConf = form.passwordConfirm;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('유효한 이메일 주소를 입력해 주세요.', 'error');
      return;
    }
    if (!pw || pw.length < 6) {
      showMsg('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
      return;
    }
    if (pw !== pwConf) {
      showMsg('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'error');
      return;
    }

    setBusy(true);
    showMsg('계정을 생성하고 인증 메일을 전송하는 중입니다...', 'info');
    try {
      const { user, verificationSent, verificationError } = await register(email, pw);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      if (verificationSent) {
        showMsg(`인증 메일이 ${user.email} 주소로 발송되었습니다. 메일함의 링크를 클릭한 후 아래 [인증 완료 확인]을 눌러주세요.`, 'success');
      } else {
        showMsg(`계정은 생성되었으나 메일 발송에 실패했습니다(${verificationError?.code || '오류'}). 아래 [인증 메일 다시 보내기]를 눌러주세요.`, 'warning');
      }
    } catch (err) {
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      if (err.code === 'auth/email-already-in-use') {
        showMsg('이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용해 주세요.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        showMsg('유효하지 않은 이메일 형식입니다.', 'error');
      } else if (err.code === 'auth/weak-password') {
        showMsg('비밀번호는 최소 6자리 이상이어야 합니다.', 'error');
      } else if (err.code === 'auth/network-request-failed') {
        showMsg('네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.', 'error');
      } else {
        showMsg(err.message || '가입 처리 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    const email = form.email.trim();
    const pw = form.password;

    if (!email) {
      showMsg('이메일을 입력해 주세요.', 'error');
      return;
    }
    if (!pw) {
      showMsg('비밀번호를 입력해 주세요.', 'error');
      return;
    }

    setBusy(true);
    showMsg('');
    try {
      await login(email, pw);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
    } catch (err) {
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showMsg('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        showMsg('유효하지 않은 이메일 형식입니다.', 'error');
      } else if (err.code === 'auth/too-many-requests') {
        showMsg('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'error');
      } else if (err.code === 'auth/network-request-failed') {
        showMsg('네트워크 연결 상태를 확인해 주세요.', 'error');
      } else {
        showMsg('로그인 중 오류가 발생했습니다. 입력 정보를 확인해 주세요.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    if (busy) return;
    setBusy(true);
    showMsg('이메일 인증 상태를 확인 중입니다...', 'info');
    try {
      const refreshed = await refreshIdentity();
      if (refreshed?.emailVerified) {
        setIdentity({
          uid: refreshed.uid,
          email: refreshed.email,
          emailVerified: true,
          displayName: refreshed.displayName
        });
        showMsg('이메일 인증이 완료되었습니다! 회사 소속 확인을 진행해 주세요.', 'success');
      } else {
        showMsg('아직 이메일 인증이 완료되지 않았습니다. 메일함(스팸함 포함)의 링크를 클릭한 후 다시 확인을 눌러주세요.', 'error');
      }
    } catch (err) {
      showMsg('인증 상태 확인 중 오류가 발생했습니다: ' + (err.message || '다시 시도해 주세요.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResendEmail = async () => {
    if (busy) return;
    setBusy(true);
    showMsg('인증 메일을 발송 중입니다...', 'info');
    try {
      await verifyEmail();
      showMsg('인증 메일을 다시 발송했습니다. 메일함을 확인해 주세요.', 'success');
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        showMsg('요청이 너무 많습니다. 잠시 기다린 후 다시 시도해 주세요.', 'error');
      } else {
        showMsg('인증 메일 재발송 실패: ' + (err.message || '잠시 후 다시 시도해 주세요.'), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (busy) return;
    const email = form.email.trim();
    if (!email) {
      showMsg('비밀번호를 재설정할 이메일을 입력창에 입력해 주세요.', 'error');
      return;
    }
    setBusy(true);
    showMsg('');
    try {
      await resetPassword(email);
      showMsg('해당 이메일로 비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.', 'success');
    } catch (err) {
      showMsg('비밀번호 재설정 요청 실패: ' + (err.message || '이메일을 확인해 주세요.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      setMessage('');
    } finally {
      setBusy(false);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
    }
  };

  // Check emulator safety violation
  const isEmulatorAttached = Boolean(auth?.emulatorConfig);
  const isProdVerifyMode = authTargetMode === 'production-auth-only';

  if (session?.role === 'partner') return <PartnerOrders session={session} />;
  if (session?.authRole === 'platform_admin' || (session && manage)) {
    return <MembershipAdmin session={session} onBack={session.authRole === 'tenant_admin' ? () => setManage(false) : undefined} />;
  }
  if (session) {
    return (
      <>
        {session.authRole === 'tenant_admin' && (
          <button className="auth-admin-toggle" onClick={() => setManage(true)}>
            소속 승인 관리
          </button>
        )}
        {children(session)}
      </>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>링커엑스</h1>
        <p className="auth-subtext">내 계정으로 인증하고, 승인받은 회사에서 업무를 시작하세요.</p>

        {isProdVerifyMode ? (
          isEmulatorAttached ? (
            <div className="auth-badge-status failure">
              🚨 안전 실패: 운영 인증 검증 모드이나 127.0.0.1:9099 에뮬레이터에 연결되었습니다.
            </div>
          ) : (
            <div className="auth-badge-status prod-verify">
              🛡️ 운영 Firebase Auth 검증 모드 (link-x-6606e) · 운영 Firestore 쓰기 원천 차단됨
            </div>
          )
        ) : authTargetMode === 'emulator' ? (
          <div className="auth-badge-status emulator">
            🧪 격리된 로컬 에뮬레이터 환경 (127.0.0.1:9099)
          </div>
        ) : null}

        {message && (
          <div className={`auth-msg ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
            {message}
          </div>
        )}

        {!identity ? (
          mode === 'login' ? (
            <>
              <h2 className="auth-mode-title">이메일 로그인</h2>
              <form onSubmit={handleLogin} className="auth-form">
                <label>
                  이메일
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={change}
                  />
                </label>
                <label>
                  비밀번호
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={change}
                  />
                </label>
                <button type="submit" className="auth-btn-primary" disabled={busy}>
                  {busy ? '로그인 처리 중...' : '로그인'}
                </button>
              </form>

              <div className="auth-action-divider"><span>또는</span></div>

              <button
                type="button"
                className="auth-btn-google"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  showMsg('');
                  try {
                    await googleLogin();
                  } catch (err) {
                    showMsg('Google 로그인 실패: ' + (err.message || '인증에 실패했습니다.'), 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Google 계정으로 계속
              </button>

              <div className="auth-button-group">
                <button
                  type="button"
                  className="auth-btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setMode('signup');
                    setMessage('');
                  }}
                >
                  이메일로 가입
                </button>
                <button
                  type="button"
                  className="auth-btn-text"
                  disabled={busy || !form.email.trim()}
                  onClick={handlePasswordReset}
                >
                  비밀번호 재설정
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="auth-mode-title">이메일로 가입</h2>
              <p className="auth-desc">가입할 이메일과 비밀번호를 입력해 주세요.</p>
              <form onSubmit={handleSignup} className="auth-form">
                <label>
                  이메일
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={change}
                  />
                </label>
                <label>
                  비밀번호
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="6자리 이상 비밀번호"
                    value={form.password}
                    onChange={change}
                  />
                </label>
                <label>
                  비밀번호 확인
                  <input
                    type="password"
                    name="passwordConfirm"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="비밀번호 재입력"
                    value={form.passwordConfirm}
                    onChange={change}
                  />
                </label>
                <button type="submit" className="auth-btn-primary" disabled={busy}>
                  {busy ? '가입 처리 중...' : '이메일로 가입하기'}
                </button>
              </form>

              <div className="auth-button-group">
                <button
                  type="button"
                  className="auth-btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setMode('login');
                    setMessage('');
                    setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
                  }}
                >
                  로그인으로 돌아가기
                </button>
              </div>
            </>
          )
        ) : !identity.emailVerified ? (
          <>
            <div className="auth-badge-status warning">이메일 인증 대기</div>
            <h2 className="auth-mode-title">이메일 인증 대기</h2>
            <p className="auth-desc">
              <strong>{identity.email}</strong> 주소로 인증 메일이 발송되었습니다.<br />
              메일함(스팸함 포함)에서 인증 링크를 클릭한 후, 아래 <strong>[인증 완료 확인]</strong> 버튼을 눌러주세요.
            </p>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy}
                onClick={handleCheckEmailVerified}
              >
                {busy ? '확인 중...' : '인증 완료 확인'}
              </button>

              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={handleResendEmail}
              >
                인증 메일 다시 보내기
              </button>

              <button
                type="button"
                className="auth-btn-ghost"
                disabled={busy}
                onClick={handleLogout}
              >
                다른 계정으로 로그인 (로그아웃)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-badge-status warning">회사 승인 대기</div>
            <h2 className="auth-mode-title">회사 승인 대기</h2>
            <div className="auth-user-info-box">
              <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>계정 UID:</strong> <code>{identity.uid}</code></p>
              <p className="auth-notice-text">
                * 이메일 인증이 완료되었으나, 회사 데이터 접근 권한은 서버에서 별도로 승인되어야 합니다.
                기존 동명크릴의 발주·상차·재고·정산 데이터는 인증 계정과 자동으로 연결되지 않습니다.
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); enter(); }} className="auth-form">
              <label>
                회사 ID
                <input
                  name="companyId"
                  pattern="[A-Za-z0-9_-]{1,100}"
                  required
                  placeholder="예: dongmyeong 또는 회사 식별자"
                  value={form.companyId}
                  onChange={change}
                />
              </label>
              <button type="submit" className="auth-btn-primary" disabled={busy}>
                {busy ? '확인 중...' : '인증 및 소속 확인 후 입장'}
              </button>
            </form>

            <details className="auth-details-box">
              <summary>회원사·직원·거래처 소속 승인 신청</summary>
              <form onSubmit={e => {
                e.preventDefault();
                (async () => {
                  setBusy(true);
                  showMsg('');
                  try {
                    await refreshIdentity();
                    await callAuth('requestMembership', withoutSecrets(form));
                    showMsg('승인 신청을 접수했습니다. 회사 관리자 확인 후 입장할 수 있습니다.', 'success');
                  } catch (err) {
                    showMsg('승인 신청 실패: ' + (err.message || '입력 정보 및 서버 상태를 확인해 주세요.'), 'error');
                  } finally {
                    setBusy(false);
                  }
                })();
              }} className="auth-form">
                <label>
                  가입 구분
                  <select name="role" value={form.role} onChange={change}>
                    <option value="tenant_admin">회원사 대표</option>
                    <option value="tenant_staff">직원</option>
                    <option value="partner">거래처</option>
                  </select>
                </label>
                <label>
                  회사 ID
                  <input name="companyId" required pattern="[A-Za-z0-9_-]{1,100}" value={form.companyId} onChange={change} />
                </label>
                <label>
                  기존 직원·거래처 문서 ID 또는 신규 희망 ID
                  <input name="legacyId" required pattern="[A-Za-z0-9_-]{1,100}" value={form.legacyId} onChange={change} />
                </label>
                {form.role === 'partner' && (
                  <label>
                    거래처 담당자 구분 ID
                    <input name="contactId" value={form.contactId} onChange={change} />
                  </label>
                )}
                <label>
                  이름
                  <input name="name" required value={form.name} onChange={change} />
                </label>
                <label>
                  전화번호
                  <input type="tel" name="phone" value={form.phone} onChange={change} />
                </label>
                <label>
                  회사명
                  <input name="companyName" value={form.companyName} onChange={change} />
                </label>
                <label>
                  사업자번호
                  <input name="businessNo" value={form.businessNo} onChange={change} />
                </label>
                <p className="auth-form-help">
                  기존 계정 연결은 관리자가 직접 확인합니다. 이메일 일치만으로 자동 연결되지 않습니다.
                </p>
                <button type="submit" className="auth-btn-primary" disabled={busy}>
                  {busy ? '접수 중...' : '소속 승인 신청서 제출'}
                </button>
              </form>
            </details>

            <button type="button" className="auth-btn-ghost" disabled={busy} onClick={handleLogout}>
              로그아웃
            </button>
          </>
        )}
      </section>
    </main>
  );
}
