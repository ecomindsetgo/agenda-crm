'use strict';
const crypto=require('node:crypto');
const APP_ID='psicologia-agenda-default-v2';
function validDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return false;const d=new Date(date+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;}
function validTime(time){return /^([01]\d|2[0-3]):[0-5]\d$/.test(time||'');}
function at(a){return validDate(a.date)&&validTime(a.time)?Date.parse(a.date+'T'+a.time+':00-05:00'):NaN;}
function active(a){return a&&!a.isManualBlock&&a.recordType!=='manual_block'&&!['cancelada','no_asistio','completada'].includes(a.status);}
function phone(number){const s=String(number||'').replace(/[\s()+.-]/g,'');if(/^9\d{8}$/.test(s))return '51'+s;if(/^[1-9]\d{9,14}$/.test(s))return s;return null;}
function reminderKey(uid,a,minutes){return crypto.createHash('sha256').update([uid,a.id,a.date,a.time,minutes].join('|')).digest('hex');}
function due(a,settings,now){const minutes=Number(settings.leadMinutes);return [30,60,1440].includes(minutes)&&active(a)&&at(a)>now&&at(a)-now<=minutes*60000&&at(a)-now>=minutes*60000-10*60000;}
function templatePayload(a,p,settings){const to=phone(p.whatsappPhone||p.phone);if(!to||p.whatsappOptIn!==true)throw new Error('Consentimiento o teléfono pendiente');return {messaging_product:'whatsapp',to,type:'template',template:{name:settings.templateName,language:{code:settings.language||'es_PE'},components:[{type:'body',parameters:[{type:'text',text:p.name||'Paciente'},{type:'text',text:a.date.split('-').reverse().join('/')},{type:'text',text:a.time},{type:'text',text:a.modality==='virtual'?'virtual':'presencial'}]}]}};}
function safeAmount(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;}
function summary(appointments){const buckets={PEN:{cobrado:0,pendiente:0},USD:{cobrado:0,pendiente:0}};for(const a of appointments){if(a.isManualBlock||a.recordType==='manual_block')continue;const cost=safeAmount(a.cost),paid=a.paymentStatus==='pagado'?cost:Math.min(cost,safeAmount(a.paidAmount)),b=buckets[a.currency==='USD'?'USD':'PEN'];b.cobrado+=paid;if(!['cancelada','no_asistio'].includes(a.status))b.pendiente+=cost-paid;}return buckets;}
function queryAnswer(plan,patients,appointments){
 if(plan.patientId&&!patients.some(p=>p.id===plan.patientId))throw new Error('Indica un paciente registrado.');
 if(!['agenda','finanzas','disponibilidad'].includes(plan.query))throw new Error('Indica qué deseas consultar.');
 if(plan.query==='disponibilidad'){
  if(!validDate(plan.date)||!validTime(plan.time))throw new Error('Indica fecha y hora para revisar disponibilidad.');const start=Number(plan.time.slice(0,2))*60+Number(plan.time.slice(3)),end=start+60;
  const conflict=appointments.some(a=>{if(a.date!==plan.date||['cancelada','no_asistio'].includes(a.status))return false;const manual=a.isManualBlock||a.recordType==='manual_block',time=manual?a.blockStart:a.time;if(!validTime(time))return false;const from=Number(time.slice(0,2))*60+Number(time.slice(3));const until=manual&&validTime(a.blockEnd)?Number(a.blockEnd.slice(0,2))*60+Number(a.blockEnd.slice(3)):from+60;return from<end&&until>start;});
  return {action:'respuesta',message:plan.date+' a las '+plan.time+': '+(conflict?'el horario está ocupado o bloqueado.':'no hay citas ni bloqueos que se crucen con una sesión de 60 minutos. Confirma nuevamente al guardar la cita.')};
 }
 if(!validDate(plan.from)||!validDate(plan.to)||plan.from>plan.to)throw new Error('Indica un periodo válido.');
 const list=appointments.filter(a=>!a.isManualBlock&&a.recordType!=='manual_block'&&a.date>=plan.from&&a.date<=plan.to&&(!plan.patientId||a.patientId===plan.patientId)).sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time)));
 if(plan.query==='agenda')return {action:'respuesta',message:'Del '+plan.from+' al '+plan.to+': '+list.length+' citas.\n'+list.slice(0,40).map(a=>a.date+' '+a.time+' · '+a.patientName+' · '+a.status).join('\n')+(list.length>40?'\nConsulta Agenda para ver las demás citas.':'')};
 const totals=summary(list);return {action:'respuesta',message:'Del '+plan.from+' al '+plan.to+', según fecha de cita:\nCobrado: S/ '+totals.PEN.cobrado.toFixed(2)+' · US$ '+totals.USD.cobrado.toFixed(2)+'\nSaldo pendiente: S/ '+totals.PEN.pendiente.toFixed(2)+' · US$ '+totals.USD.pendiente.toFixed(2)};
}
function validatePlan(plan,patients,appointments){
 if(plan?.action==='consulta')return queryAnswer(plan,patients,appointments);
 if(!plan||!['respuesta','agendar','reprogramar','cancelar','pago','nota'].includes(plan.action))throw new Error('Acción no válida');
 const result={action:plan.action,message:String(plan.message||'').slice(0,2000)};
 if(plan.action==='respuesta')return result;
 const patient=patients.find(p=>p.id===plan.patientId),appointment=appointments.find(a=>a.id===plan.appointmentId);
 if(['agendar','nota'].includes(plan.action)&&!patient)throw new Error('Selecciona un paciente existente.');
 if(['reprogramar','cancelar','pago'].includes(plan.action)&&(!appointment||appointment.isManualBlock||appointment.recordType==='manual_block'))throw new Error('Selecciona una cita válida.');
 if(['agendar','reprogramar'].includes(plan.action)){if(!validDate(plan.date)||!validTime(plan.time))throw new Error('Indica fecha y hora válidas.');if(at(plan)<=Date.now())throw new Error('Selecciona un horario futuro.');Object.assign(result,{date:plan.date,time:plan.time});}
 if(patient)Object.assign(result,{patientId:patient.id,patientName:patient.name});
 if(appointment)Object.assign(result,{appointmentId:appointment.id,patientId:appointment.patientId,patientName:appointment.patientName});
 if(plan.action==='agendar'){if(!['individual','pareja'].includes(plan.attentionType)||!['presencial','virtual'].includes(plan.modality))throw new Error('Indica tipo de atención y modalidad.');if(!Number.isFinite(plan.cost)||plan.cost<0||plan.cost>10000)throw new Error('Indica una tarifa válida.');Object.assign(result,{cost:Math.round(plan.cost*100)/100,currency:patient.currency==='USD'?'USD':'PEN',modality:plan.modality,attentionType:plan.attentionType});}
 if(plan.action==='pago'){const cost=safeAmount(appointment.cost),paid=appointment.paymentStatus==='pagado'?cost:Math.min(cost,safeAmount(appointment.paidAmount));if(['cancelada','no_asistio'].includes(appointment.status)||!Number.isFinite(plan.amount)||plan.amount<=0||plan.amount>cost-paid+.001)throw new Error('El abono debe ser mayor que cero y no superar el saldo de una cita activa.');if(!validDate(plan.date))throw new Error('Indica la fecha del pago.');Object.assign(result,{amount:Math.round(plan.amount*100)/100,date:plan.date,currency:appointment.currency==='USD'?'USD':'PEN',method:['Yape','Plin','Efectivo','Transferencia','Tarjeta','Otro'].includes(plan.method)?plan.method:'Otro'});}
 if(plan.action==='nota'){if(!validDate(plan.date)||!String(plan.note||'').trim())throw new Error('Indica fecha y contenido de la nota.');Object.assign(result,{date:plan.date,note:String(plan.note).slice(0,12000),session:String(plan.session||'').slice(0,80)});}
 return result;
}
module.exports={APP_ID,validDate,validTime,at,active,phone,reminderKey,due,templatePayload,summary,queryAnswer,validatePlan};
