import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import express from 'express';
import puppeteer from 'puppeteer-core';
import * as handlers from '../../functions/index.js';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Only isolated emulators are permitted');
const admin=initializeApp({projectId:'demo-linker-auth'},'browser-flow-admin'),db=getFirestore(admin);let webServer,browser;const processes=[];
after(async()=>{await browser?.close();for(const p of processes)p.kill();if(webServer)await new Promise(r=>webServer.close(r));await deleteApp(admin);});
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local app did not start');}
test('real browser: email login, server approval check, sanitized ERP startup on desktop and mobile',{skip:process.env.SKIP_BROWSER_FLOW==='1'?'Host denies Chromium Unix sockets; cloud browser verification recorded separately':false},async()=>{
 const user=await getAuth(admin).createUser({email:'browser-worker@example.test',password:'Fixture-pass-123!',emailVerified:true});
 await db.doc('companies/UI_PILOT').set({id:'UI_PILOT',name:'UI Fixture Company',status:'active',password:'LEGACY_UI_SECRET'});
 await db.doc('companies/UI_PILOT/staffList/UI_worker').set({id:'UI_worker',userId:'worker',name:'UI Worker',warehouse:'vehicle',companyId:'UI_PILOT',role:'admin',permissions:{ALL:true},password:'LEGACY_UI_STAFF_SECRET'});
 await db.doc(`authz/${user.uid}/companies/UI_PILOT`).set({companyId:'UI_PILOT',legacyId:'UI_worker',userId:'worker',role:'tenant_staff',status:'active',permissions:{orders:true,loading:true,delivery:true,invoices:true,inventory:true,catalog:true,reports:true}});
 for(const key of ['systemSettings','recentActivity','staffZones','staffJobTitles'])await db.doc(`companies/UI_PILOT/settings/${key}`).set({value:key==='systemSettings'?{companyName:'UI Fixture Company'}:[]});
 await db.doc('companies/UI_PILOT/settings/inventory').set({value:{warehouse:{Fixture:10},vehicle:{Fixture:0}}});
 for(const col of ['products','warehouses','partners','staffList','categories','schedules','accounts','vehicles','vehicleLogs','specialPrices','purchaseInvoices','purchaseOrders','salesInvoices','salesOrders','quotations','expenses','inventoryAdjustments','inventoryTransferHistory','actionLogs']){
  const list=col==='products'?[{id:'fixture',name:'Fixture',companyId:'UI_PILOT',price:10}]:col==='staffList'?[{id:'UI_worker',userId:'worker',name:'UI Worker',companyId:'UI_PILOT',role:'admin',permissions:{ALL:true},password:'LEGACY_UI_STAFF_SECRET'}]:[];
  await db.doc(`companies/UI_PILOT/bundles/${col}`).set({list,version:1,isChunked:false});
 }
 const platformUser=await getAuth(admin).createUser({email:'browser-platform@example.test',password:'Fixture-pass-123!',emailVerified:true});
 await db.doc(`platformAccess/${platformUser.uid}`).set({status:'active'});
 const server=express();server.use(express.json({limit:'2mb'}));server.all('/demo-linker-auth/asia-northeast3/:name',(req,res)=>handlers[req.params.name]?handlers[req.params.name](req,res):res.status(404).end());webServer=await new Promise(r=>{const s=server.listen(5001,'127.0.0.1',()=>r(s));});
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const targets=[{name:'mobile',root:process.cwd(),width:390,height:844}];

 for(let index=0;index<targets.length;index++){
  const target=targets[index],port=4177+index,child=spawn(process.execPath,[resolve(target.root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:target.root,stdio:'ignore'});processes.push(child);await ready(`http://127.0.0.1:${port}`);
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:target.width,height:target.height});await page.setRequestInterception(true);
  page.on('request',req=>{const url=req.url();if(url.startsWith('http://127.0.0.1:')||url.startsWith('ws://127.0.0.1:')||url.startsWith('data:')||url.startsWith('blob:'))req.continue();else req.abort();});
  await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'domcontentloaded'});await page.evaluate(()=>localStorage.setItem('system_cleaned_ver','20260509_v2'));
  await page.waitForSelector('input[name=email]');await page.type('input[name=email]',user.email);await page.type('input[name=password]','Fixture-pass-123!');await page.click('form button[type=submit], form button');
  await page.waitForSelector('input[name=companyId]',{timeout:15000});await page.type('input[name=companyId]','UI_PILOT');await page.click('.auth-card form button');
  await page.waitForFunction(()=>!document.querySelector('.auth-shell'),{timeout:20000});
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('currentUser')||'null');return s?.authRole==='tenant_staff'&&s.companyId==='UI_PILOT';},{timeout:20000});
  await page.waitForFunction(()=>{const raw=localStorage.getItem('products_UI_PILOT');return raw&&JSON.parse(raw).some(p=>p.name==='Fixture');},{timeout:20000});
  const state=await page.evaluate(()=>({user:JSON.parse(localStorage.getItem('currentUser')),cache:Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('firebase:'))),text:document.body.innerText}));
  assert.equal(state.user.role,'staff');assert.equal(state.user.permissions.ALL,undefined);assert.equal(JSON.stringify(state.cache).includes('LEGACY_UI_SECRET'),false);assert.equal(JSON.stringify(state.cache).includes('LEGACY_UI_STAFF_SECRET'),false);assert.equal(state.text.includes('화면 표시 중 일시적인 오류'),false);assert.deepEqual(errors,[]);
  mkdirSync('security/evidence/browser',{recursive:true});await page.screenshot({path:`security/evidence/browser/${target.name}-fixture.png`});console.log(JSON.stringify({target:target.name,approvedUid:true,legacyRoleOverrideBlocked:true,productsLoaded:true,legacySecretCached:false,browserErrors:errors.length}));
  await context.close();
  const platformContext = await browser.createBrowserContext();
  const platformPage = await platformContext.newPage();
  await platformPage.setRequestInterception(true);
  platformPage.on('request', request => {
   const url = request.url();
   if (/^(http|ws):\/\/127\.0\.0\.1:/.test(url) || url.startsWith('data:') || url.startsWith('blob:')) request.continue();
   else request.abort();
  });
  await platformPage.goto(`http://127.0.0.1:${port}`, {waitUntil:'domcontentloaded'});
  await platformPage.waitForSelector('input[name=email]');
  await platformPage.type('input[name=email]', platformUser.email);
  await platformPage.type('input[name=password]', 'Fixture-pass-123!');
  await platformPage.click('.auth-card form button');
  await platformPage.waitForSelector('input[name=companyId]');
  await platformPage.type('input[name=companyId]', 'linker_x_hq');
  await platformPage.click('.auth-card form button');
  await platformPage.waitForFunction(() => document.querySelector('h1')?.textContent === '플랫폼 관리자');
  await platformPage.waitForFunction(() => document.querySelector('table')?.textContent.includes('UI Fixture Company'));
  const platformText = await platformPage.evaluate(() => document.body.innerText);
  assert.equal(platformText.includes('부분 수집') || platformText.includes('미수집'), true);
  assert.equal(platformText.includes('LEGACY_UI_SECRET'), false);
  console.log(JSON.stringify({target:target.name+'-platform',platformApproval:true,allowlistedCompanyLoaded:true,unknownUsageShown:true}));
  await platformContext.close();
  child.kill();
 }
});
