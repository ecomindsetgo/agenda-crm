(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const ico=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;

function buildPageHeads(){
  const patients=q('#sec-pacientes');
  if(patients && !q('.v35-page-head',patients)){
    patients.insertAdjacentHTML('afterbegin',`<div class="v35-page-head"><div class="v35-page-head-left"><span class="v35-page-icon">${ico('users')}</span><div><span class="v35-eyebrow">Pacientes</span><h2>CRM clínico</h2><p>Un único listado para buscar, segmentar y abrir la ficha 360 de cada paciente.</p></div></div><button class="v35-primary" onclick="openPatientModal()">${ico('plus')}<span>Nuevo paciente</span></button></div>`);
  }
  if(patients){
    const children=[...patients.children];
    children.forEach((el,i)=>{
      if(i===0) return; // page head inserted
      if(el.classList.contains('v2-panel')) return; // keep CRM panel
      el.classList.add('v35-legacy-hidden');
    });
  }

  const alerts=q('#sec-alertas');
  if(alerts && !q('.v35-page-head',alerts)){
    alerts.insertAdjacentHTML('afterbegin',`<div class="v35-page-head"><div class="v35-page-head-left"><span class="v35-page-icon">${ico('bell')}</span><div><span class="v35-eyebrow">Seguimiento</span><h2>Centro de alertas</h2><p>Solo incidencias que requieren acción: cobros, seguimiento, historias pendientes y paquetes por terminar.</p></div></div><button class="v35-primary" onclick="renderV2Alerts()">${ico('bell')}<span>Actualizar</span></button></div>`);
  }
}

function isolateModules(){
  if(window.__v35RouterInstalled) return;
  const old=window.switchTab;
  if(typeof old!=='function') return;
  window.__v35RouterInstalled=true;
  window.switchTab=function(target){
    qa('main>section[id^="sec-"]').forEach(s=>s.classList.add('hidden'));
    const result=old.apply(this,arguments);
    // hard isolation after legacy routers execute
    setTimeout(()=>{
      qa('main>section[id^="sec-"]').forEach(s=>{
        if(s.id!==`sec-${target}`) s.classList.add('hidden');
      });
      const targetSec=q(`#sec-${target}`);
      if(targetSec) targetSec.classList.remove('hidden');
    },0);
    return result;
  };
}

function appointmentForm(){
  const modal=q('#appointment-modal>div'), form=q('#appointment-form');
  if(!modal||!form||form.dataset.v35==='1') return;
  form.dataset.v35='1';
  const hiddenValues={};
  ['app-id','app-package-id','app-package-type','app-session-value','app-package-consumed'].forEach(id=>{hiddenValues[id]=q('#'+id)?.value||''});
  modal.querySelector(':scope>div:first-child').outerHTML=`<div class="v35-modal-head"><div class="v35-modal-heading"><span class="v35-modal-icon">${ico('calendar')}</span><div><h3 id="app-modal-title">Programar cita</h3><p>Paciente, horario, atención y cobro en una ficha compacta.</p></div></div><button type="button" class="v35-close" onclick="closeAppointmentModal()" aria-label="Cerrar">${ico('x')}</button></div>`;
  form.className='v35-form';
  form.innerHTML=`
    <input type="hidden" id="app-id" value="${hiddenValues['app-id']}">
    <input type="hidden" id="app-package-id" value="${hiddenValues['app-package-id']}">
    <input type="hidden" id="app-package-type" value="${hiddenValues['app-package-type']}">
    <input type="hidden" id="app-session-value" value="${hiddenValues['app-session-value']}">
    <input type="hidden" id="app-package-consumed" value="${hiddenValues['app-package-consumed']}">

    <section class="v35-section">
      <div class="v35-section-title">${ico('calendar')} Datos de la cita</div>
      <div class="v35-grid-3">
        <div class="v35-field full"><label>Paciente clínico *</label><div style="display:flex;gap:8px"><select id="app-patient-select" required onchange="autoSelectPatientPackage(); updateAppointmentPricing()" style="flex:1"></select><button type="button" onclick="switchToNewPatientFromAppoint()" class="v35-inline-new">${ico('plus')} Nuevo</button></div></div>
        <div class="v35-field"><label>Fecha *</label><input type="date" id="app-date" required></div>
        <div class="v35-field"><label>Hora *</label><input type="time" id="app-time" required></div>
        <div class="v35-field"><label>Estado *</label><select id="app-status"><option value="pendiente">Pendiente</option><option value="completada">Completada</option><option value="no_asistio">No asistió</option><option value="cancelada">Cancelada</option></select></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('clinical')} Atención</div>
      <div class="v35-grid-2">
        <div class="v35-field"><label>Tipo de atención *</label><div class="v35-choice-grid"><label class="v35-choice"><input type="radio" name="app-attention-type" id="app-attention-individual" value="individual" checked onchange="autoSelectPatientPackage(); updateAppointmentPricing()"> Individual</label><label class="v35-choice"><input type="radio" name="app-attention-type" id="app-attention-pareja" value="pareja" onchange="autoSelectPatientPackage(); updateAppointmentPricing()"> Pareja</label></div></div>
        <div class="v35-field"><label>Modalidad *</label><div class="v35-choice-grid"><label class="v35-choice"><input type="radio" name="app-modality" id="app-modality-presencial" value="presencial" checked onchange="updateAppointmentPricing()"> Presencial</label><label class="v35-choice"><input type="radio" name="app-modality" id="app-modality-virtual" value="virtual" onchange="updateAppointmentPricing()"> Virtual</label></div></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('wallet')} Cobro</div>
      <div class="v35-grid-3">
        <div class="v35-field"><label>Tarifa *</label><select id="app-rate-type" onchange="updateAppointmentPricing()"><option value="sesion">Sesión individual</option><option value="paquete6">Paquete de 6 sesiones</option><option value="paquete8">Paquete de 8 sesiones</option></select></div>
        <div class="v35-field"><label id="app-cost-label">Precio (S/) *</label><input type="number" id="app-cost" min="0" step="0.50" value="50.00" required><span class="v35-help">Editable si necesitas ajustar la tarifa.</span></div>
        <div class="v35-field"><label>Estado de pago *</label><select id="app-payment"><option value="pendiente">Pendiente de cobro</option><option value="pagado">Pagado</option></select></div>
      </div>
      <div id="app-package-info" class="hidden" style="margin-top:12px"></div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('edit')} Nota administrativa</div>
      <div class="v35-field"><label>Observaciones</label><textarea id="app-notes" rows="3" placeholder="Observaciones relacionadas con la cita..."></textarea></div>
    </section>
    <div class="v35-form-actions"><button type="button" onclick="closeAppointmentModal()" class="v35-btn-cancel">Cancelar</button><button type="submit" class="v35-btn-save">${ico('check')} Guardar cita</button></div>`;
  try{window.updatePatientDropdowns?.()}catch(_){}
}

function patientForm(){
  const modal=q('#patient-modal>div'), form=q('#patient-form');
  if(!modal||!form||form.dataset.v35==='1') return;
  form.dataset.v35='1';
  const pid=q('#patient-id')?.value||'';
  modal.querySelector(':scope>div:first-child').outerHTML=`<div class="v35-modal-head"><div class="v35-modal-heading"><span class="v35-modal-icon">${ico('users')}</span><div><h3 id="patient-modal-title">Registrar paciente</h3><p>Datos esenciales y seguimiento, sin campos repetidos.</p></div></div><button type="button" class="v35-close" onclick="closePatientModal()" aria-label="Cerrar">${ico('x')}</button></div>`;
  form.className='v35-form';
  form.innerHTML=`
    <input type="hidden" id="patient-id" value="${pid}">
    <section class="v35-section">
      <div class="v35-section-title">${ico('users')} Datos personales</div>
      <div class="v35-grid-2">
        <div class="v35-field full"><label>Nombre completo *</label><input type="text" id="pat-name" required placeholder="Ej. Alejandra Ruiz Medina"></div>
        <div class="v35-field"><label>DNI</label><input type="text" id="pat-dni" placeholder="12345678"></div>
        <div class="v35-field"><label>Teléfono *</label><input type="tel" id="pat-phone" required placeholder="987654321"></div>
        <div class="v35-field"><label>Fecha de nacimiento</label><input type="date" id="pat-birth"></div>
        <div class="v35-field"><label>Edad</label><input type="text" id="pat-age" placeholder="Edad"></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('report')} Seguimiento</div>
      <div class="v35-grid-3">
        <div class="v35-field"><label>Origen del contacto</label><select id="pat-origen"><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="marketplace">Facebook Marketplace</option><option value="web">Página web</option><option value="whatsapp">WhatsApp directo</option><option value="calendly">Calendly</option><option value="google">Google</option><option value="referido">Referido</option><option value="otro" selected>Otro</option></select></div>
        <div class="v35-field"><label>Canal</label><select id="pat-canal"><option value="whatsapp" selected>WhatsApp</option><option value="llamada">Llamada telefónica</option><option value="presencial">Presencial</option><option value="email">Email</option><option value="otro">Otro</option></select></div>
        <div class="v35-field"><label>Estado CRM</label><select id="pat-lead-status"><option value="nuevo" selected>Nuevo</option><option value="contactado">Contactado</option><option value="interesado">Interesado</option><option value="cita_agendada">Cita agendada</option><option value="atendido">Atendido</option><option value="recurrente">En tratamiento</option><option value="seguimiento">Seguimiento</option><option value="pausado">Pausado</option><option value="alta">Alta terapéutica</option><option value="inactivo">Inactivo</option></select></div>
        <div class="v35-field"><label>Moneda</label><select id="pat-currency"><option value="PEN" selected>Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('clinical')} Antecedentes generales</div>
      <div class="v35-field"><label>Observaciones administrativas / antecedentes breves</label><textarea id="pat-history" rows="4" placeholder="Información general relevante para la ficha del paciente..."></textarea><span class="v35-help">La historia clínica detallada se registra en su módulo clínico, no aquí.</span></div>
    </section>
    <div class="v35-form-actions"><button type="button" onclick="closePatientModal()" class="v35-btn-cancel">Cancelar</button><button type="submit" class="v35-btn-save">${ico('check')} Guardar paciente</button></div>`;
}


function normalizeModalTitles(){
  const at=q('#app-modal-title');
  if(at) at.textContent=(q('#app-id')?.value?'Editar cita':'Programar cita');
  const pt=q('#patient-modal-title');
  if(pt) pt.textContent=(q('#patient-id')?.value?'Editar paciente':'Registrar paciente');
}

function wrapModalOpeners(){
  if(window.__v35ModalWrappers) return;
  const oa=window.openAppointmentModal, op=window.openPatientModal, ea=window.editAppointment, ep=window.editPatient;
  if(typeof oa==='function') window.openAppointmentModal=function(){const r=oa.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof op==='function') window.openPatientModal=function(){const r=op.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof ea==='function') window.editAppointment=function(){const r=ea.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof ep==='function') window.editPatient=function(){const r=ep.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  window.__v35ModalWrappers=true;
}

function refreshFormsData(){
  try{
    const sel=q('#app-patient-select');
    const s=window._profileState;
    if(sel && s?.patients){sel.innerHTML=s.patients.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(p=>`<option value="${p.id}">${p.name||'Paciente'}</option>`).join('')||'<option value="">Sin pacientes</option>';}
  }catch(_){}
}

function init(){
  buildPageHeads();
  isolateModules();
  appointmentForm();
  patientForm();
  refreshFormsData();
  wrapModalOpeners();
  normalizeModalTitles();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{init();setTimeout(init,500);setTimeout(init,1600)});
else {init();setTimeout(init,500);setTimeout(init,1600)}
})();
