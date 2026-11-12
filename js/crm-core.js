(function(global){
 'use strict';
 const numeric=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;};
 const validAppointment=a=>a&&!a.isManualBlock&&a.recordType!=='manual_block';
 const currency=a=>a.currency==='USD'?'USD':'PEN';
 const isCenterMedical=a=>!!a&&(a.collectionMode==='centro_medico'||a.careOrigin==='centro_medico');
 const cost=a=>numeric(a.cost);
 const paid=a=>{if(isCenterMedical(a))return 0;const hasAmount=a.paidAmount!==undefined&&a.paidAmount!==null&&a.paidAmount!=='';return Math.min(cost(a),hasAmount?numeric(a.paidAmount):(a.paymentStatus==='pagado'?cost(a):0));};
 const paymentState=a=>isCenterMedical(a)?'no_aplica':(paid(a)<=0?'pendiente':cost(a)>0&&paid(a)>=cost(a)?'pagado':'parcial');
 const paymentMismatch=a=>isCenterMedical(a)?false:String(a.paymentStatus||'pendiente').toLowerCase()!==paymentState(a);
 const cancelled=a=>['cancelada','no_asistio'].includes(a.status);
 const remaining=a=>isCenterMedical(a)||cancelled(a)?0:Math.max(0,cost(a)-paid(a));
 const settlementDue=a=>isCenterMedical(a)?numeric(a.settlementAmount!==undefined?a.settlementAmount:a.cost):0;
 const settlementPaid=a=>{if(!isCenterMedical(a))return 0;const hasAmount=a.settlementPaidAmount!==undefined&&a.settlementPaidAmount!==null&&a.settlementPaidAmount!=='';if(hasAmount)return Math.min(settlementDue(a),numeric(a.settlementPaidAmount));return Math.min(settlementDue(a),(Array.isArray(a.settlementHistory)?a.settlementHistory:[]).reduce((n,e)=>n+numeric(e.amount),0));};
 const settlementRemaining=a=>!isCenterMedical(a)||cancelled(a)?0:Math.max(0,settlementDue(a)-settlementPaid(a));
 const settlementState=a=>!isCenterMedical(a)?'no_aplica':(settlementPaid(a)<=0?'pendiente':settlementRemaining(a)<=0?'liquidado':'parcial');
 function metrics(input){
  const bucket=()=>({facturado:0,cobrado:0,porCobrar:0,vencido:0,futuro:0,perdido:0,devengado:0,anticiposCancelados:0});
  const m={PEN:bucket(),USD:bucket(),citas:0,completadas:0,canceladas:0,programadas:0,citasPagadas:0,citasPorCobrar:0,presencial:0,virtual:0,individual:0,pareja:0,sesionSuelta:0,sesionPaquete:0,_pacientes:new Set(),centroMedico:{citas:0,completadas:0,canceladas:0,honorarios:0,liquidado:0,porLiquidar:0,citasPorLiquidar:0}};
  const apps=(input||[]).filter(validAppointment);
  apps.forEach(a=>{
   const center=isCenterMedical(a),b=m[currency(a)],price=cost(a),received=paid(a),due=remaining(a);
   m.citas++;if(a.patientId)m._pacientes.add(String(a.patientId));m[a.modality==='virtual'?'virtual':'presencial']++;m[a.attentionType==='pareja'?'pareja':'individual']++;m[a.packageId?'sesionPaquete':'sesionSuelta']++;
   if(center){m.centroMedico.citas++;if(cancelled(a)){m.centroMedico.canceladas++;m.canceladas++;return;}if(a.status==='completada'){m.completadas++;m.centroMedico.completadas++;m.centroMedico.honorarios+=settlementDue(a);m.centroMedico.liquidado+=settlementPaid(a);m.centroMedico.porLiquidar+=settlementRemaining(a);if(settlementRemaining(a)>0)m.centroMedico.citasPorLiquidar++;}else m.programadas++;return;}
   b.cobrado+=received;if(received>=price&&price>0)m.citasPagadas++;
   if(cancelled(a)){m.canceladas++;b.perdido+=price;b.anticiposCancelados+=received;return;}b.facturado+=price;if(a.status==='completada'){m.completadas++;b.devengado+=price;}else m.programadas++;
   b.porCobrar+=due;if(due>0){m.citasPorCobrar++;b[a.status==='completada'?'vencido':'futuro']+=due;}
  });
  m.pacientesUnicos=m._pacientes.size;
  ['PEN','USD'].forEach(c=>{m['tasaCobranza'+c]=m[c].facturado?Math.min(100,(m[c].cobrado-m[c].anticiposCancelados)/m[c].facturado*100):0;const eligible=apps.filter(a=>!isCenterMedical(a)&&!cancelled(a)&&currency(a)===c&&cost(a)>0);m['ticketPromedio'+c]=eligible.length?eligible.reduce((n,a)=>n+cost(a),0)/eligible.length:0;});
  const billable=apps.filter(a=>!isCenterMedical(a)&&!cancelled(a)&&cost(a)>0);m.tasaCobranza=billable.length?billable.filter(a=>remaining(a)===0).length/billable.length*100:0;
  const resolved=m.completadas+m.canceladas;m.tasaAsistencia=resolved?m.completadas/resolved*100:0;m.tasaCancelacion=resolved?m.canceladas/resolved*100:0;return m;
 }
 function money(pen,usd){return 'S/ '+numeric(pen).toFixed(2)+(numeric(usd)?' · US$ '+numeric(usd).toFixed(2):'');}
 function dateKey(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
 function inRange(a,start,end){return validAppointment(a)&&(!start||a.date>=start)&&(!end||a.date<=end);}
 function safeURL(value){try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}}
 function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@\-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 global.CRMCore={numeric,validAppointment,currency,isCenterMedical,cost,paid,paymentState,paymentMismatch,remaining,settlementDue,settlementPaid,settlementRemaining,settlementState,cancelled,metrics,money,dateKey,inRange,safeURL,csvCell};
})(typeof window==='undefined'?globalThis:window);
