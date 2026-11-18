import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
import {moveStockAtomic,revertAutoMoveStockAtomic,recordSalesInvoiceStockAtomic,revertSalesInvoiceStockAtomic} from '../fixtures/stockTransactionService.js';
let env;const cid='STOCK_AUTH';const fixture={from:'warehouse',to:'vehicle',productName:'Fixture',qty:2,isAuto:true};
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw Error('demo emulator required');
 env=await initializeTestEnvironment({projectId:'demo-linker-auth',firestore:{rules:readFileSync(new URL('../firestore.auth.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();await setDoc(doc(d,'companies',cid),{status:'active'});await setDoc(doc(d,'companies','OTHER_STOCK'),{status:'active'});for(const uid of ['driver1','driver2'])await setDoc(doc(d,'authz',uid,'companies',cid),{companyId:cid,status:'active',role:'tenant_staff',permissions:{inventory:true,invoices:true,orders:true},legacyId:uid});await setDoc(doc(d,'companies',cid,'settings','inventory'),{value:{warehouse:{Fixture:0},vehicle:{Fixture:0}}});});
});
after(async()=>{await env?.cleanup();});
const staff=uid=>env.authenticatedContext(uid,{email_verified:true}).firestore();
async function stock(){return (await getDoc(doc(staff('driver1'),'companies',cid,'settings','inventory'))).data().value;}
test('unchanged Antigravity source runs order/loading/delivery/invoice lifecycle under restrictive auth rules',async()=>{
 const db=staff('driver1');await setDoc(doc(db,'companies',cid,'salesOrders','authOrder'),{companyId:cid,status:'대기',items:[{name:'Fixture',qty:2}]});
 await moveStockAtomic({...fixture,db,companyId:cid,operationId:'auth_load_1',relatedOrderId:'authOrder'});let value=await stock();assert.equal(value.warehouse.Fixture,-2);assert.equal(value.vehicle.Fixture,2);
 await revertAutoMoveStockAtomic({...fixture,db,companyId:cid,relatedOrderId:'auth_load_1',operationId:'auth_cancel_1'});value=await stock();assert.equal(value.warehouse.Fixture,0);assert.equal(value.vehicle.Fixture,0);
 await moveStockAtomic({...fixture,db,companyId:cid,operationId:'auth_reload_1'});
 await recordSalesInvoiceStockAtomic({db,companyId:cid,invoiceId:'auth_invoice',warehouse:'vehicle',items:[{name:'Fixture',qty:2}]});
 await setDoc(doc(db,'companies',cid,'salesInvoices','auth_invoice'),{companyId:cid,items:[{name:'Fixture',qty:2}]});value=await stock();assert.equal(value.warehouse.Fixture,-2);assert.equal(value.vehicle.Fixture,0);assert.equal(value['매출출고'].Fixture,2);
 await revertSalesInvoiceStockAtomic({db,companyId:cid,invoiceId:'auth_invoice',warehouse:'vehicle',items:[{name:'Fixture',qty:2}]});value=await stock();assert.equal(value.warehouse.Fixture,-2);assert.equal(value.vehicle.Fixture,2);assert.equal(value['매출출고'].Fixture,0);
});
test('two authorized staff retry duplicate operation without double deduction',async()=>{const req={...fixture,qty:3,companyId:cid,operationId:'auth_duplicate'};const results=await Promise.all([moveStockAtomic({...req,db:staff('driver1')}),moveStockAtomic({...req,db:staff('driver2')})]);assert.equal(results.filter(x=>x.alreadyProcessed).length,1);const v=await stock();assert.equal(v.warehouse.Fixture,-5);assert.equal(v.vehicle.Fixture,5);});
test('unchanged transaction service denied to unauthenticated and other-company callers',async()=>{await assertFails(moveStockAtomic({...fixture,db:env.unauthenticatedContext().firestore(),companyId:cid,operationId:'unauth'}));await assertFails(moveStockAtomic({...fixture,db:staff('driver1'),companyId:'OTHER_STOCK',operationId:'cross'}));});
test('revoked driver cannot replay pending operation after reconnection',async()=>{await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'authz','driver2','companies',cid),{status:'revoked'}));await assertFails(moveStockAtomic({...fixture,db:staff('driver2'),companyId:cid,operationId:'revoked_retry'}));const v=await stock();assert.equal(v.warehouse.Fixture,-5);});
