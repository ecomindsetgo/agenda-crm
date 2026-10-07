(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
const clean=t=>String(t||'').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu,'').replace(/\s+/g,' ').trim();

function iconTitle(el,name,text){
  if(!el||el.dataset.v33done==='1') return;
  el.dataset.v33done='1';
  el.innerHTML=`<span class="v33-modal-title-icon">${svg(name)}</span><span>${text||clean(el.textContent)}</span>`;
}

function addHint(target,text){
  if(!target||target.querySelector('.v33-modal-hint')) return;
  const p=document.createElement('p');
  p.className='v33-modal-hint';
  p.textContent=text;
  target.appendChild(p);
}

function stripOptionEmoji(){
  qa('#app-rate-type option,#pat-currency option,#pat-origen option,#pat-canal option').forEach(o=>o.textContent=clean(o.textContent));
  qa('#appointment-form label,#patient-form label').forEach(el=>{ if(el.childElementCount===0) el.textContent=clean(el.textContent); });
}

function enhanceModals(){
  iconTitle(q('#app-modal-title'),'calendar','Programar cita');
  addHint(q('#app-modal-title')?.parentElement,'Agenda clínica, modalidad y cobro en una sola ficha.');
  iconTitle(q('#patient-modal-title'),'users','Registrar paciente');
  addHint(q('#patient-modal-title')?.parentElement,'Datos generales, procedencia y seguimiento comercial-clínico.');
  iconTitle(q('#profile-modal h3'),'edit','Mi cuenta');
  iconTitle(q('#assistant-modal h3'),'clinical','Asistente personal');

  const histTitle=q('#patient-history-modal h3');
  if(histTitle && !histTitle.dataset.v33done){
    histTitle.dataset.v33done='1';
    histTitle.classList.add('v33-history-top');
  }

  const appSave=q('#appointment-form button[type="submit"]');
  if(appSave && !appSave.dataset.v33done){appSave.dataset.v33done='1'; appSave.innerHTML=`${svg('check')}<span>Guardar cita</span>`; appSave.classList.add('flex','items-center','justify-center','gap-2');}
  const patSave=q('#patient-form button[type="submit"]');
  if(patSave && !patSave.dataset.v33done){patSave.dataset.v33done='1'; patSave.innerHTML=`${svg('check')}<span>Guardar paciente</span>`; patSave.classList.add('flex','items-center','justify-center','gap-2');}
  const appNew=q('#appointment-form button[onclick="switchToNewPatientFromAppoint()"]');
  if(appNew && !appNew.dataset.v33done){appNew.dataset.v33done='1'; appNew.innerHTML=`${svg('plus')} <span>Nuevo</span>`; appNew.classList.add('inline-flex','items-center','gap-1');}
  const appCancel=q('#appointment-form button[onclick="closeAppointmentModal()"]');
  if(appCancel) appCancel.textContent='Cancelar';
  const patCancel=q('#patient-form button[onclick="closePatientModal()"]');
  if(patCancel) patCancel.textContent='Cancelar';
  const ptab=q('#ptab-perfil'); if(ptab) ptab.innerHTML=`${svg('edit')} <span>Perfil</span>`;
  const pkey=q('#ptab-clave'); if(pkey) pkey.innerHTML=`${svg('lock')} <span>Seguridad</span>`;
  stripOptionEmoji();
}

function enhanceFinance(){
  const sec=q('#sec-finanzas');
  if(!sec) return;
  sec.classList.add('v33-finance');

  const head=q('.v23-finance-toolbar-head h2',sec);
  if(head && !head.dataset.v33done){
    head.dataset.v33done='1';
    head.classList.add('v33-fin-title');
    head.innerHTML=`<span class="v33-fin-ico">${svg('wallet')}</span><span>Finanzas del consultorio</span>`;
  }
  const eyebrow=q('.v23-finance-toolbar-head .v2-eyebrow',sec);
  if(eyebrow) eyebrow.textContent='Panel financiero';
  const excel=[...qa('.v23-toolbar-actions button',sec)].find(b=>/excel/i.test(b.textContent||''));
  if(excel) excel.innerHTML=`${svg('download')} <span>Exportar Excel</span>`;
  const report=[...qa('.v23-toolbar-actions button',sec)].find(b=>/reporte/i.test(b.textContent||''));
  if(report) report.innerHTML=`${svg('report')} <span>Generar reporte</span>`;
  const summaryLabel=q('#finance-period-summary-label',sec);
  if(summaryLabel){summaryLabel.className='v33-soft-note'; summaryLabel.innerHTML=`${svg('calendar')} <span>Los indicadores responden al filtro superior</span>`;}

  const metricCards=qa(':scope > div.bg-white:first-of-type .grid > div',sec);
  const metricMeta=[
    ['money','Monto total facturado','neutral'],
    ['wallet','Cobrado en caja','success'],
    ['report','Pendiente de cobro','warn'],
    ['check','Tasa de cobranza','info']
  ];
  metricCards.slice(0,4).forEach((card,i)=>{
    card.classList.add('v33-metric-card');
    card.dataset.tone=metricMeta[i][2];
    const title=card.querySelector('span');
    if(title && !card.dataset.v33done){
      card.dataset.v33done='1';
      title.classList.add('v33-card-headline');
      title.innerHTML=`<span class="v33-minibadge">${svg(metricMeta[i][0])}</span><strong>${metricMeta[i][1]}</strong>`;
    }
  });

  const blockIcons=['money','users','report','calendar','check','clock','wallet','folder'];
  qa('section#sec-finanzas > .bg-white h3, section#sec-finanzas > .grid .bg-white h3').forEach((h3,idx)=>{
    if(h3.dataset.v33done==='1') return;
    h3.dataset.v33done='1';
    const txt=clean(h3.textContent);
    h3.classList.add('v33-block-title');
    h3.innerHTML=`<span class="v33-fin-ico">${svg(blockIcons[idx]||'report')}</span><span>${txt}</span>`;
  });
}

function enhanceDocuments(){
  const sec=q('#sec-documentos');
  if(!sec) return;
  const eyebrow=q('.v3-eyebrow',sec); if(eyebrow) eyebrow.classList.add('v33-hidden');
  const desc=q('.v3-section-head p',sec); if(desc) desc.textContent='Centraliza por paciente enlaces a consentimientos, informes, recetas y otros archivos de apoyo.';
  qa('p').forEach(p=>{
    if(!sec.contains(p) && /consentimientos, informes, recetas/i.test(p.textContent||'')) p.remove();
    if(!sec.contains(p) && /expediente digital/i.test(p.textContent||'')) p.remove();
  });
}

function enhanceReports(){
  const title=q('#print-modal .v31-report-modal-head h3');
  if(title && !title.dataset.v33done){
    title.dataset.v33done='1';
    title.textContent='Centro de reportes';
  }
  const subtitle=q('#print-modal .v31-report-modal-head p');
  if(subtitle) subtitle.textContent='Genera reportes con una presentación unificada para agenda, finanzas y recepción.';
  const cats=[['btn-pc-citas','calendar','Agenda'],['btn-pc-finanzas','wallet','Finanzas'],['btn-pc-recepcion','reception','Recepción']];
  cats.forEach(([id,ico,txt])=>{const b=q('#'+id); if(b && !b.dataset.v33done){b.dataset.v33done='1'; b.innerHTML=`${svg(ico)}<span>${txt}</span>`;}})
  const printBtn=[...qa('#print-modal .v31-report-actions .v31-btn')].find(b=>/vista|impresión/i.test(b.textContent||''));
  if(printBtn && !printBtn.dataset.v33done){printBtn.dataset.v33done='1'; printBtn.innerHTML=`${svg('printer')}<span>Vista de impresión</span>`;}
}

function enhanceMisc(){
  const aiNav=[...qa('button[data-v2-nav] span, .v2-sidebar button span')].find(el=>clean(el.textContent)==='Asistente IA');
  if(aiNav) aiNav.textContent='Asistente';
  qa('#patient-form .text-amber-600, #patient-form .text-indigo-500').forEach(el=>el.textContent=clean(el.textContent));
}

function init(){
  enhanceModals();
  enhanceFinance();
  enhanceDocuments();
  enhanceReports();
  enhanceMisc();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{init(); setTimeout(init,300); setTimeout(init,1200);});
else {init(); setTimeout(init,300); setTimeout(init,1200);} 

// V3.4: se elimina el observador global para evitar ciclos de renderizado.
})();
