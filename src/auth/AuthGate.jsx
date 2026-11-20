import React, { useCallback, useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db, authTargetMode } from '../firebase';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { login, register, googleLogin, verifyEmail, resetPassword, verifyResetCode, confirmResetPassword, applyEmailVerification, verifyActionCode, refreshIdentity, logout, callAuth, initDongmyeongSampleData } from './client';
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

  // Unauthenticated view mode: 'login' | 'signup' | 'reset_password' | 'confirm_reset'
  const [viewMode, setViewMode] = useState('login');
  // Signup target type: 'new_tenant' (새 회원사 등록) | 'existing_tenant' (기존 회원사 소속 신청)
  const [signupTarget, setSignupTarget] = useState('new_tenant');

  // Password reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState(null);
  const [resetCodeStatus, setResetCodeStatus] = useState(null); // 'checking' | 'valid' | 'expired' | 'invalid'
  const [resetEmailTarget, setResetEmailTarget] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Email verification action code states
  const [verifyEmailStatus, setVerifyEmailStatus] = useState(null); // 'checking' | 'success' | 'expired' | 'invalid' | 'failed'
  const [verifiedTargetEmail, setVerifiedTargetEmail] = useState('');

  // Registration status states
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regData, setRegData] = useState(null);

  // Authenticated & verified sub-view:
  // 'company_login' | 'new_tenant_form' | 'existing_tenant_form' | 'awaiting_tenant_approval' | 'awaiting_member_approval' | 'no_application'
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const change = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const showMsg = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const resolvePlatformAdmin = async (targetUser) => {
    try {
      const u = targetUser || auth.currentUser;
      const tokenResult = await u?.getIdTokenResult();
      const claims = tokenResult?.claims || {};
      const hasClaim = claims.superAdmin === true || claims.role === 'super_admin' || claims.platform_admin === true;

      const approved = withoutSecrets(await callAuth('authSession', { companyId: 'linker_x_hq' }));
      if (approved?.authRole === 'platform_admin' || hasClaim) {
        const sessionWithClaims = {
          ...approved,
          role: 'super_admin',
          authRole: 'platform_admin',
          isPlatformAdmin: true,
          claims
        };
        await prepareSessionScope(sessionWithClaims);
        localStorage.setItem('currentUser', JSON.stringify(sessionWithClaims));
        setSession(sessionWithClaims);
        return true;
      }
    } catch (e) {
      console.error('[resolvePlatformAdmin error]', e);
      // Not platform admin, continue normal flow
    }
    return false;
  };

  useEffect(() => {
    clearLegacyCredentials(localStorage);
    clearLegacyCredentials(sessionStorage);
    return onIdTokenChanged(auth, async u => {
      const activeUser = (typeof window !== 'undefined' && window.__mockFirebaseUser) || u;
      clearSessionScope();
      localStorage.removeItem('currentUser');
      const nextIdentity = activeUser ? {
        uid: activeUser.uid,
        email: activeUser.email,
        emailVerified: activeUser.emailVerified,
        displayName: activeUser.displayName
      } : null;
      setIdentity(nextIdentity);
      setSession(null);
      setBusy(false);
      setForm(f => ({
        ...f,
        password: '',
        passwordConfirm: '',
        email: activeUser?.email || f.email,
        name: activeUser?.displayName || f.name
      }));
      if (activeUser && activeUser.emailVerified) {
        const isPlatform = await resolvePlatformAdmin(activeUser);
        if (!isPlatform) {
          await checkRegistrationStatus(activeUser);
        }
      }
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
      const verifiedUser = (typeof window !== 'undefined' && window.__mockFirebaseUser) || auth.currentUser;
      if (!verifiedUser?.emailVerified) {
        showMsg('회사 입장 전 이메일 인증이 필요합니다.', 'error');
        setIdentity(prev => prev ? ({ ...prev, emailVerified: false }) : null);
        return;
      }
      const approved = withoutSecrets(await callAuth('authSession', { companyId: targetCid }));
      await prepareSessionScope(approved);
      if (approved.companyId === 'no1dmkr') {
        initDongmyeongSampleData();
      }
      localStorage.setItem('currentUser', JSON.stringify(approved));
      setSession(approved);
    } catch {
      localStorage.removeItem('currentUser');
      showMsg('회사 소속 승인이 완료되지 않았거나 등록된 소속이 없습니다. 관리자 승인을 확인해 주세요. (미승인 계정은 업무 데이터에 접근할 수 없습니다)', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Query registration status by UID from the server
  const checkRegistrationStatus = useCallback(async (targetUser) => {
    const u = targetUser || auth.currentUser;
    if (!u || !u.emailVerified) return;

    setRegLoading(true);
    setRegError(null);
    try {
      const res = await callAuth('getMyRegistrationStatus');
      setRegData(res);
      if (res.status === 'approved' && res.companyId) {
        // 승인 및 활성화 완료: '회사 업무 시작' 버튼과 무료 이용 종료일을 표시
        setVerifiedView('awaiting_tenant_approval');
        setForm(f => ({
          ...f,
          companyId: res.companyId || f.companyId,
          companyName: res.companyName || res.profile?.companyName || f.companyName,
          name: res.profile?.name || f.name,
          phone: res.profile?.phone || f.phone
        }));
        showMsg(`[${res.companyName || res.companyId}] 회원사 승인이 완료되었습니다. 업무를 시작해 주세요!`, 'success');
      } else if (res.status === 'pending') {
        // Condition A: 접수 완료·검토 중이면 회원사 승인 대기 화면을 표시하고 재등록/회사 ID 입력 숨김
        setVerifiedView('awaiting_tenant_approval');
        setForm(f => ({
          ...f,
          companyId: res.companyId || f.companyId,
          companyName: res.companyName || res.profile?.companyName || f.companyName,
          name: res.profile?.name || f.name,
          phone: res.profile?.phone || f.phone
        }));
      } else if (res.status === 'none') {
        // Condition B: 신청 기록이 없으면 새 회원사 등록 신청 유도 화면 표시
        setVerifiedView('no_application');
      } else if (res.status === 'rejected') {
        setVerifiedView('registration_rejected');
        showMsg(res.reason || '회원사 등록 신청이 반려되었습니다. 관리자에게 문의해 주세요.', 'error');
      } else {
        setVerifiedView('company_login');
      }
    } catch {
      // Condition D: 조회 실패는 "신청 상태를 불러오지 못했습니다"와 [다시 시도]로 안내
      setRegError('신청 상태를 불러오지 못했습니다');
    } finally {
      setRegLoading(false);
    }
  }, []);

  // Check URL parameters for Firebase action codes (e.g. password reset)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setViewMode('confirm_reset');
      setResetCode(oobCode);
      setResetCodeStatus('checking');
      verifyResetCode(oobCode)
        .then(email => {
          setResetEmailTarget(email || '');
          setResetCodeStatus('valid');
        })
        .catch(err => {
          if (err.code === 'auth/expired-action-code') {
            setResetCodeStatus('expired');
          } else {
            setResetCodeStatus('invalid');
          }
        });
    } else if (mode === 'verifyEmail' && oobCode) {
      setViewMode('verify_email_result');
      setVerifyEmailStatus('checking');
      verifyActionCode(oobCode)
        .then(info => {
          if (info?.data?.email) setVerifiedTargetEmail(info.data.email);
        })
        .catch(() => {});

      applyEmailVerification(oobCode)
        .then(async () => {
          setVerifyEmailStatus('success');
          await refreshIdentity();
        })
        .catch(err => {
          if (err.code === 'auth/expired-action-code') {
            setVerifyEmailStatus('expired');
          } else if (err.code === 'auth/invalid-action-code') {
            setVerifyEmailStatus('invalid');
          } else {
            setVerifyEmailStatus('failed');
          }
        });
    }
  }, []);

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
      const isPlatform = await resolvePlatformAdmin();
      if (!isPlatform) {
        await checkRegistrationStatus();
      }
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
        const isPlatform = await resolvePlatformAdmin();
        if (!isPlatform) {
          await checkRegistrationStatus();
        }
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
        const isPlatform = await resolvePlatformAdmin(refreshed);
        if (!isPlatform) {
          if (signupTarget === 'new_tenant') {
            setVerifiedView('new_tenant_form');
            showMsg('이메일 인증이 완료되었습니다! 새 회원사 정보를 입력해 주세요.', 'success');
          } else if (signupTarget === 'existing_tenant') {
            setVerifiedView('existing_tenant_form');
            showMsg('이메일 인증이 완료되었습니다! 소속 신청 정보를 입력해 주세요.', 'success');
          } else {
            await checkRegistrationStatus(refreshed);
          }
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

  // Submit new company registration (Step 3: 슈퍼관리자 검토 요청 - 희망 회사 ID 입력 불필요, 승인 시 서버 자동 발급)
  const handleNewTenantSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cname = form.companyName.trim();
    const bno = form.businessNo.trim();
    const name = form.name.trim();
    const phone = form.phone.trim();

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
        companyId: 'pending',
        role: 'tenant_admin',
        legacyId: identity.uid,
        name,
        phone,
        companyName: cname,
        businessNo: bno
      }));
      setRegData({
        status: 'pending',
        companyId: 'pending',
        companyName: cname,
        role: 'tenant_admin',
        profile: { name, phone, companyName: cname, businessNo: bno },
        createdAt: new Date().toISOString()
      });
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

  const handlePasswordResetSubmit = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    const email = (resetEmail || form.email || '').trim();
    if (!email) {
      showMsg('가입할 때 등록한 전체 이메일 주소를 입력해 주세요.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMsg('가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)', 'error');
      return;
    }
    setBusy(true);
    showMsg('');
    try {
      await resetPassword(email);
      setResetSent(true);
      showMsg('등록된 이메일이라면 재설정 링크를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.', 'success');
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        showMsg('가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)', 'error');
      } else if (err.code === 'auth/user-not-found') {
        setResetSent(true);
        showMsg('등록된 이메일이라면 재설정 링크를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.', 'success');
      } else {
        showMsg('비밀번호 재설정 요청 실패: ' + (err.message || '잠시 후 다시 시도해 주세요.'), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPasswordResetSubmit = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    if (!newPassword || newPassword.length < 6) {
      showMsg('새 비밀번호는 6자리 이상이어야 합니다.', 'error');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showMsg('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    setBusy(true);
    showMsg('');
    try {
      await confirmResetPassword(resetCode, newPassword);
      showMsg('비밀번호가 성공적으로 변경되었습니다! 새 비밀번호로 로그인해 주세요.', 'success');
      setTimeout(() => {
        if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname);
        setViewMode('login');
        setForm(f => ({ ...f, email: resetEmailTarget, password: '' }));
      }, 2000);
    } catch (err) {
      if (err.code === 'auth/expired-action-code') {
        setResetCodeStatus('expired');
        showMsg('재설정 링크가 만료되었습니다. 새 링크를 요청해 주세요.', 'error');
      } else if (err.code === 'auth/invalid-action-code') {
        setResetCodeStatus('invalid');
        showMsg('이미 사용되었거나 유효하지 않은 재설정 링크입니다. 새 링크를 요청해 주세요.', 'error');
      } else {
        showMsg('비밀번호 재설정 실패: ' + (err.message || '잠시 후 다시 시도해 주세요.'), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReturnToLinkerX = async () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setViewMode('login');
    const u = auth.currentUser;
    if (u) {
      await refreshIdentity();
      if (u.emailVerified) {
        const isPlatform = await resolvePlatformAdmin(u);
        if (!isPlatform) {
          await checkRegistrationStatus(u);
        }
        return;
      }
    }
    showMsg('이메일 인증이 완료되었습니다! 로그인하시면 회원사 등록 절차로 이어집니다.', 'success');
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      setMessage('');
      setViewMode('login');
      setVerifiedView('company_login');
      setRegData(null);
      setRegError(null);
      setRegLoading(false);
    } finally {
      setBusy(false);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
    }
  };

  // Check emulator safety violation
  const isEmulatorAttached = Boolean(auth?.emulatorConfig);
  const isProdVerifyMode = authTargetMode === 'production-auth-only';

  if (session?.role === 'partner') return <PartnerOrders session={session} />;
  if (session && manage && (session.authRole === 'tenant_admin' || session.isPlatformAdmin)) {
    return <MembershipAdmin session={session} onBack={() => setManage(false)} />;
  }
  if (session) {
    return (
      <>
        {(session.authRole === 'tenant_admin' || session.isPlatformAdmin) && (
          <button 
            className="auth-admin-toggle" 
            onClick={() => setManage(true)}
          >
            {session.isPlatformAdmin ? '플랫폼 가입/소속 승인 관리' : '소속 승인 관리'}
          </button>
        )}
        {children(session)}
      </>
    );
  }

  return (
    <main className="auth-shell dark-theme">
      {/* 1. 상단 브랜딩: 3D X 로고 + Linker X + 서브 슬로건 */}
      <div className="dark-auth-header">
        <div className="dark-logo-wrap">
          <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="dark-logo-icon">
            <defs>
              <linearGradient id="xGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="xGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <filter id="xGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M16 12 L30 12 L64 68 L50 68 Z" fill="url(#xGrad1)" filter="url(#xGlow)" />
            <path d="M64 12 L50 12 L16 68 L30 68 Z" fill="url(#xGrad2)" filter="url(#xGlow)" />
          </svg>
        </div>
        <h1 className="dark-brand-title">Linker X</h1>
        <p className="dark-brand-sub">LINK BEYOND, AUTOMATE EVERYTHING.</p>
      </div>

      <section className="auth-card dark-glass">
        {isProdVerifyMode && isEmulatorAttached && (
          <div className="auth-badge-status failure">
            🚨 안전 실패: 운영 인증 검증 모드이나 127.0.0.1:9099 에뮬레이터에 연결되었습니다.
          </div>
        )}

        {message && (
          <div className={`auth-msg ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
            {message}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            0. 이메일 인증 완료/확인 결과 화면 (브랜드 디자인)
        ───────────────────────────────────────────────────────────── */}
        {viewMode === 'verify_email_result' ? (
          <>
            {verifyEmailStatus === 'checking' ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <div className="auth-badge-status prod-verify" style={{ display: 'inline-block', marginBottom: '12px' }}>인증 확인 중</div>
                <h2 className="auth-mode-title">이메일 인증 확인</h2>
                <p className="auth-desc">이메일 인증 링크를 확인하고 있습니다...</p>
              </div>
            ) : verifyEmailStatus === 'success' ? (
              <>
                <div className="auth-badge-status success" style={{ marginBottom: '12px' }}>인증 완료</div>
                <h2 className="auth-mode-title" style={{ fontSize: '1.45rem', marginBottom: '12px' }}>
                  이메일 인증이 완료되었습니다
                </h2>
                <p className="auth-desc" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
                  링커엑스 회원가입을 위한 이메일 인증이 성공적으로 완료되었습니다.<br />
                  아래 <strong>[링커엑스로 돌아가기]</strong>를 눌러 회원사 등록 및 다음 절차를 진행해 주세요.
                </p>

                {verifiedTargetEmail && (
                  <div className="auth-user-info-box" style={{ marginBottom: '24px' }}>
                    <p><strong>인증 완료 계정:</strong> {verifiedTargetEmail} <span className="auth-verified-tag">인증됨</span></p>
                  </div>
                )}

                <div className="auth-action-stack">
                  <button
                    type="button"
                    className="auth-btn-primary"
                    style={{ minHeight: '48px', fontSize: '1rem', fontWeight: 700 }}
                    onClick={handleReturnToLinkerX}
                  >
                    링커엑스로 돌아가기
                  </button>
                </div>

                {/* 제품 소개 및 브랜드 푸터 (인증 버튼과 명확히 구분된 하단 카드) */}
                <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                    링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                    수주 접수부터 물류 상차, 전자 매출전표 발행, 실시간 배송 및 재고 마감까지 한곳에서 관리하는 통합 물류 솔루션입니다.
                  </p>
                </div>
              </>
            ) : verifyEmailStatus === 'expired' ? (
              <>
                <div className="auth-badge-status failure" style={{ marginBottom: '12px' }}>링크 만료</div>
                <h2 className="auth-mode-title">인증 링크 만료</h2>
                <div className="auth-msg error" role="alert" style={{ margin: '16px 0' }}>
                  해당 인증 링크는 유효 시간이 만료되었습니다. 보안을 위해 링커엑스 로그인 화면에서 인증 메일을 재발송해 주세요.
                </div>
                <div className="auth-action-stack" style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="auth-btn-primary"
                    onClick={handleReturnToLinkerX}
                  >
                    링커엑스 로그인으로 돌아가기
                  </button>
                </div>
              </>
            ) : verifyEmailStatus === 'invalid' ? (
              <>
                <div className="auth-badge-status failure" style={{ marginBottom: '12px' }}>유효하지 않은 링크</div>
                <h2 className="auth-mode-title">인증 링크 확인 불가</h2>
                <div className="auth-msg error" role="alert" style={{ margin: '16px 0' }}>
                  이미 사용되었거나 유효하지 않은 인증 링크입니다. 링커엑스 로그인 화면에서 새 인증 링크를 요청해 주세요.
                </div>
                <div className="auth-action-stack" style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="auth-btn-primary"
                    onClick={handleReturnToLinkerX}
                  >
                    링커엑스 로그인으로 돌아가기
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-badge-status failure" style={{ marginBottom: '12px' }}>인증 오류</div>
                <h2 className="auth-mode-title">이메일 인증 오류</h2>
                <div className="auth-msg error" role="alert" style={{ margin: '16px 0' }}>
                  이메일 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
                </div>
                <div className="auth-action-stack" style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="auth-btn-primary"
                    onClick={handleReturnToLinkerX}
                  >
                    링커엑스 로그인으로 돌아가기
                  </button>
                </div>
              </>
            )}
          </>
        ) : !identity ? (
          <>
            {viewMode !== 'reset_password' && viewMode !== 'confirm_reset' && viewMode !== 'verify_email_result' && (
              <div className="auth-tabs dark-auth-tabs">
                <button
                  type="button"
                  className={`auth-tab dark-auth-tab ${viewMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setViewMode('login'); setMessage(''); }}
                >
                  <span>로그인</span>
                  {viewMode === 'login' && <div className="dark-tab-glow-bar" />}
                </button>
                <button
                  type="button"
                  className={`auth-tab dark-auth-tab ${viewMode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setViewMode('signup'); setMessage(''); }}
                >
                  <span>회원사 가입</span>
                  {viewMode === 'signup' && <div className="dark-tab-glow-bar" />}
                </button>
              </div>
            )}

            {viewMode === 'reset_password' ? (
              <>
                <h2 className="auth-mode-title">비밀번호 재설정</h2>
                <p className="auth-desc">
                  가입할 때 등록한 전체 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                </p>

                <form onSubmit={handlePasswordResetSubmit} className="auth-form">
                  <label>
                    가입 이메일 주소
                    <input
                      type="email"
                      name="resetEmail"
                      autoComplete="email"
                      required
                      placeholder="user@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <button type="submit" className="auth-btn-primary" disabled={busy}>
                    {busy ? '재설정 링크 발송 중...' : '재설정 링크 발송'}
                  </button>
                </form>

                <div className="auth-info-box" style={{ marginTop: '16px', fontSize: '0.84rem', color: '#475569', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>💡 안내 사항</div>
                  <div>• <strong>기존 비밀번호는 입력하실 필요가 없습니다.</strong></div>
                  <div>• Google 계정으로 가입하신 경우 비밀번호 재설정 대신 <strong>'Google 계정으로 계속'</strong>으로 로그인하시거나, <a href="https://accounts.google.com/signin/recovery" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Google 계정 복구</a>를 이용해 주세요.</div>
                  <div>• 비밀번호를 재설정하더라도 기존 계정의 데이터와 회사 소속, 권한은 그대로 안전하게 유지됩니다.</div>
                </div>

                <div className="auth-button-group" style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    className="auth-btn-secondary"
                    disabled={busy}
                    onClick={() => { setViewMode('login'); setMessage(''); }}
                  >
                    ← 로그인 화면으로 돌아가기
                  </button>
                </div>
              </>
            ) : viewMode === 'confirm_reset' ? (
              <>
                <h2 className="auth-mode-title">새 비밀번호 설정</h2>
                {resetCodeStatus === 'checking' && (
                  <p className="auth-desc">재설정 링크를 확인하는 중입니다...</p>
                )}
                {resetCodeStatus === 'expired' && (
                  <div className="auth-error-box" style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700 }}>⚠️ 비밀번호 재설정 링크 만료</p>
                    <p style={{ margin: 0 }}>해당 재설정 링크는 유효 시간이 만료되었습니다. 보안을 위해 새 재설정 링크를 요청해 주세요.</p>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      style={{ marginTop: '12px', width: '100%' }}
                      onClick={() => { setViewMode('reset_password'); setMessage(''); }}
                    >
                      비밀번호 재설정 다시 요청하기
                    </button>
                  </div>
                )}
                {resetCodeStatus === 'invalid' && (
                  <div className="auth-error-box" style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700 }}>⚠️ 유효하지 않거나 이미 사용된 링크</p>
                    <p style={{ margin: 0 }}>이 링크는 이미 사용되었거나 유효하지 않습니다. 비밀번호를 변경하려면 새 재설정 링크를 요청해 주세요.</p>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      style={{ marginTop: '12px', width: '100%' }}
                      onClick={() => { setViewMode('reset_password'); setMessage(''); }}
                    >
                      비밀번호 재설정 다시 요청하기
                    </button>
                  </div>
                )}
                {resetCodeStatus === 'valid' && (
                  <>
                    <p className="auth-desc">
                      <strong>{resetEmailTarget}</strong> 계정의 새 비밀번호를 입력해 주세요. (6자 이상)
                    </p>
                    <form onSubmit={handleConfirmPasswordResetSubmit} className="auth-form">
                      <label>
                        새 비밀번호
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          placeholder="새 비밀번호 (6자 이상)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        새 비밀번호 확인
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          placeholder="새 비밀번호 다시 입력"
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <button type="submit" className="auth-btn-primary" disabled={busy}>
                        {busy ? '새 비밀번호 저장 중...' : '새 비밀번호 저장'}
                      </button>
                    </form>
                  </>
                )}
                <div className="auth-button-group" style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    className="auth-btn-secondary"
                    disabled={busy}
                    onClick={() => { setViewMode('login'); setMessage(''); if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname); }}
                  >
                    링커엑스 로그인으로 돌아가기
                  </button>
                </div>
              </>
            ) : viewMode === 'login' ? (
              <>
                <form onSubmit={handleLogin} className="auth-form dark-auth-form">
                  <div className="dark-input-wrap">
                    <span className="dark-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder="이메일을 입력하세요"
                      value={form.email}
                      onChange={change}
                      className="dark-input"
                      disabled={busy}
                    />
                  </div>

                  <div className="dark-input-wrap">
                    <span className="dark-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      required
                      placeholder="비밀번호를 입력하세요"
                      value={form.password}
                      onChange={change}
                      className="dark-input"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="dark-toggle-eye"
                      onClick={() => setShowPassword(p => !p)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      tabIndex="-1"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="dark-form-utility-row">
                    <label className="dark-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="dark-checkbox"
                      />
                      <span>로그인 상태 유지</span>
                    </label>
                    <button
                      type="button"
                      className="dark-link-btn"
                      onClick={() => {
                        setViewMode('reset_password');
                        setMessage('');
                        setResetEmail(form.email?.trim() || '');
                      }}
                    >
                      비밀번호 찾기
                    </button>
                  </div>

                  <button type="submit" className="auth-btn-primary dark-btn-gradient-login" disabled={busy}>
                    <span>{busy ? '로그인 처리 중...' : '로그인'}</span>
                    <span className="dark-btn-arrow">→</span>
                  </button>
                </form>

                <div className="dark-divider">
                  <span>또는 간편 로그인</span>
                </div>

                <button
                  type="button"
                  className="auth-btn-google dark-btn-google"
                  disabled={busy}
                  onClick={() => handleGoogleAuth(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google로 로그인</span>
                </button>
              </>
            ) : (
              <>
                {/* 30일 무료 체험 프로모션 헤더 */}
                <div className="auth-trial-hero">
                  <div className="auth-badge-trial">✨ 30일 무료 체험 프로모션</div>
                  <h2 className="auth-trial-headline">주문부터 배송까지, 한 달 무료로 써보세요</h2>
                  <p className="auth-trial-sub">
                    주문 수집, 상차 검수, 모바일 현장 전표 발행까지 원스톱으로 처리하는 통합 물류 솔루션
                  </p>
                </div>

                {/* 3대 핵심 기능 실제 제품 화면 미니 프리뷰 */}
                <div className="auth-preview-grid">
                  {/* 1. 주문 통합 */}
                  <div className="auth-preview-card">
                    <div className="preview-card-header">
                      <div className="preview-card-title">📦 주문 통합 관리</div>
                      <span className="preview-card-tag">스마트 수주</span>
                    </div>
                    <p className="preview-card-desc">카톡·전화·엑셀 주문을 한곳에서 자동 집계하고 단가와 미수금을 실시간 연동합니다.</p>
                    <div className="preview-mini-screen">
                      <div className="mini-screen-header">
                        <span>수주서 ORD-2026-001</span>
                        <span className="mini-screen-badge mini-badge-blue">접수완료</span>
                      </div>
                      <div className="mini-screen-row">
                        <span>거래처</span>
                        <strong>남해낚시마트 (미수 120만원)</strong>
                      </div>
                      <div className="mini-screen-row">
                        <span>품목</span>
                        <span>동명 고급 크릴 1kg × 50개 (275,000원)</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 상차 체크 */}
                  <div className="auth-preview-card">
                    <div className="preview-card-header">
                      <div className="preview-card-title">🚚 상차 검수 체크</div>
                      <span className="preview-card-tag">모바일 실시간</span>
                    </div>
                    <p className="preview-card-desc">창고 재고 파악부터 배송 차량별 적재 수량을 현장에서 모바일로 즉시 대조합니다.</p>
                    <div className="preview-mini-screen">
                      <div className="mini-screen-header">
                        <span>1호 탑차 (부산80바1234)</span>
                        <span className="mini-screen-badge mini-badge-green">상차 100% 완료</span>
                      </div>
                      <div className="mini-screen-row">
                        <span>출고창고</span>
                        <span>메인냉동창고</span>
                      </div>
                      <div className="mini-screen-row">
                        <span>검수현황</span>
                        <strong>[✓] 크릴 50개 [✓] 각크릴 30개 적재</strong>
                      </div>
                    </div>
                  </div>

                  {/* 3. 현장 전표 발행 */}
                  <div className="auth-preview-card">
                    <div className="preview-card-header">
                      <div className="preview-card-title">🧾 현장 전표 발행</div>
                      <span className="preview-card-tag">원클릭 공유</span>
                    </div>
                    <p className="preview-card-desc">배송지 현장에서 즉시 전자 매출전표를 발행하고 문자나 카톡으로 명세서를 전송합니다.</p>
                    <div className="preview-mini-screen">
                      <div className="mini-screen-header">
                        <span>매출전표 INV-2026-001</span>
                        <span className="mini-screen-badge mini-badge-amber">발행완료</span>
                      </div>
                      <div className="mini-screen-row">
                        <span>공급가액 / 세액</span>
                        <span>250,000원 / 25,000원</span>
                      </div>
                      <div className="mini-screen-row">
                        <span>합계 / 전송</span>
                        <strong>275,000원 (카톡 명세서 전송)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 주요 액션 버튼: 회원사 무료 체험 신청 */}
                <button
                  type="button"
                  className="auth-btn-trial-main"
                  onClick={() => {
                    setSignupTarget('new_tenant');
                    const formEl = document.getElementById('signup-form-anchor');
                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  🚀 회원사 무료 체험 신청
                </button>

                {/* 가입 양식 (기존 이메일 인증 & 회사 정보 입력 연계) */}
                <div id="signup-form-anchor" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="auth-btn-google"
                    disabled={busy}
                    onClick={() => { setSignupTarget('new_tenant'); handleGoogleAuth(true); }}
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
                      {busy ? '가입 처리 중...' : '30일 무료 체험 가입하고 인증 메일 받기'}
                    </button>
                  </form>
                </div>

                <div className="auth-button-group" style={{ flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="auth-btn-text"
                    disabled={busy}
                    onClick={() => { setViewMode('login'); setMessage(''); }}
                  >
                    이미 계정이 있으신가요? 로그인
                  </button>
                  <button
                    type="button"
                    className="auth-btn-text"
                    style={{ fontSize: '0.82rem', color: '#64748b' }}
                    disabled={busy}
                    onClick={() => {
                      setSignupTarget('existing_tenant');
                      setVerifiedView('existing_tenant_form');
                      setMessage('기존 등록된 회원사의 직원 또는 거래처 정보를 입력해 주세요.');
                    }}
                  >
                    기존 회원사의 직원·거래처이신가요? 소속 신청
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

              <div className="auth-notice-text">
                * 새 회원사 신청은 링커엑스 슈퍼관리자가 검토 및 승인하며, 승인 시 내부 회사 식별 번호가 자동 발급됩니다.<br />
                * 이메일이 일치하더라도 기존 동명크릴 등 기존 회원사 계정에 자동 연결되지 않습니다.
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
        ) : regLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div className="auth-badge-status prod-verify" style={{ display: 'inline-block', marginBottom: '12px' }}>상태 확인 중</div>
            <h2 className="auth-mode-title">신청 상태 조회 중</h2>
            <p className="auth-desc">회원사 등록 및 승인 상태를 확인하고 있습니다...</p>
          </div>
        ) : regError ? (
          <>
            <div className="auth-badge-status failure">조회 실패</div>
            <h2 className="auth-mode-title">신청 상태 조회</h2>
            <div className="auth-msg error" role="alert" style={{ margin: '16px 0' }}>
              {regError}
            </div>
            <p className="auth-desc" style={{ textAlign: 'center', marginBottom: '20px' }}>
              서버 연결 또는 네트워크 상태를 확인하신 후 다시 시도해 주세요.
            </p>
            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy || regLoading}
                onClick={() => checkRegistrationStatus()}
              >
                다시 시도
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
        ) : verifiedView === 'no_application' ? (
          <>
            <div className="auth-badge-status success">이메일 인증 완료</div>
            <h2 className="auth-mode-title">회원사 등록 신청 안내</h2>
            <div className="auth-user-info-box">
              <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>계정 UID:</strong> <code>{identity.uid}</code></p>
            </div>
            <p className="auth-desc" style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600, margin: '16px 0 8px 0', textAlign: 'center' }}>
              이메일 인증이 완료되었습니다. 회원사 등록을 신청해 주세요
            </p>
            <p className="auth-notice-text" style={{ textAlign: 'center', marginBottom: '20px' }}>
              새 회원사를 등록하시면 링커엑스 슈퍼관리자 검토 후 회사 관리자 권한이 부여됩니다.
            </p>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy}
                onClick={() => { setVerifiedView('new_tenant_form'); setMessage(''); }}
              >
                🏢 새 회원사 등록 신청
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
        ) : verifiedView === 'awaiting_tenant_approval' ? (
          /* ─────────────────────────────────────────────────────────────
              3-B. 회원사 등록 신청 완료 / 활성화 안내 화면
          ───────────────────────────────────────────────────────────── */
          regData?.status === 'approved' ? (
            /* 활성화 완료 상태: '회사 업무 시작' 버튼과 무료 이용 종료일 표시 */
            <>
              <div className="auth-badge-status success">회원사 활성화 완료</div>
              <h2 className="auth-mode-title">회원사 이용이 활성화되었습니다</h2>
              <p className="auth-desc">
                <strong>[{regData?.companyName || form.companyName || '등록 회원사'}]</strong>의 심사가 승인되어 정식 등록되었습니다.
              </p>

              <div className="auth-trial-active-box">
                <div className="auth-trial-active-title">🎉 첫 30일 무료 이용 혜택 시작</div>
                <div className="auth-trial-active-date">
                  무료 이용 종료일: {regData?.trialEndDate || '2026-12-20'} {regData?.trialDaysRemaining != null ? `(D-${regData.trialDaysRemaining})` : ''}
                </div>
                <p className="auth-trial-active-desc">
                  주문 통합 관리 · 실시간 상차 체크 · 모바일 현장 전표를 제한 없이 자유롭게 이용하세요.
                </p>
              </div>

              <div className="auth-user-info-box">
                <p><strong>회사명:</strong> {regData?.companyName || form.companyName || '미지정'} (ID: <code>{regData?.companyId || form.companyId}</code>)</p>
                <p><strong>대표자:</strong> {regData?.profile?.name || form.name} ({regData?.profile?.phone || form.phone})</p>
                <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
                <p><strong>계정 권한:</strong> <span className="auth-badge-status success" style={{ display: 'inline', padding: '2px 8px' }}>회사 관리자 (Admin)</span></p>
              </div>

              <div className="auth-action-stack">
                <button
                  type="button"
                  className="auth-btn-trial-main"
                  disabled={busy}
                  onClick={() => enter(regData.companyId)}
                >
                  🚀 회사 업무 시작
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
            /* 심사/승인 대기 상태: '회원사 등록 신청을 받았습니다' + 회사명 + '신청 상태 확인' 버튼 + '첫 30일 무료 이용' 시작 기준 안내 */
            <>
              <div className="auth-badge-status warning">등록 신청 접수 완료</div>
              <h2 className="auth-mode-title">회원사 등록 신청을 받았습니다</h2>
              <p className="auth-desc">
                신청 회사: <strong>[{regData?.companyName || form.companyName || form.companyId || '신규 회원사'}]</strong><br />
                링커엑스 슈퍼관리자가 등록 정보를 검토 중입니다. 심사가 완료되면 바로 업무를 시작할 수 있습니다.
              </p>

              <div className="auth-action-stack" style={{ margin: '14px 0 18px 0' }}>
                <button
                  type="button"
                  className="auth-btn-primary"
                  disabled={busy || regLoading}
                  onClick={() => checkRegistrationStatus()}
                >
                  {busy || regLoading ? '신청 상태 확인 중...' : '신청 상태 확인'}
                </button>
              </div>

              <div className="auth-user-info-box">
                <p><strong>신청 회사명:</strong> {regData?.companyName || form.companyName || '미지정'}</p>
                <p><strong>담당자(대표자):</strong> {regData?.profile?.name || form.name} ({regData?.profile?.phone || form.phone})</p>
                <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
                <p><strong>진행 상태:</strong> <span className="auth-badge-status warning" style={{ display: 'inline', padding: '2px 8px' }}>심사 대기 중</span></p>
              </div>

              {/* 하단: 첫 30일 무료 이용 안내 및 시작 기준 */}
              <div className="auth-trial-info-box">
                <div className="auth-trial-info-header">
                  <span>🎁</span>
                  <span>첫 30일 무료 이용 안내</span>
                </div>
                <ul className="auth-trial-rule-list">
                  <li className="auth-trial-rule-item">
                    <span className="rule-icon">📅</span>
                    <div>
                      <strong>시작 기준:</strong> 무료 이용 기간(30일)은 슈퍼관리자의 심사 완료 후 <u>회사 이용이 처음 활성화된 날</u>을 기준으로 기록 및 시작됩니다.
                    </div>
                  </li>
                  <li className="auth-trial-rule-item">
                    <span className="rule-icon">🛡️</span>
                    <div>
                      <strong>기간 보장:</strong> 동일 회사의 재신청이나 승인 재시도로 무료 이용 기간이 다시 시작(리셋)되지 않고, 활성화된 날로부터 30일간 안전하게 보장됩니다.
                    </div>
                  </li>
                  <li className="auth-trial-rule-item">
                    <span className="rule-icon">🚀</span>
                    <div>
                      <strong>활성화 후 즉시 시작:</strong> 승인 완료 즉시 [회사 업무 시작] 버튼과 함께 잔여 무료 이용 기간이 제공됩니다.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="auth-action-stack">
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
          )
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

      {/* 3. 하단 3대 핵심 특징 섹션 (우주-지구 네트워크 배경 위 3단 바) */}
      {!identity && (viewMode === 'login' || viewMode === 'signup') && (
        <div className="dark-features-bar">
          <div className="dark-feature-item">
            <div className="dark-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 12 12 17 22 12" />
                <polyline points="2 17 12 22 22 17" />
              </svg>
            </div>
            <div className="dark-feature-text">
              <span>주문부터 배송까지</span>
              <strong>한 번에</strong>
            </div>
          </div>

          <div className="dark-feature-divider" />

          <div className="dark-feature-item">
            <div className="dark-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="dark-feature-text">
              <span>상차·재고를</span>
              <strong>실시간으로</strong>
            </div>
          </div>

          <div className="dark-feature-divider" />

          <div className="dark-feature-item">
            <div className="dark-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="18" y="10" width="4" height="11" rx="1" />
                <rect x="11" y="4" width="4" height="17" rx="1" />
                <rect x="4" y="14" width="4" height="7" rx="1" />
              </svg>
            </div>
            <div className="dark-feature-text">
              <span>누락·오배송을</span>
              <strong>최소화</strong>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
