(function(){
'use strict';
const $=id=>document.getElementById(id);
function syncAssistantMobileState(){
  const modal=$('assistant-modal');
  if(!modal) return;
  const open=!modal.classList.contains('hidden');
  document.body.classList.toggle('v362-assistant-open',open);
  if(open){
    document.querySelector('.v36-mobile-more')?.classList.remove('open');
  }
}
function wrap(name,after){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__v362) return false;
  const w=function(...args){const r=fn.apply(this,args);try{after?.()}catch(_){}return r};
  w.__v362=true; window[name]=w; return true;
}
function install(){
  const ok1=wrap('openAssistantModal',()=>setTimeout(syncAssistantMobileState,0));
  const ok2=wrap('closeAssistantModal',()=>setTimeout(syncAssistantMobileState,0));
  syncAssistantMobileState();
  return ok1&&ok2;
}
let tries=0;const t=setInterval(()=>{if(install()||++tries>40)clearInterval(t)},100);
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('resize',syncAssistantMobileState);
})();
