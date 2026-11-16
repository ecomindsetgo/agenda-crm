(function(global){
 'use strict';
 const numeric=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;};
 const validAppointment=a=>a&&!a.isManualBlock&&a.recordType!=='manual_block';
 const currency=a=>isCenterMedical(a)?'PEN':(a.currency==='USD'?'USD':'PEN');
 const normalizeStatus=value=>String(value??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_');
 const completed=a=>['completada','completado','completed'].includes(normalizeStatus(a&&a.status));
 const isCenterMedical=a=>!!a&&(a.collectionMode==='centro_medico'||a.careOrigin==='centro_medico');
 const withPatientCareOrigin=(a,patient)=>{if(!a||isCenterMedical(a)||a.careOrigin||a.collectionMode||patient?.careOrigin!=='centro_medico')return a;return {...a,careOrigin:'centro_medico',collectionMode:'centro_medico',cost:60,currency:'PEN'};};
 const cost=a=>isCenterMedical(a)?60:numeric(a&&a.cost);
 const cancelled=a=>['cancelada','cancelado','no_asistio','no_show'].includes(normalizeStatus(a&&a.status));
 // Ambos tipos de cita usan el mismo registro de pagos. En el centro médico la
 // tarifa es fija (S/60), pero solo se considera cobrada cuando existe un pago.
 const paid=a=>{const hasAmount=a&&a.paidAmount!==undefined&&a.paidAmount!==null&&a.paidAmount!=='';return Math.min(cost(a),hasAmount?numeric(a.paidAmount):(a&&a.paymentStatus==='pagado'?cost(a):0));};
 const paymentState=a=>{if(isCenterMedical(a)&&cancelled(a)&&paid(a)<=0)return 'no_aplica';return paid(a)<=0?'pendiente':cost(a)>0&&paid(a)>=cost(a)?'pagado':'parcial';};
 const paymentMismatch=a=>isCenterMedical(a)?false:String(a&&a.paymentStatus||'pendiente').toLowerCase()!==paymentState(a);
 const remaining=a=>cancelled(a)?0:Math.max(0,cost(a)-paid(a));
 function metrics(input){
  const bucket=()=>({facturado:0,cobrado:0,porCobrar:0,vencido:0,futuro:0,perdido:0,devengado:0,anticiposCancelados:0});
  const m={PEN:bucket(),USD:bucket(),citas:0,completadas:0,canceladas:0,programadas:0,citasPagadas:0,citasPorCobrar:0,presencial:0,virtual:0,individual:0,pareja:0,sesionSuelta:0,sesionPaquete:0,_pacientes:new Set(),centroMedico:{citas:0,completadas:0,canceladas:0,ingresos:0}};
  const apps=(input||[]).filter(validAppointment);
  apps.forEach(a=>{
   const center=isCenterMedical(a),b=m[currency(a)],price=cost(a),received=paid(a),due=remaining(a);
   m.citas++;if(a.patientId)m._pacientes.add(String(a.patientId));m[a.modality==='virtual'?'virtual':'presencial']++;m[a.attentionType==='pareja'?'pareja':'individual']++;m[a.packageId?'sesionPaquete':'sesionSuelta']++;
   if(center){
    m.centroMedico.citas++;b.cobrado+=received;m.centroMedico.ingresos+=received;
    if(received>=price&&price>0)m.citasPagadas++;
    if(cancelled(a)){m.centroMedico.canceladas++;m.canceladas++;b.anticiposCancelados+=received;return;}
    // El total facturado incluye las citas del centro que siguen vigentes,
    // igual que las particulares; el honorario es S/60 por atención.
    b.facturado+=price;b.porCobrar+=due;
    if(due>0){m.citasPorCobrar++;b[completed(a)?'vencido':'futuro']+=due;}
    if(completed(a)){m.completadas++;m.centroMedico.completadas++;b.devengado+=price;}
    else m.programadas++;
    return;
   }
   b.cobrado+=received;if(received>=price&&price>0)m.citasPagadas++;
   if(cancelled(a)){m.canceladas++;b.perdido+=price;b.anticiposCancelados+=received;return;}b.facturado+=price;if(completed(a)){m.completadas++;b.devengado+=price;}else m.programadas++;
   b.porCobrar+=due;if(due>0){m.citasPorCobrar++;b[completed(a)?'vencido':'futuro']+=due;}
  });
  m.pacientesUnicos=m._pacientes.size;
  ['PEN','USD'].forEach(c=>{m['tasaCobranza'+c]=m[c].facturado?Math.min(100,(m[c].cobrado-m[c].anticiposCancelados)/m[c].facturado*100):0;const eligible=apps.filter(a=>!isCenterMedical(a)&&!cancelled(a)&&currency(a)===c&&cost(a)>0);m['ticketPromedio'+c]=eligible.length?eligible.reduce((n,a)=>n+cost(a),0)/eligible.length:0;});
  const billable=apps.filter(a=>!cancelled(a)&&cost(a)>0);m.tasaCobranza=billable.length?billable.filter(a=>remaining(a)===0).length/billable.length*100:0;
  const resolved=m.completadas+m.canceladas;m.tasaAsistencia=resolved?m.completadas/resolved*100:0;m.tasaCancelacion=resolved?m.canceladas/resolved*100:0;return m;
 }
 function money(pen,usd){return 'S/ '+numeric(pen).toFixed(2)+(numeric(usd)?' · US$ '+numeric(usd).toFixed(2):'');}
 function dateKey(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
 function inRange(a,start,end){return validAppointment(a)&&(!start||a.date>=start)&&(!end||a.date<=end);}
 function safeURL(value){try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}}
 function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@\-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 global.CRMCore={numeric,validAppointment,currency,normalizeStatus,completed,isCenterMedical,withPatientCareOrigin,cost,paid,paymentState,paymentMismatch,remaining,cancelled,metrics,money,dateKey,inRange,safeURL,csvCell};
})(typeof window==='undefined'?globalThis:window);
