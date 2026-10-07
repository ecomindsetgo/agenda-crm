# Psicología Pro V2 — Compatibilidad de datos

## Objetivo
Esta versión moderniza la experiencia de uso sin migrar ni reemplazar la información ya almacenada.

## Firebase
Se conserva exactamente el mismo proyecto, `appId` lógico y rutas de datos usadas por la versión anterior:

- `artifacts/psicologia-agenda-default-v2/users/{userId}/appointments`
- `artifacts/psicologia-agenda-default-v2/users/{userId}/patients`
- `artifacts/psicologia-agenda-default-v2/users/{userId}/clinicalHistories`
- `artifacts/psicologia-agenda-default-v2/users/{userId}/clinicalNotes`

Por tanto, al iniciar sesión con el mismo usuario, la V2 carga los pacientes, citas, historias clínicas, notas, paquetes y datos financieros existentes.

## Estrategia de compatibilidad
- No se ejecuta migración destructiva.
- No se renombran colecciones existentes.
- No se borran documentos existentes al iniciar la V2.
- Los datos nuevos se interpretan de manera tolerante a campos faltantes para mantener compatibilidad con registros antiguos.
- Los paquetes siguen almacenándose dentro del documento del paciente, igual que en la versión anterior.

## Funciones nuevas de la base V2
- Centro operativo / Dashboard inicial.
- Navegación lateral en escritorio y navegación inferior en móvil.
- Paleta visual basada en el logo de Lisbeth Méndez.
- Paciente 360: resumen, sesiones, deuda, última/próxima atención, estado clínico, paquetes y actividad reciente.
- CRM visual aprovechando el campo `leadStatus` existente.
- Alertas de pagos pendientes, falta de seguimiento y paquetes con una sesión restante.
- Accesos rápidos a cita, paciente, IA y respaldo.
- Exportación manual de respaldo JSON con pacientes, citas, historias y notas actualmente sincronizados.
- Corrección del flujo interno para restablecimiento de contraseña mediante enlace Firebase.
- Se mantienen los reportes diarios/semanales/mensuales/rango corregidos de la versión anterior.

## Archivos V2 añadidos
- `v2.css`: sistema visual, responsive, navegación y componentes V2.
- `v2.js`: Dashboard, Paciente 360, alertas, respaldo y navegación V2.

## Recomendación antes de publicar
Aunque esta V2 no elimina ni migra datos, se recomienda utilizar el botón `Respaldo` del Dashboard para guardar un JSON local antes de cambios importantes o despliegues futuros.
