(function(){
  'use strict';
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money = n => 'S/ ' + Number(n || 0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const today = () => new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  const parseDate = s => s ? new Date(s+'T00:00:00') : null;
  const dateLabel = s => { const d=parseDate(s); return d ? d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}) : '—'; };
  const getState = ()=>window._profileState || {appointments:[],patients:[],histories:[],notes:[]};
  const byPatient = (id)=>getState().patients.find(p=>String(p.id)===String(id));
  const pName = a => a.patientName || (byPatient(a.patientId)||{}).name || 'Paciente';
  const statusLabel = s => ({pendiente:'Pendiente',confirmada:'Confirmada',completada:'Completada',cancelada:'Cancelada',no_asistio:'No asistió',arrived:'Llegó',in_session:'En sesión'}[s] || s || 'Pendiente');
  const crmLabel = p => ({nuevo:'Nuevo',contactado:'Contactado',interesado:'Interesado',cita_agendada:'Primera cita',atendido:'En tratamiento',recurrente:'En tratamiento',no_asistio:'Seguimiento',cancelo:'Pausado'}[p.leadStatus] || 'Nuevo');

  function daysBetween(a,b){ return Math.floor((b-a)/86400000); }
  function lastAppointment(pid){ return getState().appointments.filter(a=>String(a.patientId)===String(pid) && a.status!=='cancelada').sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]; }
  function nextAppointment(pid){ const t=today(); return getState().appointments.filter(a=>String(a.patientId)===String(pid) && (a.date||'')>=t && a.status!=='cancelada').sort((a,b)=>(a.date||'').localeCompare(b.date||'') || String(a.time||'').localeCompare(String(b.time||'')))[0]; }
  function pendingForPatient(pid){ return getState().appointments.filter(a=>String(a.patientId)===String(pid) && a.status!=='cancelada' && (a.paymentStatus||'pendiente')!=='pagado').reduce((s,a)=>s+Number(a.cost||0),0); }

  window.exportAgendaBackup = function(){
    const s=getState();
    const payload={
      version:'psicologia-pro-v2',
      exportedAt:new Date().toISOString(),
      appId:'psicologia-agenda-default-v2',
      appointments:Array.isArray(s.appointments)?s.appointments:[],
      patients:Array.isArray(s.patients)?s.patients:[],
      clinicalHistories:Array.isArray(s.histories)?s.histories:[],
      clinicalNotes:Array.isArray(s.notes)?s.notes:[]
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`respaldo-psicologia-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  window.renderV2Dashboard = function(){
    const s=getState();
    const root=document.getElementById('sec-inicio'); if(!root) return;
    const t=today();
    const apps=(s.appointments||[]).filter(a=>a.date===t).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
    const completed=apps.filter(a=>a.status==='completada').length;
    const pending=apps.filter(a=>!['completada','cancelada'].includes(a.status)).length;
    const cancelled=apps.filter(a=>a.status==='cancelada').length;
    const collected=apps.filter(a=>a.status!=='cancelada' && a.paymentStatus==='pagado').reduce((x,a)=>x+Number(a.cost||0),0);
    const receivable=(s.appointments||[]).filter(a=>a.status==='completada' && a.paymentStatus!=='pagado').reduce((x,a)=>x+Number(a.cost||0),0);
    const patients=(s.patients||[]);
    const now=new Date();
    const monthPrefix=t.slice(0,7);
    const newMonth=patients.filter(p=>{ const own=(s.appointments||[]).filter(a=>String(a.patientId)===String(p.id) && a.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))); const first=own[0]?.date || ''; return String(first).startsWith(monthPrefix); }).length;
    const untracked=patients.filter(p=>{const la=lastAppointment(p.id); if(!la) return false; const d=parseDate(la.date); return d && daysBetween(d,now)>30 && !nextAppointment(p.id);}).slice(0,5);
    const packageAlerts=[];
    patients.forEach(p=>(p.packages||[]).forEach(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0); const used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0); const remaining= total ? Math.max(total-used,0) : null; if(remaining===1) packageAlerts.push({p,pk});}));
    const unpaidPatients=patients.map(p=>({p,amount:pendingForPatient(p.id)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,4);

    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
    set('v2-kpi-today',apps.length); set('v2-kpi-completed',completed); set('v2-kpi-pending',pending); set('v2-kpi-cancelled',cancelled);
    set('v2-kpi-collected',money(collected)); set('v2-kpi-receivable',money(receivable)); set('v2-kpi-patients',patients.length); set('v2-kpi-new',newMonth);

    const list=document.getElementById('v2-today-list');
    if(list) list.innerHTML = apps.length ? apps.map(a=>`<div class="v2-appointment-row"><div class="v2-time">${esc(a.time||'--:--')}</div><div class="min-w-0"><div class="text-sm font-extrabold text-slate-700 truncate">${esc(pName(a))}</div><div class="text-[11px] text-slate-400 mt-0.5">${esc(a.attentionType||a.type||'Sesión')} · ${esc(a.modality||'Sin modalidad')} · ${money(a.cost)}</div></div><span class="v2-status v2-status-${esc(a.status||'pendiente')}">${esc(statusLabel(a.status))}</span></div>`).join('') : '<div class="py-8 text-center text-sm text-slate-400">No hay citas programadas para hoy.</div>';

    const alerts=document.getElementById('v2-alerts');
    if(alerts){
      const arr=[];
      if(unpaidPatients.length) arr.push(`<div class="v2-alert"><div>💳</div><div><strong>${unpaidPatients.length} paciente(s) con pagos pendientes</strong><span>${money(unpaidPatients.reduce((x,i)=>x+i.amount,0))} en la lista prioritaria.</span></div></div>`);
      if(untracked.length) arr.push(`<div class="v2-alert"><div>🧭</div><div><strong>${untracked.length} paciente(s) necesitan seguimiento</strong><span>Más de 30 días sin una próxima cita.</span></div></div>`);
      if(packageAlerts.length) arr.push(`<div class="v2-alert"><div>📦</div><div><strong>${packageAlerts.length} paquete(s) por terminar</strong><span>Queda una sesión disponible.</span></div></div>`);
      if(!arr.length) arr.push('<div class="v2-alert"><div>✓</div><div><strong>Todo en orden</strong><span>No hay alertas operativas prioritarias.</span></div></div>');
      alerts.innerHTML=arr.join('');
    }
    const greet=document.getElementById('v2-greeting'); if(greet){const h=new Date().getHours(); greet.textContent=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';}
    const fullDate=document.getElementById('v2-full-date'); if(fullDate) fullDate.textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  };

  window.openPatient360 = function(pid){
    const s=getState(), p=s.patients.find(x=>String(x.id)===String(pid)); if(!p) return;
    const apps=(s.appointments||[]).filter(a=>String(a.patientId)===String(pid)).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || String(b.time||'').localeCompare(String(a.time||'')));
    const valid=apps.filter(a=>a.status!=='cancelada');
    const completed=apps.filter(a=>a.status==='completada').length;
    const next=nextAppointment(pid), last=lastAppointment(pid), debt=pendingForPatient(pid);
    const hist=(s.histories||[]).find(h=>String(h.id)===String(pid));
    const notes=(s.notes||[]).filter(n=>String(n.patientId||n.pid||'')===String(pid));
    document.getElementById('p360-name').textContent=p.name||'Paciente';
    document.getElementById('p360-status').textContent=crmLabel(p);
    document.getElementById('p360-phone').textContent=p.phone||'—';
    document.getElementById('p360-birth').textContent=p.birth||'—';
    document.getElementById('p360-sessions').textContent=completed;
    document.getElementById('p360-debt').textContent=money(debt);
    document.getElementById('p360-last').textContent=last?dateLabel(last.date):'Sin sesiones';
    document.getElementById('p360-next').textContent=next?`${dateLabel(next.date)} · ${next.time||''}`:'Sin próxima cita';
    document.getElementById('p360-clinical').textContent=hist?'Historia clínica registrada':'Historia clínica pendiente';
    document.getElementById('p360-notes').textContent=`${notes.length} nota(s) clínica(s)`;
    const pkgs=p.packages||[];
    document.getElementById('p360-packages').innerHTML=pkgs.length?pkgs.slice().reverse().map(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0);const used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0);return `<div class="v2-360-card"><div class="text-xs font-extrabold text-slate-700">${esc(pk.name||pk.label||'Paquete')}</div><div class="text-[11px] text-slate-400 mt-1">Sesiones: ${used}${total?' / '+total:''}</div></div>`}).join(''):'<div class="text-sm text-slate-400">No tiene paquetes registrados.</div>';
    document.getElementById('p360-timeline').innerHTML=apps.slice(0,8).map(a=>`<div class="v2-timeline-item"><div class="text-xs font-extrabold text-slate-700">${dateLabel(a.date)} · ${esc(a.time||'')}</div><div class="text-[11px] text-slate-400">${esc(statusLabel(a.status))} · ${esc(a.modality||'')} · ${money(a.cost)}</div></div>`).join('')||'<div class="text-sm text-slate-400">Sin actividad registrada.</div>';
    document.getElementById('p360-open-history').onclick=()=>{closePatient360(); window.openPatientHistory && window.openPatientHistory(pid)};
    document.getElementById('p360-open-clinical').onclick=()=>{closePatient360(); window.openClinicalHistory && window.openClinicalHistory(pid)};
    document.getElementById('p360-edit').onclick=()=>{closePatient360(); window.editPatient && window.editPatient(pid)};
    const m=document.getElementById('patient-360-modal'); m.classList.remove('hidden');m.classList.add('flex');
  };
  window.closePatient360=function(){const m=document.getElementById('patient-360-modal');if(m){m.classList.add('hidden');m.classList.remove('flex')}};

  function syncNav(target){
    document.querySelectorAll('[data-v2-nav]').forEach(b=>b.classList.toggle('v2-nav-active',b.dataset.v2Nav===target));
  }
  const oldSwitch=window.switchTab;
  window.switchTab=function(target){
    const tabs=['inicio','citas','pacientes','finanzas'];
    tabs.forEach(t=>{const sec=document.getElementById('sec-'+t);if(sec)sec.classList.add('hidden')});
    const chosen=document.getElementById('sec-'+target);if(chosen)chosen.classList.remove('hidden');
    if(target!=='inicio' && typeof oldSwitch==='function') oldSwitch(target);
    syncNav(target);
    if(target==='inicio') window.renderV2Dashboard();
    try{localStorage.setItem('agendaV2LastTab',target)}catch(_){ }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    syncNav('inicio');
    setTimeout(()=>{window.switchTab('inicio');window.renderV2Dashboard()},250);
    setInterval(()=>{if(!document.getElementById('sec-inicio')?.classList.contains('hidden'))window.renderV2Dashboard()},15000);
  });
})();
