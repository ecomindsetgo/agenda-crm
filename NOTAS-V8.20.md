# V8.20 — Finanzas originales y pagos paginados

Se eliminó la regla CSS que escondía el tablero financiero original. El panel de Estado de Caja, métricas, tendencias y periodos sigue usando sus funciones existentes. El historial de pagos y pendientes se sitúa al final y muestra 10 registros por página. Las páginas se reinician al cambiar el periodo. No se modifica Firestore ni se cambian los importes.

Validar en un navegador conectado a datos de prueba: Todo el tiempo, Este mes, Esta semana, Hoy, Rango, paginación de cobros y pendientes, impresión y exportación.
