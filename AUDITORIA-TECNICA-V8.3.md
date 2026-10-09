# Auditoría técnica y mejoras V8.3 (9 de octubre de 2026)

## Modificaciones efectuadas
- Los botones de cobro rápido registran operaciones mediante transacciones Firestore y agregan `paymentHistory`, identificador de operación, importe, fecha, método, autor y sello de tiempo. No permiten vaciar cobros anteriores.
- Los cambios de estado realizados desde accesos directos usan transacciones e incorporan `statusHistory` (anterior, nuevo, fecha, autor e identificador).
- Al editar una cita existente, el selector de pago ya no reescribe el estado de cobro sin movimiento de caja. Para los cobros, usar el registro de pago.
- Caja diaria, recepción y resumen financiero secundario computan abonos y saldos reales mediante `CRMCore` en los puntos corregidos.
- Se mantienen los reportes originales, el asistente anterior y el envío manual de WhatsApp.

## Riesgos que permanecen y requieren un trabajo adicional
1. **No hay pruebas completas contra Firebase real**. No se alteraron datos de producción ni reglas en la nube. Las reglas incluidas son una plantilla que el administrador debe contrastar y desplegar conscientemente.
2. **Paquetes de sesiones**: sincronización de paquete y cita en operaciones separadas; una falla intermedia puede producir inconsistencias. Requiere una única transacción sobre documentos involucrados y reparación de registros existentes.
3. **Conflictos de agenda**: las validaciones de solapamiento se hacen sobre el estado cargado en navegador; dos dispositivos pueden reservar el mismo horario. Requiere reserva atómica en servidor/transacción.
4. **Trazabilidad clínica y pacientes**: no hay log inmutable integral de todas las acciones. `statusHistory` y `paymentHistory` son trazas funcionales, pero el propietario con permiso de escritura podría modificarlas. Requiere auditoría fuera del documento y privilegios de backend, incluyendo historial de modificaciones clínicas, accesos y exportaciones.
5. **Finanzas**: los reportes históricos de pagos todavía se agrupan principalmente por fecha de cita, no por fecha real de cobranza. No son equivalentes a un libro contable de caja.
6. **Seguridad SaaS**: faltan segregación por consultorio/rol, consentimientos, retención, respaldo probado, recuperación, revocación de acceso, auditoría independiente, validación de esquemas y endurecimiento de reglas por campo y por acción.
7. **Edición de precio tras abonos**: requiere política formal para impedir o auditar que el costo quede debajo del monto ya recibido.
8. **Datos clínicos en asistentes externos**: verificar consentimiento, contratos de procesamiento y minimización de información antes de habilitar servicios de IA en producción.
9. **Pruebas de interfaz**: las pruebas browser requieren Playwright y un entorno de navegador preparado; las comprobaciones automatizadas de Node no demuestran el funcionamiento de todos los botones en un entorno real.

## Pasos recomendados antes de desplegar
- Crear un proyecto Firebase de pruebas o usar datos sintéticos aislados; respaldar Firestore de producción.
- Probar los flujos pacientes -> cita -> pago parcial -> pago total -> reporte -> cancelación y paquetes, con dos usuarios/dispositivos.
- Verificar políticas de autorización contra Firebase Emulator Suite y auditar la visibilidad de datos entre usuarios.
- No habilitar cobro automático o reglas abiertas en producción.
