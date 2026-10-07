# Psicología Pro V3.2 — Pulido visual y operativo

Esta versión mantiene las colecciones y documentos actuales de Firebase. No migra ni elimina pacientes, citas, historias o notas.

## Cambios principales
- Estados visibles de cita simplificados a: Pendiente, Completada, No asistió y Cancelada.
- Estados operativos anteriores continúan siendo compatibles con datos históricos y se agrupan como Pendiente en las vistas nuevas.
- KPIs de Sesiones: Completadas, No asistió, Canceladas y Pendientes.
- Paginación en Pacientes/CRM, Gestión clínica, Sesiones e Historial de citas (10/20/50 cuando aplica).
- Alertas reorganizadas por bloques con paginación.
- "Marcar seguimiento" ahora cambia el estado CRM a seguimiento, registra fecha, muestra confirmación y retira al paciente de la alerta de falta de seguimiento.
- Disponibilidad: cita ocupada y horario ya no disponible utilizan el mismo rojo; bloqueo manual usa rojo oscuro.
- Se conserva la exportación privada de disponibilidad: no incluye nombres de pacientes.
- Rediseño visual de modales heredados: cita, paciente, historial, cuenta y asistente.
- Paleta global suavizada en verde petróleo, salvia, arena y neutros cálidos.
- Se eliminaron emojis heredados visibles en títulos y filas principales del historial.

## Compatibilidad
Se mantienen las rutas existentes bajo `artifacts/psicologia-agenda-default-v2/users/{uid}` y sus colecciones actuales.
