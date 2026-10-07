(function(){
'use strict';
const st=()=>window._profileState||{appointments:[],patients:[],histories:[],notes:[]};
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const icon=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=s=>{if(!s)return '—';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'})};
const finalStatuses=['completada','no_asistio','cancelada'];
const isPending=s=>!finalStatuses.includes(s);
const patient=id=>st().patients.find(p=>String(p.id)===String(id));
const pname=a=>a.patientName||patient(a.patientId)?.name||'Paciente';
const pages={crm:1,clinical:1,sessions:1,history:1,alert_overdue:1,alert_follow:1,alert_incomplete:1,alert_packages:1};
const sizes={crm:10,clinical:10,sessions:10,history:10};
function toast(msg,error=false){document.querySelector('.v32-toast')?.remove();const el=document.createElement('div');el.className='v32-toast'+(error?' error':'');el.innerHTML=`${icon(error?'x':'check')}<span>${esc(msg)}</span>`;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
window.v32Toast=toast;
function pager(key,total,onRender){const size=sizes[key]||10,totalPages=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(Math.max(1,pages[key]||1),totalPages);const p=pages[key],start=total?((p-1)*size+1):0,end=Math.min(total,p*size);let nums=[];for(let i=Math.max(1,p-2);i<=Math.min(totalPages,p+2);i++)nums.push(i);return `<div class="v32-pager"><div class="v32-pager-info">${start}-${end} de ${total} registros</div><div class="v32-pager-actions"><select class="v32-page-size" onchange="v32SetSize('${key}',this.value,'${onRender}')"><option ${size===10?'selected':''}>10</option><option ${size===20?'selected':''}>20</option><option ${size===50?'selected':''}>50</option></select><button class="v32-page-btn" ${p<=1?'disabled':''} onclick="v32GoPage('${key}',${p-1},'${onRender}')">‹</button>${nums.map(n=>`<button class="v32-page-btn ${n===p?'active':''}" onclick="v32GoPage('${key}',${n},'${onRender}')">${n}</button>`).join('')}<button class="v32-page-btn" ${p>=totalPages?'disabled':''} onclick="v32GoPage('${key}',${p+1},'${onRender}')">›</button></div></div>`}
window.v32GoPage=function(key,p,fn){pages[key]=Math.max(1,p);window[fn]?.()};
window.v32SetSize=function(key,v,fn){sizes[key]=Number(v)||10;pages[key]=1;window[fn]?.()};
function paginateRows(root,key,fn){const table=root?.querySelector('table');if(!table)return;const rows=[...table.querySelectorAll('tbody tr')],size=sizes[key]||10,total=rows.length,totalPages=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(pages[key]||1,totalPages);const p=pages[key];rows.forEach((r,i)=>r.style.display=(i>=(p-1)*size&&i<p*size)?'':'none');root.querySelector('.v32-pager')?.remove();root.insertAdjacentHTML('beforeend',pager(key,total,fn));}

/* CRM y clínica: conserva lógica existente, añade paginación */
const oldCRM=window.renderV2CRM; if(typeof oldCRM==='function') window.renderV2CRM=function(){oldCRM();paginateRows(document.getElementById('v2-crm-table'),'crm','renderV2CRM')};
const oldClinical=window.renderV2Clinical; if(typeof oldClinical==='function') window.renderV2Clinical=function(){oldClinical();paginateRows(document.getElementById('v2-clinical-table'),'clinical','renderV2Clinical')};

/* Sesiones: estados simplificados + KPIs solicitados + paginación */
window.renderV3Sessions=function(){
 const apps=(st().appointments||[]).filter(a=>!a.isManualBlock),term=(document.getElementById('v3-session-search')?.value||'').toLowerCase(),filter=document.getElementById('v3-session-status')?.value||'all';
 let list=apps.filter(a=>{if(filter==='all')return true;if(filter==='pendiente')return isPending(a.status);return a.status===filter}).filter(a=>!term||pname(a).toLowerCase().includes(term)).sort((a,b)=>String((b.date||'')+(b.time||'')).localeCompare(String((a.date||'')+(a.time||''))));
 const counts={completada:apps.filter(a=>a.status==='completada').length,no_asistio:apps.filter(a=>a.status==='no_asistio').length,cancelada:apps.filter(a=>a.status==='cancelada').length,pendiente:apps.filter(a=>isPending(a.status)).length};
 const kp=document.getElementById('v3-session-kpis');if(kp){kp.className='v32-kpi-grid';kp.innerHTML=[['Completadas',counts.completada,'check'],['No asistió',counts.no_asistio,'x'],['Canceladas',counts.cancelada,'trash'],['Pendientes',counts.pendiente,'clock']].map(x=>`<div class="v32-kpi"><div class="v32-kpi-ico">${icon(x[2])}</div><div><strong>${x[1]}</strong><span>${x[0]}</span></div></div>`).join('')}
 const size=sizes.sessions||10,total=list.length,totalPages=Math.max(1,Math.ceil(total/size));pages.sessions=Math.min(pages.sessions||1,totalPages);const slice=list.slice((pages.sessions-1)*size,pages.sessions*size),root=document.getElementById('v3-session-table');if(!root)return;
 root.innerHTML=slice.length?`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Atención</th><th>Estado</th><th>Pago</th><th>Acciones</th></tr></thead><tbody>${slice.map(a=>`<tr><td>${dateLabel(a.date)}<br><small>${esc(a.time||'')}</small></td><td class="name">${esc(pname(a))}</td><td>${esc(a.attentionType||'Sesión')} · ${esc(a.modality||'')}</td><td><span class="v3-chip ${a.status==='completada'?'green':a.status==='cancelada'||a.status==='no_asistio'?'red':'amber'}">${a.status==='completada'?'Completada':a.status==='cancelada'?'Cancelada':a.status==='no_asistio'?'No asistió':'Pendiente'}</span></td><td>${a.paymentStatus==='pagado'?'<span class="v3-chip green">Pagado</span>':'<span class="v3-chip amber">Pendiente</span>'}</td><td><div class="v3-table-actions"><button class="v3-icon-action" title="Paciente" onclick="openV3Patient('${a.patientId}')">${icon('users')}</button><button class="v3-icon-action" title="Historia clínica" onclick="openClinicalHistory('${a.patientId}')">${icon('clinical')}</button><button class="v3-icon-action" title="Editar cita" onclick="editAppointment('${a.id}')">${icon('edit')}</button></div></td></tr>`).join('')}</tbody></table></div>${pager('sessions',total,'renderV3Sessions')}`:'<div class="v3-empty">No hay sesiones para los filtros seleccionados.</div>';
};

/* Alertas por bloques, 10 por página. Seguimiento deja de reaparecer una vez marcado. */
function days(a,b){return Math.floor((b-a)/86400000)}
function appByPatient(pid){return(st().appointments||[]).filter(a=>String(a.patientId)===String(pid)&&!a.isManualBlock)}
function lastApp(pid){return appByPatient(pid).filter(a=>a.status!=='cancelada').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]}
function nextApp(pid){const t=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});return appByPatient(pid).filter(a=>String(a.date||'')>=t&&!['cancelada','no_asistio'].includes(a.status)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0]}
function alertGroup(key,title,items,row){const size=10,total=items.length,tp=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(pages[key]||1,tp);const p=pages[key],slice=items.slice((p-1)*size,p*size);return `<div class="v32-alert-card"><div class="v32-alert-head"><h3>${esc(title)}</h3><span class="v32-alert-count">${total}</span></div>${slice.length?slice.map(row).join(''):'<div class="v3-empty">Sin alertas en esta categoría.</div>'}${total>size?`<div class="v32-pager"><div class="v32-pager-info">${(p-1)*size+1}-${Math.min(total,p*size)} de ${total}</div><div class="v32-pager-actions"><button class="v32-page-btn" ${p<=1?'disabled':''} onclick="v32AlertPage('${key}',${p-1})">‹</button><button class="v32-page-btn active">${p}/${tp}</button><button class="v32-page-btn" ${p>=tp?'disabled':''} onclick="v32AlertPage('${key}',${p+1})">›</button></div></div>`:''}</div>`}
window.v32AlertPage=(key,p)=>{pages[key]=Math.max(1,p);renderV2Alerts()};
window.renderV2Alerts=function(){
 const s=st(),patients=s.patients||[],now=new Date(),histIds=new Set((s.histories||[]).map(h=>String(h.id)));
 const overdue=patients.map(p=>({p,amount:appByPatient(p.id).filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((n,a)=>n+Number(a.cost||0),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const follow=patients.map(p=>({p,last:lastApp(p.id)})).filter(x=>{const d=x.last&&new Date(x.last.date+'T00:00:00');return d&&days(d,now)>30&&!nextApp(x.p.id)&&!['alta','inactivo','seguimiento'].includes(x.p.leadStatus||'nuevo')});
 const incomplete=patients.filter(p=>!histIds.has(String(p.id)));const packages=[];patients.forEach(p=>(p.packages||[]).forEach(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0),used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0),r=Math.max(total-used,0);if(total&&r<=1)packages.push({p,remaining:r})}));
 const k=document.getElementById('v2-alert-kpis');if(k)k.innerHTML=`<div class="v32-kpi-grid" style="grid-column:1/-1"><div class="v32-kpi"><div class="v32-kpi-ico">${icon('money')}</div><div><strong>${overdue.length}</strong><span>Cobros pendientes</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('bell')}</div><div><strong>${follow.length}</strong><span>Sin seguimiento</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('file')}</div><div><strong>${incomplete.length}</strong><span>Historias pendientes</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('clock')}</div><div><strong>${packages.length}</strong><span>Paquetes por terminar</span></div></div></div>`;
 const root=document.getElementById('v2-alert-center');if(!root)return;root.innerHTML=
 alertGroup('alert_overdue','Cobros pendientes',overdue,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>${money(x.amount)} pendiente</span></div><button class="v32-follow-btn" onclick="openPatient360('${x.p.id}')">Ver ficha</button></div>`)+
 alertGroup('alert_follow','Seguimiento clínico',follow,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>Última sesión: ${x.last?dateLabel(x.last.date):'—'}</span></div><button class="v32-follow-btn" onclick="v32MarkFollow('${x.p.id}')">Marcar seguimiento</button></div>`)+
 alertGroup('alert_incomplete','Historia clínica pendiente',incomplete,p=>`<div class="v32-alert-row"><div><strong>${esc(p.name)}</strong><span>Sin historia clínica registrada</span></div><button class="v32-follow-btn" onclick="openClinicalHistory('${p.id}')">Completar</button></div>`)+
 alertGroup('alert_packages','Paquetes por terminar',packages,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>${x.remaining===0?'Paquete agotado':'Queda 1 sesión'}</span></div><button class="v32-follow-btn" onclick="openPatient360('${x.p.id}')">Ver paquete</button></div>`);
};
window.v32MarkFollow=async function(pid){try{if(typeof window.markPatientFollowUp!=='function')throw new Error('Función no disponible');await window.markPatientFollowUp(pid);const p=patient(pid);if(p){p.leadStatus='seguimiento';p.followUpAt=new Date().toISOString()}toast('Paciente marcado para seguimiento');renderV2Alerts();window.renderV2CRM?.()}catch(e){console.error(e);toast('No se pudo marcar el seguimiento',true)}};

/* Historial: paginar citas antiguas sin alterar datos */
function applyHistoryPagination(){const list=document.getElementById('hist-appointments-list');if(!list)return;const rows=[...list.children].filter(x=>!x.classList.contains('v32-pager'));if(!rows.length)return;const size=sizes.history||10,total=rows.length,tp=Math.max(1,Math.ceil(total/size));pages.history=Math.min(pages.history||1,tp);const p=pages.history;rows.forEach((r,i)=>r.style.display=(i>=(p-1)*size&&i<p*size)?'':'none');list.querySelector('.v32-pager')?.remove();list.insertAdjacentHTML('beforeend',pager('history',total,'v32RefreshHistory'))}
window.v32RefreshHistory=function(){applyHistoryPagination()};
function wrapHistory(){if(typeof window.openPatientHistory!=='function'||window.openPatientHistory.__v32)return false;const old=window.openPatientHistory;const wrapped=function(pid){pages.history=1;old(pid);setTimeout(applyHistoryPagination,0)};wrapped.__v32=true;window.openPatientHistory=wrapped;return true}
let tries=0;const timer=setInterval(()=>{if(wrapHistory()||++tries>30)clearInterval(timer)},200);

/* Normaliza visualmente etiquetas antiguas al abrir modales */
document.addEventListener('DOMContentLoaded',()=>{
 const sel=document.getElementById('v3-session-status');if(sel)sel.innerHTML='<option value="all">Todos</option><option value="pendiente">Pendientes</option><option value="completada">Completadas</option><option value="no_asistio">No asistió</option><option value="cancelada">Canceladas</option>';
 const title=document.querySelector('#profile-modal h3');if(title)title.textContent='Mi cuenta';
 const p1=document.getElementById('ptab-perfil'),p2=document.getElementById('ptab-clave');if(p1)p1.textContent='Editar perfil';if(p2)p2.textContent='Cambiar clave';
});
})();
