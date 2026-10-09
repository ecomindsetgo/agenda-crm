# Activar WhatsApp automático y asistente IA

El código de integración está incluido. No está desplegado ni conectado a cuentas externas. Subir solo los archivos HTML/JS a GitHub Pages no activa estos servicios.

## 1. Preparar el servidor Firebase

Usa el mismo proyecto existente: agenda-psicologica-pro. Necesitas acceso administrativo al proyecto y facturación habilitada para Cloud Functions/Cloud Scheduler. Los servicios de WhatsApp e IA pueden generar consumo según las condiciones de sus proveedores; revisa esos servicios antes de activarlos.

Desde la carpeta agenda-crm-main, con Node 22 y Firebase CLI instalados:

```bash
firebase login
firebase use agenda-psicologica-pro
cd functions
npm ci
```

Copia functions/.env.example a functions/.env.agenda-psicologica-pro. Completa los parámetros públicos:

- CONSULTORIO_ALLOWED_UIDS: el UID real de la cuenta de la psicóloga en Firebase Authentication. Puedes incluir otros UID autorizados separados por comas. Cada cuenta usa sus propias colecciones.
- META_PHONE_NUMBER_ID: identificador del número registrado en WhatsApp Business Platform.
- META_GRAPH_VERSION: una versión de Graph API compatible con tu aplicación de Meta, con formato vNN.N.
- META_REMINDER_TEMPLATE y META_TEMPLATE_LANGUAGE: nombre e idioma exactos de la plantilla aprobada.
- GEMINI_MODEL: un modelo activo de tu cuenta que admita generateContent y salida JSON. No se presupone que un modelo particular esté disponible indefinidamente.

Guarda las claves como secretos del servidor, desde la raíz del proyecto:

```bash
firebase functions:secrets:set META_WHATSAPP_TOKEN
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions:consultorio
```

Los comandos de secretos piden el valor en tu consola. No lo escribas en el código HTML/JS ni en formularios de la plataforma. No es necesario proporcionar esas claves en el chat.

Revisa Firebase App Check: el dominio de la agenda debe estar registrado y emitir tokens válidos. Las funciones verifican autenticación, UID autorizado y App Check. Un fallo de App Check bloqueará la integración, sin bloquear la agenda manual.

El archivo firebase.json configura únicamente este código de funciones y emuladores. No publica la web ni reemplaza las reglas actuales de Firestore. firestore.owner.rules es una propuesta separada para revisión; no se desplegó automáticamente.

## 2. Conectar WhatsApp

Configura un número de WhatsApp Business Platform, su token y una plantilla de recordatorio aprobada en Meta. La plantilla debe tener cuatro variables en el cuerpo, en este orden:

1. Nombre del paciente.
2. Fecha de la cita.
3. Hora.
4. Modalidad.

Ejemplo para crear la plantilla:

> Hola {{1}}, te recordamos tu cita el {{2}} a las {{3}}, modalidad {{4}}. Si necesitas reprogramar, responde a este mensaje.

El idioma de la plantilla debe coincidir con META_TEMPLATE_LANGUAGE. Esta integración no contempla variables adicionales de encabezado, botones ni archivos adjuntos.

En la plataforma: Más opciones → Configuración → Conectar WhatsApp automático y asistente IA → Comprobar conexión.

- Registra el número y la autorización de cada paciente en Autorizar WhatsApp de un paciente.
- Selecciona aviso de un día, 60 o 30 minutos.
- Activa los recordatorios y guarda la configuración cuando el número y plantilla estén listos.

Cloud Scheduler revisa cada cinco minutos. La ventana tolera hasta diez minutos de retraso de ejecución. Si el servicio está detenido más tiempo, el recordatorio puede quedar fuera de ventana: no se envían recordatorios tardíos arbitrarios. Una cita creada después de su ventana tampoco dispara un envío inmediato.

El sistema omite citas canceladas, no asistidas, completadas y bloqueos, y pacientes sin autorización o teléfono válido. Revalida los datos antes de reclamar un envío. No incluye notas clínicas ni diagnósticos en el mensaje.

## 3. Verificar un envío real

Primero utiliza una cita de prueba y un número que puedas revisar. En Configuración aparece el historial de resultados:

- **Aceptado por Meta:** Meta devolvió un identificador; esto no prueba que el paciente lo haya recibido.
- **Rechazado:** revisar plantilla, permisos o número.
- **Revisar envío:** hubo una respuesta incierta o interrupción; no se reintenta automáticamente para evitar duplicados.
- **En proceso:** se reclamó el envío. Si permanece en este estado mucho tiempo, revisa los registros del servidor antes de reenviar.

No se añadió un webhook de entrega/lectura ni de confirmación automática por respuesta del paciente. Comprueba estos resultados en Meta; no elimines registros de recordatorios para intentar un reenvío, porque podrías duplicarlo.

## 4. Utilizar el asistente

La clave Gemini solo se usa en el servidor. La sección Asistente admite texto o dictado del navegador. El dictado transcribe voz a texto; no almacena archivos de audio. La disponibilidad del reconocimiento y lectura depende del navegador y de sus permisos.

Ejemplos:

- «Agenda a Ana mañana a las 5 pm, individual presencial, 50 soles».
- «Reprograma la cita de Ana del viernes para el lunes a las 4 pm».
- «Registra un abono de 20 soles por Yape, hoy, en la cita de Ana».
- «Guarda una nota de sesión para Ana con fecha de hoy: ...».
- «¿Qué citas tengo hoy?».
- «¿Cuánto está pendiente este mes?».

Se muestra una propuesta. Agendar o reprogramar abre el formulario para revisión y guardado. Pagos, notas y cancelaciones requieren confirmar la propuesta. El asistente trabaja de una acción a la vez y solicita aclaraciones cuando falta información o el paciente es ambiguo.

Las consultas de citas, importes y disponibilidad se calculan con código sobre los registros; el modelo interpreta la intención. Los importes se agrupan por fecha de cita, igual que Finanzas. Las monedas no se convierten ni se suman entre sí.

El proveedor recibe tu instrucción, nombres/IDs de pacientes y una selección de datos administrativos de citas. No recibe automáticamente historias, diagnósticos ni notas clínicas existentes. Una nota que dictes explícitamente para ordenar sí forma parte de la instrucción enviada. Esta integración no genera diagnósticos ni informes clínicos a partir de datos no proporcionados.

Hay un límite de 30 consultas por cuenta cada 15 minutos y de 1000 pacientes en la selección general. Para un consultorio de mayor volumen se debe ampliar la selección de contexto. Las consultas de importes usan el conjunto de citas cargado en el servidor, no solo las 300 referencias administrativas incluidas en la solicitud de IA. Configura TTL en la colección quota sobre expiresAt para limpiar contadores antiguos.

## Fuentes técnicas

- [Funciones programadas de Firebase](https://firebase.google.com/docs/functions/schedule-functions)
- [Secretos y parámetros de Firebase](https://firebase.google.com/docs/functions/config-env)
- [App Check para funciones](https://firebase.google.com/docs/app-check/cloud-functions)
- [WhatsApp Business Platform, colección oficial de Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Política de WhatsApp Business](https://whatsappbusiness.com/policy/)
- [Generación estructurada Gemini](https://ai.google.dev/gemini-api/docs/structured-output)
- [Referencia generateContent](https://ai.google.dev/api/generate-content)
