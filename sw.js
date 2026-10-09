'use strict';
const VERSION='consultorio-static-v7-experience-20261009';
const STATIC=['offline.html','index.html','css/app.css','css/crm.css','js/app.js','js/ui.js','js/tasks.js','js/crm-core.js','js/crm-platform.js','js/experience.js','assets/logo-lisbeth.png','assets/icons/icon-192.png','assets/icons/icon-512.png','manifest.webmanifest'];
const allowed=new Set(STATIC.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(STATIC.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('consultorio-static-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Solo interfaz estática del mismo dominio. Nunca Firestore, audio, PDFs, respaldos ni respuestas autenticadas.
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(VERSION).then(cache=>cache.match(new URL('offline.html',self.registration.scope)))));return;}
 if(!allowed.has(url.pathname))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(url.pathname,copy)));}return response;}).catch(()=>caches.open(VERSION).then(cache=>cache.match(url.pathname))));
});
