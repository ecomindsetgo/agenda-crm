(() => {
 'use strict';
 const byId=id=>document.getElementById(id),overlay=byId('ct-overlay');
 let owner=null,tasks=[],previousFocus=null;
 function uid(){return window._profileState?.currentUser?.uid||null;}
 function load(){owner=uid();tasks=[];if(!owner)return;try{const value=JSON.parse(localStorage.getItem('consultorio_tasks_'+owner)||'[]');if(Array.isArray(value))tasks=value.filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string').map(t=>({id:t.id,title:t.title,date:/^\d{4}-\d{2}-\d{2}$/.test(t.date||'')?t.date:'',done:!!t.done}));}catch(_){}}
 function save(next){if(!owner||owner!==uid())return false;try{localStorage.setItem('consultorio_tasks_'+owner,JSON.stringify(next));tasks=next;return true;}catch(_){alert('No se pudo guardar. El navegador debe permitir almacenamiento local.');return false;}}
 function make(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function render(){
  const list=byId('ct-list'),filter=byId('ct-filter').value;list.replaceChildren();
  const shown=tasks.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  if(!shown.length){list.append(make('div','No hay tareas para este filtro.','ct-empty'));return;}
  shown.forEach(t=>{const row=make('div',undefined,'ct-row'+(t.done?' ct-done':'')),check=make('input');check.type='checkbox';check.checked=t.done;check.setAttribute('aria-label','Completar '+t.title);check.addEventListener('change',()=>{if(save(tasks.map(x=>x.id===t.id?{...x,done:check.checked}:x)))render();else check.checked=t.done;});const info=make('div');info.append(make('strong',t.title));if(t.date)info.append(make('small',(t.date<today()&&!t.done?'Vencida · ':'')+t.date,t.date<today()&&!t.done?'ct-late':''));const remove=make('button','Eliminar');remove.type='button';remove.addEventListener('click',()=>{if(confirm('¿Eliminar esta tarea?')&&save(tasks.filter(x=>x.id!==t.id)))render();});row.append(check,info,remove);list.append(row);});
 }
 function close(){overlay.classList.remove('ct-open');owner=null;tasks=[];byId('ct-list').replaceChildren();byId('ct-form').reset();previousFocus?.focus();}
 window.openConsultorioTasks=function(){if(!uid()){alert('Inicia sesión para acceder a tus tareas.');return;}window.closeV36More?.();previousFocus=document.activeElement;load();render();overlay.classList.add('ct-open');byId('ct-text').focus();};
 byId('ct-close').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusable=Array.from(overlay.querySelectorAll('button,input,select')).filter(n=>!n.disabled);const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 byId('ct-form').addEventListener('submit',e=>{e.preventDefault();if(owner!==uid()){close();return;}const title=byId('ct-text').value.trim();if(!title)return;const id=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);if(save([...tasks,{id,title,date:byId('ct-date').value,done:false}])){e.target.reset();render();byId('ct-text').focus();}});
 byId('ct-filter').addEventListener('change',()=>{load();render();});
 window.addEventListener('storage',e=>{if(overlay.classList.contains('ct-open')&&e.key==='consultorio_tasks_'+uid()){load();render();}});
 new MutationObserver(()=>{if(overlay.classList.contains('ct-open')&&(!uid()||owner!==uid()||byId('app-container').classList.contains('hidden')))close();}).observe(byId('app-container'),{attributes:true,attributeFilter:['class']});
})();
