import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import { initializeTestEnvironment, assertFails as deny, assertSucceeds as allow } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
let env;
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080') throw Error('Emulator required');
 env=await initializeTestEnvironment({projectId:'demo-linker-auth',firestore:{rules:readFileSync(new URL('../firestore.auth.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();
 for(const c of ['A','B']){await setDoc(doc(db,'companies',c),{id:c,status:'active'});await setDoc(doc(db,'companies',c,'salesOrders','o'),{companyId:c,items:[]});await setDoc(doc(db,'companies',c,'staffList','s'),{name:'fixture'});}
 for(const [uid,c,role,status,permissions] of [['a','A','tenant_staff','active',{orders:true,loading:true,delivery:true,invoices:true,inventory:true}],['b','B','tenant_staff','active',{orders:true}],['pending','A','tenant_staff','pending',{}],['partner','A','partner','active',{}],['admin','A','tenant_admin','active',{}],['limited','A','tenant_staff','active',{}]])await setDoc(doc(db,'authz',uid,'companies',c),{uid,companyId:c,role,status,permissions,legacyId:uid,partnerId:'p1'});
 for(const p of ['p1','p2'])await setDoc(doc(db,'companies','A','partnerOrders',p),{companyId:'A',partnerId:p,items:[],status:'submitted'});
 });
});
after(async()=>{await env?.cleanup();});
const dbFor=(uid,verified=true)=>env.authenticatedContext(uid,{email_verified:verified}).firestore();
test('unauthenticated business reads/writes denied',async()=>{const db=env.unauthenticatedContext().firestore();await deny(getDoc(doc(db,'companies','A','salesOrders','o')));await deny(setDoc(doc(db,'companies','A','inventory','x'),{qty:1}));});
test('A staff cannot read/list/write B',async()=>{const db=dbFor('a');await deny(getDoc(doc(db,'companies','B','salesOrders','o')));await deny(getDocs(collection(db,'companies','B','salesOrders')));await deny(setDoc(doc(db,'companies','B','salesOrders','x'),{companyId:'B'}));});
test('pending or unassigned signup denied',async()=>{for(const u of ['pending','new'])await deny(getDoc(doc(dbFor(u),'companies','A','salesOrders','o')));});
test('unverified email denied',async()=>{await deny(getDoc(doc(dbFor('a',false),'companies','A','salesOrders','o')));});
test('staff cannot grant admin or change approval',async()=>{const db=dbFor('a');await deny(updateDoc(doc(db,'authz','a','companies','A'),{role:'tenant_admin'}));await deny(setDoc(doc(db,'platformAccess','a'),{status:'active'}));await deny(updateDoc(doc(db,'companies','A','staffList','s'),{role:'admin'}));});
test('partner only reads own order projection',async()=>{const db=dbFor('partner');await allow(getDoc(doc(db,'companies','A','partnerOrders','p1')));await deny(getDoc(doc(db,'companies','A','partnerOrders','p2')));await deny(getDoc(doc(db,'companies','A','salesOrders','o')));await deny(getDoc(doc(db,'companies','A','bundles','staffList')));await allow(getDocs(query(collection(db,'companies','A','partnerOrders'),where('companyId','==','A'),where('partnerId','==','p1'))));});
test('partner submission cannot forge ownership/status',async()=>{const db=dbFor('partner');await allow(setDoc(doc(db,'companies','A','partnerOrders','new'),{companyId:'A',partnerId:'p1',items:[],status:'submitted'}));await deny(setDoc(doc(db,'companies','A','partnerOrders','forged'),{companyId:'A',partnerId:'p2',items:[],status:'submitted'}));await deny(updateDoc(doc(db,'companies','A','partnerOrders','new'),{status:'approved'}));});
test('authorized staff order/loading/delivery/invoice path access',async()=>{const db=dbFor('a');await allow(getDoc(doc(db,'companies','A','salesOrders','o')));for(const c of ['salesOrders','inventoryTransferHistory','salesInvoices']){await allow(setDoc(doc(db,'companies','A',c,'workflow'),{companyId:'A',fixture:true}));await allow(getDoc(doc(db,'companies','A',c,'workflow')));}
await allow(setDoc(doc(db,'companies','A','settings','inventory'),{fixtureProduct:10}));await allow(getDoc(doc(db,'companies','A','settings','inventory')));});
test('authenticated staff without required permission denied',async()=>{await deny(getDoc(doc(dbFor('limited'),'companies','A','salesOrders','o')));});
test('unknown/global paths denied for admin',async()=>{for(const p of [['settings','x'],['platformStaff','x'],['companies','A','unknown','x']])await deny(setDoc(doc(dbFor('admin'),...p),{fixture:true}));});
test('legacy password writes and authz reads denied',async()=>{const db=dbFor('admin');await deny(setDoc(doc(db,'companies','A','staffList','x'),{password:'dummy'}));await deny(setDoc(doc(db,'companies','A','salesOrders','x'),{companyId:'A',password:'dummy'}));await deny(getDoc(doc(db,'authz','admin','companies','A')));});
test('revocation effective without token refresh',async()=>{await env.withSecurityRulesDisabled(async ctx=>{await updateDoc(doc(ctx.firestore(),'authz','b','companies','B'),{status:'revoked'});});await deny(getDoc(doc(dbFor('b'),'companies','B','salesOrders','o')));});
