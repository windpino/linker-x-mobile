import React, { useCallback, useEffect, useState, useRef } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db, authTargetMode } from '../firebase';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { login, register, googleLogin, linkGoogleAccount, linkExistingEmailAccountWithGoogleCredential, verifyEmail, resetPassword, verifyResetCode, confirmResetPassword, applyEmailVerification, verifyActionCode, refreshIdentity, logout, callAuth, initDongmyeongSampleData, deleteCurrentAccountAndAllData } from './client';
import { clearLegacyCredentials, withoutSecrets } from './sanitize';
import './auth.css';
import MembershipAdmin from './MembershipAdmin';
import { prepareSessionScope, clearSessionScope } from './sessionScope';
import LegalDocumentModal from '../components/common/LegalDocumentModal';
import { PRIVACY_POLICY_TEXT, PRIVACY_POLICY_VERSION } from '../constants/legalDocuments';

const PENDING_SIGNUP_FLOW_KEY = 'lx_pending_signup_flow';
const PENDING_SIGNUP_TTL_MS = 24 * 60 * 60 * 1000;

function savePendingSignupFlow(email, target = 'new_tenant', verified = false) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return;
    const safeTarget = target === 'existing_tenant' ? 'existing_tenant' : 'new_tenant';
    window.localStorage.setItem(
      PENDING_SIGNUP_FLOW_KEY,
      JSON.stringify({ email: cleanEmail, target: safeTarget, verified: Boolean(verified), at: Date.now() })
    );
  } catch {}
}

function readPendingSignupFlow(matchEmail) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUP_FLOW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || (Date.now() - Number(parsed.at || 0)) > PENDING_SIGNUP_TTL_MS) {
      window.localStorage.removeItem(PENDING_SIGNUP_FLOW_KEY);
      return null;
    }
    if (matchEmail && parsed.email !== String(matchEmail).trim().toLowerCase()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearPendingSignupFlow() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(PENDING_SIGNUP_FLOW_KEY);
  } catch {}
}

function PartnerOrders({session}) {
  const [tab, setTab] = useState('orders'); // 'orders' | 'new_order' | 'invoices'
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const orderSnap = await getDocs(query(
        collection(db, 'companies', session.companyId, 'partnerOrders'),
        where('companyId', '==', session.companyId),
        where('partnerId', '==', session.partnerId)
      )).catch(() => ({ docs: [] }));
      
      const localOrders = JSON.parse(localStorage.getItem(`partnerOrders_${session.companyId}`) || '[]');
      const filteredLocal = localOrders.filter(o => o.partnerId === session.partnerId);
      const combined = [...orderSnap.docs.map(d => ({ id: d.id, ...d.data() })), ...filteredLocal];
      const map = new Map();
      combined.forEach(o => map.set(o.id || o.orderNo, o));
      setOrders(Array.from(map.values()));

      // 공유 전표 조회 (자기 partnerId만 격리)
      const allInvoices = JSON.parse(localStorage.getItem(`salesInvoices_${session.companyId}`) || '[]');
      const myInvoices = allInvoices.filter(inv => inv.partnerId === session.partnerId || inv.partnerName === session.partnerName);
      setInvoices(myInvoices);
    } catch {
      setError('주문 내역을 조회하지 못했습니다.');
    }
  }, [session.companyId, session.partnerId, session.partnerName]);

  useEffect(() => { load(); }, [load]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!item.trim()) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const newOrder = {
        id: `PORD-${Date.now()}`,
        orderNo: `PORD-${Date.now()}`,
        companyId: session.companyId,
        partnerId: session.partnerId,
        partnerName: session.partnerName || session.name || '거래처',
        items: [{ description: item.trim(), qty: Number(qty) || 1 }],
        note: note.trim(),
        status: '접수완료',
        createdAt: new Date().toISOString()
      };
      try {
        await addDoc(collection(db, 'companies', session.companyId, 'partnerOrders'), {
          ...newOrder,
          createdAt: serverTimestamp()
        });
      } catch {}
      const localOrders = JSON.parse(localStorage.getItem(`partnerOrders_${session.companyId}`) || '[]');
      localOrders.unshift(newOrder);
      localStorage.setItem(`partnerOrders_${session.companyId}`, JSON.stringify(localOrders));

      // 공급사 수주 관리(salesOrders) 연동
      const supplierOrders = JSON.parse(localStorage.getItem(`salesOrders_${session.companyId}`) || '[]');
      supplierOrders.unshift({
        id: newOrder.id,
        orderNo: newOrder.orderNo,
        partnerId: session.partnerId,
        partnerName: session.partnerName || session.name || '거래처',
        productName: item.trim(),
        qty: Number(qty) || 1,
        price: 0,
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        status: '주문완료',
        note: note.trim(),
        source: '거래처주문포털',
        companyId: session.companyId
      });
      localStorage.setItem(`salesOrders_${session.companyId}`, JSON.stringify(supplierOrders));

      setItem('');
      setQty(1);
      setNote('');
      setMsg('주문이 정상적으로 공급사에 접수되었습니다.');
      setTab('orders');
      await load();
    } catch {
      setError('주문을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell dark-theme">
      <div className="dark-auth-header">
        <img
          src="/assets/linker-x-horizontal.png"
          alt="Linker X"
          className="dark-brand-logo-img"
        />
      </div>

      <section className="auth-card dark-glass" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              거래처 전용 주문 포털
            </span>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '6px 0 2px 0', fontWeight: 800 }}>
              {session.companyName || session.companyId} · 주문 포털
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              주문 거래처: <strong>{session.partnerName || session.name || session.partnerId}</strong> ({session.email})
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            로그아웃
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="dark-pill-selector" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`dark-pill ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            📦 주문 & 배송 상태 ({orders.length})
          </button>
          <button
            type="button"
            className={`dark-pill ${tab === 'new_order' ? 'active' : ''}`}
            onClick={() => setTab('new_order')}
          >
            ✏️ 새 주문 작성
          </button>
          <button
            type="button"
            className={`dark-pill ${tab === 'invoices' ? 'active' : ''}`}
            onClick={() => setTab('invoices')}
          >
            🧾 공유 전표 ({invoices.length})
          </button>
        </div>

        {error && <div className="auth-badge-status failure" style={{ marginBottom: '12px' }}>{error}</div>}
        {msg && <div className="auth-badge-status prod-verify" style={{ marginBottom: '12px' }}>{msg}</div>}

        {/* 탭 1: 새 주문 작성 */}
        {tab === 'new_order' && (
          <form onSubmit={handleSubmitOrder} className="dark-auth-form">
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                주문 품목 및 규격
              </label>
              <div className="dark-input-wrap">
                <input
                  required
                  placeholder="예: 동명 고급 크릴 1kg 또는 각크릴 블록"
                  value={item}
                  onChange={e => setItem(e.target.value)}
                  className="dark-input"
                  style={{ paddingLeft: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  수량
                </label>
                <div className="dark-input-wrap">
                  <input
                    type="number"
                    min="1"
                    required
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    className="dark-input"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  배송 요청사항 / 메모
                </label>
                <div className="dark-input-wrap">
                  <input
                    placeholder="예: 내일 오전 8시 전 배송 부탁드립니다"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="dark-input"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="auth-btn-primary dark-btn-gradient-login" disabled={busy}>
              <span>{busy ? '주문 전송 중...' : '공급사에 주문 전송'}</span>
              <span className="dark-btn-arrow">→</span>
            </button>
          </form>
        )}

        {/* 탭 2: 주문 내역 & 배송 상태 */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                접수된 주문 내역이 없습니다. [새 주문 작성] 탭에서 주문을 보내보세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                {orders.map(o => (
                  <div key={o.id || o.orderNo} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 700 }}>
                        {o.items?.map(i => `${i.description} (${i.qty}개)`).join(', ') || o.productName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        주문번호: <code>{o.orderNo || o.id}</code> · {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : (o.date || '')}
                        {o.note && <span> · 메모: {o.note}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: o.status === '배송완료' ? 'rgba(16, 185, 129, 0.2)' : o.status === '상차준비' || o.status === '출하준비' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: o.status === '배송완료' ? '#34d399' : o.status === '상차준비' || o.status === '출하준비' ? '#fbbf24' : '#38bdf8'
                    }}>
                      {o.status || '접수완료'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 3: 공유 전표 내역 */}
        {tab === 'invoices' && (
          <div>
            {invoices.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                공유된 매출 전표 내역이 없습니다. 공급사가 전표를 발행하면 이곳에 안전하게 표시됩니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                {invoices.map(inv => (
                  <div key={inv.id || inv.invoiceNo} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 700 }}>
                        {inv.invoiceNo || '전자매출전표'} · {Number(inv.totalAmount || 0).toLocaleString()}원
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        일자: {inv.date} · 공급가액: {Number(inv.supplyAmount || 0).toLocaleString()}원 · 세액: {Number(inv.vatAmount || 0).toLocaleString()}원
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                      발행완료
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.76rem', color: '#64748b', textAlign: 'center' }}>
          * 본 포털은 귀하의 사업장 주문 및 배송 현황만 조회되며, 공급사의 내부 원가·재고 및 타 매장 자료는 엄격히 격리 차단됩니다.
        </div>
      </section>
    </main>
  );
}

export default function AuthGate({children}) {
  const [identity, setIdentity] = useState(null);
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  sessionRef.current = session;
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'error' | 'success' | 'warning'

  // Unauthenticated view mode: 'login' | 'signup' | 'reset_password' | 'confirm_reset' | 'verify_email_result'
  const [viewMode, setViewMode] = useState('login');
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  // Signup target type: 'new_tenant' (새 회원사 등록) | 'existing_tenant' (기존 회원사 소속 신청)
  const [signupTarget, setSignupTarget] = useState('new_tenant');
  const signupTargetRef = useRef(signupTarget);
  signupTargetRef.current = signupTarget;
  const autoVerifyHandledRef = useRef(false);
  const verifyRedirectTimerRef = useRef(null);

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

  // Workspaces and pending invitations
  const [workspaces, setWorkspaces] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);

  // Google provider account link modal
  const [accountLinkModal, setAccountLinkModal] = useState({
    isOpen: false,
    email: '',
    password: '',
    pendingCredential: null,
    error: '',
    busy: false
  });

  // Authenticated & verified sub-view:
  // 'company_login' | 'workspace_selector' | 'new_tenant_form' | 'existing_tenant_form' | 'awaiting_tenant_approval' | 'awaiting_member_approval' | 'no_application'
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
    representativeEmail: '',
    contactId: 'primary',
    role: 'tenant_staff'
  });
  const [requestedCompanyInfo, setRequestedCompanyInfo] = useState({ name: '', email: '', companyId: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [tenantPrivacyAgreed, setTenantPrivacyAgreed] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

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
      const mockUser = typeof window !== 'undefined' ? window.__mockFirebaseUser : null;
      const activeUser = mockUser || u;
      
      if (!activeUser) {
        autoVerifyHandledRef.current = false;
        clearSessionScope();
        localStorage.removeItem('currentUser');
        setIdentity(null);
        setSession(null);
        setBusy(false);
        return;
      }

      if (!mockUser && !activeUser.emailVerified && typeof activeUser.reload === 'function') {
        try {
          await activeUser.reload();
        } catch {}
      }

      const isEmailVerified = activeUser.emailVerified === true;
      if (!isEmailVerified) {
        autoVerifyHandledRef.current = false;
      }
      const nextIdentity = {
        uid: activeUser.uid,
        email: activeUser.email,
        emailVerified: isEmailVerified,
        displayName: activeUser.displayName
      };
      setIdentity(nextIdentity);
      setBusy(false);

      // 이미 해당 사용자의 세션이 활성화되어 있다면 세션을 유지하고 중복 루프 방지
      if (sessionRef.current && sessionRef.current.authUid === activeUser.uid && (sessionRef.current.companyId || sessionRef.current.role)) {
        return;
      }

      const currentStored = (() => {
        try {
          return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch {
          return null;
        }
      })();

      const deletedIds = (() => {
        try {
          return JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
        } catch {
          return [];
        }
      })();

      if (currentStored && currentStored.authUid === activeUser.uid && (currentStored.companyId || currentStored.role) && !deletedIds.includes(currentStored.companyId)) {
        await enter(currentStored.companyId);
        return;
      }

      setForm(f => ({
        ...f,
        password: '',
        passwordConfirm: '',
        email: activeUser?.email || f.email,
        name: activeUser?.displayName || f.name
      }));

      if (isEmailVerified) {
        if (viewModeRef.current === 'verify_email_result' || autoVerifyHandledRef.current) {
          return;
        }
        const isPlatform = await resolvePlatformAdmin(activeUser);
        if (!isPlatform) {
          await loadUserWorkspacesAndInvites(activeUser);
        } else {
          clearPendingSignupFlow();
        }
      }
    });
  }, []);

  // Enter company workspace after verifying approved server session
  const enter = async (overrideCompanyId, options = {}) => {
    const targetCid = (overrideCompanyId || form.companyId || '').trim();
    if (!targetCid) {
      showMsg('입장할 회사 ID를 확인해 주세요.', 'error');
      return false;
    }
    setBusy(true);
    showMsg('');
    try {
      const verifiedUser = (typeof window !== 'undefined' && window.__mockFirebaseUser) || auth.currentUser;
      const isVerified = verifiedUser?.emailVerified === true;
      if (!isVerified) {
        showMsg('회사 입장 전 이메일 인증이 필요합니다.', 'error');
        setIdentity(prev => prev ? ({ ...prev, emailVerified: false }) : null);
        return false;
      }
      let approved;
      try {
        approved = withoutSecrets(await callAuth('authSession', { companyId: targetCid }));
      } catch (firstErr) {
        if (options.retryOnce) {
          await new Promise(resolve => setTimeout(resolve, 500));
          approved = withoutSecrets(await callAuth('authSession', { companyId: targetCid }));
        } else {
          throw firstErr;
        }
      }
      await prepareSessionScope(approved);
      localStorage.setItem('currentUser', JSON.stringify(approved));
      setSession(approved);
      return true;
    } catch {
      localStorage.removeItem('currentUser');
      showMsg('회사 소속 승인이 완료되지 않았거나 등록된 소속이 없습니다. 관리자 승인을 확인해 주세요. (미승인 계정은 업무 데이터에 접근할 수 없습니다)', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Load user's accessible workspaces and pending invitations
  const loadUserWorkspacesAndInvites = useCallback(async (targetUser, options = {}) => {
    const u = targetUser || auth.currentUser;
    const isVerified = u?.emailVerified === true;
    if (!u || !isVerified) return;

    setRegLoading(true);
    setRegError(null);
    try {
      let res = await callAuth('getMyWorkspaces');
      let ws = res.workspaces || [];
      const invs = res.pendingInvitations || [];

      // windpino@naver.com 마스터 계정이 기기 이동(데스크탑/모바일) 등으로 로컬 소속이 비어있는 경우, 동명크릴 자동 복구 및 입장 보장
      if (ws.length === 0 && (u.email || '').toLowerCase().trim() === 'windpino@naver.com') {
        try {
          initDongmyeongSampleData(u.uid, u.email, true);
          const retryRes = await callAuth('getMyWorkspaces');
          if (retryRes.workspaces?.length > 0) {
            ws = retryRes.workspaces;
          }
        } catch (seedErr) {
          console.warn('windpino@naver.com auto-seed fallback:', seedErr);
        }
      }

      setWorkspaces(ws);
      setPendingInvitations(invs);

      // 1) 단일 소속 & 대기 초대 없음 -> 즉시 해당 워크스페이스로 자동 입장!
      if (ws.length === 1 && invs.length === 0) {
        clearPendingSignupFlow();
        await enter(ws[0].companyId);
        return;
      }

      // 2) 다중 소속이거나 대기 초대가 있으면 워크스페이스 선택 화면 노출!
      if (ws.length > 0 || invs.length > 0) {
        clearPendingSignupFlow();
        setVerifiedView('workspace_selector');
        return;
      }

      // 대기 중인 직원 연결 요청 확인
      try {
        const storedReqs = JSON.parse(localStorage.getItem('dev_staff_connections') || '[]');
        const myReq = storedReqs.find(r => r.uid === u.uid && r.status === 'pending');
        if (myReq) {
          setRequestedCompanyInfo({
            name: myReq.companyName || '신청 회사',
            email: myReq.representativeEmail,
            companyId: myReq.companyId
          });
          setVerifiedView('awaiting_staff_connection');
          return;
        }
      } catch (e) {
        console.warn('Error reading dev_staff_connections:', e);
      }

      // 3) 소속이 없는 경우: 기존 등록 신청 상태 확인
      const reg = await callAuth('getMyRegistrationStatus');
      setRegData(reg);
      if (reg.companyId || reg.status === 'approved') {
        clearPendingSignupFlow();
        // 즉시 해당 회사 작업공간으로 자동 입장 (승인 대기 화면 제거)
        await enter(reg.companyId);
        return;
      } else if (reg.status === 'rejected') {
        setVerifiedView('registration_rejected');
        showMsg(reg.reason || '회원사 등록 신청이 반려되었습니다.', 'error');
      } else {
        const pendingFlow = readPendingSignupFlow(u.email);
        const resolvedTarget = options.preferNewTenant
          ? 'new_tenant'
          : (pendingFlow?.target || signupTargetRef.current || 'new_tenant');
        if (resolvedTarget === 'existing_tenant' && !options.preferNewTenant) {
          setVerifiedView('existing_tenant_form');
          showMsg(options.successMessage || '이메일 인증이 완료되었습니다! 연결할 회사의 대표 이메일을 입력해 주세요.', 'success');
        } else {
          // 완전 신규 또는 회원사 추가 정보 미입력: 회원사 추가 정보 입력 화면으로 자동 안내
          setVerifiedView('new_tenant_form');
          showMsg(options.successMessage || '인증 완료! 회원사 정보를 입력해 주세요.', 'success');
        }
      }
    } catch (err) {
      console.error('[loadUserWorkspacesAndInvites error]', err);
      // fallback
      await checkRegistrationStatus(u, options);
    } finally {
      setRegLoading(false);
    }
  }, []);

  // Query registration status by UID from the server
  const checkRegistrationStatus = useCallback(async (targetUser, options = {}) => {
    const u = targetUser || auth.currentUser;
    if (!u || !u.emailVerified) return;

    setRegLoading(true);
    setRegError(null);
    try {
      const res = await callAuth('getMyRegistrationStatus');
      setRegData(res);
      if ((res.status === 'approved' || res.status === 'pending') && res.companyId) {
        clearPendingSignupFlow();
        // 승인 대기 화면 없이 즉시 회사 작업공간 입장
        await enter(res.companyId);
        return;
      } else if (res.status === 'rejected') {
        setVerifiedView('registration_rejected');
        showMsg(res.reason || '회원사 등록 신청이 반려되었습니다. 관리자에게 문의해 주세요.', 'error');
      } else {
        const pendingFlow = readPendingSignupFlow(u.email);
        const resolvedTarget = options.preferNewTenant
          ? 'new_tenant'
          : (pendingFlow?.target || signupTargetRef.current || 'new_tenant');
        if (resolvedTarget === 'existing_tenant' && !options.preferNewTenant) {
          setVerifiedView('existing_tenant_form');
          showMsg(options.successMessage || '이메일 인증이 완료되었습니다! 연결할 회사의 대표 이메일을 입력해 주세요.', 'success');
        } else {
          setVerifiedView('new_tenant_form');
          showMsg(options.successMessage || '인증 완료! 회원사 정보를 입력해 주세요.', 'success');
        }
      }
    } catch {
      const pendingFlow = readPendingSignupFlow(u.email);
      const hasStoredSession = Boolean(localStorage.getItem('currentUser'));
      if (options.preferNewTenant || pendingFlow || !hasStoredSession) {
        setRegError(null);
        if (pendingFlow?.target === 'existing_tenant' && !options.preferNewTenant) {
          setVerifiedView('existing_tenant_form');
          showMsg('이메일 인증이 완료되었습니다! 연결할 회사의 대표 이메일을 입력해 주세요.', 'info');
        } else {
          setVerifiedView('new_tenant_form');
          showMsg(options.successMessage || '인증 완료! 회원사 정보를 입력해 주세요.', 'success');
        }
      } else {
        // 조회 실패는 "신청 상태를 불러오지 못했습니다"와 [다시 시도]로 안내
        setRegError('신청 상태를 불러오지 못했습니다');
      }
    } finally {
      setRegLoading(false);
    }
  }, []);

  const proceedAfterEmailVerified = async (targetUser, preferredTarget) => {
    const u = targetUser || auth.currentUser;
    if (!u || !u.emailVerified) return false;

    setRegError(null);
    setIdentity({
      uid: u.uid,
      email: u.email,
      emailVerified: true,
      displayName: u.displayName
    });
    setForm(f => ({
      ...f,
      password: '',
      passwordConfirm: '',
      email: u.email || f.email,
      name: u.displayName || f.name
    }));

    const pendingFlow = readPendingSignupFlow(u.email);
    const target = preferredTarget || pendingFlow?.target || signupTargetRef.current || 'new_tenant';

    const isPlatform = await resolvePlatformAdmin(u);
    if (isPlatform) {
      clearPendingSignupFlow();
      return true;
    }

    if (target === 'existing_tenant') {
      const repEmail = (formRef.current.representativeEmail || '').trim();
      if (repEmail) {
        try {
          showMsg('대표 이메일로 회사를 조회하여 직원 연결을 요청하는 중입니다...', 'info');
          const reqRes = await callAuth('requestStaffConnection', {
            representativeEmail: repEmail
          });
          setRequestedCompanyInfo({
            name: reqRes.companyName || '신청 회사',
            email: repEmail,
            companyId: reqRes.companyId
          });
          clearPendingSignupFlow();
          setVerifiedView('awaiting_staff_connection');
          if (reqRes.alreadyLinked) {
            showMsg('이미 해당 회사에 연결되어 있습니다. 워크스페이스로 입장합니다!', 'success');
            await enter(reqRes.companyId);
          } else {
            showMsg(`[${reqRes.companyName || '회사'}] 관리자에게 직원 연결 요청이 성공적으로 전달되었습니다. 관리자 승인을 기다려 주세요.`, 'success');
          }
          return true;
        } catch (reqErr) {
          showMsg('직원 연결 요청 실패: ' + (reqErr.message || '대표 이메일을 확인해 주세요.'), 'error');
          setVerifiedView('existing_tenant_form');
          return true;
        }
      }
      setVerifiedView('existing_tenant_form');
      showMsg('이메일 인증이 완료되었습니다! 연결할 회사의 대표 이메일을 입력해 주세요.', 'success');
      return true;
    }

    await loadUserWorkspacesAndInvites(u, {
      preferNewTenant: true,
      successMessage: '인증 완료! 회원사 정보를 입력해 주세요.'
    });
    return true;
  };

  // Auto-detect email verification completion while waiting on the verification screen
  useEffect(() => {
    if (!identity || identity.emailVerified || viewMode === 'verify_email_result') return;
    if (typeof window !== 'undefined' && window.__mockFirebaseUser) return;

    let active = true;
    let checking = false;

    const checkNow = async () => {
      if (!active || checking || autoVerifyHandledRef.current || !auth.currentUser) return;
      checking = true;
      try {
        await auth.currentUser.reload();
        if (!active || !auth.currentUser?.emailVerified) return;
        autoVerifyHandledRef.current = true;
        const refreshed = await refreshIdentity();
        if (!active) return;
        const activeUser = refreshed || auth.currentUser;
        if (activeUser?.emailVerified) {
          savePendingSignupFlow(activeUser.email, signupTargetRef.current, true);
          await proceedAfterEmailVerified(activeUser, signupTargetRef.current);
        } else {
          autoVerifyHandledRef.current = false;
        }
      } catch {
        autoVerifyHandledRef.current = false;
      } finally {
        checking = false;
      }
    };

    const timer = setInterval(checkNow, 3000);
    const onFocus = () => { checkNow(); };
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkNow();
      }
    };
    window.addEventListener('focus', onFocus);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [identity?.uid, identity?.emailVerified, viewMode]);

  // Check URL parameters for Firebase action codes (e.g. password reset, email verification)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const emailVerifiedFlag = urlParams.get('emailVerified');
    const urlSignupTarget = urlParams.get('signupTarget') === 'existing_tenant' ? 'existing_tenant' : 'new_tenant';

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
      let mounted = true;
      setViewMode('verify_email_result');
      setVerifyEmailStatus('checking');

      (async () => {
        let checkedEmail = '';
        try {
          const info = await verifyActionCode(oobCode);
          checkedEmail = info?.data?.email || '';
          if (mounted && checkedEmail) setVerifiedTargetEmail(checkedEmail);
        } catch {}

        try {
          await applyEmailVerification(oobCode);
          if (!mounted) return;
          if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setVerifyEmailStatus('success');

          autoVerifyHandledRef.current = true;
          const refreshed = await refreshIdentity();
          if (!mounted) return;

          const activeUser = refreshed || auth.currentUser;
          const emailForFlow = checkedEmail || activeUser?.email || readPendingSignupFlow()?.email || '';
          const flowTarget = urlParams.get('signupTarget') === 'existing_tenant'
            ? 'existing_tenant'
            : (readPendingSignupFlow(emailForFlow)?.target || signupTargetRef.current || 'new_tenant');

          if (emailForFlow) {
            savePendingSignupFlow(emailForFlow, flowTarget, true);
          }

          verifyRedirectTimerRef.current = setTimeout(async () => {
            verifyRedirectTimerRef.current = null;
            if (!mounted) return;
            setViewMode('login');
            if (activeUser?.emailVerified) {
              await proceedAfterEmailVerified(activeUser, flowTarget);
            } else {
              autoVerifyHandledRef.current = false;
              if (emailForFlow) {
                setForm(f => ({ ...f, email: emailForFlow, password: '', passwordConfirm: '' }));
              }
              showMsg('이메일 인증이 완료되었습니다! 로그인하시면 회원사 추가 정보 입력 화면으로 자동 이동합니다.', 'success');
            }
          }, 800);
        } catch (err) {
          if (!mounted) return;
          if (err.code === 'auth/expired-action-code') {
            setVerifyEmailStatus('expired');
          } else if (err.code === 'auth/invalid-action-code') {
            setVerifyEmailStatus('invalid');
          } else {
            setVerifyEmailStatus('failed');
          }
        }
      })();

      return () => {
        mounted = false;
        if (verifyRedirectTimerRef.current) {
          clearTimeout(verifyRedirectTimerRef.current);
          verifyRedirectTimerRef.current = null;
        }
      };
    } else if (emailVerifiedFlag === '1') {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setSignupTarget(urlSignupTarget);
      (async () => {
        autoVerifyHandledRef.current = true;
        const refreshed = await refreshIdentity();
        const activeUser = refreshed || auth.currentUser;
        if (activeUser?.emailVerified) {
          savePendingSignupFlow(activeUser.email, urlSignupTarget, true);
          setViewMode('login');
          await proceedAfterEmailVerified(activeUser, urlSignupTarget);
        } else {
          autoVerifyHandledRef.current = false;
          const pending = readPendingSignupFlow();
          if (pending?.email) {
            savePendingSignupFlow(pending.email, urlSignupTarget, true);
            setForm(f => ({ ...f, email: f.email || pending.email }));
          }
          setViewMode('login');
          showMsg('이메일 인증이 완료되었습니다! 로그인하시면 회원사 추가 정보 입력 화면으로 자동 이동합니다.', 'success');
        }
      })();
    }
  }, []);

  // 승인 대기 화면 제거: awaiting_tenant_approval 진입 시 즉시 회사로 입장하거나 등록 폼으로 전환
  useEffect(() => {
    if (verifiedView === 'awaiting_tenant_approval') {
      if (regData?.companyId) {
        enter(regData.companyId);
      } else {
        setVerifiedView('new_tenant_form');
      }
    }
  }, [verifiedView, regData?.companyId]);

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
      await login(email, pw, rememberMe);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      // onIdTokenChanged가 플랫폼 관리자 판별 및 워크스페이스 로딩을 안전하게 처리합니다.
    } catch (err) {
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showMsg('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        showMsg('유효하지 않은 이메일 형식입니다.', 'error');
      } else if (err.code === 'auth/too-many-requests') {
        showMsg('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'error');
      } else if (err.code === 'auth/network-request-failed') {
        const hint = authTargetMode === 'emulator'
          ? '로컬 인증 에뮬레이터(127.0.0.1:9099)에 연결할 수 없습니다. 에뮬레이터 실행 상태를 확인해 주세요.'
          : '네트워크 연결 오류가 발생했습니다. 인터넷 연결 상태를 확인해 주세요.';
        showMsg(hint, 'error');
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
      const result = await googleLogin(rememberMe);
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
        // onIdTokenChanged가 플랫폼 관리자 판별 및 워크스페이스 로딩을 안전하게 처리합니다.
      }
      return result;
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential' && err.pendingCredential) {
        setAccountLinkModal({
          isOpen: true,
          email: err.email || form.email,
          password: '',
          pendingCredential: err.pendingCredential,
          error: '',
          busy: false
        });
        showMsg('기존 이메일/비밀번호 계정이 확인되었습니다. 비밀번호를 입력하여 Google 로그인을 동일한 계정(동일 UID)으로 연결해 주세요.', 'info');
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        showMsg('브라우저의 팝업 차단이 활성화되어 있어 Google 인증 창이 열리지 않았습니다. 브라우저 주소창 우측에서 팝업을 허용해 주세요.', 'error');
        return;
      }
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        showMsg('Google 인증 창이 닫혔습니다.', 'info');
        return;
      }
      showMsg('Google 인증 실패: ' + (err.message || '인증에 실패했습니다.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmAccountLink = async (e) => {
    e.preventDefault();
    if (!accountLinkModal.password) {
      setAccountLinkModal(prev => ({ ...prev, error: '비밀번호를 입력해 주세요.' }));
      return;
    }
    setAccountLinkModal(prev => ({ ...prev, busy: true, error: '' }));
    try {
      await linkExistingEmailAccountWithGoogleCredential(
        accountLinkModal.email,
        accountLinkModal.password,
        accountLinkModal.pendingCredential
      );
      setAccountLinkModal({ isOpen: false, email: '', password: '', pendingCredential: null, error: '', busy: false });
      showMsg('Google 계정과 기존 계정이 성공적으로 하나로 연동되었습니다! (동일 UID)', 'success');
      const isPlatform = await resolvePlatformAdmin();
      if (!isPlatform) {
        await checkRegistrationStatus();
      }
    } catch (linkErr) {
      setAccountLinkModal(prev => ({
        ...prev,
        busy: false,
        error: linkErr.code === 'auth/wrong-password' || linkErr.code === 'auth/invalid-credential'
          ? '비밀번호가 올바르지 않습니다.'
          : (linkErr.message || '계정 연동에 실패했습니다.')
      }));
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
      savePendingSignupFlow(email, signupTarget, false);
      const { user, verificationSent, verificationError } = await register(email, pw, signupTarget);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
      if (verificationSent) {
        showMsg(`인증 메일이 ${user.email} 주소로 발송되었습니다. 메일함의 링크를 클릭하면 자동으로 회원사 추가 정보 입력 화면으로 이동합니다.`, 'success');
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
        const hint = authTargetMode === 'emulator'
          ? '로컬 인증 에뮬레이터(127.0.0.1:9099)에 연결할 수 없습니다. 에뮬레이터 실행 상태를 확인해 주세요.'
          : '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
        showMsg(hint, 'error');
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
    autoVerifyHandledRef.current = true;
    try {
      const refreshed = await refreshIdentity();
      if (refreshed?.emailVerified) {
        savePendingSignupFlow(refreshed.email, signupTargetRef.current, true);
        await proceedAfterEmailVerified(refreshed, signupTargetRef.current);
      } else {
        autoVerifyHandledRef.current = false;
        showMsg('아직 이메일 인증이 완료되지 않았습니다. 메일함(스팸함 포함)의 링크를 클릭한 후 다시 확인을 눌러주세요.', 'error');
      }
    } catch (err) {
      autoVerifyHandledRef.current = false;
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
      await verifyEmail(signupTargetRef.current);
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

  // Submit new company registration (즉시 개설 & 첫 관리자 권한 부여 후 즉시 업무 화면 입장)
  const handleNewTenantSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const cname = form.companyName.trim();
    const bno = form.businessNo.trim();
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!cname) return showMsg('회사명을 입력해 주세요.', 'error');
    if (!bno) return showMsg('사업자등록번호를 입력해 주세요.', 'error');
    if (!name) return showMsg('담당자(대표자) 성명을 입력해 주세요.', 'error');
    if (!phone) return showMsg('연락처를 입력해 주세요.', 'error');
    if (!tenantPrivacyAgreed) return showMsg('회원사 정보 수집 및 이용에 동의해 주세요.', 'error');

    setBusy(true);
    showMsg('새 회원사를 개설하고 자동 로그인하는 중입니다...', 'info');
    autoVerifyHandledRef.current = true;
    try {
      await refreshIdentity();
      let res;
      try {
        res = await callAuth('registerNewTenantDirect', withoutSecrets({
          companyName: cname,
          businessNo: bno,
          name,
          phone
        }));
      } catch (callErr) {
        const code = callErr?.code || '';
        const msg = String(callErr?.message || '');
        if (code === 'functions/not-found' || code === 'functions/internal' || code === 'functions/unavailable' || msg.includes('404')) {
          console.warn('[handleNewTenantSubmit] Functions endpoint not found, retrying directly:', callErr);
          res = await callAuth('registerNewTenantDirect', withoutSecrets({
            companyName: cname,
            businessNo: bno,
            name,
            phone
          }));
        } else {
          throw callErr;
        }
      }
      clearPendingSignupFlow();
      showMsg(`[${res.companyName}] 회원사 개설 및 첫 관리자 권한 등록이 완료되었습니다. 업무를 시작합니다!`, 'success');
      // 승인 대기 절차 없이 즉시 생성된 회사로 자동 로그인 입장!
      await enter(res.companyId, { retryOnce: true });
    } catch (err) {
      autoVerifyHandledRef.current = false;
      const code = err?.code || '';
      if (code === 'functions/not-found' || code === 'functions/internal') {
        showMsg('회원사 개설 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      } else {
        showMsg('회원사 등록 실패: ' + (err.message || '입력 정보를 다시 확인해 주세요.'), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  // Accept staff or partner order invitation
  const handleAcceptInvitation = async (invitationId) => {
    if (busy) return;
    setBusy(true);
    showMsg('초대를 수락하고 권한을 연결하는 중입니다...', 'info');
    try {
      const res = await callAuth('acceptInvitation', { invitationId });
      showMsg('초대가 성공적으로 수락되었습니다. 워크스페이스로 입장합니다!', 'success');
      await enter(res.companyId);
    } catch (err) {
      showMsg('초대 수락 실패: ' + (err.message || '오류가 발생했습니다.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Submit existing company staff connection request by representative email
  const handleExistingTenantSubmit = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    const repEmail = (form.representativeEmail || '').trim().toLowerCase();

    if (!repEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail)) {
      showMsg('연결할 회사의 대표 이메일을 정확히 입력해 주세요.', 'error');
      return;
    }

    setBusy(true);
    showMsg('대표 이메일로 회사를 조회하여 직원 연결을 요청하는 중입니다...', 'info');
    try {
      await refreshIdentity();
      const res = await callAuth('requestStaffConnection', {
        representativeEmail: repEmail
      });
      setRequestedCompanyInfo({
        name: res.companyName || '신청 회사',
        email: repEmail,
        companyId: res.companyId
      });
      setVerifiedView('awaiting_staff_connection');
      if (res.alreadyLinked) {
        showMsg('이미 해당 회사에 연결되어 있습니다. 워크스페이스로 입장합니다!', 'success');
        await enter(res.companyId);
      } else {
        showMsg(`[${res.companyName || '회사'}] 관리자에게 직원 연결 요청이 접수되었습니다. 관리자 승인을 기다려 주세요.`, 'success');
      }
    } catch (err) {
      showMsg('직원 연결 요청 실패: ' + (err.message || '대표 이메일을 확인해 주세요.'), 'error');
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
    if (verifyRedirectTimerRef.current) {
      clearTimeout(verifyRedirectTimerRef.current);
      verifyRedirectTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setViewMode('login');
    autoVerifyHandledRef.current = true;
    const u = await refreshIdentity();
    if (u?.emailVerified) {
      await proceedAfterEmailVerified(u);
      return;
    }
    autoVerifyHandledRef.current = false;
    const fallbackEmail = verifiedTargetEmail || readPendingSignupFlow()?.email || '';
    if (fallbackEmail) {
      setForm(f => ({ ...f, email: f.email || fallbackEmail }));
    }
    showMsg('이메일 인증이 완료되었습니다! 로그인하시면 회원사 추가 정보 입력 화면으로 자동 이동합니다.', 'success');
  };

  const handleLogout = async () => {
    if (verifyRedirectTimerRef.current) {
      clearTimeout(verifyRedirectTimerRef.current);
      verifyRedirectTimerRef.current = null;
    }
    autoVerifyHandledRef.current = false;
    clearPendingSignupFlow();
    setBusy(true);
    try {
      await logout();
      setMessage('');
      setViewMode('login');
      setVerifiedView('company_login');
      setRegData(null);
      setRegError(null);
      setRegLoading(false);
      setTenantPrivacyAgreed(false);
    } finally {
      setBusy(false);
      setForm(f => ({ ...f, password: '', passwordConfirm: '' }));
    }
  };

  const handleResetAllDataAndAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ [전체 가입 데이터 및 계정 완전 초기화]\n\n" +
      "현재 가입된 로그인 계정과 모든 회사/소속/업무 데이터를 완전히 삭제하시겠습니까?\n\n" +
      "• 가입된 이메일 계정이 영구 삭제됩니다.\n" +
      "• 모든 회사 및 테스트 데이터가 초기화됩니다.\n" +
      "• 작업 완료 후 완전한 초기 상태에서 새로 가입하여 테스트할 수 있습니다.\n\n" +
      "정말로 초기화를 진행하시겠습니까?"
    );
    if (!confirmed) return;

    setBusy(true);
    showMsg('계정 및 데이터 초기화 진행 중...', 'info');
    try {
      await deleteCurrentAccountAndAllData();
      alert('모든 가입 계정 및 데이터가 완전히 초기화되었습니다.\n초기 화면에서 새롭게 가입하여 테스트를 시작할 수 있습니다.');
      window.location.href = '/';
    } catch (err) {
      console.error('Reset error:', err);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      alert('로컬 데이터가 완전히 초기화되었습니다.\n초기 화면에서 새롭게 가입하여 테스트를 시작할 수 있습니다.');
      window.location.href = '/';
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__resetAllDataAndAccount = handleResetAllDataAndAccount;
    }
  }, []);

  // Check emulator safety violation
  const isEmulatorAttached = Boolean(auth?.emulatorConfig);
  const isProdVerifyMode = authTargetMode === 'production-auth-only';
  const isCompactTenantForm = Boolean(identity?.emailVerified && verifiedView === 'new_tenant_form' && viewMode !== 'verify_email_result');

  if (session?.role === 'partner') return <PartnerOrders session={session} />;
  if (session) return children(session);

  return (
    <main className={`auth-shell dark-theme${!identity && viewMode === 'login' ? ' mobile-login-compact' : ''}${isCompactTenantForm ? ' mobile-tenant-compact' : ''}`}>
      <div className="desktop-auth-layout">
        <aside className="desktop-auth-brand" aria-label="Linker X 소개">
          <img
            src="/assets/linker-x-brand.png"
            alt="Linker X - Link Beyond, Automate Everything."
            className="desktop-brand-logo-img"
            style={{ width: 'min(96px, 28vw)', maxWidth: '104px', height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </aside>

        <div className="desktop-auth-entry">

          <section className="auth-card dark-glass">
        {isProdVerifyMode && isEmulatorAttached && (
          <div className="auth-badge-status failure">
            🚨 안전 실패: 운영 인증 검증 모드이나 127.0.0.1:9099 에뮬레이터에 연결되었습니다.
          </div>
        )}

        {message && (
          <div className={`auth-msg ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
            {messageType === 'success' && (
              <span className="auth-msg-icon" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            <span className="auth-msg-text">{message}</span>
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
                  잠시 후 <strong>회원사 추가 정보 입력 화면</strong>으로 자동 이동합니다. 이동하지 않으면 아래 버튼을 눌러주세요.
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
                    회원사 추가 정보 입력으로 바로 이동
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
                {/* 1. 회원가입 구분: 새 회원사(대표) vs 기존 회원사(소속) */}
                <div className="dark-pill-selector">
                  <button
                    type="button"
                    className={`dark-pill ${signupTarget === 'new_tenant' ? 'active' : ''}`}
                    onClick={() => setSignupTarget('new_tenant')}
                  >
                    🏢 새 회원사(대표)
                  </button>
                  <button
                    type="button"
                    className={`dark-pill ${signupTarget === 'existing_tenant' ? 'active' : ''}`}
                    onClick={() => setSignupTarget('existing_tenant')}
                  >
                    👥 기존 회원사(소속)
                  </button>
                </div>

                <form onSubmit={handleEmailSignup} className="dark-auth-form">
                  {/* 이메일 입력 */}
                  <div className="dark-input-wrap">
                    <div className="dark-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder="이메일을 입력하세요"
                      value={form.email}
                      onChange={change}
                      className="dark-input"
                    />
                  </div>

                  {/* 비밀번호 입력 */}
                  <div className="dark-input-wrap">
                    <div className="dark-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      placeholder="비밀번호를 입력하세요 (6자리 이상)"
                      value={form.password}
                      onChange={change}
                      className="dark-input"
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

                  {/* 비밀번호 확인 입력 */}
                  <div className="dark-input-wrap">
                    <div className="dark-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="passwordConfirm"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      placeholder="비밀번호 확인"
                      value={form.passwordConfirm}
                      onChange={change}
                      className="dark-input"
                    />
                    <button
                      type="button"
                      className="dark-toggle-eye"
                      onClick={() => setShowPasswordConfirm(p => !p)}
                      aria-label={showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                      tabIndex="-1"
                    >
                      {showPasswordConfirm ? (
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

                  {/* 기존 회사 소속 신청 시 대표 이메일 입력란 */}
                  {signupTarget === 'existing_tenant' && (
                    <div style={{ marginBottom: '14px' }}>
                      <div className="dark-input-wrap">
                        <div className="dark-input-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="representativeEmail"
                          required={signupTarget === 'existing_tenant'}
                          placeholder="연결할 회사의 대표 이메일 입력"
                          value={form.representativeEmail || ''}
                          onChange={change}
                          className="dark-input"
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', paddingLeft: '4px', lineHeight: '1.4' }}>
                        💡 대표 이메일로 회사를 찾아 해당 회사 관리자에게 직원 연결 요청을 발송합니다.
                      </div>
                    </div>
                  )}

                  <div className="signup-privacy-consent">
                    <label>
                      <input type="checkbox" required />
                      <span>개인정보 수집 및 이용에 동의합니다 <em>(필수)</em></span>
                    </label>
                    <button type="button" onClick={() => setPrivacyModalOpen(true)}>보기</button>
                  </div>

                  <button type="submit" className="auth-btn-primary dark-btn-gradient-login" disabled={busy}>
                    <span>{busy ? '가입 처리 중...' : '회원가입'}</span>
                    <span className="dark-btn-arrow">→</span>
                  </button>
                </form>

                <div className="dark-divider">
                  <span>또는 간편 가입</span>
                </div>

                <button
                  type="button"
                  className="auth-btn-google dark-btn-google"
                  disabled={busy}
                  onClick={() => handleGoogleAuth(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google로 시작하기</span>
                </button>

                <div className="dark-auth-footer-link">
                  <span>이미 계정이 있으신가요?</span>
                  <button
                    type="button"
                    onClick={() => { setViewMode('login'); setMessage(''); }}
                  >
                    로그인
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
              메일함(스팸함 포함)의 링크를 클릭하시면 <strong>회원사 추가 정보 입력 화면으로 자동 이동</strong>합니다. 자동 이동하지 않을 경우 아래 <strong>[인증 완료 확인]</strong> 버튼을 눌러주세요.
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
              3-A. 새 회원사 등록 흐름: 회사 정보 입력 즉시 개설 (승인 대기 제거)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-new-tenant">
              <div className="auth-new-tenant-head">
                <h2 className="auth-mode-title auth-new-tenant-title">회원사 추가 정보</h2>
                <span className="auth-new-tenant-badge">30일 무료 · 즉시개설</span>
              </div>
              <div className="auth-new-tenant-account">
                <div className="auth-account-avatar" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="auth-account-meta">
                  <span className="auth-account-caption">인증 완료 계정</span>
                  <strong className="auth-account-email">{identity.email}</strong>
                </div>
                <em className="auth-account-verified-pill">✓ 인증됨</em>
              </div>
              <p className="auth-desc auth-new-tenant-desc">
                입력 완료 시 회사 ID·관리자 권한 즉시 발급
              </p>

              <form onSubmit={handleNewTenantSubmit} className="auth-form auth-new-tenant-form">
                <div className="auth-new-tenant-fields">
                  <label className="auth-new-tenant-row">
                    <span className="auth-new-tenant-label">회사명</span>
                    <input
                      name="companyName"
                      required
                      placeholder="예: (주)링커엑스"
                      value={form.companyName}
                      onChange={change}
                    />
                  </label>
                  <label className="auth-new-tenant-row">
                    <span className="auth-new-tenant-label">사업자번호</span>
                    <input
                      name="businessNo"
                      required
                      placeholder="예: 123-45-67890"
                      value={form.businessNo}
                      onChange={change}
                    />
                  </label>
                  <label className="auth-new-tenant-row">
                    <span className="auth-new-tenant-label">대표자명</span>
                    <input
                      name="name"
                      required
                      placeholder="예: 홍길동"
                      value={form.name}
                      onChange={change}
                    />
                  </label>
                  <label className="auth-new-tenant-row">
                    <span className="auth-new-tenant-label">연락처</span>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="예: 010-1234-5678"
                      value={form.phone}
                      onChange={change}
                    />
                  </label>
                </div>

              <div className="signup-privacy-consent">
                <label>
                  <input
                    type="checkbox"
                    required
                    checked={tenantPrivacyAgreed}
                    onChange={(e) => setTenantPrivacyAgreed(e.target.checked)}
                  />
                  <span>회원사 정보 수집·이용 동의 <em>(필수)</em></span>
                </label>
                <button type="button" onClick={() => setPrivacyModalOpen(true)}>보기</button>
              </div>

                <button type="submit" className="auth-btn-primary dark-btn-gradient-login" disabled={busy}>
                  <span>{busy ? '회원사 개설 및 로그인 중...' : '회원사 개설 및 업무 시작'}</span>
                  <span className="dark-btn-arrow">→</span>
                </button>
              </form>

              <div className="auth-button-group auth-new-tenant-actions">
                <button
                  type="button"
                  className="auth-btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (workspaces.length > 0) setVerifiedView('workspace_selector');
                    else setVerifiedView('existing_tenant_form');
                  }}
                >
                  {workspaces.length > 0 ? '워크스페이스 목록' : '기존 회원사 소속'}
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
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setRegError(null);
                  setVerifiedView('new_tenant_form');
                  setMessage('');
                }}
              >
                🏢 새 회원사 추가 정보 입력
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
              3-B. 승인 대기 화면 제거 -> 회사 작업공간으로 즉시 이동 안내
          ───────────────────────────────────────────────────────────── */
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚀</div>
            <h2 className="auth-mode-title">회사 작업공간으로 연결 중...</h2>
            <p className="auth-desc">잠시만 기다려 주세요.</p>
            {regData?.companyId && (
              <button
                type="button"
                className="auth-btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => enter(regData.companyId)}
              >
                회사 업무 시작
              </button>
            )}
          </div>
        ) : verifiedView === 'existing_tenant_form' ? (
          /* ─────────────────────────────────────────────────────────────
              3-C. 기존 회사 직원 연결 요청 (대표 이메일로 요청)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status prod-verify">기존 회사에 연결</div>
            <h2 className="auth-mode-title">기존 회사 직원 연결 요청</h2>
            <p className="auth-desc">
              인증 계정: <strong>{identity.email}</strong> <span className="auth-verified-tag">인증됨</span><br />
              연결하려는 회사의 대표 이메일을 입력하면 해당 회사 관리자에게 직원 연결 요청이 전달됩니다.
            </p>

            <form onSubmit={handleExistingTenantSubmit} className="auth-form">
              <label>
                연결할 회사의 대표 이메일 <span style={{ color: '#ef4444' }}>*</span>
                <input
                  type="email"
                  name="representativeEmail"
                  required
                  placeholder="예: ceo@company.com (대표 또는 관리자 이메일)"
                  value={form.representativeEmail || ''}
                  onChange={change}
                />
              </label>

              <div className="auth-notice-text">
                * 대표 이메일은 회사를 찾는 용도로 사용됩니다. 요청을 보낸 후 관리자가 회원님의 계정을 직원 카드로 연결하면 바로 업무가 열립니다. (회사 ID를 직접 입력할 필요가 없습니다)
              </div>

              <button type="submit" className="auth-btn-primary" disabled={busy}>
                {busy ? '연결 요청 제출 중...' : '관리자에게 직원 연결 요청'}
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
        ) : (verifiedView === 'awaiting_member_approval' || verifiedView === 'awaiting_staff_connection') ? (
          /* ─────────────────────────────────────────────────────────────
              3-D. 기존 회원사 소속 신청 완료: 관리자 연결 대기
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status warning">⏳ 관리자 연결 대기</div>
            <h2 className="auth-mode-title">관리자 직원 연결 대기</h2>
            <p className="auth-desc">
              <strong>[{requestedCompanyInfo.name || form.companyId || '신청 회사'}]</strong>의 관리자가 직원 연결을 확인하고 있습니다.<br />
              관리자가 회원님의 계정을 직원 카드로 연결하면 해당 회사의 업무 작업공간이 열립니다.
            </p>

            <div className="auth-user-info-box">
              <p><strong>신청 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p><strong>연결 대상 회사:</strong> {requestedCompanyInfo.name || form.companyId || '신청 회사'} {requestedCompanyInfo.email ? `(대표: ${requestedCompanyInfo.email})` : ''}</p>
              <p><strong>연결 상태:</strong> <span className="auth-badge-status warning" style={{ display: 'inline', padding: '2px 8px' }}>관리자 승인 및 직원 카드 연결 대기</span></p>
            </div>

            <div className="auth-action-stack">
              <button
                type="button"
                className="auth-btn-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const activeUser = await refreshIdentity();
                    await loadUserWorkspacesAndInvites(activeUser);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? '연결 상태 확인 중...' : '연결 완료 확인 및 입장'}
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
              3-E. 워크스페이스 선택 및 대기 초대 확인 (회사 ID 직접 입력 절차 제거)
          ───────────────────────────────────────────────────────────── */
          <>
            <div className="auth-badge-status prod-verify">워크스페이스 선택</div>
            <h2 className="auth-mode-title">접속할 워크스페이스 선택</h2>
            <div className="auth-user-info-box" style={{ marginBottom: '16px' }}>
              <p><strong>인증 계정:</strong> {identity.email} <span className="auth-verified-tag">인증됨</span></p>
              <p className="auth-notice-text">
                접근 가능한 회원사 업무 또는 거래처 주문 포털을 선택해 주세요.
              </p>
            </div>

            {/* 1. 대기 중인 초대장이 있는 경우 */}
            {pendingInvitations.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💌</span>
                  <span>도착한 초대장 ({pendingInvitations.length}건)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingInvitations.map(inv => (
                    <div key={inv.id} style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: 700 }}>
                          [{inv.companyName}] {inv.type === 'staff' ? '직원 초대' : `거래처 주문 초대 (${inv.partnerName})`}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          초대자: {inv.invitedByName || '회사 관리자'} · 유효기간 내 수락 필요
                        </div>
                      </div>
                      <button
                        type="button"
                        className="auth-btn-primary"
                        style={{ width: 'auto', padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
                        disabled={busy}
                        onClick={() => handleAcceptInvitation(inv.id)}
                      >
                        수락 후 입장
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. 소속 워크스페이스 목록 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                🏢 소속 목록 ({workspaces.length}개)
              </div>
              {workspaces.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.88rem' }}>
                  현재 소속된 회원사 또는 거래처가 없습니다.<br />
                  아래 [새 회원사 개설]로 즉시 회사를 개설하거나 초대를 확인해 주세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {workspaces.map(w => (
                    <div
                      key={`${w.companyId}_${w.role}`}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>
                            {w.companyName}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            backgroundColor: w.type === 'platform_ops' ? 'rgba(99, 102, 241, 0.25)' : w.type === 'partner_order' ? 'rgba(16, 185, 129, 0.2)' : w.isTenantAdmin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                            color: w.type === 'platform_ops' ? '#a5b4fc' : w.type === 'partner_order' ? '#34d399' : w.isTenantAdmin ? '#f87171' : '#38bdf8'
                          }}>
                            {w.roleLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                          회사 식별자: <code>{w.companyId}</code>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="auth-btn-primary dark-btn-gradient-login"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '0.84rem', height: 'auto' }}
                        disabled={busy}
                        onClick={() => enter(w.companyId)}
                      >
                        <span>{w.type === 'platform_ops' ? (w.isSuperAdmin ? '본사 관리' : '운영 포털') : w.type === 'partner_order' ? '거래처 주문' : '회사 업무'}</span>
                        <span className="dark-btn-arrow">→</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. 하단 액션 버튼 */}
            <div className="auth-action-divider"><span>추가 업무</span></div>

            <div className="auth-button-group">
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => { setVerifiedView('new_tenant_form'); setMessage(''); }}
              >
                🏢 새 회원사 개설 (30일 무료)
              </button>
              <button
                type="button"
                className="auth-btn-secondary"
                disabled={busy}
                onClick={() => { setVerifiedView('existing_tenant_form'); setMessage(''); }}
              >
                👥 기존 회원사 소속 신청
              </button>
            </div>

            <button type="button" className="auth-btn-ghost" disabled={busy} onClick={handleLogout} style={{ marginTop: '16px' }}>
              로그아웃
            </button>
          </>
        )}
          </section>
        </div>
      </div>

      <LegalDocumentModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        title="개인정보 처리방침 [초안]"
        documentText={PRIVACY_POLICY_TEXT}
        version={PRIVACY_POLICY_VERSION}
      />

      {/* Google Provider Link Modal for existing accounts */}
      {accountLinkModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>기존 계정과 Google 연동</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>단일 Firebase UID로 통합 관리</p>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
              <strong>{accountLinkModal.email}</strong> 계정은 이미 이메일/비밀번호로 등록되어 있습니다.<br />
              비밀번호를 입력하시면 Google 로그인과 <strong>동일한 계정(동일 UID)</strong>으로 연결되어 양쪽 방식으로 모두 로그인하실 수 있습니다.
            </p>

            {accountLinkModal.error && (
              <div style={{ padding: '10px 12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px', fontWeight: 600 }}>
                {accountLinkModal.error}
              </div>
            )}

            <form onSubmit={handleConfirmAccountLink}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  기존 계정 비밀번호
                </label>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={accountLinkModal.password}
                  onChange={e => setAccountLinkModal(prev => ({ ...prev, password: e.target.value }))}
                  disabled={accountLinkModal.busy}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAccountLinkModal({ isOpen: false, email: '', password: '', pendingCredential: null, error: '', busy: false })}
                  disabled={accountLinkModal.busy}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={accountLinkModal.busy}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {accountLinkModal.busy ? '연동 중...' : '계정 연동 및 로그인'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
