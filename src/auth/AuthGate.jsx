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

  // Unauthenticated view mode: 'login' | 'signup'
  const [viewMode, setViewMode] = useState('login');
  // Signup target type: 'new_tenant' (새 회원사 등록) | 'existing_tenant' (기존 회원사 소속 신청)
  const [signupTarget, setSignupTarget] = useState('new_tenant');

  // Authenticated & verified sub-view:
  // 'company_login' | 'new_tenant_form' | 'existing_tenant_form' | 'awaiting_tenant_approval' | 'awaiting_member_approval'
  const [verifiedView, setVerifiedView] = useState('company_login');

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
      const nextIdentity = u ? {
        uid: u.uid,
        email: u.email,
        emailVerified: u.emailVerified,
        displayName: u.displayName
      } : null;
      setIdentity(nextIdentity);
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

  // Enter company workspace after verifying approved server session
  const enter = async (overrideCompanyId) => {
    const targetCid = (overrideCompanyId || form.companyId || '').trim();
    if (!targetCid) {
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
      const approved = withoutSecrets(await callAuth('authSession', { companyId: targetCid }));
      await prepareSessionScope(approved);
      localStorage.setItem('currentUser', JSON.stringify(approved));
      setSession(approved);
    } catch {
      localStorage.removeItem('currentUser');
      showMsg('회사 소속 승인이 완료되지 않았거나 등록된 소속이 없습니다. 관리자 승인을 확인해 주세요. (미승인 계정은 업무 데이터에 접근할 수 없습니다)', 'error');
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

  // First screen email/password login
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
      setVerifiedView('company_login');
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

  // Google sign in/signup
  const handleGoogleAuth = async (isSignupFlow = false) => {
    setBusy(true);
    showMsg('');
    try {
      const result = await googleLogin();
      // Google accounts have emailVerified === true
      if (isSignupFlow) {
        if (signupTarget === 'new_tenant') {
          setVerifiedView('new_tenant_form');
          showMsg('Google 계정 인증이 완료되었습니다. 새 회원사 정보를 입력해 주세요.', 'success');
        } else {
          setVerifiedView('existing_tenant_form');
          showMsg('Google 계정 인증이 완료되었습니다. 소속 신청 정보를 입력해 주세요.', 'success');
        }
      } else {
        setVerifiedView('company_login');
      }
      return result;
    } catch (err) {
      showMsg('Google 인증 실패: ' + (err.message || '인증에 실패했습니다.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Email signup form submit
  const handleEmailSignup = async (e) => {
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

  // Check email verified (reload user)
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
        if (signupTarget === 'new_tenant') {
          setVerifiedView('new_tenant_form');
          showMsg('이메일 인증이 완료되었습니다! 새 회원사 정보를 입력해 주세요.', 'success');
        } else if (signupTarget === 'existing_tenant') {
          setVerifiedView('existing_tenant_form');
          showMsg('이메일 인증이 완료되었습니다! 소속 신청 정보를 입력해 주세요.', 'success');
        } else {
          setVerifiedView('company_login');
          showMsg('이메일 인증이 완료되었습니다! 회사 소속을 확인해 주세요.', 'success');
        }
      } else {
        showMsg('아직 이메일 인증이 완료되지 않았습니다. 메일함(스팸함 포함)의 링크를 클릭한 후 다시 확인을 눌러주세요.', 'error');
      }
    } catch (err) {
      showMsg('인증 상태 확인 중 오류가 발생했습니다: ' + (err.message || '다시 시도해 주세요.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Resend email verification
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

  // Submit new company registration (Step 3: 슈퍼관리자 검토 요청)
  const handleNewTenantSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cid = form.companyId.trim();
    const cname = form.companyName.trim();
    const bno = form.businessNo.trim();
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!cid || !/^[A-Za-z0-9_-]{2,50}$/.test(cid)) {
      showMsg('회사 ID는 2~50자의 영문, 숫자, 하이픈(-), 밑줄(_)만 가능합니다.', 'error');
      return;
    }
    if (!cname) {
      showMsg('회사명을 입력해 주세요.', 'error');
      return;
    }
    if (!bno) {
      showMsg('사업자등록번호를 입력해 주세요.', 'error');
      return;
    }
    if (!name) {
      showMsg('담당자(대표자) 성명을 입력해 주세요.', 'error');
      return;
    }
    if (!phone) {
      showMsg('연락처를 입력해 주세요.', 'error');
      return;
    }

    setBusy(true);
    showMsg('새 회원사 등록 신청서를 제출하는 중입니다...', 'info');
    try {
      await refreshIdentity();
      await callAuth('requestMembership', withoutSecrets({
        companyId: cid,
        role: 'tenant_admin',
        legacyId: identity.uid,
        name,
        phone,
        companyName: cname,
        businessNo: bno
      }));
      setVerifiedView('awaiting_tenant_approval');
      showMsg('새 회원사 등록 신청이 성공적으로 접수되었습니다. 링커엑스 슈퍼관리자 승인 후 서비스가 활성화됩니다.', 'success');
    } catch (err) {
      showMsg('회원사 등록 신청 실패: ' + (err.message || '입력 정보를 다시 확인해 주세요.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Submit existing tenant member/partner registration (회원사 관리자 검토 요청)
  const handleExistingTenantSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cid = form.companyId.trim();
    const role = form.role;
    const name = form.name.trim();
    const phone = form.phone.trim();
    const legacyId = (form.legacyId || '').trim();
    const contactId = role === 'partner' ? (form.contactId || 'primary').trim() : 'primary';

    if (!cid) {
      showMsg('소속 신청할 회사 ID를 입력해 주세요.', 'error');
      return;
    }
    if (!name) {
      showMsg('이름을 입력해 주세요.', 'error');
      return;
    }
    if (!phone) {
      showMsg('연락처를 입력해 주세요.', 'error');
      return;
    }
    if (!legacyId) {
      showMsg('직원·거래처 문서 ID 또는 희망 식별 ID를 입력해 주세요.', 'error');
      return;
    }

    setBusy(true);
    showMsg('소속 승인 신청서를 제출하는 중입니다...', 'info');
    try {
      await refreshIdentity();
      await callAuth('requestMembership', withoutSecrets({
        companyId: cid,
        role,
        legacyId,
        contactId,
        name,
        phone,
        companyName: form.companyName || '',
        businessNo: form.businessNo || ''
      }));
      setVerifiedView('awaiting_member_approval');
      showMsg(`[${cid}] 소속 승인 신청이 접수되었습니다. 해당 회원사 관리자의 승인 후 입장할 수 있습니다.`, 'success');
    } catch (err) {
      showMsg('소속 승인 신청 실패: ' + (err.message || '입력 정보를 확인해 주세요.'), 'error');
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
      setViewMode('login');
      setVerifiedView('company_login');
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

        {/* ─────────────────────────────────────────────────────────────
            1. 첫 화면: 미인증 상태 (로그인 & 회원가입 탭, 회사 ID 없음)
        ───────────────────────────────────────────────────────────── */}
        {!identity ? (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${viewMode === 'login' ? 'active' : ''}`}
                onClick={() => { setViewMode('login'); setMessage(''); }}
              >
                로그인
              </button>
              <button
                type="button"
                className={`auth-tab ${viewMode === 'signup' ? 'active' : ''}`}
                onClick={() => { setViewMode('signup'); setMessage(''); }}
              >
                회원가입
              </button>
            </div>

            {viewMode === 'login' ? (
              <>
                <h2 className="auth-mode-title">계정 로그인</h2>
                <p className="auth-desc">등록된 이메일 계정으로 로그인해 주세요. (회사 ID는 로그인 후 선택합니다)</p>
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
                  onClick={() => handleGoogleAuth(false)}
                >
                  Google 계정으로 계속
                </button>

                <div className="auth-button-group">
                  <button
                    type="button"
                    className="auth-btn-secondary"
                    disabled={busy}
                    onClick={() => { setViewMode('signup'); setMessage(''); }}
                  >
                    새 계정 회원가입
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
                <h2 className="auth-mode-title">회원가입</h2>
                <p className="auth-desc">가입 목적을 선택한 뒤 Google 계정 또는 이메일로 가입해 주세요.</p>

                <div className="auth-type-cards">
                  <div
                    className={`auth-type-card ${signupTarget === 'new_tenant' ? 'selected' : ''}`}
                    onClick={() => setSignupTarget('new_tenant')}
                  >
                    <div className="auth-type-card-title">🏢 새 회원사 등록 (대표자)</div>
                    <div className="auth-type-card-desc">링커엑스에 새로운 회사(회원사)를 신규 개설하고 대표 권한을 신청합니다. (슈퍼관리자 승인 필요)</div>
                  </div>
                  <div
                    className={`auth-type-card ${signupTarget === 'existing_tenant' ? 'selected' : ''}`}
                    onClick={() => setSignupTarget('existing_tenant')}
                  >
                    <div className="auth-type-card-title">👥 기존 회원사 소속 신청 (직원·거래처)</div>
                    <div className="auth-type-card-desc">이미 등록된 회원사의 직원 또는 거래처로 소속을 신청합니다. (해당 회사 관리자 승인 필요)</div>
                  </div>
                </div>

                <div className="auth-action-divider"><span>가입 방식 선택</span></div>

                <button
                  type="button"
                  className="auth-btn-google"
                  disabled={busy}
                  onClick={() => handleGoogleAuth(true)}
                >
                  Google 계정으로 가입
                </button>

                <div className="auth-action-divider"><span>또는 이메일로 가입</span></div>

                <form onSubmit={handleEmailSignup} className="auth-form">
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
                    {busy ? '가입 처리 중...' : '이메일 계정 생성 및 인증 메일 받기'}
                  </button>
                </form>

                <div className="auth-button-group">
                  <button
                    type="button"
                    className="auth-btn-secondary"
                    disabled={busy}
                    onClick={() => { setViewMode('login'); setMessage(''); }}
                  >
                    로그인으로 돌아가기
                  </button>
                </div>
              </>
            )}
          </>
        ) : !identity.emailVerified ? (
          /* ─────────────────────────────────────────────────────────────
              2. 이메일 인증 대기 화면 (한국어 인증 링크 확인 대기)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">이메일 인증 대기</div>
            <h2 className="auth-mode-title">이메일 인증 대기</h2>
            <p className="auth-desc">
              <strong>{identity.email}</strong> 주소로 한국어 인증 메일이 발송되었습니다.<br />
              메일함(스팸함 포함)의 링크를 클릭하여 인증을 마친 후, 아래 <strong>[인증 완료 확인]</strong> 버튼을 눌러주세요.
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
        ) : verifiedView === 'new_tenant_form' ? (
          /* ─────────────────────────────────────────────────────────────
              3-A. 새 회원사 등록 흐름: 회사 정보 입력 (Step 2)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status prod-verify">새 회원사 등록</div>
            <h2 className="auth-mode-title">회사 정보 입력</h2>
            <p className="auth-desc">
              인증 계정: <strong>{identity.email}</strong> <span className="auth-verified-tag">인증됨</span><br />
              링커엑스에 새로 등록할 회사 정보를 입력해 주세요. (슈퍼관리자 승인 후 개설됩니다)
            </p>

            <form onSubmit={handleNewTenantSubmit} className="auth-form">
              <label>
                회사명
                <input
                  name="companyName"
                  required
                  placeholder="예: 주식회사 링커엑스 (신규 회사명)"
                  value={form.companyName}
                  onChange={change}
                />
              </label>
              <label>
                사업자등록번호
                <input
                  name="businessNo"
                  required
                  placeholder="예: 123-45-67890"
                  value={form.businessNo}
                  onChange={change}
                />
              </label>
              <label>
                담당자 (대표자 성명)
                <input
                  name="name"
                  required
                  placeholder="예: 홍길동"
                  value={form.name}
                  onChange={change}
                />
              </label>
              <label>
                연락처
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="예: 010-1234-5678"
                  value={form.phone}
                  onChange={change}
                />
              </label>
              <label>
                희망 회사 ID (영문/숫자 식별자)
                <input
                  name="companyId"
                  required
                  pattern="[A-Za-z0-9_-]{2,50}"
                  placeholder="예: new_company (영문/숫자 2~50자)"
                  value={form.companyId}
                  onChange={change}
                />
              </label>

              <div className="auth-notice-text">
                * 새 회원사 신청은 링커엑스 슈퍼관리자가 검토 및 승인합니다. 이메일이 일치하더라도 기존 동명크릴 계정에 자동 연결되지 않습니다.
              </div>

              <button type="submit" className="auth-btn-primary" disabled={busy}>
                {busy ? '신청서 제출 중...' : '새 회원사 등록 신청하기'}
              </button>
            </form>

            <div className="auth-button-group">
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => setVerifiedView('company_login')}
              >
                취소하고 소속 확인으로 이동
              </button>
            </div>
          </>
        ) : verifiedView === 'awaiting_tenant_approval' ? (
          /* ─────────────────────────────────────────────────────────────
              3-B. 새 회원사 등록 신청 완료: 슈퍼관리자 승인 대기
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">회원사 승인 대기</div>
            <h2 className="auth-mode-title">새 회원사 승인 대기</h2>
            <p className="auth-desc">
              신규 회원사 <strong>[{form.companyName || form.companyId}]</strong> 등록 신청이 접수되었습니다.<br />
              새 회원사 신청은 <strong>링커엑스 슈퍼관리자</strong>가 검토 및 승인합니다. 승인 전에는 회사 업무 데이터에 접근할 수 없습니다.
            </p>

            <div className="auth-user-info-box">
              <p><strong>회사명:</strong> {form.companyName || '미지정'} (ID: <code>{form.companyId}</code>)</p>
              <p><strong>대표자:</strong> {form.name} ({form.phone})</p>
              <p><strong>신청 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>승인 상태:</strong> <span className="auth-badge-status warning" style={{ display: 'inline', padding: '2px 8px' }}>슈퍼관리자 검토 대기</span></p>
            </div>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy}
                onClick={() => enter(form.companyId)}
              >
                {busy ? '승인 상태 확인 중...' : '슈퍼관리자 승인 확인 후 입장'}
              </button>
              <button
                type="button"
                className="auth-btn-ghost"
                disabled={busy}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </>
        ) : verifiedView === 'existing_tenant_form' ? (
          /* ─────────────────────────────────────────────────────────────
              3-C. 기존 회원사 가입 흐름: 직원·거래처 소속 신청
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status prod-verify">기존 회원사 소속 신청</div>
            <h2 className="auth-mode-title">직원·거래처 소속 신청</h2>
            <p className="auth-desc">
              인증 계정: <strong>{identity.email}</strong> <span className="auth-verified-tag">인증됨</span><br />
              기존 회원사에 직원 또는 거래처로 소속을 신청합니다. (해당 회원사 관리자가 검토 및 승인합니다)
            </p>

            <form onSubmit={handleExistingTenantSubmit} className="auth-form">
              <label>
                소속될 회사 ID
                <input
                  name="companyId"
                  required
                  pattern="[A-Za-z0-9_-]{1,100}"
                  placeholder="예: dongmyeong (소속 회사 식별자)"
                  value={form.companyId}
                  onChange={change}
                />
              </label>
              <label>
                가입 구분
                <select name="role" value={form.role} onChange={change}>
                  <option value="tenant_staff">직원 (Staff)</option>
                  <option value="partner">거래처 (Partner)</option>
                </select>
              </label>
              <label>
                이름
                <input
                  name="name"
                  required
                  placeholder="예: 성명"
                  value={form.name}
                  onChange={change}
                />
              </label>
              <label>
                연락처
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="예: 010-0000-0000"
                  value={form.phone}
                  onChange={change}
                />
              </label>
              <label>
                기존 직원·거래처 문서 ID 또는 희망 식별 ID
                <input
                  name="legacyId"
                  required
                  pattern="[A-Za-z0-9_-]{1,100}"
                  placeholder="예: 사번, 거래처ID, 또는 신규식별자"
                  value={form.legacyId}
                  onChange={change}
                />
              </label>
              {form.role === 'partner' && (
                <label>
                  거래처 담당자 구분 ID
                  <input
                    name="contactId"
                    placeholder="기본값: primary"
                    value={form.contactId}
                    onChange={change}
                  />
                </label>
              )}

              <div className="auth-notice-text">
                * 직원·거래처 소속 신청은 해당 회원사 관리자가 검토합니다. 회사 ID를 입력하거나 이메일을 인증한 것만으로는 권한이 부여되지 않으며, 이메일 일치로 기존 동명크릴 계정에 자동 연결되지 않습니다.
              </div>

              <button type="submit" className="auth-btn-primary" disabled={busy}>
                {busy ? '신청서 제출 중...' : '소속 승인 신청서 제출'}
              </button>
            </form>

            <div className="auth-button-group">
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => setVerifiedView('company_login')}
              >
                취소하고 소속 확인으로 이동
              </button>
            </div>
          </>
        ) : verifiedView === 'awaiting_member_approval' ? (
          /* ─────────────────────────────────────────────────────────────
              3-D. 기존 회원사 소속 신청 완료: 회원사 관리자 승인 대기
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">소속 승인 대기</div>
            <h2 className="auth-mode-title">회사 소속 승인 대기</h2>
            <p className="auth-desc">
              <strong>[{form.companyId}]</strong> 소속 승인 신청이 접수되었습니다.<br />
              신청 내용은 <strong>해당 회원사 관리자</strong>가 검토 및 승인합니다. 관리자 승인 전에는 업무 데이터에 접근할 수 없습니다.
            </p>

            <div className="auth-user-info-box">
              <p><strong>신청 회사 ID:</strong> <code>{form.companyId}</code></p>
              <p><strong>가입 구분:</strong> {form.role === 'partner' ? '거래처' : '직원'}</p>
              <p><strong>성명 / 식별ID:</strong> {form.name} ({form.legacyId})</p>
              <p><strong>신청 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>승인 상태:</strong> <span className="auth-badge-status warning" style={{ display: 'inline', padding: '2px 8px' }}>회원사 관리자 검토 대기</span></p>
            </div>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy}
                onClick={() => enter(form.companyId)}
              >
                {busy ? '소속 승인 확인 중...' : '소속 승인 확인 후 입장'}
              </button>
              <button
                type="button"
                className="auth-btn-ghost"
                disabled={busy}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              3-E. 일반 로그인 후 소속 확인 및 입장 화면 (회사 ID 입력)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">회사 소속 확인</div>
            <h2 className="auth-mode-title">회사 소속 확인 및 입장</h2>
            <div className="auth-user-info-box">
              <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>계정 UID:</strong> <code>{identity.uid}</code></p>
              <p className="auth-notice-text">
                접속할 회사 ID를 입력해 주세요. 회사 ID를 입력하거나 이메일을 인증한 것만으로는 권한이 부여되지 않으며, 서버에서 승인된 소속만 입장할 수 있습니다.
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); enter(); }} className="auth-form">
              <label>
                회사 ID
                <input
                  name="companyId"
                  pattern="[A-Za-z0-9_-]{1,100}"
                  required
                  placeholder="예: dongmyeong 또는 회원사 식별자"
                  value={form.companyId}
                  onChange={change}
                />
              </label>
              <button type="submit" className="auth-btn-primary" disabled={busy}>
                {busy ? '확인 중...' : '소속 확인 후 입장'}
              </button>
            </form>

            <div className="auth-action-divider"><span>소속 신청 및 추가 업무</span></div>

            <div className="auth-button-group">
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => { setVerifiedView('new_tenant_form'); setMessage(''); }}
              >
                🏢 새 회원사 등록 신청
              </button>
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => { setVerifiedView('existing_tenant_form'); setMessage(''); }}
              >
                👥 직원·거래처 소속 신청
              </button>
            </div>

            <button type="button" className="auth-btn-ghost" disabled={busy} onClick={handleLogout} style={{ marginTop: '16px' }}>
              로그아웃
            </button>
          </>
        )}
      </section>
    </main>
  );
}
