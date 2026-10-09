# Evolución móvil

La entrega actual es una PWA: instala el acceso desde el navegador al publicar en HTTPS. No contiene APK, IPA ni una publicación en tiendas. El acceso clínico requiere internet. El service worker conserva exclusivamente interfaz estática; no guarda respuestas de Firebase ni documentos de pacientes.

## Android y iOS más adelante

1. Ejecutar `node scripts/prepare-native.mjs` para preparar `www/`.
2. Incorporar Capacitor al proyecto, siguiendo https://capacitorjs.com/docs/getting-started .
3. Copiar `mobile/capacitor.config.example.json` como configuración, ajustando el identificador de aplicación antes de registrar una app.
4. Añadir las plataformas Android e iOS y sincronizar los archivos de `www/`.
5. Revisar en los dispositivos Firebase Auth/App Check, micrófono, archivos, impresión/PDF, áreas seguras e integración de enlaces externos. La app actual usa dependencias web externas y todavía necesita internet.
6. Compilar, firmar y publicar cada aplicación con las herramientas y cuentas de desarrollador correspondientes.

La preparación web no sustituye las pruebas ni el trabajo de integración nativa. Referencias oficiales: https://capacitorjs.com/docs y https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable .
