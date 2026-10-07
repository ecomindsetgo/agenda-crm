# Psicología Pro V3.1 — Rediseño de Agenda, Reportes y Disponibilidad

Esta versión mantiene las mismas colecciones y documentos de Firebase utilizados por V3. No realiza migraciones destructivas ni borra pacientes, citas, historias clínicas o notas.

## Cambios principales
- Agenda reconstruida con una nueva estructura de trabajo: cabecera clínica, barra de comandos, navegación de fecha, búsqueda, indicadores compactos, filtros laterales y lista operativa de citas.
- Tarjetas de cita nuevas con jerarquía visual e iconografía SVG profesional.
- Centro de reportes rediseñado; se eliminaron emojis de las opciones y se usan iconos SVG consistentes.
- Formatos de impresión de Agenda, Finanzas, Recepción y Ficha de Paciente actualizados a la paleta del logo, con cabecera institucional y mejor jerarquía tipográfica.
- En Disponibilidad, los horarios pasados ahora se muestran como `Ocupado`.
- La imagen descargada de disponibilidad se genera en modo de privacidad: no incluye nombres de pacientes, únicamente el estado `Ocupado`.
- Se eliminó el botón flotante/icono del Asistente IA. El asistente sigue disponible desde el menú, sin iconografía llamativa.
- Botones flotantes y acciones de agenda actualizados a SVG.
- Se añadió `v31.css` como capa visual no destructiva y se actualizaron versiones de caché de `app.js` y `ui.js`.

## Compatibilidad de datos
Se conservan las rutas existentes bajo:
`artifacts/psicologia-agenda-default-v2/users/{uid}/...`

No se cambian las colecciones actuales de pacientes, citas, historias o notas.
