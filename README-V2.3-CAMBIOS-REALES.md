# Psicología Pro V2.3 — cambios funcionales

Esta versión conserva la misma base de Firebase y las colecciones ya existentes.
No migra ni elimina pacientes, citas, historias clínicas o notas.

## 1. Bloqueos manuales persistentes

Los rangos ocupados se guardan dentro de la colección `appointments` con:

- `recordType: manual_block`
- `isManualBlock: true`
- fecha
- hora inicial
- hora final
- motivo

La aplicación los separa de las citas al sincronizar, por lo que no entran en:

- estadísticas
- finanzas
- reportes
- caja
- CRM
- historias de pacientes

Esto permite mantener compatibilidad con las reglas de Firestore que ya autorizan la colección `appointments`, sin pedir una colección nueva.

Un bloqueo manual impide guardar una cita cuyo rango se cruce con el bloqueo.

## 2. Disponibilidad semanal

La vista semanal distingue:

- Libre
- Cita / ocupado
- Bloqueo manual
- No disponible / horario pasado

Desde la misma ventana se puede crear y eliminar un bloqueo de la semana mostrada.

## 3. Finanzas por periodo real

Se incorporó un selector visible:

- Día
- Semana
- Mes
- Todo el historial
- Rango personalizado

Día, Semana y Mes usan una **fecha de referencia**, que se puede cambiar con:

- calendario
- anterior
- siguiente
- Hoy

De esta forma se puede consultar una fecha histórica y la semana o mes correspondiente, no solamente el periodo actual.

## 4. Diseño

- Cabecera operativa nueva en Agenda.
- Centro de filtros financiero rediseñado.
- Iconografía SVG en nuevas acciones.
- Bloqueos manuales diferenciados con identidad visual propia.
- Ajustes responsive para móvil.

## Compatibilidad

La base continúa usando:

`artifacts/psicologia-agenda-default-v2/users/{uid}/appointments`

`patients`

`clinicalHistories`

`clinicalNotes`

No se requiere migración de la data existente.
