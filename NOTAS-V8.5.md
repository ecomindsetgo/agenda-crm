# Agenda Pro V8.5 — ajustes solicitados

- En el horario semanal los bloqueos manuales se muestran como **Ocupado** (continúan bloqueando reservas y conservan su color).
- En la lista de citas el botón **Eliminar** queda destacado para facilitar su identificación, también en móviles.
- **Cancelar** y **Eliminar** permanecen como acciones separadas: eliminar es solo para una cita registrada por error que no tenga pagos, notas, consumo de paquete ni actividad asistencial.
- La eliminación crea una anotación en `appointmentDeletionAudit` y elimina el documento de Firestore. La función Cloud `borrarEventoCalendar` debe estar activa y responder correctamente para que también se elimine el evento de Google Calendar.
- Antes de instalar: conservar copia de seguridad, validar reglas de Firestore para la colección de auditoría y probar con una cita ficticia.
- Estos ajustes no constituyen una prueba de integración con Firebase ni de Google Calendar en producción.
