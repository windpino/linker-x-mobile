import * as handlers from '../../functions/index.js';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, sendEmailVerification, applyActionCode, sendPasswordResetEmail, confirmPasswordReset, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { initializeApp as adminApp, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw Error('emulators required');
const project='demo-linker-auth', app=initializeApp({projectId:project,apiKey:'demo-key'},'auth-tests'),auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});auth.languageCode='ko';
const admin=adminApp({projectId:project},'auth-tests-admin'),adb=getFirestore(admin);
async function call(name,data,token){
 try {
  const decoded=token ? await adminAuth(admin).verifyIdToken(token) : null;
  const result=await handlers[name].run({data,auth:decoded?{uid:decoded.uid,token:decoded}:undefined});
  return {status:200,body:{result}};
 } catch(error) { return {status:({'unauthenticated':401,'permission-denied':403,'invalid-argument':400,'failed-precondition':400,'already-exists':409})[error.code]||500,body:{error:{code:error.code,message:error.message}}}; }
}
const codes=async()=> (await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${project}/oobCodes`)).json()).oobCodes;
after(async()=>{await signOut(auth);await deleteApp(app);await deleteAdmin(admin);});
test('email signup, verification, reset and callable approval boundary',async()=>{
 const email='auth-fixture@example.test',old='Fixture-password-1!',fresh='Fixture-password-2!';
 const u=(await createUserWithEmailAndPassword(auth,email,old)).user;
 assert.equal(u.emailVerified,false);await sendEmailVerification(u);
 assert.equal((await call('requestMembership',{companyId:'C',legacyId:'C_employee',role:'tenant_staff'},await u.getIdToken())).status,403);
 const verification=(await codes()).find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');assert.ok(verification); // Emulator OOB link stays lang=en; real localized delivery is a separate production-approved test.
 await applyActionCode(auth,verification.oobCode);await u.reload();await u.getIdToken(true);assert.equal(u.emailVerified,true);
 await sendPasswordResetEmail(auth,email);const reset=(await codes()).find(c=>c.email===email&&c.requestType==='PASSWORD_RESET');assert.ok(reset);await confirmPasswordReset(auth,reset.oobCode,fresh);
 await signOut(auth);await assert.rejects(signInWithEmailAndPassword(auth,email,old));await signInWithEmailAndPassword(auth,email,fresh);
 const token=await auth.currentUser.getIdToken(true);
 await adb.doc('companies/C').set({id:'C',status:'active'});
 assert.equal((await call('authSession',{companyId:'C'},token)).status,403);
 const request=await call('requestMembership',{companyId:'C',legacyId:'C_employee',role:'tenant_staff',name:'Fixture',phone:'',companyName:'Fixture Company'},token);assert.equal(request.status,200,JSON.stringify(request.body));
 assert.equal((await call('approveMembership',{companyId:'C',uid:u.uid,confirmLegacyLink:true},token)).status,403);
 assert.equal((await call('authSession',{companyId:'C'},token)).status,403);
 // Verified explicit admin, not matched by email, approves existing exact document ID.
 const adminUser=await adminAuth(admin).createUser({email:'admin-fixture@example.test',password:old,emailVerified:true});
 await adb.doc(`authz/${adminUser.uid}/companies/C`).set({uid:adminUser.uid,companyId:'C',legacyId:'C_admin',role:'tenant_admin',status:'active',permissions:{}});
 await adb.doc('companies/C/staffList/C_employee').set({id:'C_employee',userId:'employee',companyId:'C',name:'Fixture',password:'legacy-fixture-secret',role:'admin',permissions:{ALL:true}});
 await signInWithEmailAndPassword(auth,'admin-fixture@example.test',old);const adminToken=await auth.currentUser.getIdToken(true);
 const approved=await call('approveMembership',{companyId:'C',uid:u.uid,confirmLegacyLink:true,permissions:{orders:true,ALL:true}},adminToken);assert.equal(approved.status,200,JSON.stringify(approved.body));
 await signInWithEmailAndPassword(auth,email,fresh);const session=await call('authSession',{companyId:'C'},await auth.currentUser.getIdToken(true));assert.equal(session.status,200,JSON.stringify(session.body));const data=session.body.result;
 assert.equal(data.authUid,u.uid);assert.equal(data.companyId,'C');assert.equal(data.legacyId,'C_employee');assert.equal(data.role,'staff');assert.equal(data.password,undefined);assert.equal(data.permissions.ALL,undefined);assert.equal(data.permissions.orders,true);
 assert.equal((await call('authSession',{companyId:'OTHER'},await auth.currentUser.getIdToken())).status,403);
 await adb.doc('companies/C').update({status:'suspended'});assert.equal((await call('authSession',{companyId:'C'},await auth.currentUser.getIdToken())).status,403);
});
test('Google credential authenticates but grants no business membership',async()=>{
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const jwt=encode({alg:'none',typ:'JWT'})+'.'+encode({sub:'fixture-google',email:'google-fixture@example.test',email_verified:true,name:'Google Fixture',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:'demo-client'})+'.';
 const result=await signInWithCredential(auth,GoogleAuthProvider.credential(jwt));assert.equal(result.user.providerData[0].providerId,'google.com');
 assert.equal((await call('authSession',{companyId:'C'},await result.user.getIdToken())).status,403);
});
test('callable without identity denied',async()=>{assert.equal((await call('authSession',{companyId:'C'})).status,401);});
test('tenant admin cannot approve representative and duplicate legacy binding denied',async()=>{
 const pass='Fixture-password-1!';
 await adb.doc('companies/C').update({status:'active'});
 const candidate=await adminAuth(admin).createUser({email:'candidate-fixture@example.test',password:pass,emailVerified:true});
 await signInWithEmailAndPassword(auth,candidate.email,pass);const candidateToken=await auth.currentUser.getIdToken(true);
 assert.equal((await call('requestMembership',{companyId:'C',legacyId:'C_owner',role:'tenant_admin',name:'Candidate'},candidateToken)).status,200);
 await signInWithEmailAndPassword(auth,'admin-fixture@example.test',pass);const tenantToken=await auth.currentUser.getIdToken(true);
 assert.equal((await call('approveMembership',{companyId:'C',uid:candidate.uid,confirmLegacyLink:true},tenantToken)).status,403);
 const platform=await adminAuth(admin).createUser({email:'platform-fixture@example.test',password:pass,emailVerified:true});await adb.doc(`platformAccess/${platform.uid}`).set({status:'active'});
 await signInWithEmailAndPassword(auth,platform.email,pass);const platformToken=await auth.currentUser.getIdToken(true);
 assert.equal((await call('approveMembership',{companyId:'C',uid:candidate.uid,confirmLegacyLink:true},platformToken)).status,200);
 await signInWithEmailAndPassword(auth,candidate.email,pass);const representative=await call('authSession',{companyId:'C'},await auth.currentUser.getIdToken(true));assert.equal(representative.body.result.authRole,'tenant_admin');assert.equal(representative.body.result.isPlatformAdmin,false);

 // A different verified UID cannot take over the already-bound exact legacy record.
 const duplicate=await adminAuth(admin).createUser({email:'duplicate-fixture@example.test',password:pass,emailVerified:true});
 await signInWithEmailAndPassword(auth,duplicate.email,pass);assert.equal((await call('requestMembership',{companyId:'C',legacyId:'C_employee',role:'tenant_staff'},await auth.currentUser.getIdToken(true))).status,200);
 assert.equal((await call('approveMembership',{companyId:'C',uid:duplicate.uid,confirmLegacyLink:true},tenantToken)).status,409);
 const staffUid=(await adminAuth(admin).getUserByEmail('auth-fixture@example.test')).uid;
 assert.equal((await call('updateMembership',{companyId:'C',uid:staffUid,status:'revoked',permissions:{}},tenantToken)).status,200);
 await signInWithEmailAndPassword(auth,'auth-fixture@example.test','Fixture-password-2!');assert.equal((await call('authSession',{companyId:'C'},await auth.currentUser.getIdToken(true))).status,403);
});
