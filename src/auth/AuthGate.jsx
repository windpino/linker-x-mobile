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
        // Condition C: 승인 완료이고 권한 확인되면, 회사 ID를 다시 입력하지 않고 승인된 회사로 자동 입장
        await enter(res.companyId);
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
    <main className="auth-shell">
      <section className="auth-card">
        <h1>링커엑스</h1>
        <p className="auth-subtext">내 계정으로 인증하고, 승인받은 회사에서 업무를 시작하세요.</p>

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
                    disabled={busy}
                    onClick={() => {
                      setViewMode('reset_password');
                      setMessage('');
                      setResetEmail(form.email?.trim() || '');
                    }}
                  >
                    비밀번호 재설정
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="auth-mode-title">회원가입</h2>
                <div className="auth-pill-selector">
                  <button
                    type="button"
                    className={`auth-pill ${signupTarget === 'new_tenant' ? 'active' : ''}`}
                    onClick={() => setSignupTarget('new_tenant')}
                  >
                    🏢 새 회원사(대표)
                  </button>
                  <button
                    type="button"
                    className={`auth-pill ${signupTarget === 'existing_tenant' ? 'active' : ''}`}
                    onClick={() => setSignupTarget('existing_tenant')}
                  >
                    👥 기존 회원사(직원/거래처)
                  </button>
                </div>

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
                    {busy ? '가입 처리 중...' : '가입하고 인증 메일 받기'}
                  </button>
                </form>

                <div className="auth-button-group" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="auth-btn-text"
                    disabled={busy}
                    onClick={() => { setViewMode('login'); setMessage(''); }}
                  >
                    이미 계정이 있으신가요? 로그인
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
              3-B. 새 회원사 등록 신청 완료: 슈퍼관리자 승인 대기
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">회원사 승인 대기</div>
            <h2 className="auth-mode-title">회원사 승인 대기</h2>
            <p className="auth-desc">
              신규 회원사 <strong>[{regData?.companyName || form.companyName || form.companyId}]</strong> 등록 신청이 접수되었습니다.<br />
              새 회원사 신청은 <strong>링커엑스 슈퍼관리자</strong>가 검토 및 승인합니다. 승인 전에는 회사 업무 데이터에 접근할 수 없습니다.
            </p>

            <div className="auth-user-info-box">
              <p><strong>회사명:</strong> {regData?.companyName || form.companyName || '미지정'} (ID: <code>{regData?.companyId || form.companyId}</code>)</p>
              <p><strong>대표자:</strong> {regData?.profile?.name || form.name} ({regData?.profile?.phone || form.phone})</p>
              <p><strong>신청 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>승인 상태:</strong> <span className="auth-badge-status warning" style={{ display: 'inline', padding: '2px 8px' }}>접수 완료 · 검토 중</span></p>
            </div>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy || regLoading}
                onClick={() => checkRegistrationStatus()}
              >
                {busy || regLoading ? '승인 상태 확인 중...' : '슈퍼관리자 승인 확인 후 입장'}
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
