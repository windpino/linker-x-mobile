// A single entry-point guard for legacy JSON business caches. Firebase SDK persistence
// is left intact: only reusable PASSWORD fields and password preference keys are removed.
const passwordKey = /password|passwd|^pwd$|saved.*pw/i;
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k])=>!passwordKey.test(k)).map(([k,v])=>[k,clean(v)]));
  return value;
}
if (typeof Storage !== 'undefined' && !Storage.prototype.__linkerPasswordGuard) {
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(passwordKey.test(String(key))) { this.removeItem(key);return; }
    let next=String(value);try{next=JSON.stringify(clean(JSON.parse(next)));}catch{/* plain preferences */}
    return original.call(this,key,next);
  };
  Object.defineProperty(Storage.prototype,'__linkerPasswordGuard',{value:true});
}
