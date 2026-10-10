const assert=require('node:assert/strict');require('../js/crm-core.js');const C=globalThis.CRMCore;
const legacy={cost:50,paymentStatus:'pagado'};assert.equal(C.paymentState(legacy),'pagado');assert.equal(C.paid(legacy),50);
const reversed={...legacy,paidAmount:0,paymentStatus:'pendiente',paymentHistory:[{amount:50},{amount:-50,type:'reversal'}]};assert.equal(C.paymentState(reversed),'pendiente');assert.equal(C.remaining(reversed),50);assert.equal(C.paymentMismatch(reversed),false);
const conflict={cost:50,paidAmount:50,paymentStatus:'pendiente'};assert.equal(C.paymentState(conflict),'pagado');assert.equal(C.paymentMismatch(conflict),true);
const partial={cost:50,paidAmount:20,paymentStatus:'pendiente'};assert.equal(C.paymentState(partial),'parcial');assert.equal(C.remaining(partial),30);
console.log('OK: legacy, reversión, conflicto y abono parcial');
