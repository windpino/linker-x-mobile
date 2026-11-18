import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutSecrets, clearLegacyCredentials } from '../../src/auth/sanitize.js';
test('nested secrets are excluded from business profiles',()=>{assert.deepEqual(withoutSecrets({name:'Fixture',password:'dummy',contacts:[{password2:'dummy',name:'F'}],permissions:{orders:true}}),{name:'Fixture',contacts:[{name:'F'}],permissions:{orders:true}});});
test('old password keys and cached profiles are purged',()=>{const map=new Map([['savedLoginPw','dummy'],['currentUser','{}'],['partners_A',JSON.stringify([{name:'F',password:'dummy'}])]]);const storage={get length(){return map.size},key:i=>[...map.keys()][i],removeItem:k=>map.delete(k),getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};clearLegacyCredentials(storage);assert.equal(map.has('savedLoginPw'),false);assert.equal(map.has('currentUser'),false);assert.deepEqual(JSON.parse(map.get('partners_A')),[{name:'F'}]);});
test('storage write guard excludes password fields and preserves SDK token state',async()=>{
 class MemoryStorage {constructor(){this.map=new Map()}getItem(k){return this.map.get(k)||null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
 globalThis.Storage=MemoryStorage;
 await import('../../src/auth/storageGuard.js');const storage=new MemoryStorage();
 storage.setItem('savedAgencyPw','dummy');assert.equal(storage.getItem('savedAgencyPw'),null);
 storage.setItem('partners_A',JSON.stringify([{name:'Fixture',contacts:[{password3:'dummy',phone:'fixture'}]}]));assert.deepEqual(JSON.parse(storage.getItem('partners_A')),[{name:'Fixture',contacts:[{phone:'fixture'}]}]);
 storage.setItem('firebase:auth',JSON.stringify({token:'fixture-token'}));assert.equal(JSON.parse(storage.getItem('firebase:auth')).token,'fixture-token');delete globalThis.Storage;
});
