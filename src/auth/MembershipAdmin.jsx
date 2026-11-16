import React,{useState} from 'react';
import {callAuth,logout} from './client';
export default function MembershipAdmin({session,onBack}){
 const [companyId,setCompanyId]=useState(session.companyId==='linker_x_hq'?'':session.companyId),[requests,setRequests]=useState([]),[message,setMessage]=useState(''),[selected,setSelected]=useState(null),[confirmed,setConfirmed]=useState(false),[permissions,setPermissions]=useState({}),[createCompany,setCreateCompany]=useState(false),[busy,setBusy]=useState(false);
 const run=async f=>{setBusy(true);try{await f();}catch{setMessage('권한 또는 요청 상태를 확인해 주세요.');}finally{setBusy(false);}};
 return <main className="auth-shell"><section className="auth-card"><h1>소속 승인 관리</h1><label>회사 ID<input value={companyId} disabled={session.authRole!=='platform_admin'} onChange={e=>setCompanyId(e.target.value)}/></label><button disabled={busy||!companyId} onClick={()=>run(async()=>{setRequests(await callAuth('listMembershipRequests',{companyId}));setSelected(null);setConfirmed(false);})}>신청 목록 확인</button>
 <ul>{requests.map(r=><li key={r.uid}><button disabled={r.status!=='pending'} onClick={()=>{setSelected(r);setConfirmed(false);setPermissions({});}}>{r.profile?.name} · {r.legacyId} · {r.role} · {r.status}</button></li>)}</ul>
 {selected&&<><p>UID: {selected.uid}<br/>기존 문서: {selected.legacyId}<br/>가입 구분: {selected.role}</p><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>본인·회사 소속·기존 문서 연결 대상을 별도 확인했습니다.</label>
 {session.authRole==='platform_admin'&&selected.role==='tenant_admin'&&<label><input type="checkbox" checked={createCompany} onChange={e=>setCreateCompany(e.target.checked)}/>신규 회원사 생성을 승인합니다.</label>}
 {selected.role==='tenant_staff'&&['orders','loading','delivery','invoices','inventory','catalog','reports'].map(k=><label key={k}><input type="checkbox" checked={!!permissions[k]} onChange={e=>setPermissions(p=>({...p,[k]:e.target.checked}))}/>{({orders:'주문',loading:'상차',delivery:'납품',invoices:'전표',inventory:'재고',catalog:'품목·창고',reports:'보고서'})[k]}</label>)}
 <button disabled={busy||!confirmed} onClick={()=>run(async()=>{await callAuth('approveMembership',{companyId,uid:selected.uid,confirmLegacyLink:confirmed,permissions,createCompany});setMessage('소속 승인이 완료됐습니다.');setSelected(null);setRequests([]);})}>확인한 계정의 소속 승인</button></>}
 <p role="status">{message}</p>{onBack&&<button onClick={onBack}>업무 화면으로</button>}<button onClick={logout}>로그아웃</button></section></main>;
}
