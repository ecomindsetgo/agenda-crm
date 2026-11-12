'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const core=require('../js/patients-export-core.js');
const people=[
 {id:'p1',name:'Ana Paz',phone:'099900011',dni:'00123456',birth:'1990-01-15',leadStatus:'recurrente',origen:'instagram',history:'DIAGNÓSTICO PRIVADO',currency:'PEN',createdAt:'2026-01-01'},
 {id:'p2',name:'Beto Sol',phone:'99888777',dni:'12345678',leadStatus:'inactivo'},
 {id:'p3',name:'Carla Luna',phone:'911122233',leadStatus:'seguimiento'},
 {id:'p4',name:'Dora Mar',phone:'933332222',leadStatus:'alta'},
 {id:'p5',name:'Eva Paz',phone:'988811111',leadStatus:'pausado'},
 {id:'p6',name:'=SUM(1,1)',phone:'+51911111111',leadStatus:'nuevo'}
];
const events=[
 {id:'a1',patientId:'p1',date:'2026-11-01',status:'completada',cost:50,paidAmount:25,currency:'PEN'},
 {id:'a2',patientId:'p1',date:'2026-11-13',time:'15:00',status:'pendiente',cost:90,paidAmount:0,currency:'USD'},
 {id:'a3',patientId:'p1',date:'2026-11-11',status:'cancelada',cost:20,paidAmount:0},
 {id:'a4',patientId:'p1',date:'2026-11-12',isManualBlock:true,status:'pendiente',cost:500},
 {id:'a5',patientId:'p3',date:'2026-11-10',status:'no_asistio',cost:50}
];
function sandbox(filter='todos',search='',enabled=true){
 const calls=[],alerts=[];
 const select={value:filter,selectedOptions:[{textContent:({todos:'Todos los estados',activos:'Activos (sin pausados ni altas)',inactivo:'Inactivos',tratamiento:'En tratamiento'}[filter]||filter)}]};
 const inputs={'v2-crm-filter':select,'v2-crm-search':{value:search}};
 const xlsx={utils:{
   aoa_to_sheet(rows){const cells={'!ref':`A1:S${rows.length}`};rows.forEach((row,r)=>row.forEach((v,c)=>{if(v!==''&&v!==null&&v!==undefined){const col=String.fromCharCode(65+c);cells[col+(r+1)]={v,t:typeof v==='number'?'n':'s'};}}));return cells;},
   decode_range(ref){return {s:{r:0,c:0},e:{r:Number(ref.match(/\d+$/)[0])-1,c:18}};},
   encode_cell({r,c}){return String.fromCharCode(65+c)+(r+1);},
   book_new(){return {};},book_append_sheet(book,ws,name){book.ws=ws;book.name=name;}
 },writeFile:(wb,name)=>calls.push({wb,name})};
 const element={click(){calls.push({clicked:true});},remove(){}};
 const w={_profileState:{currentUser:{uid:'secret'},patientsReady:true,appointmentsReady:true,patients:people,appointments:events},PatientExportCore:core,CRMCore:{remaining:a=>Math.max(0,(a.cost||0)-(a.paidAmount||0))},XLSX:enabled?xlsx:undefined};
 const ctx={window:w,document:{getElementById:id=>inputs[id],createElement:()=>element,body:{appendChild(){}}},Blob,URL:{createObjectURL:()=>'/tmp/export.csv',revokeObjectURL(){}},setTimeout(){},alert:message=>alerts.push(message),console,Date};
 vm.runInNewContext(fs.readFileSync(path.join(root,'js/patients-export.js'),'utf8'),ctx);
 return {w,calls,alerts,select,inputs};
}
test('Filtros del CRM: activos excluye pausados, altas e inactivos y tratamiento agrupa recurrentes',()=>{
 assert.deepEqual(core.filterPatients(people,'activos').map(p=>p.id).sort(),['p1','p3','p6']);
 assert.deepEqual(core.filterPatients(people,'tratamiento').map(p=>p.id),['p1']);
 assert.deepEqual(core.filterPatients(people,'inactivo').map(p=>p.id),['p2']);
 assert.deepEqual(core.filterPatients(people,'todos','00123456').map(p=>p.id),['p1']);
});
test('Listado excluye bloqueos y notas, conserva texto del DNI, previene fórmulas y separa monedas',()=>{
 const r=core.buildReport(people,events,{filter:'todos',today:'2026-11-12'});
 assert.equal(r.total,6);
 assert.equal(r.headers.length,19);
 const ana=r.rows.find(row=>row[1]==='Ana Paz');
 assert.equal(ana[2],'00123456');assert.equal(ana[10],3);assert.equal(ana[11],1);assert.equal(ana[12],'2026-11-01');assert.equal(ana[13],'2026-11-13 15:00');
 assert.equal(ana[14],25);assert.equal(ana[15],90);
 assert.equal(r.rows.find(row=>row[18]==='p6')[1],"'=SUM(1,1)");
 assert.equal(r.rows.find(row=>row[18]==='p6')[3],"'+51911111111");
 assert(!JSON.stringify(r).includes('DIAGNÓSTICO PRIVADO'));
});
test('Excel exporta todo el filtro, conserva el encabezado y agrega autofiltro, sin paginación',()=>{
 const {w,calls}=sandbox('activos');w.downloadPatientsExcel();
 assert.equal(calls.length,1);assert.match(calls[0].name,/^Pacientes_CRM_activos_\d{4}-\d{2}-\d{2}\.xlsx$/);
 assert.equal(calls[0].wb.name,'Pacientes');assert.equal(calls[0].wb.ws['B6'].v,3);
 assert.equal(calls[0].wb.ws['!autofilter'].ref,'A8:S11');
 assert.equal(calls[0].wb.ws['C10'].t,'s');
});
test('Exportar búsqueda del CRM aunque coincida con una única persona',()=>{
 const {w,calls}=sandbox('todos','099900011');w.downloadPatientsExcel();assert.equal(calls[0].wb.ws['B6'].v,1);
 assert.equal(calls[0].wb.ws['B9'].v,'Ana Paz');
});
test('Evita descargas parciales y CSV de respaldo cuando falta librería Excel',()=>{
 const pending=sandbox();pending.w._profileState.patientsReady=false;pending.w.downloadPatientsExcel();
 assert.equal(pending.calls.length,0);assert.match(pending.alerts[0],/no terminaron de cargar/);
 const fallback=sandbox('inactivo','',false);fallback.w.downloadPatientsExcel();
 assert(fallback.calls.some(c=>c.clicked));assert.match(fallback.alerts[0],/CSV/);
});
test('Interfaz mantiene filtros, botón y caché para nuevos módulos',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/id="btn-export-patients-excel"/);assert.match(html,/value="activos"/);
 assert.match(html,/js\/patients-export-core\.js/);assert.match(html,/js\/patients-export\.js/);
 assert.match(ui,/PatientExportCore\.matchesStatusFilter/);
 assert.match(sw,/js\/patients-export-core\.js/);assert.match(sw,/js\/patients-export\.js/);
});
