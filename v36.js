(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
let moreOpen=false;

function installMoreSheet(){
 if(q('#v36-mobile-more')) return;
 const el=document.createElement('div');
 el.id='v36-mobile-more'; el.className='v36-mobile-more no-print';
 el.innerHTML=`<div class="v36-more-sheet" role="dialog" aria-modal="true" aria-label="Más módulos">
   <div class="v36-more-head"><div><h3>Más módulos</h3><p>Accesos secundarios del sistema</p></div><button class="v36-more-close" onclick="closeV36More()" aria-label="Cerrar">${svg('x')}</button></div>
   <div class="v36-more-grid">
    <button class="v36-more-item" onclick="v36Go('recepcion')"><span class="v36-more-icon">${svg('reception')}</span><div><strong>Recepción</strong><span>Atenciones del día</span></div></button>
    <button class="v36-more-item" onclick="v36Go('clinica')"><span class="v36-more-icon">${svg('clinical')}</span><div><strong>Gestión clínica</strong><span>Historias y evolución</span></div></button>
    <button class="v36-more-item" onclick="v36Go('sesiones')"><span class="v36-more-icon">${svg('calendar')}</span><div><strong>Sesiones</strong><span>Seguimiento de atenciones</span></div></button>
    <button class="v36-more-item" onclick="v36Go('evaluaciones')"><span class="v36-more-icon">${svg('check')}</span><div><strong>Evaluaciones</strong><span>Instrumentos y resultados</span></div></button>
    <button class="v36-more-item" onclick="v36Go('documentos')"><span class="v36-more-icon">${svg('file')}</span><div><strong>Documentos</strong><span>Archivos por paciente</span></div></button>
    <button class="v36-more-item" onclick="v36Go('caja')"><span class="v36-more-icon">${svg('money')}</span><div><strong>Caja diaria</strong><span>Ingresos y pendientes</span></div></button>
    <button class="v36-more-item" onclick="v36Go('alertas')"><span class="v36-more-icon">${svg('bell')}</span><div><strong>Alertas</strong><span>Seguimiento y pendientes</span></div></button>
    <button class="v36-more-item" onclick="closeV36More(); openPrintModal('dia','citas')"><span class="v36-more-icon">${svg('report')}</span><div><strong>Reportes</strong><span>Agenda, finanzas y recepción</span></div></button>
    <button class="v36-more-item" onclick="closeV36More(); openAssistantModal()"><span class="v36-more-icon">${svg('spark')}</span><div><strong>Asistente</strong><span>Consultas administrativas</span></div></button>
   </div>
 </div>`;
 document.body.appendChild(el);
 el.addEventListener('click',e=>{if(e.target===el) closeV36More();});
}
window.openV36More=function(){installMoreSheet();moreOpen=true;q('#v36-mobile-more')?.classList.add('open');q('#v36-mobile-more-btn')?.classList.add('v36-more-active');};
window.closeV36More=function(){moreOpen=false;q('#v36-mobile-more')?.classList.remove('open');q('#v36-mobile-more-btn')?.classList.remove('v36-more-active');};
window.toggleV36More=function(){moreOpen?closeV36More():openV36More();};
window.v36Go=function(tab){closeV36More(); window.switchTab?.(tab);};

function rebuildMobileNav(){
 const nav=q('.v2-mobile-nav'); if(!nav||nav.dataset.v36done==='1') return;
 nav.dataset.v36done='1';
 nav.innerHTML=`
  <button data-v2-nav="inicio" onclick="switchTab('inicio')" class="v2-nav-active">${svg('home')}<span>Inicio</span></button>
  <button data-v2-nav="citas" onclick="switchTab('citas')">${svg('calendar')}<span>Agenda</span></button>
  <button data-v2-nav="pacientes" onclick="switchTab('pacientes')">${svg('users')}<span>Pacientes</span></button>
  <button data-v2-nav="finanzas" onclick="switchTab('finanzas')">${svg('wallet')}<span>Finanzas</span></button>
  <button id="v36-mobile-more-btn" type="button" onclick="toggleV36More()">${svg('plus')}<span>Más</span></button>`;
}

function wrapRouter(){
 if(typeof window.switchTab!=='function'||window.switchTab.__v36) return false;
 const old=window.switchTab;
 const fn=function(target){closeV36More();const out=old.apply(this,arguments);setTimeout(()=>{
   qa('.v2-mobile-nav [data-v2-nav]').forEach(b=>b.classList.toggle('v2-nav-active',b.dataset.v2Nav===target));
   q('#v36-mobile-more-btn')?.classList.toggle('v36-more-active',!['inicio','citas','pacientes','finanzas'].includes(target));
 },0);return out;};
 fn.__v36=true;window.switchTab=fn;return true;
}

function ensureFab(){
 const fab=q('#btn-fab-main'); if(fab) fab.setAttribute('aria-label','Crear nuevo');
}
function init(){installMoreSheet();rebuildMobileNav();ensureFab();wrapRouter();}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
let tries=0;const t=setInterval(()=>{init();if(++tries>20)clearInterval(t)},250);
})();
