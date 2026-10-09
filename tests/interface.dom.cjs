const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('assert');
const root=require('path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link[^>]*>/g,'');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...x)=>errors.push(x.map(String).join(' ')));
const dom=new JSDOM(html,{url:'https://consultorio.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;
w.alert=message=>errors.push('ALERT '+message);w.confirm=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
const snaps={},authCallbacks=[];
Object.assign(w,{initializeApp:()=>({}),getAuth:()=>({currentUser:{uid:'test',email:'profesional@example.test'}}),getFirestore:()=>({}),initializeAppCheck:()=>({}),ReCaptchaV3Provider:class{},EmailAuthProvider:{credential:()=>({})},onAuthStateChanged:(_a,cb)=>authCallbacks.push(cb),collection:(...a)=>a.slice(1).join('/'),onSnapshot:(ref,cb,error)=>{snaps[ref.split('/').at(-1)]={cb,error};return ()=>{}},doc:()=>({}),setDoc:async()=>{},updateDoc:async()=>{},deleteDoc:async()=>{},getDocs:async()=>({docs:[]}),runTransaction:async()=>{},signOut:async()=>{},signInWithEmailAndPassword:async()=>{},sendPasswordResetEmail:async()=>{},updatePassword:async()=>{},verifyPasswordResetCode:async()=>{},confirmPasswordReset:async()=>{},reauthenticateWithCredential:async()=>{}});
function load(path){w.eval(fs.readFileSync(root+'/'+path,'utf8').replace(/import\s+[\s\S]*?from\s+"https:[^"]+";/g,''));}
(async()=>{load('js/crm-core.js');load('js/ui.js');load('js/tasks.js');load('js/crm-platform.js');load('js/experience.js');load('js/app.js');await new Promise(r=>setTimeout(r,2100));await Promise.all(authCallbacks.map(cb=>cb({uid:'test',email:'profesional@example.test'})));
const date=w.CRMCore.dateKey();const records={appointments:[{id:'a1',patientId:'p1',patientName:'Paciente Prueba',date,time:'10:30',status:'completada',cost:50,currency:'PEN',paidAmount:20,paymentStatus:'parcial',modality:'presencial'}],patients:[{id:'p1',name:'Paciente Prueba',phone:'999999999',leadStatus:'recurrente'}],clinicalHistories:[],clinicalNotes:[]};
for(const [key,rows] of Object.entries(records))snaps[key].cb({docs:rows.map(row=>({id:row.id,data:()=>row}))});
for(const route of ['inicio','citas','pacientes','finanzas','clinica','sesiones','evaluaciones','documentos','caja','alertas','sistema','asistente','herramientas']){w.switchTab(route);const visible=[...w.document.querySelectorAll('#app-container>main>section[id^="sec-"]')].filter(s=>!s.hidden&&!s.classList.contains('hidden'));assert.deepEqual(visible.map(s=>s.id),['sec-'+route],route);assert(!w.document.querySelector('#sec-'+route+' .crm-render-error'),route+' failed rendering');}
w.switchTab('citas');assert(w.document.getElementById('appointments-list').textContent.includes('Paciente Prueba'));
w.switchTab('finanzas');assert(w.document.getElementById('crm-finance-results').textContent.includes('20.00'));assert(w.document.getElementById('crm-finance-results').textContent.includes('30.00'));
// Realtime update refreshes a visible section, rather than waiting for periodic timer.
records.appointments[0].paidAmount=35;snaps.appointments.cb({docs:records.appointments.map(row=>({id:row.id,data:()=>row}))});assert(w.document.getElementById('crm-finance-results').textContent.includes('15.00'));
// Permission failure is shown to the signed-in professional.
snaps.appointments.error({code:'permission-denied'});assert(w.document.querySelector('#sec-finanzas .crm-load-status').textContent.includes('permisos'));
assert(w.document.getElementById('tab-citas'));assert(w.document.getElementById('tab-finanzas'));
assert.equal(w.document.querySelectorAll('.v2-sidebar>div>button').length,8);
console.log('DOM results errors:',errors);assert.deepEqual(errors,['Carga de citas [object Object]']);console.log('PASS: all routes isolated, appointments/patients loaded, finance partials update, permission errors visible, menu stable.');dom.window.close();})().catch(e=>{console.error(e);console.error(errors);dom.window.close();process.exitCode=1;});
