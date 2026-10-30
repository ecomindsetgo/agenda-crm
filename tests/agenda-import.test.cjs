const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx={Date,Set,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/agenda-import-core.js'),'utf8'),ctx);
const C=ctx.AgendaImportCore;
const patient={id:'p1',name:'Ana María López',dni:'12345678',currency:'PEN',phone:'987654321'};
const template=[['PACIENTE','FECHA','HORA','MODALIDAD','TIPO DE ATENCION','PRECIO','COBRADO','ESTADO','OBSERVACIONES','DNI','TELEFONO','MONEDA'],['Ana María López','30/10/2026','10:00','virtual','individual',45,0,'pendiente','Seguimiento','12345678','','PEN']];
const opts={patients:[patient],appointments:[],blocks:[],defaultRate:()=>50};
function review(rows,changed={}){return C.review(rows,{...opts,...changed});}

test('fecha peruana, ISO y serial Excel',()=>{
 assert.equal(C.excelDate('30/10/2026'),'2026-10-30');
 assert.equal(C.excelDate('2026-11-02'),'2026-11-02');
 assert.equal(C.excelDate('31/02/2026'),'');
 assert.equal(C.excelDate(1),'1899-12-31');
});
test('hora Excel: texto, fracción y AM/PM',()=>{
 assert.equal(C.excelTime('16:30'),'16:30');
 assert.equal(C.excelTime(.5),'12:00');
 assert.equal(C.excelTime('12:00 am'),'00:00');
 assert.equal(C.excelTime('5:30 PM'),'17:30');
 assert.equal(C.excelTime('25:00'),'');
});
test('se lee una fila de plantilla',()=>{
 const data=C.parseRows(template);assert.equal(data.length,1);assert.equal(data[0].patientName,'Ana María López');
 assert.equal(data[0].date,'2026-10-30');assert.equal(data[0].status,'pendiente');
 const res=review(data);assert.equal(res.ready.length,1);assert.equal(res.skipped.length,0);
});
test('se lee el horario semanal exportado con títulos y pie de totales',()=>{
 const rows=[['OCTUBRE'],[],['DEL 26 AL 31 DE OCTUBRE'],[],['ITEM','PACIENTE','MODALIDAD','FECHA','HORA','PRECIO','SI','COBRADO','OBSERVACION'],[1,'Ana María López','presencial','2026-10-30','11:00',50,'SI',30,'REALIZADO — Seguimiento'],['','','','','TOTAL',50,'',30,'']];
 const data=C.parseRows(rows);assert.equal(data.length,1);
 assert.equal(data[0].status,'completada');assert.equal(data[0].notes,'Seguimiento');assert.equal(data[0].paid,30);
});
test('se detecta una cita existente a una hora distinta con solapamiento',()=>{
 const rows=C.parseRows(template);
 const res=review(rows,{appointments:[{date:'2026-10-30',time:'10:30',status:'pendiente',patientId:'otro'}]});
 assert.equal(res.ready.length,0);assert.match(res.skipped[0].issues.join(),/Horario ocupado/);
});
test('se respeta bloqueo manual y se evita duplicado dentro del Excel',()=>{
 const rows=C.parseRows([...template,['Ana María López','30/10/2026','10:30','virtual','individual',45,0,'pendiente','','12345678','','PEN']]);
 const res=review(rows);assert.equal(res.ready.length,1);assert.equal(res.skipped.length,1);
 const blocked=review(rows,{blocks:[{date:'2026-10-30',blockStart:'09:30',blockEnd:'10:15'}]});
 assert.equal(blocked.ready.length,1);assert.equal(blocked.skipped.length,1);
});
test('paciente nuevo requiere consentimiento explícito',()=>{
 const rows=C.parseRows([template[0],['Paciente Nuevo','31/10/2026','17:00','presencial','individual','','','','','','','']]);
 assert.equal(review(rows).ready.length,0);
 const res=review(rows,{createPatients:true});assert.equal(res.ready.length,1);assert.equal(res.newPatients,1);
 assert.equal(res.ready[0].cost,50);
});
test('no se asigna el paciente equivocado cuando existe el mismo nombre',()=>{
 const rows=C.parseRows([template[0],['Ana María López','31/10/2026','17:00','presencial','individual',50,0,'pendiente','','','','PEN']]);
 const res=review(rows,{patients:[patient,{...patient,id:'p2',dni:'11223344'}]});
 assert.equal(res.ready.length,0);
});
test('rechaza importes cobrados superiores a precio y monedas distintas',()=>{
 const rows=C.parseRows([template[0],['Ana María López','31/10/2026','17:00','presencial','individual',50,70,'pendiente','','12345678','','USD']]);
 assert.equal(review(rows).ready.length,0);
});
test('encabezados obligatorios',()=>assert.throws(()=>C.parseRows([['NOMBRE','CELULAR']]),/PACIENTE, FECHA y HORA/));
