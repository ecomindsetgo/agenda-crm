const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const handlers={},self={registration:{scope:'https://consulta.test/agenda/'},location:{origin:'https://consulta.test'},addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8'),{self,URL,Set,Request,Promise,caches:{open:async()=>({match:async()=>({offline:true})})},fetch:async()=>{throw Error('sin red')}});
function intercepted(url,method='GET',mode='cors'){let called=false,promise;handlers.fetch({request:{url,method,mode},respondWith(p){called=true;promise=p;},waitUntil(){}});return {called,promise};}
assert.equal(intercepted('https://firestore.googleapis.com/v1/patients').called,false);
assert.equal(intercepted('https://consulta.test/agenda/api/patients').called,false);
assert.equal(intercepted('https://consulta.test/agenda/informe-paciente.pdf').called,false);
assert.equal(intercepted('https://consulta.test/agenda/js/app.js','POST').called,false);
assert.equal(intercepted('https://consulta.test/agenda/js/app.js?v=crm-pro-5').called,true);
(async()=>{const result=intercepted('https://consulta.test/agenda/','GET','navigate');assert.equal((await result.promise).offline,true);console.log('OK: no intercepta API, Firestore, PDFs ni escrituras; ofrece página de desconexión.');})();
