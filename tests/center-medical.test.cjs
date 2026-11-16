'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('La ficha separa procedencia asistencial del origen de captación',()=>{
 const ui=read('js/ui.js'),app=read('js/app.js');
 assert.match(ui,/id="pat-care-origin"/);
 assert.match(ui,/id="app-care-origin"/);
 assert.match(ui,/syncAppointmentCareOriginFromPatient\(\)/);
 assert.match(app,/careOrigin:\s*document\.getElementById\('pat-care-origin'\)/);
 assert.match(app,/collectionMode:\s*isCenterOrigin \? 'centro_medico' : 'particular'/);
});

test('Las citas del centro médico permiten agregar pagos con el mismo flujo que las particulares',()=>{
 const app=read('js/app.js'),core=read('js/crm-core.js'),experience=read('js/experience.js'),platform=read('js/crm-platform.js');
 assert.match(app,/window\.registerAppointmentPayment = async function/);
 assert.match(app,/window\.quickTogglePayment = async function/);
 assert.match(app,/isCenterMedicalAppointment\(a\)\?'Centro médico':'Efectivo'/);
 assert.match(app,/window\.registerCenterMedicalPayment = function\(aid\) \{ return window\.quickTogglePayment\(aid\); \}/);
 assert.match(app,/title="Agregar un pago a esta cita"/);
 assert.match(app,/appointmentPaymentState === 'pagado' \? 'Pagado'/);
 assert.match(core,/const paid=a=>\{const hasAmount/);
 assert.match(core,/const remaining=a=>cancelled\(a\)\?0/);
 assert.match(experience,/C\.withPatientCareOrigin\(a,/);
 assert.match(experience,/id=\"elo-payment-form\" data-appointment=/);
 assert.match(platform,/Pagos pendientes/);
 assert.match(platform,/C\.remaining\(a\)>0/);
 assert.doesNotMatch(app,/El centro médico paga S\/60.*automáticamente/);
 assert.doesNotMatch(app,/changes\.paidAmount = newStatus === 'completada' \? 60 : 0/);
});

test('Finanzas incluye las citas del centro en facturado y separa lo cobrado de lo pendiente',()=>{
 const core=read('js/crm-core.js'),app=read('js/app.js'),platform=read('js/crm-platform.js');
 assert.match(core,/b\.facturado\+=price/);
 assert.match(core,/b\.cobrado\+=received/);
 assert.match(core,/b\.porCobrar\+=due/);
 assert.match(app,/const resolved = source\.map\(resolveAppointmentCareOrigin\)/);
 assert.match(platform,/Incluye los pagos registrados de citas particulares y del centro médico/);
 assert.match(platform,/C\.isCenterMedical\(a\)\?'Centro médico':'Particular'/);
});
