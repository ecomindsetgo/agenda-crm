# Auditoría integral V8.10 — alcance y hallazgos

## Recorridos revisados mediante código y pruebas
- Autenticación y lectura Firestore: suscripciones y límites de reglas.
- Agenda: día/semana/mes, visualización, guardar, editar, cambiar estado, cancelar y eliminar.
- Pagos: abono, cambio de estado, reversión, importes heredados y pago parcial.
- Caja diaria, finanzas, exportación semanal y ficha de paciente.
- Vista 360, sesiones antiguas, notas, historial, documentos, reportes y vista móvil.
- Cloud Functions para creación/actualización/eliminación Calendar: verificación estática únicamente.

## Correcciones V8.10
- Etiquetas de pago en la vista anterior de historia del paciente y asistente basadas en CRMCore, no en paymentStatus aislado.
- Saldo de la vista 360 antigua calculado como suma de importes realmente pendientes (sin cobrar doble ni computar canceladas).
- Historial en la vista 360 anterior completo; la vista moderna mantiene botón para expandir.
- Ordenamiento de citas tolerante a fechas y horarios faltantes.
- Reporte semanal conserva su estructura y usa importe efectivamente cobrado, admite pagos parciales.
- El listado de citas no considera pagada una cita cancelada solo por tener saldo pendiente cero.

## Hallazgos de riesgo NO solucionados ni certificados
1. **Acceso clínico**: reglas owner UID son insuficientes para control multiusuario, roles, mínimo privilegio y separación por organización. Cualquier dispositivo autenticado como ese UID puede escribir registros y alterar auditoría financiera dentro de appointments.
2. **Auditoría**: paymentHistory y statusHistory son arrays editables en el documento; no son un ledger inmutable protegido en servidor. `appointmentDeletionAudit` solo tiene reglas de creación y protege frente a edición de cliente, pero falta validación de forma y vínculo atómico estricto.
3. **Calendar**: despliegue de Cloud Functions y credenciales no son testeables sin acceso controlado a Google Cloud, Firebase y una cuenta de pruebas. Hay que impedir duplicados, atender fallos/reintentos y comprobar cancelación semántica.
4. **Compatibilidad entre dos aplicaciones**: el esquema legacy (`paymentStatus`) y moderno (`paidAmount`, `paymentHistory`) requiere migración en servidor y una estrategia de compatibilidad definida. No debe suponerse que `paymentStatus = pagado` es evidencia contable inequívoca.
5. **Finanzas**: `CRMCore.metrics` cuenta pagos en canceladas como cobrado, aunque excluye facturación; debe presentarse como adelanto/crédito/reembolso pendiente, no como ingreso neto devengado de sesiones.
6. **Impresiones y UX**: exige ensayo con impresoras PDF en Chrome/Safari y dispositivos reales, accesibilidad con teclado y revisión de formularios.
7. **Integridad referencial**: Firestore sin restricciones de claves foráneas; verificar patientId, paquetes, notas y bloqueos en escrituras del servidor.
8. **Historia clínica**: falta una política validada de conservación, rectificación, accesos, registros de lectura, cifrado adicional cuando proceda y cumplimiento normativo peruano sobre datos de salud.
9. **Pruebas operacionales**: pruebas contra Firebase Emulator Suite y pruebas E2E de rol clínico son obligatorias antes de producción. No publicar este candidato como verificado en Firebase real.

## Despliegue seguro
Hacer respaldo cifrado de Firestore y exportar muestras desidentificadas. Usar staging con proyecto separado, usuarios de prueba y Google Calendar de prueba. Ejecutar pruebas de extremo a extremo; pasar a producción solo con aprobación y plan de reversión.
