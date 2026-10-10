# V8.8 — Conciliación de estados de pago

- Se añadió `CRMCore.paymentState(a)` para derivar Pagado / Abono registrado / Pendiente desde el saldo cobrado.
- Las etiquetas de listado y recepción utilizan este cálculo; no se confía en una etiqueta antigua que puede ser contradictoria.
- La ficha muestra una advertencia si `paymentStatus` contradice el importe calculado.
- No se altera ningún cobro automáticamente. Para corregir el caso de Victoria, abrir la cita y seleccionar **Corregir / revertir cobro**; indicar S/ 50 y un motivo. Tras la operación, `paidAmount` será 0, `paymentStatus` pendiente, y quedará movimiento negativo en `paymentHistory`.
- Los indicadores de caja y Finanzas ya empleaban `CRMCore.paid`; ahora comparten el mismo criterio con el listado.
- Mantener copia de seguridad y probar primero en entorno de prueba. Requiere validación real de Firestore y las reglas.
