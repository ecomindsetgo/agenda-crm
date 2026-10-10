# Agenda Pro V8.11 — Candidata de publicación (NO certificada)

## Cambios ejecutados
- Los importes recibidos en citas canceladas se identifican separadamente como `anticiposCancelados` en las métricas. No se asumen devueltos ni se eliminan de lo cobrado. La tasa de cobranza ya no los incluye en el numerador.
- El borrado desde la interfaz utiliza `CRMCore.paid` para reconocer importes heredados, en vez de confiar en el campo `paidAmount` solamente.
- Se incluye una plantilla de reglas con restricciones de borrado de citas y campos mínimos de la constancia de auditoría. **No se despliega automáticamente**: validarla con Firebase Emulator Suite antes de publicar.
- Nuevo identificador de caché para reducir archivos JavaScript antiguos mezclados entre versiones.
- Pruebas de regresión específicas para cancelaciones, pagos parciales y borrado.

## Limitaciones que impiden certificar esta versión para producción clínica
- Reglas de `create` y `update` mantienen compatibilidad de escritura por propietario con versiones anteriores: no aseguran la inmutabilidad de `paymentHistory`. Mover pagos/reversiones y mutaciones clínicas a Cloud Functions con verificación de Auth, transacciones, identificadores idempotentes y ledger de auditoría solo servidor.
- No se ejecutaron pruebas de extremo a extremo contra Firestore, Google Calendar, dispositivos móviles ni impresoras.
- Google Calendar puede quedar desincronizado si falla la Cloud Function. Revisar logs, reintentos, duplicados y comportamiento de cancelación.
- Un proyecto de pruebas Firebase separado, respaldos verificados y migración de cobros heredados son necesarios. No compartir cuentas de acceso entre profesionales.
- No prometer cumplimiento legal de tratamiento de datos clínicos hasta validar consentimientos, acceso, retención, contratos y medidas aplicables en Perú.

## Publicar de manera controlada
1. Respaldar/exportar Firestore con método de recuperación comprobado. Guardar código V8.10 y reglas existentes.
2. Desplegar en URL *staging* separada y conectar a un Firebase de pruebas, con pacientes ficticios. Nunca probar reversiones sobre pacientes reales.
3. Ejecutar `node --test tests/*.test.cjs` (las pruebas browser requieren dependencias y entorno adicionales).
4. Validar en Emulator reglas y flujos de dos clientes simultáneos: crear, actualizar, cancelar y eliminar; pagos/abonos/reversiones; paquetes, notas, reportes, IA y Google Calendar.
5. Una vez superado, aprobar despliegue de reglas y web en ventana de baja actividad; revisar errores y tener preparada restauración.

La página estática en GitHub Pages no sustituye controles de servidor ni protege por sí sola información de salud.
