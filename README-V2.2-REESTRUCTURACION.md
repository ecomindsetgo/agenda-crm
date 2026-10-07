# Psicología Pro V2.2 — Reestructuración operativa

Esta versión conserva las colecciones existentes en Firebase:

- `artifacts/psicologia-agenda-default-v2/users/{uid}/patients`
- `.../appointments`
- `.../clinicalHistories`
- `.../clinicalNotes`

No migra ni elimina información existente.

## Mejoras incorporadas

- Navegación profesional con iconografía SVG consistente.
- Dashboard operativo rediseñado.
- Recepción operativa con flujo:
  - Agendada
  - Confirmada
  - Llegó
  - En sesión
  - Completada
  - No asistió
  - Cancelada
- CRM avanzado con segmentación y cambio de etapa del paciente.
- Gestión clínica con control de historias y notas.
- Caja diaria calculada desde las citas/pagos existentes.
- Centro de alertas para cobros, seguimiento, historias y paquetes.
- Paciente 360 mejor integrado.
- Responsive para escritorio y móvil.

## Compatibilidad

Los estados nuevos se guardan en el mismo documento de cita (`status`) y los estados CRM en el mismo documento de paciente (`leadStatus`). Los registros antiguos siguen siendo válidos.

No se han creado nuevas colecciones que requieran cambiar las reglas actuales de Firestore.
