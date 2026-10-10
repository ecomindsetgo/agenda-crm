const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../js/crm-core.js'); const C=globalThis.CRMCore;
const canceled={cost:50,paidAmount:20,status:'cancelada',paymentStatus:'parcial'};
const active={cost:100,paidAmount:25,status:'completada',paymentStatus:'pagado'};
const m=C.metrics([canceled,active]);
assert.equal(m.PEN.cobrado,45); // El dinero recibido no se borra al cancelar.
assert.equal(m.PEN.anticiposCancelados,20); // Pero se informa separado.
assert.equal(m.PEN.facturado,100);
assert.equal(m.tasaCobranzaPEN,25); // No contar anticipos cancelados como cobranza de sesiones vigentes.
assert.equal(C.paymentState(active),'parcial');
assert.equal(C.remaining(active),75);
const source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
assert.match(source,/const paid = window\.CRMCore\.paid\(original\)/);
const rules=fs.readFileSync(path.join(__dirname,'../firestore.owner.rules'),'utf8');
assert.match(rules,/allow delete: if owner\(userId\)/);
assert.match(rules,/request\.resource\.data\.deletedBy == request\.auth\.uid/);
assert.match(rules,/allow update, delete: if false/);
console.log('OK V8.11: reconciliación, cancelación con anticipo, borrado controlado y auditoría.');
