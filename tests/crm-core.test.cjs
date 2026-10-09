const assert=require('node:assert/strict');
require('../js/crm-core.js');const C=globalThis.CRMCore;
const records=[
 {patientId:'p1',status:'completada',cost:100,paidAmount:40,paymentStatus:'pendiente'},
 {patientId:'p2',status:'pendiente',cost:60,paymentStatus:'pagado'},
 {patientId:'p3',status:'completada',cost:25,currency:'USD',paymentStatus:'pagado'},
 {patientId:'p4',status:'cancelada',cost:50,paidAmount:10,paymentStatus:'pendiente'},
 {recordType:'manual_block',cost:9999},
 {patientId:'p5',status:'completada',cost:30,paidAmount:999,currency:'USD'}
];
const m=C.metrics(records);
assert.equal(m.citas,5);assert.equal(m.PEN.facturado,160);assert.equal(m.PEN.cobrado,110);assert.equal(m.PEN.porCobrar,60);assert.equal(m.PEN.vencido,60);assert.equal(m.PEN.futuro,0);assert.equal(m.USD.cobrado,55);assert.equal(m.USD.porCobrar,0);
assert.equal(C.remaining({cost:50,paidAmount:100}),0);assert.equal(C.paid({cost:'100',paidAmount:'20'}),20);
assert.equal(C.cost({cost:'NaN'}),0);assert.equal(C.cost({cost:-20}),0);assert.equal(C.numeric(Infinity),0);
assert.equal(C.remaining({status:'no_asistio',cost:100}),0);
assert.equal(C.safeURL('javascript:alert(1)'),'');assert.equal(C.safeURL('data:text/html,bad'),'');assert.ok(C.safeURL('https://example.com/documento').startsWith('https://'));
assert.equal(C.csvCell('=SUM(A1)'),'"\'=SUM(A1)"');assert.equal(C.csvCell('Ana "López"'),'"Ana ""López"""');
assert.equal(C.inRange({date:'2026-10-09'},'2026-10-01','2026-10-09'),true);assert.equal(C.inRange({date:'2026-11-01'},'2026-10-01','2026-10-09'),false);
assert.equal(C.dateKey(new Date('2026-10-10T02:00:00Z')),'2026-10-09');
for(const cur of ['PEN','USD']){assert.ok(m[cur].porCobrar>=0);assert.ok(m[cur].cobrado>=0);assert.equal(m[cur].porCobrar,m[cur].vencido+m[cur].futuro);}
console.log('OK: abonos, cancelaciones con cobro, monedas, bloqueos, valores inválidos, fechas, enlaces y CSV.');
