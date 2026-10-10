const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');const base=path.resolve(__dirname,'..');const context={};vm.runInNewContext(fs.readFileSync(path.join(base,'js/crm-core.js'),'utf8'),context);const C=context.CRMCore;
const rows=[{id:'legacy',date:'2026-10-09',cost:50,paymentStatus:'pagado',paidAmount:0,status:'completada'},{id:'partial',date:'2026-10-09',cost:60,paymentStatus:'pagado',paidAmount:20,status:'completada'},{id:'original',date:'2026-10-09',cost:50,paymentStatus:'pagado',status:'completada'},{id:'cancel',date:'2026-10-09',cost:50,paidAmount:10,status:'cancelada'}];
assert.equal(C.paymentState(rows[0]),'pendiente');assert.equal(C.paid(rows[0]),0);assert.equal(C.remaining(rows[0]),50);
assert.equal(C.paymentState(rows[1]),'parcial');assert.equal(C.remaining(rows[1]),40);
assert.equal(C.paid(rows[2]),50);assert.equal(C.remaining(rows[2]),0);
assert.equal(C.remaining(rows[3]),0);assert.equal(C.metrics(rows).PEN.cobrado,80);
const ui=fs.readFileSync(path.join(base,'js/ui.js'),'utf8');const exp=fs.readFileSync(path.join(base,'js/experience.js'),'utf8');const app=fs.readFileSync(path.join(base,'js/app.js'),'utf8');
assert(ui.includes('window.CRMCore.remaining(a),0'));assert(ui.includes("document.getElementById('p360-timeline').innerHTML=apps.map"));assert(exp.includes("C.paymentState(a)==='pagado'"));assert(app.includes('const paidAmount = window.CRMCore.paid(a)'));console.log('PASS: legacy paid, reversal, partial, cancelled, old 360 and printed report amounts.');
