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

test('Las citas del centro no se registran como cobros al paciente y tienen liquidación auditada',()=>{
 const app=read('js/app.js'),platform=read('js/crm-platform.js'),core=read('js/crm-core.js');
 assert.match(app,/paymentStatus:\s*isCenterOrigin \? 'no_aplica'/);
 assert.match(app,/window\.registerCenterSettlement = async function/);
 assert.match(app,/settlementHistory:\s*\[\.\.\.history/);
 assert.match(app,/El paciente paga al centro médico/);
 assert.match(platform,/Liquidaciones del centro médico/);
 assert.match(platform,/data-center-settle/);
 assert.match(core,/const paid=a=>\{if\(isCenterMedical\(a\)\)return 0/);
});
