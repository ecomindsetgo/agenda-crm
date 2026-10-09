# Actualización del proyecto correcto: agenda-crm-main

Esta entrega usa exclusivamente el ZIP agenda-crm-main.zip adjunto. Mantiene su estructura css/, js/ y assets/, los módulos existentes y la conexión Firebase.

## Impresión de historias clínicas

- A4 con encabezado/logo y pie turquesa en cada hoja.
- Logo y título compactos.
- Distribución continua: se aprovecha el espacio de la hoja actual; no se conservan los saltos obligatorios de la plantilla original.
- Reserva de 8 mm sobre el pie y páginas de continuación al llegar al límite.
- Se elimina la duplicación de historia personal.
- Código automático persistente HC-0101, HC-0102… hasta HC-9999, asignado mediante transacción Firebase. Los códigos requieren conexión.
- Nombre sugerido al guardar como PDF: Nombre del paciente_AAAA-MM-DD.pdf, fecha de Perú.

## Interfaz y organización

Tema de pantalla inspirado en la organización pública de HolaElo: tonos lavanda, tarjetas claras, panel de inicio y navegación lateral. Se mantiene la identidad del consultorio. No se copió ni se conectó con su aplicación privada.

Se mantienen CRM, recepción, caja, agenda y bloqueos, sesiones, evaluaciones, documentos, reportes, asistente y menú móvil. Se añade un organizador de tareas en el menú lateral y en Más en móvil: permite crear, completar, filtrar y eliminar tareas. Las tareas se guardan por cuenta en este navegador; no se sincronizan entre dispositivos.

WhatsApp conserva el envío manual existente. No se ha configurado automatización de mensajes ni nuevas integraciones externas.

## Instalar

Sube el contenido de agenda-crm-main respetando las carpetas. Incluye js/tasks.js. Reemplaza index.html, css/app.css, js/app.js y js/ui.js. Recarga con Ctrl+F5. Se conserva el CNAME. No se borran ni migran masivamente datos de Firebase.

Para imprimir: A4, escala 100%, gráficos de fondo activados y encabezados/pies adicionales del navegador desactivados.

## Validación

Sintaxis de JavaScript verificada. Comprobados identificadores HTML únicos, conservación de módulos y archivos, tareas con texto seguro, persistencia y aislamiento entre cuentas. La integración con datos reales de Firebase y la apariencia final del PDF no pudieron comprobarse en este entorno, que no dispone de navegador ejecutable.
