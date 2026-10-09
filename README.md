# Agenda Pro · CRM del Consultorio

Esta versión usa el proyecto correcto `agenda-crm-main`, conserva los verdes de la marca y las rutas existentes de Firebase. Se integra una capa de organización y administración sin borrar ni trasladar masivamente los registros.

## Módulos

| Área | Módulos | Propósito |
|---|---|---|
| Operación diaria | Inicio, agenda, recepción | Próxima atención, sesiones, horarios, bloqueos y llegada de pacientes |
| Gestión clínica | Pacientes/CRM, historias, sesiones, evaluaciones, documentos | Ficha integral del paciente y continuidad de la atención |
| Administración | Finanzas, caja diaria, reportes, alertas | Cobros, saldos, pendientes y seguimiento |
| Herramientas | Tareas, asistente IA, mi plataforma | Actividades, apoyo administrativo, perfil, instalación y respaldo |

Los módulos clínicos, calendario y CRM existentes se conservan. Los reportes administrativos no incorporan diagnósticos, motivos de consulta ni notas clínicas. La historia clínica conserva su impresión independiente.

## Refuerzos implementados

- Navegación agrupada por área; controlador final limita la vista a una sección activa. Menú secundario móvil por módulos.
- Panel de inicio reestructurado con indicadores, agenda del día, próxima cita y accesos clínicos.
- Motor financiero común para indicadores, caja, reportes y resumen financiero. PEN y USD se mantienen separados.
- Tratamiento de abonos parciales, saldos no negativos, estados cancelados y exclusión de bloqueos de horarios del cálculo económico.
- Caja y reportes se agrupan por **fecha de cita**. No representan un libro bancario por fecha exacta del movimiento ni contabilidad tributaria.
- Un cobro registrado no desaparece al cancelar una cita; cancelar no registra un reembolso. No se implementó un libro separado de reembolsos ni gastos.
- Centro de reportes con rango, estado, nombre editable de profesional, vista previa, PDF mediante impresión y CSV con protección contra fórmulas.
- Enlaces de documentos restringidos a HTTP/HTTPS. Mejor tratamiento de texto de pacientes y evoluciones en las pantallas modificadas.
- Pacientes se archivan como inactivos en lugar de eliminar sus fichas. Se reactivan cambiando el estado CRM. La opción de eliminar una cita ahora la cancela y conserva el registro.
- Metadato `updatedBy` en los cambios reforzados de fichas, citas, pagos y estados. No constituye una auditoría inmutable.
- Respaldo JSON incluye pacientes, citas, bloqueos, historias, notas y tareas locales. Esta entrega no incluye restauración automática de ese respaldo.

## Historia clínica

Texto continuo con páginas adicionales, encabezado/logo y pie turquesa en cada hoja. Encabezado compacto y espacio reservado de 8 mm sobre el pie. No se repite la historia personal.

Códigos HC-0101 a HC-9999, asignados mediante transacción Firebase. Nombre sugerido al guardar como PDF: nombre del paciente y fecha de Perú. Se requiere conexión para asignar un código.

Para PDF: A4, escala 100%, gráficos de fondo activados y encabezados/pies adicionales del navegador desactivados.

## Móvil e instalación

Incluye manifiesto, iconos, service worker y una página de desconexión. Publica en HTTPS y abre **Mi plataforma → Instalar**. En iPhone/Safari utiliza Compartir → Añadir a pantalla de inicio.

La aplicación instalada necesita conexión para abrir los datos y guardar cambios. Se cachea únicamente interfaz estática del mismo dominio; no se cachean respuestas de Firebase, historias, audios, PDFs ni respaldos. No se ofrecen recordatorios automáticos en segundo plano.

En `mobile/README.md` se describe la ruta futura a Android/iOS con Capacitor. El script `scripts/prepare-native.mjs` prepara `www/`. No se entrega APK, IPA ni una publicación en tiendas.

## Tareas

Las tareas se guardan por usuario en este navegador, se pueden completar, filtrar y eliminar. No se sincronizan entre dispositivos. Se incluyen en el respaldo del usuario. Los demás registros principales conservan Firebase como fuente.

## Seguridad de Firebase

Se incluye `firestore.owner.rules`: ejemplo completo de reglas que exige una sesión y restringe cada ruta al UID dueño. No se ha publicado en tu Firebase. Antes de utilizarlo, confirma que las rutas reales corresponden a este proyecto y que no necesitas compartir una cuenta entre distintos UID o autorizar roles adicionales. Copia el archivo en Firestore → Reglas y publica cuando hayas comprobado esos requisitos.

La seguridad del servidor depende de las reglas efectivamente publicadas; no se sustituye con controles visuales. El cliente actual es para un consultorio por cuenta. No se implementó administración multiempresa ni delegación de roles entre profesionales.

## Actualizar

1. Conserva una copia del proyecto anterior.
2. Sube el contenido completo de esta carpeta respetando `css/`, `js/`, `assets/` y los archivos de instalación. Conserva `CNAME`.
3. Recarga con Ctrl+F5. Si ya instalaste una versión anterior, cierra y vuelve a abrir la aplicación para permitir la renovación del service worker.
4. Comprueba ingreso, crear/editar citas, estados, paquetes, historia clínica, reportes y cambios en un segundo dispositivo conectado.

No requiere volver a registrar pacientes ni trasladar datos. La asignación de códigos ocurre al abrir, guardar o imprimir una historia.

## Validación realizada

- Sintaxis de los scripts e identificadores HTML únicos.
- Motor financiero: abonos, cancelaciones con cobro, monedas separadas, bloqueos, valores inválidos, fechas y saldos.
- Seguridad de enlaces y exportación CSV.
- Service worker: no intercepta Firestore, API, PDFs ni escrituras; ofrece página de desconexión.
- Manifiesto, iconos y preparación de archivos para un futuro contenedor nativo.
- Persistencia, texto seguro y aislamiento de tareas entre cuentas.

Ejecutar `node tests/crm-core.test.cjs` y `node tests/service-worker.test.cjs` para repetir las pruebas del motor y de la caché.

No se conectó con tu Firebase real ni se pudo revisar visualmente con navegador en este entorno. Las reglas no se probaron en el emulador y los flujos móviles de instalación/voz/PDF requieren comprobación en dispositivos reales.
