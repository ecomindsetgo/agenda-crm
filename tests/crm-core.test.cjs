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
const center={patientId:'p6',status:'completada',cost:60,currency:'PEN',careOrigin:'centro_medico',collectionMode:'centro_medico',paymentStatus:'pendiente',paidAmount:0};
assert.equal(C.isCenterMedical(center),true);assert.equal(C.cost(center),60);assert.equal(C.paid(center),0);assert.equal(C.remaining(center),60);assert.equal(C.paymentState(center),'pendiente');
const withCenter=C.metrics([...records,center]);assert.equal(withCenter.PEN.facturado,m.PEN.facturado+60);assert.equal(withCenter.PEN.cobrado,m.PEN.cobrado);assert.equal(withCenter.PEN.porCobrar,m.PEN.porCobrar+60);assert.equal(withCenter.centroMedico.ingresos,0);
const paidCenter={...center,paidAmount:60,paymentStatus:'pagado'};
assert.equal(C.paid(paidCenter),60);assert.equal(C.remaining(paidCenter),0);assert.equal(C.paymentState(paidCenter),'pagado');
const withPaidCenter=C.metrics([...records,paidCenter]);assert.equal(withPaidCenter.PEN.facturado,m.PEN.facturado+60);assert.equal(withPaidCenter.PEN.cobrado,m.PEN.cobrado+60);assert.equal(withPaidCenter.centroMedico.ingresos,60);assert.equal(withPaidCenter.citasPagadas,m.citasPagadas+1);
const partialCenter={...center,paidAmount:20,paymentStatus:'parcial'};assert.equal(C.paid(partialCenter),20);assert.equal(C.remaining(partialCenter),40);assert.equal(C.paymentState(partialCenter),'parcial');
const scheduledCenter={...center,status:'pendiente'};assert.equal(C.paid(scheduledCenter),0);assert.equal(C.remaining(scheduledCenter),60);assert.equal(C.paymentState(scheduledCenter),'pendiente');
const legacyCenter=C.withPatientCareOrigin({id:'old-center',patientId:'pc',status:'Completada',cost:45},{id:'pc',careOrigin:'centro_medico'});
assert.equal(C.isCenterMedical(legacyCenter),true);assert.equal(C.cost(legacyCenter),60);assert.equal(C.currency(legacyCenter),'PEN');assert.equal(C.paid(legacyCenter),0);assert.equal(C.remaining(legacyCenter),60);
const legacyMetrics=C.metrics([legacyCenter]);assert.equal(legacyMetrics.PEN.facturado,60);assert.equal(legacyMetrics.PEN.cobrado,0);assert.equal(legacyMetrics.centroMedico.ingresos,0);
const legacyPaid=C.withPatientCareOrigin({id:'old-paid',patientId:'pc',status:'Completada',paymentStatus:'pagado'},{id:'pc',careOrigin:'centro_medico'});assert.equal(C.paid(legacyPaid),60);
assert.equal(C.completed({status:'COMPLETADA'}),true);assert.equal(C.cancelled({status:'No asistió'}),true);
const explicitPrivate=C.withPatientCareOrigin({patientId:'pc',careOrigin:'particular',cost:50},{id:'pc',careOrigin:'centro_medico'});assert.equal(C.isCenterMedical(explicitPrivate),false);
const withScheduled=C.metrics([...records,scheduledCenter]);assert.equal(withScheduled.PEN.facturado,m.PEN.facturado+60);assert.equal(withScheduled.PEN.cobrado,m.PEN.cobrado);assert.equal(withScheduled.PEN.futuro,m.PEN.futuro+60);assert.equal(withScheduled.centroMedico.ingresos,0);
const cancelledCenter={...center,status:'no_asistio'};assert.equal(C.paid(cancelledCenter),0);assert.equal(C.remaining(cancelledCenter),0);assert.equal(C.paymentState(cancelledCenter),'no_aplica');
assert.equal(C.safeURL('javascript:alert(1)'),'');assert.equal(C.safeURL('data:text/html,bad'),'');assert.ok(C.safeURL('https://example.com/documento').startsWith('https://'));
assert.equal(C.csvCell('=SUM(A1)'),"\"'=SUM(A1)\"");assert.equal(C.csvCell('Ana "López"'),'"Ana ""López"""');
assert.equal(C.inRange({date:'2026-10-09'},'2026-10-01','2026-10-09'),true);assert.equal(C.inRange({date:'2026-11-01'},'2026-10-01','2026-10-09'),false);
for(const cur of ['PEN','USD']){assert.ok(m[cur].porCobrar>=0);assert.ok(m[cur].cobrado>=0);assert.equal(m[cur].porCobrar,m[cur].vencido+m[cur].futuro);}
console.log('OK: pagos particulares y centro médico, abonos, facturación global, cancelaciones, monedas, bloqueos, fechas y CSV.');
