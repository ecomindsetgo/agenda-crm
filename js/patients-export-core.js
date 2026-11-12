/* Exportación administrativa de pacientes. No incluye historias ni notas clínicas. */
(function(root){
  'use strict';
  const NAMES={nuevo:'Nuevo',contactado:'Contactado',interesado:'Interesado',cita_agendada:'Primera cita',atendido:'En tratamiento',recurrente:'En tratamiento',no_asistio:'Seguimiento',cancelo:'Pausado',seguimiento:'Seguimiento',pausado:'Pausado',alta:'Alta',inactivo:'Inactivo'};
  const SOURCE={instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',marketplace:'Facebook Marketplace',whatsapp:'WhatsApp',calendly:'Calendly',google:'Google',referido:'Referido',otro:'Otro'};
  const CARE_ORIGIN={particular:'Particular',centro_medico:'Centro médico'};
  const CHANNEL={whatsapp:'WhatsApp',llamada:'Llamada',presencial:'Presencial',email:'Correo',otro:'Otro'};
  const norm=p=>{const s=String(p?.leadStatus||'nuevo');return ['atendido','recurrente'].includes(s)?'tratamiento':s==='cancelo'?'pausado':s==='no_asistio'?'seguimiento':s;};
  const active=p=>!['inactivo','alta','pausado'].includes(norm(p));
  const matchesStatusFilter=(p,f)=>!f||f==='todos'||(f==='activos'?active(p):norm(p)===f);
  const txt=(v)=>String(v??'').trim();
  const matchesSearch=(p,q)=>{const t=txt(q).toLocaleLowerCase('es');return !t||[p.name,p.phone,p.dni].some(v=>txt(v).toLocaleLowerCase('es').includes(t));};
  const filterPatients=(patients,filter='todos',search='')=>(Array.isArray(patients)?patients:[])
    .filter(p=>p&&matchesStatusFilter(p,filter)&&matchesSearch(p,search))
    .slice().sort((a,b)=>txt(a.name).localeCompare(txt(b.name),'es',{sensitivity:'base'}));
  const iso=(v)=>{if(!v)return '';if(typeof v==='string')return /^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';if(v instanceof Date)return Number.isNaN(v.getTime())?'':v.toISOString().slice(0,10);if(v&&typeof v.toDate==='function')return iso(v.toDate());return '';};
  const safeText=(v)=>{const s=txt(v).replace(/[\u0000-\u001F\u007F]/g,' ');return /^[=+\-@\t\r]/.test(s)?"'"+s:s;};
  const num=(v)=>Math.round((Number(v)||0)*100)/100;
  const todayPeru=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  function buildReport(patients,appointments,options={}){
    const {filter='todos',search='',today=todayPeru()}=options;
    const selected=filterPatients(patients,filter,search);
    const byId=new Map();
    (Array.isArray(appointments)?appointments:[]).forEach(a=>{
      if(!a||a.isManualBlock||a.recordType==='manual_block'||!a.patientId)return;
      const id=String(a.patientId),arr=byId.get(id)||[];arr.push(a);byId.set(id,arr);
    });
    const headers=['N°','Paciente','DNI','Teléfono','Nacimiento','Edad','Estado CRM','Origen del contacto','Procedencia de atención','Canal','Moneda','Citas registradas','Citas completadas','Última sesión completada','Próxima cita','Saldo pendiente (S/)','Saldo pendiente (USD)','Fecha de registro','Última actualización','ID interno'];
    const data=selected.map((p,i)=>{
      const apps=byId.get(String(p.id))||[];
      const completed=apps.filter(a=>a.status==='completada');
      const last=completed.map(a=>iso(a.date)).filter(Boolean).sort().at(-1)||'';
      const next=apps.filter(a=>iso(a.date)>=today&&!['completada','cancelada','no_asistio'].includes(a.status))
        .sort((a,b)=>(iso(a.date)+txt(a.time)).localeCompare(iso(b.date)+txt(b.time)))[0];
      let pen=0,usd=0;
      apps.filter(a=>!['cancelada','no_asistio'].includes(a.status)).forEach(a=>{
        const remaining=typeof options.remaining==='function'?options.remaining(a):Math.max(0,num(a.cost)-num(a.paidAmount));
        if(a.currency==='USD')usd+=Math.max(0,num(remaining));else pen+=Math.max(0,num(remaining));
      });
      return [i+1,safeText(p.name),safeText(p.dni),safeText(p.phone),iso(p.birth),safeText(p.age),
        NAMES[p.leadStatus]||'Nuevo',safeText(SOURCE[p.origen]||p.origen),safeText(CARE_ORIGIN[p.careOrigin]||'Particular'),safeText(CHANNEL[p.canal]||p.canal),p.currency==='USD'?'USD':'PEN',
        apps.length,completed.length,last,next?`${iso(next.date)} ${txt(next.time).slice(0,5)}`:'',num(pen),num(usd),iso(p.createdAt),iso(p.updatedAt),safeText(p.id)];
    });
    return {headers,rows:data,total:data.length,filter,search};
  }
  const api={norm,active,matchesStatusFilter,matchesSearch,filterPatients,buildReport,todayPeru,safeText,CARE_ORIGIN};
  root.PatientExportCore=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
