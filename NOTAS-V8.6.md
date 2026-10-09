# Agenda Pro V8.6 — Acciones de citas visibles

- Corregida la ausencia de **Cancelar cita** y **Eliminar cita** en el panel de detalle que realmente se muestra (js/experience.js).
- Los botones aparecen debajo de las acciones clínicas tanto en ordenador como en móvil.
- Cancelar conserva el registro; eliminar usa la función existente removeAppointmentPermanently, que requiere doble confirmación y rechaza citas con cobros, paquetes o actividad asistencial.
- La eliminación en Google Calendar depende de la Cloud Function existente y es asíncrona; comprobar su resultado en Google Cloud.
- Incrementada la versión de los recursos para mitigar caché del navegador.

**Precaución:** la auditoría de borrado depende de reglas Firestore que autoricen la transacción. Mantener un respaldo y probar con citas ficticias, nunca con datos clínicos reales.
