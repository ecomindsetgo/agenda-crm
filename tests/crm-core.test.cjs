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
const center={patientId:'p6',status:'completada',cost:60,currency:'PEN',careOrigin:'centro_medico',collectionMode:'centro_medico',paymentStatus:'no_aplica',settlementAmount:60,settlementPaidAmount:20,settlementHistory:[{amount:20}]};
assert.equal(C.isCenterMedical(center),true);assert.equal(C.paid(center),0);assert.equal(C.remaining(center),0);assert.equal(C.paymentState(center),'no_aplica');
assert.equal(C.settlementDue(center),60);assert.equal(C.settlementPaid(center),20);assert.equal(C.settlementRemaining(center),40);assert.equal(C.settlementState(center),'parcial');
const withCenter=C.metrics([...records,center]);assert.equal(withCenter.PEN.facturado,m.PEN.facturado);assert.equal(withCenter.PEN.cobrado,m.PEN.cobrado);assert.equal(withCenter.centroMedico.honorarios,60);assert.equal(withCenter.centroMedico.liquidado,20);assert.equal(withCenter.centroMedico.porLiquidar,40);
const fullySettled={...center,settlementPaidAmount:60};assert.equal(C.settlementRemaining(fullySettled),0);assert.equal(C.settlementState(fullySettled),'liquidado');
assert.equal(C.safeURL('javascript:alert(1)'),'');assert.equal(C.safeURL('data:text/html,bad'),'');assert.ok(C.safeURL('https://example.com/documento').startsWith('https://'));
assert.equal(C.csvCell('=SUM(A1)'),'"\'=SUM(A1)"');assert.equal(C.csvCell('Ana "López"'),'"Ana ""López"""');
assert.equal(C.inRange({date:'2026-10-09'},'2026-10-01','2026-10-09'),true);assert.equal(C.inRange({date:'2026-11-01'},'2026-10-01','2026-10-09'),false);
assert.equal(C.dateKey(new Date('2026-10-10T02:00:00Z')),'2026-10-09');
for(const cur of ['PEN','USD']){assert.ok(m[cur].porCobrar>=0);assert.ok(m[cur].cobrado>=0);assert.equal(m[cur].porCobrar,m[cur].vencido+m[cur].futuro);}
console.log('OK: abonos, cancelaciones con cobro, monedas, bloqueos, valores inválidos, fechas, enlaces y CSV.');
