# V8.19 — Controles visibles y resumen de finanzas completo

- Añadido **Nuevo paciente** en la cabecera del CRM, conectado a `openPatientModal()` existente.
- Restaurados los nombres y el orden de filtros: Todo el tiempo, Este mes, Esta semana, Hoy y Rango.
- Se mantiene la selección de fechas con `finance-reference-date` y el rango personalizado, así como Excel y Reporte.
- Se conserva la vista financiera integral original con sus indicadores, análisis y tablas. No se han modificado sus fórmulas ni registros de Firebase.
- La selección de semana/mes usa la fecha de referencia; los rótulos indican periodos seleccionables, no necesariamente la semana actual al navegar hacia fechas anteriores.
- Revisar números con datos reales y contrastar movimientos heredados antes de publicar en producción.
