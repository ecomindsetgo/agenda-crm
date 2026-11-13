const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const start=app.indexOf('function patientNameKey');
const end=app.indexOf('function describeDuplicatePatient');
assert(start>0&&end>start,'No se encontró la lógica de duplicados');
const state={patients:[
 {id:'a',name:'Alejandra Ruiz Medina',dni:'12345678',phone:'987 654 321'},
 {id:'b',name:'José Pérez',dni:'',phone:'+51 999111222',leadStatus:'inactivo'}
]};
const find=new Function('state',app.slice(start,end)+';return findPatientDuplicates;')(state);
// DNI repetido
assert.equal(find({name:'Otra',dni:'12.345.678',phone:''}).dni.length,1);
// mismo nombre, distinto orden y tildes/mayúsculas
assert.equal(find({name:'ruiz medina ALEJANDRA',dni:'',phone:''}).name.length,1);
assert.equal(find({name:'Jose Perez',dni:'',phone:''}).name.length,1);
// teléfono con y sin prefijo +51
assert.equal(find({name:'Nuevo',dni:'',phone:'999111222'}).phone.length,1);
// al editar la misma ficha no se marca como duplicado
assert.equal(find({name:'Alejandra Ruiz Medina',dni:'12345678',phone:'987654321'},'a').dni.length,0);
// paciente realmente nuevo
const none=find({name:'Carla Soto',dni:'87654321',phone:'911000111'});
assert.equal(none.dni.length+none.phone.length+none.name.length,0);
// eliminación definitiva y botones presentes
assert(app.includes('window.removePatientPermanently'));
assert(app.includes("removePatientPermanently('${p.id}')"));
assert(app.includes('No se puede eliminar a'));
const ui=fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8');
assert(ui.includes('window.removePatientPermanently(')); 
console.log('PASS: duplicados por DNI/teléfono/nombre y eliminación definitiva.');
