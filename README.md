# Consultorio Lisbeth Méndez · Versión 7

Referencia funcional: el video de HolaElo aportado por el usuario. Se conserva el verde de la marca, el formato clínico y la conexión al proyecto Firebase existente.

## Trabajo diario

- **Inicio:** citas de hoy y Agendar cita.
- **Agenda:** vistas de día, semana y mes. Lista compacta de sesiones; selecciona una para ver su detalle. Desde el detalle puedes cambiar estado, reprogramar, acceder a la historia, escribir una nota y registrar un pago.
- **Pacientes:** listado y ficha; historias clínicas, evaluaciones y documentos quedan en pestañas internas.
- **Recordatorios:** próximas citas, avisos locales y acceso a la conexión de WhatsApp automático.
- **Finanzas:** cobrado, por cobrar, deuda de sesiones atendidas y pagos pendientes. Registrar pago abre la sesión correspondiente. Soles y dólares permanecen separados.
- **Notas:** selecciona el paciente y escribe evolución/acuerdos; cada nota anterior se abre individualmente.
- **Asistente:** texto o dictado, propuesta revisable y acciones sobre citas, pagos y notas. Escuchar respuesta es opcional.
- **Más opciones:** reportes, recepción, configuración y tareas.

Solo se muestra un módulo a la vez. En móvil el detalle queda debajo de la lista; Más opciones reúne los accesos secundarios.

## Pagos y agenda

Los nuevos abonos se guardan mediante transacción, validando el saldo. Se conserva un detalle de importe, fecha y medio de pago dentro de la cita. La misma operación no se registra dos veces. Los pagos antiguos siguen conservando su importe acumulado; no se inventan fechas ni movimientos detallados anteriores.

Cancelar una cita no genera un reembolso. Los pacientes se archivan manteniendo sus registros. Los reportes financieros se agrupan por fecha de cita; no se presentan como libro de movimientos bancarios.

La validación de agenda detecta cruces de sesiones de 60 minutos y bloqueos manuales, y excluye las citas canceladas/no asistidas del conflicto. Esto mejora la comprobación anterior que solo comparaba la hora exacta. La validación de horarios ocurre al guardar; no es un bloqueo transaccional entre varios profesionales que guardan simultáneamente.

## WhatsApp automático e IA

Se incluyen las funciones de servidor y los controles de conexión. **No están activados ni desplegados en las cuentas del usuario.** Subir los archivos web no activa envíos por sí solo. Consulta ACTIVAR-WHATSAPP-E-IA.md para conectar Meta, Gemini y desplegar Firebase.

El servicio de WhatsApp puede trabajar aunque la web esté cerrada, después de desplegarlo y activarlo. Los avisos locales del navegador, en cambio, requieren la app abierta. Los botones manuales existentes de WhatsApp no constituyen automatización.

La IA prepara una acción, no afirma ejecutarla antes de la confirmación. No carga automáticamente historias clínicas ni notas existentes. No se implementó un webhook de entrega/lectura, transcripción de archivos de audio grabados, creación de diagnósticos ni un proveedor de pagos bancarios.

## Impresión clínica

Se mantiene el generador de la versión anterior: código desde HC-0101, encabezado/logo reducido y pie por página, flujo de texto continuo y reserva del pie. Al guardar mediante impresión del navegador se propone paciente y fecha de Lima. Esta revisión no cambia nuevamente el diseño del PDF clínico.

## Actualizar la web

1. Descomprime el ZIP.
2. Actualiza index.html, css, js, assets, manifest.webmanifest, sw.js y offline.html, conservando las rutas. Conserva CNAME si utilizas el mismo dominio.
3. Recarga con Ctrl+F5 y usa tu cuenta habitual.
4. Comprueba una fecha que tenga citas reales. Si hay un problema de conexión o permisos, se muestra dentro de la sección con Reintentar.

Los archivos functions, firebase.json, .firebaserc y ACTIVAR-WHATSAPP-E-IA.md se utilizan para la integración del servidor. No necesitas publicarlos como archivos del sitio estático. No se modificaron reglas ni datos de tu Firebase durante este trabajo.

La base PWA y la preparación Capacitor se mantienen: consulta mobile/README.md. No se entrega APK/IPA ni una publicación en tiendas. La conexión es necesaria para cargar/guardar información. Las tareas siguen siendo locales por cuenta y navegador; las notas se guardan en Firestore. El respaldo JSON conserva pacientes, citas (con nuevos movimientos de pago), bloqueos, historias, notas y tareas; no se añadió restauración automática.

## Comprobaciones

Se probaron con datos ficticios y servicios simulados:

- Navegación aislada, datos visibles y actualización del módulo activo.
- Chromium: agenda lista/detalle/semana, abonos, revisión de propuesta IA, formulario de nueva cita, dictado simulado, notas y móvil sin desbordamiento horizontal.
- Validación de cruce de horarios al guardar.
- Transacciones de pago: operación repetida y abono superior al saldo.
- Servidor: consentimiento, citas canceladas, reclamos concurrentes de envío, resultado ambiguo sin reenvío, autorización por UID y consultas deterministas.
- Finanzas, protección CSV, caché estática y sintaxis/exportaciones del SDK de funciones.

No se realizaron envíos reales ni llamadas reales a Gemini, no se desplegaron funciones y no se accedió al Firebase del usuario. El dictado real depende del navegador/micrófono. La impresión clínica conservada debe comprobarse con tus documentos e impresora.

Para repetir pruebas: node tests/crm-core.test.cjs; node tests/service-worker.test.cjs; node --test functions/test/*.test.cjs. Las pruebas de interfaz requieren jsdom/playwright y Chromium. Ejecuta node tests/interface.dom.cjs y node tests/interface.browser.cjs.
