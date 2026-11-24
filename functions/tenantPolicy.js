// Shared server access policy; clients never choose their company membership or role.
export const collectionPolicy = {
 products:['catalog','orders','loading','invoices'], categories:['catalog','orders','loading','invoices'], warehouses:['catalog','orders','loading','invoices'],
 vehicles:['catalog','loading','delivery'],vehicleLogs:['catalog','loading','delivery'],
 salesOrders:['orders','loading','delivery'], purchaseOrders:['orders'],quotations:['orders','reports'],
 salesInvoices:['invoices','reports'],purchaseInvoices:['invoices','reports'],accounts:['invoices','reports'],specialPrices:['orders','invoices'],expenses:['invoices','reports'],
 inventoryAdjustments:['inventory'],inventoryTransferHistory:['inventory'],operations:['inventory'],schedules:['orders','loading','delivery'],schedule_types:['orders','loading','delivery'],
 scheduleTypes:['orders','loading','delivery'],staffZones:['catalog','orders'],staffJobTitles:['catalog','orders'],dashboardConfig:['reports'],actionLogs:['reports']
};
export function hasCapability(m,keys){return m?.status==='active' && (m.role==='tenant_admin'||m.role==='admin'||m.authRole==='tenant_admin'||m.isCompanyAdmin===true||m.isMasterAdmin===true||(m.role==='tenant_staff'&&keys.some(k=>m.permissions?.[k]===true)));}
export function canReadCollection(m,col){
 if(m?.status==='active' && (m.role==='tenant_admin'||m.role==='admin'||m.authRole==='tenant_admin'||m.isCompanyAdmin===true||m.isMasterAdmin===true)) return true;
 if(['staffList','partners'].includes(col))return hasCapability(m,['orders','loading','delivery','invoices','catalog']);
 return !!collectionPolicy[col]&&hasCapability(m,collectionPolicy[col]);
}
export function canWriteCollection(m,col){
 if(m?.status==='active' && (m.role==='tenant_admin'||m.role==='admin'||m.authRole==='tenant_admin'||m.isCompanyAdmin===true||m.isMasterAdmin===true)) return true;
 if(['staffList','partners'].includes(col))return m?.status==='active'&&m.role==='tenant_admin';
 const writeMap={products:['catalog'],categories:['catalog'],warehouses:['catalog'],vehicles:['catalog'],vehicleLogs:['loading','delivery'],salesInvoices:['invoices'],purchaseInvoices:['invoices'],accounts:['invoices'],expenses:['invoices'],specialPrices:['invoices'],actionLogs:['orders','loading','delivery','invoices','inventory']};
 return !!collectionPolicy[col]&&hasCapability(m,writeMap[col]||collectionPolicy[col].filter(k=>k!=='reports'));
}
const secrets=/password|passwd|^pwd$|token|credential|api.?key|secret|authUid|permissions|^role$|isPlatform|isCompanyAdmin|allowAllEditDelete|allowSpecialPriceSave/i;
export function publicBusiness(value){
 if(Array.isArray(value))return value.map(publicBusiness);
 if(value && typeof value==='object'){
  if(typeof value.toDate==='function')return value.toDate().toISOString();
  return Object.fromEntries(Object.entries(value).filter(([k])=>!secrets.test(k)).map(([k,v])=>[k,publicBusiness(v)]));
 }
 return value;
}
export function directoryProjection(col,raw,m,actorName){
 const row=publicBusiness(raw);
 if(col==='staffList'&&m.role!=='tenant_admin'){
  return Object.fromEntries(['id','userId','name','jobTitle','warehouse','zone','companyId','_docId'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
 }
 if(col==='partners'&&m.role!=='tenant_admin'){
  if(!actorName||String(raw.manager||'').trim()!==String(actorName).trim())return null;
  return Object.fromEntries(['id','clientId','name','ceo','businessNo','address','phone','contact','manager','type','status','companyId','_docId','aliases'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
 }
 return row;
}
