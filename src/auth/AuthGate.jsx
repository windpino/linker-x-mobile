import React, { useCallback, useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { login, register, googleLogin, verifyEmail, resetPassword, refreshIdentity, logout, callAuth } from './client';
import { clearLegacyCredentials, withoutSecrets } from './sanitize';
import './auth.css';
import MembershipAdmin from './MembershipAdmin';
import PlatformConsole from './PlatformConsole';
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
  const [manage,setManage]=useState(false);
  const [identity,setIdentity]=useState(null),[session,setSession]=useState(null),[busy,setBusy]=useState(true),[message,setMessage]=useState(''),[mode,setMode]=useState('login');
  const [form,setForm]=useState({email:'',password:'',name:'',phone:'',companyName:'',businessNo:'',companyId:'',legacyId:'',contactId:'primary',role:'tenant_staff'});
  const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  useEffect(()=>{
    clearLegacyCredentials(localStorage); clearLegacyCredentials(sessionStorage);
    return onIdTokenChanged(auth,u=>{clearSessionScope();localStorage.removeItem('currentUser');setIdentity(u ? {uid:u.uid,email:u.email,emailVerified:u.emailVerified,displayName:u.displayName} : null);setSession(null);setBusy(false);setForm(f=>({...f,password:'',email:u?.email||f.email,name:u?.displayName||f.name}));});
  },[]);
  const enter = async () => {
    setSession(null);setBusy(true);
    try {await refreshIdentity(); const approved=withoutSecrets(await callAuth('authSession',{companyId:form.companyId}));await prepareSessionScope(approved);localStorage.setItem('currentUser',JSON.stringify(approved));setSession(approved);}
    catch {localStorage.removeItem('currentUser');setMessage('이메일 인증, 회사 소속 승인 또는 서버 연결을 확인해 주세요.');}
    finally{setBusy(false);}
  };
  const sessionCompanyId=session?.companyId,sessionUid=session?.authUid;
  useEffect(()=>{
    if (!sessionCompanyId || !sessionUid) return;
    let live=true;
    const timer=setInterval(async()=>{try {const next=withoutSecrets(await callAuth('authSession',{companyId:sessionCompanyId}));if(live){await prepareSessionScope(next);setSession(next);localStorage.setItem('currentUser',JSON.stringify(next));}}catch{if(live){setSession(null);localStorage.removeItem('currentUser');setMessage('소속 승인 상태를 다시 확인해 주세요.');}}},60000);
    return ()=>{live=false;clearInterval(timer);};
  },[sessionCompanyId,sessionUid]);
  const act=async fn=>{setBusy(true);setMessage('');try{await fn();}catch{setMessage('요청을 처리하지 못했습니다. 입력 정보와 인증 상태를 확인해 주세요.');}finally{setBusy(false);setForm(f=>({...f,password:''}));}};
  if(session?.role==='partner') return <PartnerOrders session={session}/>;
  if(session?.authRole==='platform_admin') return <PlatformConsole session={session}/>;
  if(session && manage) return <MembershipAdmin session={session} onBack={session.authRole==='tenant_admin'?()=>setManage(false):undefined}/>;
  if(session) return <>{session.authRole==='tenant_admin'&&<button className='auth-admin-toggle' onClick={()=>setManage(true)}>소속 승인 관리</button>}{children(session)}</>;
  return <main className="auth-shell"><section className="auth-card"><h1>링커엑스</h1><p>내 계정으로 인증하고, 승인받은 회사에서 업무를 시작하세요.</p>
    {import.meta.env.VITE_AUTH_PRODUCTION_APPROVED!=='true' && <p className="auth-badge">격리된 개발 환경</p>}
    <p role="status">{message}</p>
    {!identity ? <><form onSubmit={e=>{e.preventDefault();act(async()=>{if(mode==='signup'){await register(form.email,form.password,form.name);setMessage('인증 메일을 보냈습니다. 이메일 인증 후 소속을 신청하세요.');}else await login(form.email,form.password);});}}>
      <label>이메일<input type="email" name="email" autoComplete="email" required value={form.email} onChange={change}/></label>
      <label>비밀번호<input type="password" name="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={6} required value={form.password} onChange={change}/></label>
      <button disabled={busy}>{mode==='signup'?'이메일로 가입':'로그인'}</button></form>
      <button disabled={busy} onClick={()=>act(googleLogin)}>Google 계정으로 계속</button>
      <button disabled={busy} onClick={()=>setMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'로그인으로 돌아가기':'새 계정 가입'}</button>
      <button disabled={busy||!form.email} onClick={()=>act(async()=>{await resetPassword(form.email);setMessage('해당 계정이 있다면 비밀번호 재설정 메일이 발송됩니다.');})}>비밀번호 재설정</button></> : <>
      <p>{identity.email}</p><p>인증 성공만으로 회사 데이터 접근 권한이 생기지 않습니다.</p>
      {!identity.emailVerified && <button disabled={busy} onClick={()=>act(async()=>{await verifyEmail();setMessage('인증 메일을 보냈습니다.');})}>인증 메일 다시 보내기</button>}
      <form onSubmit={e=>{e.preventDefault();enter();}}><label>회사 ID<input name="companyId" pattern="[A-Za-z0-9_-]{1,100}" required value={form.companyId} onChange={change}/></label><button disabled={busy}>인증 및 소속 확인 후 입장</button></form>
      <details><summary>회원사·직원·거래처 소속 승인 신청</summary><form onSubmit={e=>{e.preventDefault();act(async()=>{await refreshIdentity();await callAuth('requestMembership',withoutSecrets(form));setMessage('승인 신청을 접수했습니다. 관리자 확인 후 입장할 수 있습니다.');});}}>
        <label>가입 구분<select name="role" value={form.role} onChange={change}><option value="tenant_admin">회원사 대표</option><option value="tenant_staff">직원</option><option value="partner">거래처</option></select></label>
        <label>회사 ID<input name="companyId" required pattern="[A-Za-z0-9_-]{1,100}" value={form.companyId} onChange={change}/></label>
        <label>기존 직원·거래처 문서 ID 또는 신규 희망 ID<input name="legacyId" required pattern="[A-Za-z0-9_-]{1,100}" value={form.legacyId} onChange={change}/></label>
        {form.role==='partner'&&<label>거래처 담당자 구분 ID<input name="contactId" value={form.contactId} onChange={change}/></label>}<label>이름<input name="name" required value={form.name} onChange={change}/></label><label>전화번호<input type="tel" name="phone" value={form.phone} onChange={change}/></label><label>회사명<input name="companyName" value={form.companyName} onChange={change}/></label><label>사업자번호<input name="businessNo" value={form.businessNo} onChange={change}/></label>
        <p>기존 계정 연결은 관리자가 직접 확인합니다. 이메일 일치만으로 연결하지 않습니다.</p><button disabled={busy}>소속 승인 신청</button></form></details><button disabled={busy} onClick={()=>act(logout)}>로그아웃</button></>}
  </section></main>;
}
