import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import * as handlers from '../../functions/index.js';
import {initializeApp as adminInit,deleteApp as adminDelete} from 'firebase-admin/app';
import {getFirestore as adminDb} from 'firebase-admin/firestore';
import {getAuth as adminAuth} from 'firebase-admin/auth';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Only demo emulators are permitted');
const aa=adminInit({projectId:'demo-linker-auth'},'bridge-admin'),db=adminDb(aa),app=initializeApp({projectId:'demo-linker-auth',apiKey:'demo-key'},'bridge-client'),auth=getAuth(app),functions=getFunctions(app,'asia-northeast3');
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFunctionsEmulator(functions,'127.0.0.1',5001);
let server;const accounts={};
const call=(name,data)=>httpsCallable(functions,name)(data).then(r=>r.data);
const denied=fn=>assert.rejects(fn,e=>e.code==='functions/permission-denied');
async function as(role){await signInWithEmailAndPassword(auth,accounts[role].email,'Fixture-pass-123!');}
before(async()=>{
 const web=express();web.use(express.json({limit:'2mb'}));web.all('/demo-linker-auth/asia-northeast3/:name',(req,res)=>{const fn=handlers[req.params.name];if(!fn){res.status(404).end();return;}return fn(req,res);});
 server=await new Promise(resolve=>{const s=web.listen(5001,'127.0.0.1',()=>resolve(s));});
 await db.doc('companies/BRIDGE').set({id:'BRIDGE',name:'Fixture Co',status:'active',password:'LEGACY_COMPANY_FIXTURE_SECRET'});
 await db.doc('companies/OTHER_BRIDGE').set({id:'OTHER_BRIDGE',status:'active'});
 for(const [role,kind,permissions] of [['admin','tenant_admin',{}],['worker','tenant_staff',{orders:true,inventory:true}],['catalog','tenant_staff',{catalog:true}],['limited','tenant_staff',{}],['partner','partner',{}]]){
  const a=await adminAuth(aa).createUser({email:`bridge-${role}@example.test`,password:'Fixture-pass-123!',emailVerified:true});accounts[role]=a;
  await db.doc(`authz/${a.uid}/companies/BRIDGE`).set({uid:a.uid,companyId:'BRIDGE',legacyId:role,userId:role,role:kind,status:'active',permissions,partnerId:'p1'});
  await db.doc(`companies/BRIDGE/staffList/${role}`).set({id:role,userId:role,name:role,companyId:'BRIDGE',password:'LEGACY_STAFF_FIXTURE_SECRET',role:'admin',permissions:{ALL:true},salary:9000});
 }
 await db.doc('companies/BRIDGE/partners/p1').set({id:'p1',name:'Partner One',manager:'worker',companyId:'BRIDGE',password:'LEGACY_PARTNER_FIXTURE_SECRET',contacts:[{password:'CONTACT_FIXTURE_SECRET'}]});
 await db.doc('companies/BRIDGE/partners/p2').set({id:'p2',name:'Partner Two',manager:'other',companyId:'BRIDGE',password:'LEGACY_PARTNER_FIXTURE_SECRET'});
 await db.doc('companies/BRIDGE/bundles/partners').set({list:[{id:'p1',name:'Partner One',manager:'worker',password:'LEGACY_PARTNER_FIXTURE_SECRET'},{id:'p2',name:'Partner Two',manager:'other',password:'LEGACY_PARTNER_FIXTURE_SECRET'}],version:1});
 await db.doc('companies/BRIDGE/metadata/syncState').set({products:{version:1},salesOrders:{version:2},staffList:{version:3},payrollPrivate:{version:4}});
});
after(async()=>{await signOut(auth);await deleteApp(app);await adminDelete(aa);await new Promise(resolve=>server?.close(resolve));});
test('actual callable HTTP wrapper requires identity and approved membership',async()=>{await signOut(auth);await assert.rejects(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE'}),e=>e.code==='functions/unauthenticated');await as('partner');await denied(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE'}));});
test('legacy company/password data remains stored but projection never sends secrets',async()=>{await as('admin');const result=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE'});assert.equal(result.data.name,'Fixture Co');assert.equal(result.data.password,undefined);assert.equal((await db.doc('companies/BRIDGE').get()).data().password,'LEGACY_COMPANY_FIXTURE_SECRET');});
test('staff directory hides payroll and role; partner directory is assigned only',async()=>{await as('worker');const staff=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/staffList'});assert.ok(staff.docs.length>0);assert.equal(JSON.stringify(staff).includes('salary'),false);assert.equal(JSON.stringify(staff).includes('password'),false);assert.equal(JSON.stringify(staff).includes('permissions'),false);const partners=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/partners'});assert.deepEqual(partners.docs.map(x=>x.id),['p1']);const bundle=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/bundles/partners'});assert.deepEqual(bundle.data.list.map(x=>x.id),['p1']);});
test('cross-company and path traversal rejected before any data is returned',async()=>{await as('worker');await denied(()=>call('tenantRead',{companyId:'OTHER_BRIDGE',path:'companies/OTHER_BRIDGE'}));await assert.rejects(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/OTHER_BRIDGE'}),e=>e.code==='functions/invalid-argument');await assert.rejects(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/../platformAccess'}),e=>e.code==='functions/invalid-argument');});
test('limited approved staff cannot fetch business bundles; metadata is capability-filtered',async()=>{await as('limited');await denied(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/bundles/products'}));await as('worker');const m=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/metadata/syncState'});assert.equal(m.data.payrollPrivate,undefined);assert.equal(m.data.salesOrders.version,2);});
test('staff cannot write staff profiles, auth fields or unrelated bundle metadata',async()=>{await as('worker');await denied(()=>call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/staffList/worker',operation:'update',data:{role:'admin'}}));await denied(()=>call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/metadata/syncState',operation:'set',data:{staffList:{version:5}},merge:true}));});
test('authorized bundle roundtrip strips credentials and fixes embedded company ID',async()=>{await as('catalog');await call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/bundles/products',operation:'set',data:{list:[{id:'f',name:'Fixture Product',companyId:'OTHER_BRIDGE',password:'REMOVE_FIXTURE'}],version:2}});const r=await call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE/bundles/products'});assert.equal(r.data.list[0].companyId,'BRIDGE');assert.equal(r.data.list[0].password,undefined);await call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/metadata/syncState',operation:'set',merge:true,data:{products:{version:2}}});});
test('server write cannot alter company approval or promote legacy role',async()=>{await as('admin');await denied(()=>call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE',operation:'update',data:{status:'active',role:'platform_admin'}}));await call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/staffList/worker',operation:'update',data:{phone:'fixture',password:'REMOVE_FIXTURE',permissions:{ALL:true},role:'admin'}});const m=(await db.doc(`authz/${accounts.worker.uid}/companies/BRIDGE`).get()).data();assert.equal(m.role,'tenant_staff');assert.equal(m.permissions.ALL,undefined);});
test('revoked membership is rejected by actual callable transport',async()=>{await as('worker');await db.doc(`authz/${accounts.worker.uid}/companies/BRIDGE`).update({status:'revoked'});await denied(()=>call('tenantRead',{companyId:'BRIDGE',path:'companies/BRIDGE'}));await denied(()=>call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/bundles/salesOrders',operation:'set',data:{list:[]}}));});

test('approved admin preserves company state and cannot replace existing staff identity',async()=>{await as('admin');await call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE',operation:'set',data:{name:'Renamed Fixture'}});assert.equal((await db.doc('companies/BRIDGE').get()).data().status,'active');await denied(()=>call('tenantWrite',{companyId:'BRIDGE',path:'companies/BRIDGE/staffList/worker',operation:'update',data:{userId:'admin'}}));});
