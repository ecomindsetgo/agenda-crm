# V8.4 — Correcciones de navegación y reportes

- **Día → Mes → Semana → Día:** normalización del estado, actualización de lista diaria y botones activos.
- **Citas en móvil:** detalle dentro del elemento seleccionado, inmediatamente bajo la cita; pulsar de nuevo cierra el detalle. Escritorio conserva el panel lateral.
- **PDF en móvil:** reglas explícitas de impresión para ocultar navegación inferior, lateral y capas del menú. Se mantienen los contenidos originales de los reportes.
- **Semana:** cálculo de lunes a domingo mediante fechas locales, sin convertir días al formato UTC.

## Antes de usar en producción
Probar los tres flujos en Chrome Android y Safari iOS. No se verificaron operaciones reales de Firebase ni impresión física/PDF desde esos dispositivos. Guardar copia de seguridad. No se certifica seguridad multiinquilino ni integridad total sin pruebas de integración y reglas de Firestore desplegadas.
