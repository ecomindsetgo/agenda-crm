# Agenda Pro V8 — Fusión con el flujo de Elo

Se conservan los verdes y la navegación sencilla, agenda día/semana/mes, detalle de cita, pagos parciales, pacientes, notas e impresión clínica de Agenda Pro.

- WhatsApp vuelve a ser MANUAL: desde Recordatorios o el detalle de una cita se abre WhatsApp con el mensaje original. El profesional revisa y pulsa Enviar en WhatsApp. No requiere desplegar funciones ni conectar Meta.
- Reportes originales: en Más opciones → Reportes se abre el selector anterior de agenda, finanzas y recepción, con día, semana, mes o periodo personalizado. Se conserva exclusivamente el selector y formato original de reportes.
- Asistente IA original: Asistente → Abrir mi asistente IA. Conserva su chat, clave y configuración del navegador, sin exigir el nuevo servidor. Su disponibilidad depende de la clave/modelo configurados y del proveedor.
- No se incluyen funciones de envío automático ni instrucciones para activarlas en esta entrega.

Las verificaciones usan datos simulados. No se envían mensajes reales ni se cambian datos de producción.

## V8.1 — Pagos anteriores
Finanzas abre todo el historial de citas de la misma cuenta Firebase y muestra los cobros antiguos y actuales. No migra ni sobrescribe registros. Usa pago completo por estado pagado y abonos por paidAmount. No puede recuperar datos borrados ni datos de otra cuenta/proyecto. Las fechas mostradas son de cita cuando no existe una fecha de pago.

## V8.2 — Solo reportes originales
Eliminado el centro nuevo de reportes. Más opciones → Reportes abre directamente el selector original, conservando sus categorías, periodos y formato de impresión. Finanzas → Ver reportes abre el mismo selector en categoría finanzas.
