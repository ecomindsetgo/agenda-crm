import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'www');
await rm(dest,{recursive:true,force:true});await mkdir(dest,{recursive:true});
for(const name of ['index.html','css','js','assets','offline.html','sw.js','manifest.webmanifest'])await cp(path.join(root,name),path.join(dest,name),{recursive:true});
console.log('Interfaz preparada en www/ para un futuro contenedor nativo.');
