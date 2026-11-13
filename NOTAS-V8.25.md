# V8.25 — Eliminar paciente y alerta de duplicados

PACIENTES
- Cada ficha ahora tiene 📦 Archivar (lo que hacía antes el botón "Eliminar": queda inactivo, conserva citas, cobros e historia) y 🗑️ Eliminar (borrado definitivo).
- Eliminar definitivamente SOLO se permite si el paciente no tiene citas. Pide confirmación y escribir ELIMINAR. Borra también su historia clínica y notas clínicas.
- Si tiene citas, avisa y ofrece archivar (así no se pierden cobros, paquetes ni eventos de Google Calendar).

DUPLICADOS (al crear o editar un paciente)
- Mismo DNI: bloquea el guardado y muestra la ficha existente.
- Mismo teléfono (ignora espacios y +51) o mismo nombre (ignora tildes, mayúsculas y orden): muestra una alerta con la ficha existente y deja elegir "guardar de todos modos" (útil para pareja/familia que comparten teléfono).
- También detecta coincidencias con pacientes archivados y los marca como [ARCHIVADO].

No cambia Firestore ni sus reglas (las reglas actuales ya permiten borrar pacientes, historias y notas).
Publicar subiendo el ZIP con la misma estructura. Se subió la versión de caché a v8-25.

AJUSTE (v8-26): la lista de Pacientes que se ve en pantalla es la tabla CRM (Paciente / Estado CRM / Última sesión / Próxima cita / Saldo). Se añadió el botón rojo 🗑️ Eliminar junto a "Ver 360". Para archivar, cambiar el Estado CRM a Inactivo.
