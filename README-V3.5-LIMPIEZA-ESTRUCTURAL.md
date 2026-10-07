# Psicología Pro V3.5 — Limpieza estructural

## Objetivo
Esta versión corrige la mezcla de módulos y elimina vistas duplicadas visibles. Mantiene la misma base de Firebase y no migra ni borra datos.

## Cambios principales

- **Aislamiento real de módulos**: al cambiar de sección se ocultan todas las demás, incluidas Sesiones, Evaluaciones y Documentos creados dinámicamente.
- **Alertas**: solo muestra alertas. Ya no puede quedar visible Sesiones debajo por un cambio de navegación incompleto.
- **Pacientes / CRM**: queda una sola vista operativa. Se oculta la antigua cuadrícula de pacientes que duplicaba la información del CRM.
- **Nueva ficha de Cita**: reorganizada en Datos de la cita, Atención, Cobro y Nota administrativa.
- **Nueva ficha de Paciente**: reorganizada en Datos personales, Seguimiento y Antecedentes generales.
- Formularios más compactos, consistentes y adaptables a móvil.
- Se mantienen todos los IDs y campos requeridos por la lógica existente para conservar compatibilidad.

## Datos
No se modifica la estructura actual de `patients`, `appointments`, `clinicalHistories` ni `clinicalNotes`.
