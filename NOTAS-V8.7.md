# V8.7 — conciliación de pagos

- Reversión de cobro mediante transacción con motivo y contramovimiento negativo. No borra el pago original.
- Lectura monetaria consistente: paidAmount tiene prioridad sobre etiquetas heredadas.
- La ficha de citas muestra el botón Corregir / revertir cobro cuando hay importe registrado.
- Las reglas actuales permiten actualizar appointments solo al propietario. Para multiusuario, mover la reversión a Cloud Function con bitácora inmutable.
- No se han cambiado registros reales de Firebase. Probar con citas ficticias antes de publicar.
- El ZIP separado Legacy corrige el cálculo NaN y la fecha de Lima de la app anterior. No fusionar ni sustituir la web nueva con el ZIP Legacy.
