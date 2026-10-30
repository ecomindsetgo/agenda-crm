const {test}=require('node:test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const start=app.indexOf('window.downloadHorarioExcel = function () {');
const end=app.indexOf('window.downloadHorarioImage = async function () {',start);
assert(start>0 && end>start);
const js=app.slice(start,end);
function sandbox(xlsx=true){
 const calls=[],fakeX={utils:{
  aoa_to_sheet(rows){const obj={'!ref':`A1:I${rows.length}`};rows.forEach((row,r)=>row.forEach((v,c)=>{if(v!==''&&v!=null)obj[String.fromCharCode(65+c)+(r+1)]={t:typeof v==='number'?'n':'s',v}}));return obj;},
  decode_range(value){const length=Number(value.match(/\d+$/)[0]);return {s:{r:0,c:0},e:{r:length-1,c:8}};},
  encode_cell({r,c}){return String.fromCharCode(65+c)+(r+1)},
  book_new(){return {};},book_append_sheet(book,ws,name){book.ws=ws;book.name=name;}
 },writeFile(book,name){calls.push({book,name});}};
 const date=new Date('2026-10-26T10:00:00Z');
 const ctx={
   window:{CRMCore:{paid:a=>a.paidAmount||0}},
   document:{getElementById:()=>({disabled:false,textContent:'',innerHTML:''})},
   state:{horarioWeekStart:date,appointments:[{date:'2026-10-28',time:'10:00',patientName:'Paciente Prueba',status:'pendiente',cost:50,paidAmount:20,modality:'virtual',currency:'PEN',notes:''}]},
   getMondayOf:d=>d,
   horarioDateStr:d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`,
   XLSX:xlsx?fakeX:undefined,
   agendaDownloadCsv:(rows,name)=>calls.push({rows,name}),
   alert:()=>{},console,Date
 };
 vm.runInNewContext(js,ctx);
 return {ctx,calls};
}
test('Descargar horario XLSX deja de fallar por variable paid no definida',()=>{
 const {ctx,calls}=sandbox();ctx.window.downloadHorarioExcel();
 assert.equal(calls.length,1);assert.match(calls[0].name,/\.xlsx$/);
 assert.equal(calls[0].book.ws['G6'].v,'SI');assert.equal(calls[0].book.ws['H6'].v,20);
 assert.equal(calls[0].book.ws['H8'].v,20);
});
test('Si no hay librería XLSX se descarga CSV compatible con Excel',()=>{
 const {ctx,calls}=sandbox(false);ctx.window.downloadHorarioExcel();
 assert.equal(calls.length,1);assert.match(calls[0].name,/\.csv$/);
 assert.equal(calls[0].rows[1][5],20);
});
