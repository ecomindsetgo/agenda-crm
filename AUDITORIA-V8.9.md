# Auditoría V8.9 — Vista 360

- Se elimina el límite inaccesible de ocho actividades: botón para expandir el historial completo desde Resumen y pestaña Sesiones con todas las citas.
- Se aclara que el contador cuenta solo sesiones completadas, mientras actividad reciente incluye todas las citas.
- Saldo: se calcula a partir del saldo pendiente de cada cita elegible, no de etiquetas históricas de pago.
- Se protegen ordenamientos ante fechas u horas nulas.
- Esta versión NO altera Firestore ni migra registros históricos.

## Pendiente de validación en entorno real
- Reconciliar pagos heredados entre versiones y revisar permisos de Firestore.
- Ejecutar pruebas E2E con autenticación y datos ficticios.
- Verificar rutas completas de paquetes, notas clínicas, reportes y sincronización Calendar.
- No hay base técnica para certificar el 100 % de la aplicación con estas pruebas estáticas.
