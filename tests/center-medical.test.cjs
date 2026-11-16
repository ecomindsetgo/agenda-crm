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

test('El centro médico paga S/60 automáticamente al completar la cita y no crea deuda al paciente',()=>{
 const app=read('js/app.js'),platform=read('js/crm-platform.js'),core=read('js/crm-core.js'),ui=read('js/ui.js');
 assert.match(app,/paymentStatus:\s*isCenterOrigin \? \(newStatus === 'completada' \? 'pagado' : 'no_aplica'\)/);
 assert.match(app,/changes\.paymentStatus = newStatus === 'completada' \? 'pagado' : 'no_aplica'/);
 assert.match(app,/changes\.paidAmount = newStatus === 'completada' \? 60 : 0/);
 assert.match(app,/window\.registerCenterMedicalPayment = async function/);
 assert.match(app,/quickTogglePayment = async function/);
 assert.match(app,/if \(isCenterMedicalAppointment\(a\)\) return window\.registerCenterMedicalPayment\(aid\)/);
 assert.match(app,/Registrar S\/60/);
 assert.match(core,/if\(isCenterMedical\(a\)\)return completed\(a\)&&!cancelled\(a\)\?cost\(a\):0/);
 assert.match(core,/withPatientCareOrigin/);
 assert.match(core,/const remaining=a=>isCenterMedical\(a\)\|\|cancelled\(a\)\?0/);
 assert.match(platform,/Ingresos recibidos/);
 assert.doesNotMatch(platform,/Liquidaciones del centro médico|data-center-settle/);
 assert.match(ui,/paga a Lisbeth al culminar la atención/);
 assert.doesNotMatch(app,/registerCenterSettlement|settlementHistory|settlementPaid\(/);
});
