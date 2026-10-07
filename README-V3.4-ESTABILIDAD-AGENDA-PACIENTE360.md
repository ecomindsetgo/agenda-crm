# Psicología Pro V3.4

## Corrección crítica de inicio

Se eliminó el `MutationObserver` global introducido en V3.3. Ese observador volvía a ejecutar la capa de presentación cada vez que ella misma modificaba el DOM, pudiendo producir un ciclo continuo de renderizado y dejar la aplicación aparentemente cargando sin responder.

La nueva inicialización visual se ejecuta de forma finita y conserva la carga normal de Firebase y Authentication.

## Agenda rediseñada

- Nueva cabecera operativa.
- Selector Día / Mes integrado.
- Navegación de fecha más compacta.
- Búsqueda dentro de agenda.
- KPIs visuales con iconos.
- Panel lateral de filtros y disponibilidad.
- Estados: Todas, Pendientes, Completadas, No asistió y Canceladas.
- Zona principal tipo tablero clínico con columna de hora y atención.
- Conserva bloqueos manuales y nueva cita.

## Paciente 360 rediseñado

- Nueva cabecera de identidad.
- Panel lateral con teléfono, nacimiento, sesiones y deuda.
- Acciones agrupadas: editar, historial, historia clínica.
- Resumen superior de última atención, próxima atención, historia y evolución.
- Actividad reciente y paquetes organizados en paneles separados.
- Se conservaron todos los IDs existentes para mantener la lógica de datos.

## Compatibilidad

No se migran ni eliminan datos. Se mantienen las mismas colecciones y rutas Firebase existentes.
