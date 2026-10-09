/* Psicologia Pro V4 - UI y modulos consolidados */

/* assistant */
/* Asistente IA - Agenda Psicología Pro+
   Consultas administrativas: Gemini recibe SOLO la pregunta para clasificar la intención;
   los datos de agenda se procesan localmente. Nunca se envían historias existentes.
   Modo Historia Clínica (opt-in): se envía a Gemini ÚNICAMENTE el texto/audio que la
   profesional dicta o adjunta en ese momento, para ordenarlo en los campos de la ficha.
   Nada se guarda automáticamente: la profesional revisa y pulsa "Guardar Historia Clínica".
*/
(function () {
  'use strict';

  const KEY_NAME = 'agenda_pro_gemini_api_key';
  const APP_VERSION = '2026.10.01.3';
  const MODEL = localStorage.getItem('agenda_pro_gemini_model') || 'gemini-3.8-flash';
  let lastAnswerText = '';
  let voiceQueryActive = false;
  let autoSpeak = true;
  let chatStarted = false;
  let fabGreetShown = false;

  // Memoria conversacional ligera para preguntas de seguimiento.
  const conversation = {
    lastQuestion: '',
    lastIntent: '',
    lastPatient: '',
    lastAnswerAt: 0
  };
  function hasFollowUpMarker(q) {
    const x = normalizeQuestion(q);
    return /^(y|y que|y cuanto|y cuánto|y cuales|y cuáles|y la proxima|y la próxima|y el siguiente|y ayer|y manana|y mañana|y hoy|y este mes|y esta semana|tambien|también)/.test(x);
  }
  function rememberConversation(question, intent) {
    conversation.lastQuestion = question || '';
    conversation.lastIntent = intent || '';
    conversation.lastAnswerAt = Date.now();
    try {
      const data = getData();
      const names = (data.patients || []).map(p => String(p.name || '').trim()).filter(Boolean)
        .sort((a,b) => b.length - a.length);
      const qn = normalizeQuestion(question);
      const hit = names.find(n => qn.includes(normalizeQuestion(n)));
      if (hit) conversation.lastPatient = hit;
    } catch (_) {}
  }


  function $(id) { return document.getElementById(id); }

  function specialistName() {
    try {
      if (typeof window.getAgendaSpecialistFirstName === 'function') {
        return window.getAgendaSpecialistFirstName() || '';
      }
    } catch (e) { /* noop */ }
    return '';
  }

  function scrollChatToBottom() {
    const chat = $('assistant-chat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  // Añade un mensaje del asistente (izquierda) al hilo de conversación.
  function appendBotMessage(html) {
    const chat = $('assistant-chat');
    if (!chat) return;
    const row = document.createElement('div');
    row.className = 'chat-row chat-row-bot';
    row.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble chat-bubble-bot">${html}</div>`;
    chat.appendChild(row);
    lastAnswerText = row.innerText;
    scrollChatToBottom();
    return row;
  }

  // Añade un mensaje del usuario (derecha) al hilo de conversación.
  function appendUserMessage(text) {
    const chat = $('assistant-chat');
    if (!chat) return;
    const row = document.createElement('div');
    row.className = 'chat-row chat-row-user';
    row.innerHTML = `<div class="chat-bubble chat-bubble-user">${escapeHtml(text)}</div>`;
    chat.appendChild(row);
    scrollChatToBottom();
  }

  // Indicador de "escribiendo…" mientras se procesa la consulta, para que
  // se sienta como una conversación real y no como un formulario.
  function showTyping() {
    const chat = $('assistant-chat');
    if (!chat) return null;
    const row = document.createElement('div');
    row.className = 'chat-row chat-row-bot';
    row.id = 'assistant-typing-row';
    row.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble chat-bubble-bot chat-typing"><span></span><span></span><span></span></div>`;
    chat.appendChild(row);
    scrollChatToBottom();
    return row;
  }

  function hideTyping() {
    const row = $('assistant-typing-row');
    if (row) row.remove();
  }

  function greetingMessage() {
    const name = specialistName();
    const hello = name ? `Hola ${escapeHtml(name)} 👋` : 'Hola 👋';
    return `<div class="assistant-title">${hello}</div><div>Soy tu asistente personal de la agenda. Puedo revisar tus citas, pacientes, horarios libres e ingresos al instante. ¿En qué puedo ayudarte hoy?</div><div class="mt-2 text-[11px] text-slate-400">🔒 Para consultas de agenda solo uso fechas, nombres y montos, y nunca leo tus historias existentes. Si activas «Dictar historia clínica», únicamente lo que dictes o adjuntes en ese momento se envía a Gemini para ordenarlo en la ficha.</div>`;
  }

  // Muestra el saludo inicial solo una vez por sesión de chat (mientras el
  // hilo esté vacío), igual que cuando abres un chat de WhatsApp por primera vez.
  function ensureGreeting() {
    const chat = $('assistant-chat');
    if (!chat) return;
    if (chatStarted || chat.children.length) return;
    chatStarted = true;
    appendBotMessage(greetingMessage());
  }

  function openAssistantModal() {
    const modal = $('assistant-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateConfigState();
    hideFabGreetBubble();
    const badge = $('assistant-fab-badge');
    if (badge) badge.classList.add('hidden');
    ensureGreeting();
    const q = $('assistant-question');
    if (q) setTimeout(() => q.focus(), 150);
  }

  function closeAssistantModal() {
    const modal = $('assistant-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.zIndex = '';
  }

  // Burbuja tipo "widget de WhatsApp" que aparece sola una vez, invitando a
  // abrir el chat, con el nombre de la profesional si está disponible.
  function showFabGreetBubble() {
    if (fabGreetShown) return;
    const modal = $('assistant-modal');
    if (modal && !modal.classList.contains('hidden')) return; // ya está abierto
    const bubble = $('assistant-fab-greet');
    if (!bubble) return;
    const name = specialistName();
    bubble.querySelector('span').textContent = name
      ? `Hola ${name}, soy tu asistente personal. ¿En qué puedo ayudarte hoy?`
      : 'Hola, soy tu asistente personal. ¿En qué puedo ayudarte hoy?';
    bubble.classList.remove('hidden');
    fabGreetShown = true;
    const badge = $('assistant-fab-badge');
    if (badge) badge.classList.remove('hidden');
  }

  function hideFabGreetBubble() {
    const bubble = $('assistant-fab-greet');
    if (bubble) bubble.classList.add('hidden');
  }

  function openGeminiConfig() {
    const box = $('gemini-config-box');
    if (!box) return;
    box.classList.toggle('hidden');
    const input = $('gemini-api-key');
    if (input) input.value = localStorage.getItem(KEY_NAME) || '';
    updateConfigState();
  }

  function saveGeminiKey() {
    const input = $('gemini-api-key');
    const key = input ? input.value.trim() : '';
    if (!key) {
      alert('Pega primero tu API Key de Gemini.');
      return;
    }
    localStorage.setItem(KEY_NAME, key);
    updateConfigState();
    setStatus('✅ API de Gemini guardada en este navegador.', 'ok');
    const box = $('gemini-config-box');
    if (box) box.classList.add('hidden');
  }

  function clearGeminiKey() {
    localStorage.removeItem(KEY_NAME);
    const input = $('gemini-api-key');
    if (input) input.value = '';
    updateConfigState();
    setStatus('Clave eliminada de este navegador. El asistente seguirá funcionando con interpretación local básica.', 'info');
  }

  function updateConfigState() {
    const el = $('assistant-config-state');
    if (!el) return;
    el.textContent = localStorage.getItem(KEY_NAME) ? '● Gemini configurado' : '○ Gemini no configurado';
  }

  function setStatus(text, type) {
    const el = $('assistant-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'text-xs rounded-xl p-3';
    if (type === 'ok') el.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
    else if (type === 'error') el.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
    else el.classList.add('bg-slate-50', 'text-slate-600', 'border', 'border-slate-200');
    el.classList.remove('hidden');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function todayLima() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  // Hora actual en Lima como "HH:MM", para saber si una cita de hoy ya pasó.
  function limaNowTime() {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour12: false, hour: '2-digit', minute: '2-digit' }).format(new Date());
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Convierte "HH:MM" (24h) a un formato hablado tipo "10:00 a. m.", más
  // natural tanto para leer en pantalla como para la lectura por voz.
  function formatTime12(time) {
    if (!time) return 'sin hora';
    const parts = String(time).split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (Number.isNaN(h)) return String(time);
    const d = new Date(2000, 0, 1, h, m);
    return new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  }

  // Renderiza una lista de citas evitando repetir la fecha en cada línea
  // cuando todas las citas del resultado caen en el mismo día: la fecha se
  // muestra una sola vez en el título y cada ítem queda solo con nombre y
  // hora. Si el resultado abarca varias fechas (p. ej. un rango de días),
  // sí se conserva la fecha por ítem porque ahí es información necesaria.
  function apptListHtml(list, opts) {
    opts = opts || {};
    const emoji = opts.emoji || '📅';
    const emptyMsg = opts.emptyMsg || 'No hay citas registradas para ese periodo.';
    const limit = opts.limit || 30;
    const sorted = (list || []).slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    if (!sorted.length) {
      return `<div class="assistant-title">${emoji} ${escapeHtml(opts.title || '')}</div><div>${escapeHtml(emptyMsg)}</div>`;
    }
    const dates = Array.from(new Set(sorted.map(a => a.date)));
    const sameDate = dates.length === 1;
    const fullTitle = sameDate ? `${opts.title} ${formatDate(dates[0])}` : opts.title;
    const shown = sorted.slice(0, limit);
    const items = shown.map(a => sameDate
      ? `<li><b>${escapeHtml(a.patientName)}</b> — ${escapeHtml(formatTime12(a.time))}</li>`
      : `<li><b>${escapeHtml(a.patientName)}</b> — ${formatDate(a.date)}, ${escapeHtml(formatTime12(a.time))}</li>`
    ).join('');
    return `<div class="assistant-title">${emoji} ${escapeHtml(fullTitle)}</div><div class="assistant-total">${sorted.length} cita(s)</div><ul class="assistant-list">${items}</ul>`;
  }

  function getMonthRange(dateStr) {
    const ym = dateStr.slice(0, 7);
    const start = ym + '-01';
    const d = new Date(start + 'T12:00:00');
    d.setMonth(d.getMonth() + 1);
    return [start, d.toISOString().slice(0, 10)];
  }

  function getWeekRange(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + mondayOffset);
    const start = d.toISOString().slice(0, 10);
    return [start, addDays(start, 7)];
  }

  function getPrevWeekRange(dateStr) {
    const [start] = getWeekRange(dateStr);
    const prevStart = addDays(start, -7);
    return [prevStart, start];
  }

  function getPrevMonthRange(dateStr) {
    const [start] = getMonthRange(dateStr);
    const anchor = addDays(start, -1); // último día del mes anterior
    return getMonthRange(anchor);
  }

  function getData() {
    try {
      if (typeof window.getAgendaAdminSnapshot === 'function') return window.getAgendaAdminSnapshot();
    } catch (e) { console.error(e); }
    return { appointments: [], patients: [] };
  }

  function isActiveAppointment(a) {
    const s = String(a.status || '').toLowerCase();
    return !/(cancel|anulad|no asist|no_show)/.test(s);
  }

  // "pendiente" en el campo status = pendiente de atención/confirmación (no completada, no cancelada).
  function isUnconfirmed(a) {
    return String(a.status || '').toLowerCase() === 'pendiente';
  }

  function money(amount, currency) {
    const n = Number(amount || 0).toFixed(2);
    return currency === 'USD' ? '$' + n : 'S/ ' + n;
  }

  function normalizeQuestion(q) {
    return q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Debe reflejar la misma grilla de horarios usada en el calendario semanal
  // (HORARIO_SLOTS / HORARIO_DAYS en app.js). Si esos horarios cambian allí,
  // actualízalos también aquí para que "citas libres" sea exacto.
  const SLOT_TIMES = ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'];
  const AFTERNOON_EVENING_SLOTS = ['16:00', '17:00', '18:00', '19:00'];

  // Horarios disponibles para un día dado: domingo cerrado, sábado solo mañana.
  function daySlots(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=domingo … 6=sábado
    if (dow === 0) return [];
    if (dow === 6) return SLOT_TIMES.filter(s => !AFTERNOON_EVENING_SLOTS.includes(s));
    return SLOT_TIMES.slice();
  }

  function localIntent(q) {
    const x = normalizeQuestion(q);
    if (parseDateRange(q)) return 'range';

    // Saludos y cortesía, para que se sienta como una conversación real.
    if (/^\s*(hola|buen(os|as)\s*(dias|tardes|noches)?|hey|hi|que tal)\s*[!.,¡¿?]*\s*$/.test(x)) return 'greeting';
    if (/\b(gracias|muchas gracias|te lo agradezco)\b/.test(x)) return 'thanks';
    if (/quien eres|que eres|que puedes hacer|en que me puedes ayudar|para que sirves/.test(x)) return 'help';

    // Estado de confirmación/atención: "sin confirmar", "por confirmar".
    if (/sin confirmar|no confirmad|por confirmar|falta.*confirmar/.test(x)) return 'unconfirmed';

    // Combinación de tareas + pagos pendientes para un periodo.
    if (/tareas?.*pendient|pendient.*(tareas|por hacer)|que.*queda.*pendiente/.test(x)) return 'pending_tasks';

    // Comparación de ingresos entre periodos.
    if (/comparad|comparacion.*ingres|respecto al mes pasado|como van.*ingres/.test(x)) return 'compare';

    // Próxima/primera cita o turno (por hora), antes que otros patrones más genéricos.
    // Incluye variantes con "turno" y frases tipo "¿quién sigue?" que la gente
    // usa a diario en consultorio, no solo "próxima cita".
    if (/proxima cita|siguiente cita|primera cita|proximo turno|siguiente turno|proximo paciente|siguiente paciente|que paciente (sigue|viene|esta)|quien (sigue|es el siguiente|viene ahora)|a que hora.*(empieza|inicia|es).*(primera|proxima|siguiente)/.test(x)) return 'next';

    // Último paciente atendido / última cita ya pasada.
    if (/ultimo paciente|ultima cita( atendida)?|quien fue mi ultimo/.test(x)) return 'last_done';

    // Cantidad de pacientes distintos (no de citas) en un periodo.
    if (/cuantos pacientes (distintos|diferentes|unicos)|cuantos pacientes (atendi|tengo en total|he atendido)/.test(x)) return 'unique_patients';

    // Seguimiento conversacional: "¿y cuánto cobré?", "¿y ayer?", etc.
    if (hasFollowUpMarker(q) && conversation.lastIntent) {
      if (/ayer/.test(x)) return 'yesterday';
      if (/manana/.test(x)) return 'tomorrow';
      if (/proxima|siguiente/.test(x)) return 'next';
      if (/cob(r|re)|ingres|pago|dinero/.test(x)) return 'real_income';
      if (/debe|pendient|por cobrar/.test(x)) return 'pending';
      if (/espacio|libre|disponible/.test(x)) return 'free';
      if (/cuantas|citas|agenda/.test(x)) return conversation.lastIntent === 'range' ? 'range' : 'count';
    }

    // Citas que todavía quedan hoy.
    if (/(cuantas|cu[aá]ntas|que|qu[eé])?.*(citas?|turnos?|pacientes?).*(quedan|faltan|restan)/.test(x) ||
        /(quedan|faltan|restan).*(citas?|turnos?|pacientes?)/.test(x)) return 'remaining_today';

    // Resumen administrativo de un paciente concreto.
    if (/(resumen|estado|informacion|información|historial de citas|cuantas|cuántas).*(paciente|cliente)/.test(x) ||
        /(citas|pagos|debe|pendiente).*(paciente|cliente)/.test(x)) return 'patient_summary';

    // Espacios/horarios libres.
    if (/libre|disponible|espacios? libres?|huecos? libres?|cupos? libres?/.test(x)) return 'free';

    // Día con más citas / día más ocupado.
    if (/dia.*mas citas|que dia.*mas|dia con mas citas|dia mas ocupado|mas ocupado/.test(x)) return 'busiest';

    // Finanzas: se distinguen ingresos realmente cobrados, pendientes y proyección.
    if (/proyec|esperad|estimad|cuanto.*voy.*ingres|cuanto.*ingres.*futuro/.test(x)) return 'projection';
    if (/pendient|por cobrar|sin pagar|no pagad|debo cobrar|falta cobrar|quien.*deb|clientes?.*deb|pacientes?.*deb/.test(x)) return 'pending';
    if (/ingres.*real|ingreso real|recaudad|cobrad|cobrado|efectiv|cuanto.*cobre|cuanto.*recibi|cuanto.*me.*pagaron/.test(x)) return 'real_income';
    if (/ingres|dinero|gane|gan(e|é|e)|pago|factur/.test(x)) return 'real_income';

    if (/\bayer\b/.test(x)) return 'yesterday';
    if (/\bmanana\b/.test(x)) return 'tomorrow';
    if (/hoy/.test(x)) return 'today';
    if (/semana pasada|la semana anterior/.test(x)) return 'last_week';
    if (/esta semana|semana/.test(x)) return 'week';
    if (/mes pasado|el mes anterior/.test(x)) return 'last_month';
    if (/este mes|mes/.test(x)) return 'month';
    if (/cancelad|anulad/.test(x)) return 'cancelled';
    if (/a que hora|hora.*cita|cita.*hora/.test(x)) return 'patient_time';
    if (/quien|pacientes|tienen cita/.test(x)) return 'people';
    if (/cuantas|cantidad|numero|numero de|total.*cita|citas|reservas?|agenda|turnos?/.test(x)) return 'count';
    return 'help';
  }

  function parseDateOnly(value, defaultYear) {
    if (!value) return null;
    const v = normalizeQuestion(value).trim();
    let m = v.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    m = v.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    const months = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
    m = v.match(/(\d{1,2})\s+de\s+([a-z]+)/);
    if (m && months[m[2]]) return `${defaultYear || new Date().getFullYear()}-${String(months[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return null;
  }

  function parseDateRange(question) {
    const q = normalizeQuestion(question);
    const today = todayLima();
    const currentYear = today.slice(0,4);
    const explicit = q.match(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{4})?\b/g);
    if (explicit && explicit.length >= 2) {
      const full = s => {
        const p=s.split(/[\/-]/);
        return p.length===2 ? parseDateOnly(`${p[0]}/${p[1]}/${currentYear}`) : parseDateOnly(s);
      };
      const start=full(explicit[0]), end=full(explicit[1]);
      if(start && end) return {start,end,label:`del ${formatDate(start)} al ${formatDate(end)}`};
    }
    const months='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
    let m=q.match(new RegExp('del\\s+(\\d{1,2})\\s+al\\s+(\\d{1,2})\\s+de\\s+('+months+')(?:\\s+de\\s+(\\d{4}))?'));
    if(m){
      const y=Number(m[4]||currentYear), start=parseDateOnly(`${m[1]} de ${m[3]}`,y), end=parseDateOnly(`${m[2]} de ${m[3]}`,y);
      if(start&&end)return{start,end,label:`del ${formatDate(start)} al ${formatDate(end)}`};
    }
    m=q.match(new RegExp('(?:del|desde)\\s+(?:el\\s+)?(\\d{1,2})\\s+(?:de\\s+)?('+months+')(?:\\s+de\\s+(\\d{4}))?\\s+(?:al|hasta)\\s+(?:el\\s+)?(\\d{1,2})\\s+(?:de\\s+)?('+months+')(?:\\s+de\\s+(\\d{4}))?'));
    if(m){
      const y1=Number(m[3]||currentYear), y2=Number(m[6]||m[3]||currentYear);
      const start=parseDateOnly(`${m[1]} de ${m[2]}`,y1);
      // La expresión tiene día final en m[4], mes final en m[5].
      const finalEnd=parseDateOnly(`${m[4]} de ${m[5]}`,y2);
      if(start&&finalEnd)return{start,end:finalEnd,label:`del ${formatDate(start)} al ${formatDate(finalEnd)}`};
    }
    m=q.match(/\bdel\s+(\d{1,2})\s+al\s+(\d{1,2})\b/);
    if(m && !new RegExp(months).test(q)){
      const ym=today.slice(0,7), start=`${ym}-${String(m[1]).padStart(2,'0')}`, end=`${ym}-${String(m[2]).padStart(2,'0')}`;
      return{start,end,label:`del ${formatDate(start)} al ${formatDate(end)}`};
    }
    m=q.match(/\b(?:ultimos|últimos)\s+(\d{1,3})\s+dias?\b/);
    if(m){const n=Math.max(1,Math.min(365,Number(m[1])));return{start:addDays(today,-(n-1)),end:today,label:`de los últimos ${n} días`};}
    m=q.match(/\b(?:proximos|próximos)\s+(\d{1,3})\s+dias?\b/);
    if(m){const n=Math.max(1,Math.min(365,Number(m[1])));return{start:today,end:addDays(today,n-1),label:`de los próximos ${n} días`};}
    return null;
  }

  // Resuelve un rango de fechas ("hoy", "ayer", "mañana", "esta/la semana pasada",
  // "este mes/el mes pasado") a partir de las palabras de la pregunta. Si no hay
  // ninguna palabra de fecha, usa defaultUnit ('today' | 'week' | 'month').
  function resolveScope(question, defaultUnit) {
    const x = normalizeQuestion(question);
    const today = todayLima();
    if (/\bayer\b/.test(x)) {
      const d = addDays(today, -1);
      return { start: d, end: addDays(d, 1), label: 'de ayer' };
    }
    if (/\bmanana\b/.test(x)) {
      const d = addDays(today, 1);
      return { start: d, end: addDays(d, 1), label: 'de mañana' };
    }
    if (/hoy/.test(x)) {
      return { start: today, end: addDays(today, 1), label: 'de hoy' };
    }
    if (/semana pasada|la semana anterior/.test(x)) {
      const [start, end] = getPrevWeekRange(today);
      return { start, end, label: 'de la semana pasada' };
    }
    if (/esta semana|semana/.test(x)) {
      const [start, end] = getWeekRange(today);
      return { start, end, label: 'de esta semana' };
    }
    if (/mes pasado|el mes anterior/.test(x)) {
      const [start, end] = getPrevMonthRange(today);
      return { start, end, label: 'del mes pasado' };
    }
    if (/este mes|mes/.test(x)) {
      const [start, end] = getMonthRange(today);
      return { start, end, label: 'de este mes' };
    }
    if (defaultUnit === 'week') {
      const [start, end] = getWeekRange(today);
      return { start, end, label: 'de esta semana' };
    }
    if (defaultUnit === 'today') {
      return { start: today, end: addDays(today, 1), label: 'de hoy' };
    }
    const [start, end] = getMonthRange(today);
    return { start, end, label: 'de este mes' };
  }

  async function classifyWithGemini(question) {
    const key = localStorage.getItem(KEY_NAME);
    if (!key) return null;
    const allowed = ['today','tomorrow','yesterday','week','last_week','month','last_month','cancelled',
      'real_income','pending','pending_tasks','projection','compare','patient_time','next','free','busiest',
      'unconfirmed','people','count','range','help','greeting','thanks','last_done','unique_patients','remaining_today','patient_summary'];
    const prompt = `Eres un clasificador de intención para una agenda de psicología. No respondas la pregunta: solo elige UNA categoría. La aplicación calculará la respuesta localmente con los datos administrativos.
Reglas: rango explícito de fechas = range; cuánto cobré/recibí/ingresé = real_income; deuda/pendiente/por cobrar = pending; proyección/esperado = projection; cuántas citas quedan/restan = remaining_today; nombre de paciente + resumen/citas/pagos = patient_summary; siguiente/próxima = next; espacios libres = free; comparado con = compare.
No inventes datos. Categorías permitidas: ${allowed.join(', ')}.
Responde únicamente con la categoría.
Pregunta: ${question}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 10 } })
    });
    if (!response.ok) throw new Error('Gemini respondió con HTTP ' + response.status);
    const data = await response.json();
    const text = (((data.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '';
    return allowed.includes(text.trim().toLowerCase()) ? text.trim().toLowerCase() : null;
  }

  function sumByCurrency(items) {
    const out = {};
    (items || []).forEach(a => {
      const c = a.currency === 'USD' ? 'USD' : 'PEN';
      out[c] = (out[c] || 0) + Number(a.cost || 0);
    });
    return out;
  }

  function formatTotals(byCurrency) {
    const keys = Object.keys(byCurrency || {});
    return keys.length ? keys.map(c => money(byCurrency[c], c)).join(' + ') : 'S/ 0.00';
  }

  function isPaid(a) {
    return String(a.paymentStatus || '').toLowerCase() === 'pagado';
  }

  function isPendingPayment(a) {
    return String(a.paymentStatus || '').toLowerCase() === 'pendiente';
  }

  // Lista de citas/pacientes con pago pendiente, para responder "¿qué clientes me deben?".
  function pendingDetailHtml(pending) {
    const detail = pending.slice()
      .sort((a, b) => String(a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
      .slice(0, 15)
      .map(a => `<li>${formatDate(a.date)} — <b>${escapeHtml(a.patientName)}</b>: ${money(a.cost || 0, a.currency === 'USD' ? 'USD' : 'PEN')}</li>`)
      .join('');
    return detail ? `<ul class="assistant-list mt-2">${detail}</ul>` : '';
  }

  // Agrupa citas activas por fecha y devuelve [[fecha, cantidad], ...] ordenado desc.
  function busiestDays(list) {
    const counts = {};
    (list || []).forEach(a => { counts[a.date] = (counts[a.date] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  function answer(intent, question) {
    const data = getData();
    const all = Array.isArray(data.appointments) ? data.appointments : [];
    const today = todayLima();
    let list = all.filter(a => a && a.date);
    let title = '';

    // Proyección = citas futuras/no canceladas cuyo importe representa el cobro esperado.
    // Ingreso real = únicamente paymentStatus === "pagado".
    // Pendiente = paymentStatus === "pendiente", independientemente de que esté completada.
    if (intent === 'today' || intent === 'people' || intent === 'count') {
      list = list.filter(a => a.date === today && isActiveAppointment(a));
      title = 'Citas de hoy';
    } else if (intent === 'yesterday') {
      const date = addDays(today, -1);
      list = list.filter(a => a.date === date && isActiveAppointment(a));
      title = 'Citas de ayer';
    } else if (intent === 'tomorrow') {
      const date = addDays(today, 1);
      list = list.filter(a => a.date === date && isActiveAppointment(a));
      title = 'Citas de mañana';
    } else if (intent === 'week') {
      const [start, end] = getWeekRange(today);
      list = list.filter(a => a.date >= start && a.date < end && isActiveAppointment(a));
      title = 'Citas de esta semana';
    } else if (intent === 'last_week') {
      const [start, end] = getPrevWeekRange(today);
      list = list.filter(a => a.date >= start && a.date < end && isActiveAppointment(a));
      title = 'Citas de la semana pasada';
    } else if (intent === 'month') {
      const [start, end] = getMonthRange(today);
      list = list.filter(a => a.date >= start && a.date < end && isActiveAppointment(a));
      title = 'Citas de este mes';
    } else if (intent === 'last_month') {
      const [start, end] = getPrevMonthRange(today);
      list = list.filter(a => a.date >= start && a.date < end && isActiveAppointment(a));
      title = 'Citas del mes pasado';
    } else if (intent === 'range') {
      const range = parseDateRange(question);
      if (!range) return '<div class="assistant-title">📅 Rango no reconocido</div><div>Usa, por ejemplo: “¿Cuánto ingresé del 01/09/2026 al 10/09/2026?”</div>';
      list = list.filter(a => a.date >= range.start && a.date <= range.end && isActiveAppointment(a));
      title = `Periodo ${range.label}`;
      const qn = normalizeQuestion(question);
      if (/proyec|esperad|estimad/.test(qn)) {
        // IMPORTANTE: cuando el usuario proporciona un rango explícito, se respeta
        // TODO el rango. No se vuelve a aplicar 'hoy' como límite inferior.
        // Esto evita perder citas de los primeros días del rango (p.ej. 07/09).
        // PROYECCIÓN TOTAL = todo el valor económico del periodo: incluye
        // citas ya cobradas/pagadas y citas aún pendientes de cobro.
        // No incluye citas canceladas, anuladas o no asistidas.
        // Esto permite que una consulta como “proyección del 07/09 al 03/10”
        // refleje tanto lo ya cobrado como lo que todavía se espera cobrar.
        const projection = list.filter(isActiveAppointment);
        const totals = sumByCurrency(projection);
        const detail = projection.slice().sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))
          .slice(0, 80)
          .map(a => `<li>${formatDate(a.date)} ${escapeHtml(a.time || '')} — <b>${escapeHtml(a.patientName)}</b>: ${money(a.cost || 0, a.currency === 'USD' ? 'USD' : 'PEN')}</li>`).join('');
        return `<div class="assistant-title">📈 Proyección ${escapeHtml(range.label)}</div><div class="assistant-total">${formatTotals(totals)}</div><div class="mt-1 text-slate-500">${projection.length} cita(s) consideradas: cobradas + pendientes dentro de todo el rango indicado.</div>${detail ? `<details class="mt-2"><summary class="cursor-pointer font-semibold">Ver detalle</summary><ul class="assistant-list mt-2">${detail}</ul></details>` : ''}`;
      }
      if (/pendient|por cobrar|sin pagar|no pagad|falta cobrar|quien.*deb|clientes?.*deb|pacientes?.*deb/.test(qn)) {
        const pending = list.filter(isPendingPayment);
        return `<div class="assistant-title">⏳ Pendiente ${escapeHtml(range.label)}</div><div class="assistant-total">${formatTotals(sumByCurrency(pending))}</div><div class="mt-1 text-slate-500">${pending.length} cita(s) pendientes de pago.</div>${pendingDetailHtml(pending)}`;
      }
      // Solo se asume que preguntan por ingresos si usan palabras de dinero.
      // Si no, es una pregunta de cantidad/lista de citas del periodo (ej.
      // "¿Cuántas citas hubo entre el 1 y el 15?") y se muestra el conteo.
      if (/ingres|dinero|gane|gan(e|é|e)|cobrad|recaudad|factur|efectiv|pago/.test(qn)) {
        const paid = list.filter(isPaid);
        return `<div class="assistant-title">💰 Ingresos reales ${escapeHtml(range.label)}</div><div class="assistant-total">${formatTotals(sumByCurrency(paid))}</div><div class="mt-1 text-slate-500">${paid.length} pago(s) registrado(s) como pagado.</div>`;
      }
      return apptListHtml(list, { title });
    } else if (intent === 'real_income' || intent === 'pending' || intent === 'projection') {
      const scope = resolveScope(question, 'month');
      title = scope.label;
      list = list.filter(a => a.date >= scope.start && a.date < scope.end && isActiveAppointment(a));

      if (intent === 'real_income') {
        const paid = list.filter(isPaid);
        return `<div class="assistant-title">💰 Ingresos reales ${escapeHtml(title)}</div><div class="assistant-total">${formatTotals(sumByCurrency(paid))}</div><div class="mt-1 text-slate-500">${paid.length} pago(s) efectivamente registrado(s).</div>`;
      }
      if (intent === 'pending') {
        const pending = list.filter(isPendingPayment);
        return `<div class="assistant-title">⏳ Pendiente por cobrar ${escapeHtml(title)}</div><div class="assistant-total">${formatTotals(sumByCurrency(pending))}</div><div class="mt-1 text-slate-500">${pending.length} cita(s) con pago pendiente.</div>${pendingDetailHtml(pending)}`;
      }
      // Proyección total: suma lo ya cobrado y lo pendiente dentro del periodo.
      // Las citas canceladas/no asistidas quedan fuera.
      const projection = list.filter(isActiveAppointment);
      return `<div class="assistant-title">📈 Proyección de ingresos ${escapeHtml(title)}</div><div class="assistant-total">${formatTotals(sumByCurrency(projection))}</div><div class="mt-1 text-slate-500">${projection.length} cita(s) consideradas: cobradas + pendientes.</div>`;
    } else if (intent === 'compare') {
      const qn = normalizeQuestion(question);
      const useWeek = /semana/.test(qn);
      let curStart, curEnd, prevStart, prevEnd, curLabel, prevLabel;
      if (useWeek) {
        [curStart, curEnd] = getWeekRange(today);
        [prevStart, prevEnd] = getPrevWeekRange(today);
        curLabel = 'esta semana'; prevLabel = 'la semana pasada';
      } else {
        [curStart, curEnd] = getMonthRange(today);
        [prevStart, prevEnd] = getPrevMonthRange(today);
        curLabel = 'este mes'; prevLabel = 'el mes pasado';
      }
      const curPaid = all.filter(a => a && a.date >= curStart && a.date < curEnd && isPaid(a));
      const prevPaid = all.filter(a => a && a.date >= prevStart && a.date < prevEnd && isPaid(a));
      const curTotals = sumByCurrency(curPaid);
      const prevTotals = sumByCurrency(prevPaid);
      const curPen = curTotals.PEN || 0;
      const prevPen = prevTotals.PEN || 0;
      const diff = curPen - prevPen;
      const pct = prevPen > 0 ? ((diff / prevPen) * 100).toFixed(1) : null;
      const arrow = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➖');
      return `<div class="assistant-title">${arrow} Comparación de ingresos reales</div>` +
        `<div><b>${escapeHtml(curLabel)}:</b> ${formatTotals(curTotals)} (${curPaid.length} pago(s))</div>` +
        `<div><b>${escapeHtml(prevLabel)}:</b> ${formatTotals(prevTotals)} (${prevPaid.length} pago(s))</div>` +
        `<div class="mt-1 text-slate-500">Diferencia en soles: ${diff >= 0 ? '+' : ''}S/ ${diff.toFixed(2)}${pct !== null ? ' (' + (diff >= 0 ? '+' : '') + pct + '%)' : ''}. Si manejas montos en USD, revisa el detalle por separado arriba.</div>`;
    } else if (intent === 'next') {
      const qn = normalizeQuestion(question);
      let candidates = all.filter(a => a && a.date && isActiveAppointment(a));
      let label = 'Tu próxima cita';
      if (/\bmanana\b/.test(qn)) {
        const d = addDays(today, 1);
        candidates = candidates.filter(a => a.date === d);
        label = 'Primera cita de mañana';
      } else if (/hoy/.test(qn) && /primera/.test(qn)) {
        candidates = candidates.filter(a => a.date === today);
        label = 'Primera cita de hoy';
      } else {
        const nowTime = limaNowTime();
        candidates = candidates.filter(a => a.date > today || (a.date === today && (a.time || '00:00') >= nowTime));
      }
      candidates = candidates.slice().sort((a, b) => String(a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      const next = candidates[0];
      if (!next) return `<div class="assistant-title">🕐 ${escapeHtml(label)}</div><div>No encontré citas próximas para ese periodo.</div>`;
      return `<div class="assistant-title">🕐 ${escapeHtml(label)}</div><div class="assistant-total">${escapeHtml(next.time || 'sin hora')}</div><div class="mt-1 text-slate-500">${formatDate(next.date)} — ${escapeHtml(next.patientName)}</div>`;
    } else if (intent === 'free') {
      const scope = resolveScope(question, 'today');
      const days = [];
      for (let d = scope.start; d < scope.end; d = addDays(d, 1)) days.push(d);
      const rows = days.map(d => {
        const slots = daySlots(d);
        const free = slots.filter(s => !all.some(a => a.date === d && isActiveAppointment(a) && a.time && a.time.slice(0, 5) === s));
        return { date: d, slots, free };
      });
      if (rows.length === 1) {
        const r = rows[0];
        if (!r.slots.length) return `<div class="assistant-title">🟢 Espacios libres ${escapeHtml(scope.label)}</div><div>Ese día no hay atención (consultorio cerrado).</div>`;
        return `<div class="assistant-title">🟢 Espacios libres ${escapeHtml(scope.label)}</div><div class="assistant-total">${r.free.length} de ${r.slots.length} horario(s)</div>${r.free.length ? '<ul class="assistant-list">' + r.free.map(s => `<li>${s}</li>`).join('') + '</ul>' : '<div>No hay horarios libres ese día.</div>'}`;
      }
      const totalFree = rows.reduce((s, r) => s + r.free.length, 0);
      return `<div class="assistant-title">🟢 Espacios libres ${escapeHtml(scope.label)}</div><div class="assistant-total">${totalFree} horario(s) libres en total</div><ul class="assistant-list">${rows.map(r => r.slots.length ? `<li>${formatDate(r.date)}: <b>${r.free.length}</b> libre(s) de ${r.slots.length}</li>` : `<li>${formatDate(r.date)}: cerrado</li>`).join('')}</ul>`;
    } else if (intent === 'busiest') {
      const qn = normalizeQuestion(question);
      const useMonth = /mes/.test(qn);
      const [start, end] = useMonth ? getMonthRange(today) : getWeekRange(today);
      const label = useMonth ? 'este mes' : 'esta semana';
      const scoped = all.filter(a => a && a.date && a.date >= start && a.date < end && isActiveAppointment(a));
      const ranking = busiestDays(scoped);
      if (!ranking.length) return `<div class="assistant-title">📊 Día con más citas (${escapeHtml(label)})</div><div>No hay citas registradas en ese periodo.</div>`;
      const max = ranking[0][1];
      const top = ranking.filter(r => r[1] === max);
      return `<div class="assistant-title">📊 Día con más citas (${escapeHtml(label)})</div><div class="assistant-total">${top.map(r => formatDate(r[0])).join(', ')} — ${max} cita(s)</div><ul class="assistant-list">${ranking.slice(0, 7).map(r => `<li>${formatDate(r[0])}: ${r[1]} cita(s)</li>`).join('')}</ul>`;
    } else if (intent === 'unconfirmed') {
      const qn = normalizeQuestion(question);
      let scoped = all.filter(a => a && a.date && isUnconfirmed(a));
      let label = 'próximas';
      if (/hoy|manana|semana|mes/.test(qn)) {
        const scope = resolveScope(question, 'today');
        scoped = scoped.filter(a => a.date >= scope.start && a.date < scope.end);
        label = scope.label;
      } else {
        scoped = scoped.filter(a => a.date >= today);
      }
      return apptListHtml(scoped, {
        emoji: '📝',
        title: `Citas sin confirmar (${label})`,
        emptyMsg: 'No hay citas pendientes de confirmar/atender en ese periodo.',
        limit: 20
      });
    } else if (intent === 'pending_tasks') {
      const scope = resolveScope(question, 'today');
      const scoped = all.filter(a => a && a.date && a.date >= scope.start && a.date < scope.end && isActiveAppointment(a));
      const unconfirmed = scoped.filter(isUnconfirmed);
      const paymentPending = scoped.filter(isPendingPayment);
      let html = `<div class="assistant-title">🧾 Pendientes ${escapeHtml(scope.label)}</div>` +
        `<div><b>${unconfirmed.length}</b> cita(s) sin confirmar/atender.</div>` +
        `<div><b>${paymentPending.length}</b> cita(s) con pago pendiente (${formatTotals(sumByCurrency(paymentPending))}).</div>`;
      if (unconfirmed.length) html += '<div class="mt-2 font-semibold">Sin confirmar:</div><ul class="assistant-list">' + unconfirmed.slice(0, 15).map(a => `<li>${formatDate(a.date)} ${escapeHtml(a.time || '')} — ${escapeHtml(a.patientName)}</li>`).join('') + '</ul>';
      if (paymentPending.length) html += '<div class="mt-2 font-semibold">Pago pendiente:</div>' + pendingDetailHtml(paymentPending);
      return html;
    } else if (intent === 'remaining_today') {
      const nowTime = limaNowTime();
      const remaining = all.filter(a => a && a.date === today && isActiveAppointment(a) &&
        String(a.time || '23:59').slice(0,5) >= nowTime)
        .sort((a,b) => String(a.time||'').localeCompare(String(b.time||'')));
      return `<div class="assistant-title">⏳ Citas que quedan hoy</div><div class="assistant-total">${remaining.length} cita(s)</div>` +
        (remaining.length ? `<ul class="assistant-list">${remaining.map(a => `<li><b>${escapeHtml(a.patientName)}</b> — ${escapeHtml(formatTime12(a.time))}</li>`).join('')}</ul>` :
        '<div>No quedan citas pendientes de atención para hoy.</div>');
    } else if (intent === 'patient_summary') {
      const qn = normalizeQuestion(question);
      const dataPatients = Array.isArray(data.patients) ? data.patients : [];
      let patientName = conversation.lastPatient || '';
      const hit = dataPatients.map(p => String(p.name || '').trim()).filter(Boolean)
        .sort((a,b)=>b.length-a.length).find(n => qn.includes(normalizeQuestion(n)));
      if (hit) patientName = hit;
      if (!patientName) {
        const candidate = all.map(a => a.patientName).filter(Boolean)
          .find(n => qn.split(/\s+/).some(w => w.length > 2 && normalizeQuestion(n).includes(w)));
        patientName = candidate || '';
      }
      if (!patientName) return `<div class="assistant-title">👤 Paciente no identificado</div><div>Indícame el nombre del paciente para revisar sus citas y pagos administrativos.</div>`;
      const rows = all.filter(a => a && normalizeQuestion(a.patientName) === normalizeQuestion(patientName));
      const activeRows = rows.filter(isActiveAppointment);
      const paidRows = rows.filter(isPaid);
      const pendingRows = rows.filter(isPendingPayment);
      const next = activeRows.filter(a => a.date > today || (a.date === today && String(a.time||'23:59').slice(0,5) >= limaNowTime()))
        .sort((a,b)=>String(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0];
      return `<div class="assistant-title">👤 Resumen administrativo: ${escapeHtml(patientName)}</div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="assistant-kpi"><strong>${rows.length}</strong><span>Citas registradas</span></div>
          <div class="assistant-kpi"><strong>${activeRows.length}</strong><span>Citas activas</span></div>
          <div class="assistant-kpi"><strong>${formatTotals(sumByCurrency(paidRows))}</strong><span>Pagado</span></div>
          <div class="assistant-kpi"><strong>${formatTotals(sumByCurrency(pendingRows))}</strong><span>Pendiente</span></div>
        </div>
        ${next ? `<div class="mt-3 text-slate-500">Próxima cita: <b>${formatDate(next.date)}</b> — ${escapeHtml(formatTime12(next.time))}</div>` : '<div class="mt-3 text-slate-500">No tiene una próxima cita activa registrada.</div>'}
        ${rows.length ? `<details class="mt-3"><summary class="cursor-pointer font-semibold">Ver citas</summary>${apptListHtml(rows,{title:'Citas del paciente',limit:20})}</details>` : ''}`;
    } else if (intent === 'patient_time') {
      const words = normalizeQuestion(question).split(/\s+/).filter(w => w.length > 2 && !['quien','tiene','cita','hora','que','a','para','el','la','de'].includes(w));
      const matches = words.length ? list.filter(a => words.some(w => normalizeQuestion(a.patientName).includes(w))) : [];
      if (!matches.length) return '<div class="assistant-title">🔎 No encontré una coincidencia.</div><div>Prueba con el nombre del paciente, por ejemplo: “¿A qué hora tiene cita María?”</div>';
      return '<div class="assistant-title">🕐 Horario encontrado</div><ul class="assistant-list">' + matches.slice(0, 10).map(a => `<li><b>${escapeHtml(a.patientName)}</b>: ${escapeHtml(a.time || 'sin hora')} — ${formatDate(a.date)}</li>`).join('') + '</ul>';
    } else if (intent === 'cancelled') {
      list = all.filter(a => a && a.date && String(a.status || '').toLowerCase() === 'cancelada');
      return apptListHtml(list, {
        emoji: '❌',
        title: 'Citas canceladas',
        emptyMsg: 'No hay citas canceladas registradas.',
        limit: 20
      });
    } else if (intent === 'help') {
      const name = specialistName();
      return `<div class="assistant-title">🤖 Puedo ayudarte con la agenda${name ? ', ' + escapeHtml(name) : ''}</div><div>Ejemplos: “¿Cuántas citas tengo esta semana?”, “¿Qué paciente sigue?”, “¿Tengo espacios libres hoy?”, “¿A qué hora es mi próxima cita?”, “¿Qué día tengo más citas este mes?”, “¿Cuánto ingresé realmente este mes?”, “¿Cuánto tengo pendiente por cobrar?”, “¿Qué clientes me deben?”, “¿Tengo citas sin confirmar?”, “¿Cómo van mis ingresos comparado con el mes pasado?”, “¿Cuál es mi proyección de ingresos este mes?”, “¿Cuántos pacientes distintos atendí este mes?” o “¿Cuántas citas tuve del 1 al 10?”.</div>`;
    } else if (intent === 'greeting') {
      return greetingMessage();
    } else if (intent === 'thanks') {
      return '<div class="assistant-title">🤖 ¡De nada!</div><div>Aquí estoy si necesitas revisar algo más de tu agenda.</div>';
    } else if (intent === 'last_done') {
      const past = all.filter(a => a && a.date && isActiveAppointment(a) &&
        (a.date < today || (a.date === today && (a.time || '00:00') < limaNowTime())));
      past.sort((a, b) => String(b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      const last = past[0];
      if (!last) return '<div class="assistant-title">🕐 Última cita</div><div>Todavía no encuentro citas anteriores registradas.</div>';
      return `<div class="assistant-title">🕐 Tu última cita</div><div class="assistant-total">${escapeHtml(last.patientName)}</div><div class="mt-1 text-slate-500">${formatDate(last.date)} — ${escapeHtml(formatTime12(last.time))}</div>`;
    } else if (intent === 'unique_patients') {
      const scope = resolveScope(question, 'month');
      const scoped = all.filter(a => a && a.date && a.date >= scope.start && a.date < scope.end && isActiveAppointment(a));
      const names = Array.from(new Set(scoped.map(a => (a.patientName || '').trim()).filter(Boolean)));
      return `<div class="assistant-title">👥 Pacientes distintos ${escapeHtml(scope.label)}</div><div class="assistant-total">${names.length} paciente(s)</div><div class="mt-1 text-slate-500">${scoped.length} cita(s) en total en ese periodo.</div>`;
    }

    if (intent === 'people') {
      return apptListHtml(list, { emoji: '👥', title, emptyMsg: 'No hay citas registradas.' });
    }

    return apptListHtml(list, { emoji: '📅', title });
  }

  function speakAnswer() {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setStatus('Este navegador no admite lectura por voz. Prueba Chrome o Edge.', 'error');
      return false;
    }
    const bubbles = document.querySelectorAll('#assistant-chat .chat-bubble-bot');
    const lastBubble = bubbles.length ? bubbles[bubbles.length - 1] : null;
    const text = lastAnswerText || (lastBubble ? lastBubble.innerText : '');
    if (!text.trim()) {
      setStatus('Primero realiza una consulta.', 'info');
      return false;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      // Antes, los saltos de línea entre cada cita (uno por <li>/<div>) se
      // borraban al colapsar todos los espacios en uno solo, así que la voz
      // leía todo seguido sin pausas. Ahora cada salto de línea se convierte
      // en un punto para que el lector de voz haga una pausa natural entre
      // cada cita, fecha u otro dato de la lista.
      const paused = text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('. ')
        .replace(/([.:,;])\s*\./g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      // En móviles, especialmente iPhone/iPad, es más fiable crear la voz
      // inmediatamente dentro de la interacción del usuario.
      const utterance = new SpeechSynthesisUtterance(paused);
      utterance.lang = 'es-PE';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setStatus('🔊 Reproduciendo la respuesta por voz.', 'ok');
      utterance.onend = () => setStatus('✅ Respuesta terminada.', 'ok');
      utterance.onerror = (e) => setStatus('No se pudo reproducir la voz (' + (e.error || 'error') + '). Toca “Leer respuesta” nuevamente.', 'error');
      synth.speak(utterance);
      // Algunos navegadores móviles pausan la síntesis recién iniciada.
      setTimeout(() => { try { if (synth.paused) synth.resume(); } catch (_) {} }, 120);
      return true;
    } catch (e) {
      setStatus('No se pudo iniciar la lectura por voz. Toca “Leer respuesta” nuevamente.', 'error');
      return false;
    }
  }

  function stopAnswerVoice() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setStatus('🔇 Lectura por voz detenida.', 'info');
  }

  function toggleAutoVoice() {
    autoSpeak = !autoSpeak;
    const btn = $('assistant-auto-voice-btn');
    if (btn) {
      btn.textContent = autoSpeak ? '🔊 Voz automática: ON' : '🔇 Voz automática: OFF';
      btn.classList.toggle('bg-emerald-50', autoSpeak);
      btn.classList.toggle('text-emerald-700', autoSpeak);
    }
    if (!autoSpeak) stopAnswerVoice();
  }

  let recognition = null;
  let isListening = false;

  function toggleAssistantVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Tu navegador no admite dictado por voz. Usa Google Chrome o Microsoft Edge.', 'error');
      return;
    }
    if (clinicalMode) { toggleClinicalDictation(SpeechRecognition); return; }
    voiceQueryActive = true;
    if (isListening && recognition) { recognition.stop(); return; }

    recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = true;
    isListening = true;
    updateVoiceButton();
    setStatus('🎙️ Escuchando… habla ahora.', 'info');

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text; else interim += text;
      }
      const input = $('assistant-question');
      if (input) input.value = (finalText + interim).trim();
    };
    recognition.onend = () => {
      isListening = false;
      updateVoiceButton();
      if (finalText.trim()) {
        const input = $('assistant-question');
        if (input) input.value = finalText.trim();
        setTimeout(() => askAssistant(), 250);
      } else {
        setStatus('No pude captar la pregunta. Inténtalo nuevamente.', 'info');
      }
    };
    recognition.onerror = (event) => {
      isListening = false;
      updateVoiceButton();
      const msg = event.error === 'not-allowed' ? 'Debes permitir el acceso al micrófono en el navegador.' : 'No se pudo usar el micrófono: ' + event.error;
      setStatus(msg, 'error');
    };
    recognition.start();
  }

  function updateVoiceButton() {
    const btn = $('assistant-voice-btn');
    if (!btn) return;
    btn.textContent = isListening ? '⏹️' : '🎙️';
    btn.title = isListening ? 'Detener dictado' : 'Hablar';
    btn.setAttribute('aria-label', isListening ? 'Detener dictado' : 'Hablar');
    btn.classList.toggle('bg-rose-100', isListening);
    btn.classList.toggle('text-rose-700', isListening);
  }

  async function askAssistant() {
    const input = $('assistant-question');
    const question = input ? input.value.trim() : '';
    if (!question) { setStatus('Escribe una pregunta primero.', 'error'); return; }
    ensureGreeting();
    appendUserMessage(question);
    if (input) input.value = '';
    const btn = $('assistant-send-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    showTyping();
    try {
      if (pendingClinical) { hideTyping(); await continuePendingClinical(question); return; }
      if (clinicalMode || isClinicalCommand(question)) { hideTyping(); await handleClinicalInput({ text: question }); return; }
      // Un rango explícito siempre tiene prioridad sobre la clasificación IA.
      // Así Gemini no puede convertir '07/09 al 03/10' en una consulta genérica de mes.
      let intent = parseDateRange(question) ? 'range' : localIntent(question);
      try {
        const aiIntent = await classifyWithGemini(question);
        if (aiIntent && !parseDateRange(question)) intent = aiIntent;
      } catch (e) {
        console.warn('[Asistente] Gemini no disponible; usando interpretación local.', e);
      }
      rememberConversation(question, intent);
      const answerHtml = answer(intent, question);
      // Pequeña pausa para que la respuesta se sienta conversacional en vez
      // de aparecer de golpe; el cálculo real ya terminó, esto es solo UX.
      await new Promise(res => setTimeout(res, 260));
      hideTyping();
      appendBotMessage(answerHtml);
      const el = $('assistant-status');
      if (el) el.classList.add('hidden');
      const wasVoiceQuery = voiceQueryActive;
      if (autoSpeak) setTimeout(() => speakAnswer(), 80);
      if (wasVoiceQuery) setStatus('✅ Consulta por voz procesada. Si el navegador bloquea el audio, toca “Leer respuesta”.', 'ok');
      voiceQueryActive = false;
    } catch (e) {
      console.error(e);
      hideTyping();
      appendBotMessage('<div class="assistant-title">⚠️ No pude procesar eso</div><div>' + escapeHtml(e.message || 'Ocurrió un error inesperado.') + '</div>');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '➤'; }
    }
  }

  function askAssistantExample(text) {
    const input = $('assistant-question');
    if (input) input.value = text;
    askAssistant();
  }


  /* =====================================================================
     HISTORIA CLÍNICA ASISTIDA POR IA
     La profesional dicta, escribe o adjunta un audio; Gemini lo ordena en
     los campos de la ficha. Se rellena el formulario abierto (sin guardar).
     ===================================================================== */
  const HC_CONSENT_KEY = 'agenda_pro_hc_ai_consent_v1';
  const HC_MAX_AUDIO_BYTES = 14 * 1024 * 1024; // el límite de la petición inline es ~20 MB (base64 +33%)
  let clinicalMode = false;
  let clinicalPatientId = '';
  let pendingClinical = null; // { text, audio } esperando que se indique el paciente
  let clinicalListening = false;
  let clinicalUserStopped = false;
  let clinicalRecognition = null;

  const HC_FIELDS = [
    { key: 'motivo', id: 'hc-motivo', label: 'Motivo de consulta' },
    { key: 'problema', id: 'hc-problema', label: 'Problema actual' },
    { key: 'impacto', id: 'hc-impacto', label: 'Impacto en su vida' },
    { key: 'historiaPersonal', id: 'hc-historia-personal', label: 'Historia personal relevante' },
    { key: 'vinculos', id: 'hc-vinculos', label: 'Vínculos y relaciones' },
    { key: 'tecnicas', id: 'hc-tecnicas', label: 'Técnicas e instrumentos' },
    { key: 'conducta', id: 'hc-conducta', label: 'Observación de conducta' },
    { key: 'hipotesis', id: 'hc-hipotesis', label: 'Hipótesis / conclusiones' },
    { key: 'recomendaciones', id: 'hc-recomendaciones', label: 'Recomendaciones' },
    { key: 'tareas', id: 'hc-tareas', label: 'Tareas / acuerdos' },
    { key: 'frecuencia', id: 'hc-frecuencia', label: 'Frecuencia', short: true },
    { key: 'enfoque', id: 'hc-enfoque', label: 'Enfoque', short: true },
    { key: 'duracion', id: 'hc-duracion', label: 'Duración sugerida', short: true },
    { key: 'ocupacion', id: 'hc-occupation', label: 'Ocupación', short: true },
    { key: 'estadoCivil', id: 'hc-civil-status', label: 'Estado civil', select: true }
  ];

  function isClinicalCommand(q) {
    const x = normalizeQuestion(q);
    return /\b(anota|anotar|registra|registrar|llena|llenar|completa|completar|agrega|agregar|actualiza|actualizar|escribe|redacta)\b.*\b(historia|evolucion|ficha)\b/.test(x)
      || /^\s*(historia clinica|evolucion|ficha clinica)\s+(de|del|para)\b/.test(x)
      || /\bdictar?\b.*\bhistoria\b/.test(x);
  }

  function patientById(id) {
    return (getData().patients || []).find(p => String(p.id) === String(id)) || null;
  }

  // Busca un paciente nombrado en el texto: nombre completo, o nombre + apellido, o nombre único.
  function findPatientInText(text) {
    const patients = (getData().patients || []).filter(p => p && p.name);
    const qn = normalizeQuestion(text || '');
    const full = patients
      .filter(p => qn.includes(normalizeQuestion(p.name)))
      .sort((a, b) => b.name.length - a.name.length);
    if (full.length) return { patient: full[0] };
    const words = new Set(qn.split(/[^a-z0-9]+/).filter(w => w.length > 2));
    const scored = patients.map(p => {
      const tokens = normalizeQuestion(p.name).split(/[^a-z0-9]+/).filter(w => w.length > 3);
      return { p, score: tokens.filter(t => words.has(t)).length };
    }).filter(x => x.score > 0);
    if (!scored.length) return null;
    const best = Math.max.apply(null, scored.map(x => x.score));
    const top = scored.filter(x => x.score === best);
    if (top.length === 1) return { patient: top[0].p };
    return { ambiguous: top.map(x => x.p) };
  }

  function openClinicalPatientId() {
    const modal = $('clinical-history-modal');
    if (!modal || modal.style.display !== 'flex') return '';
    const el = $('hc-patient-id');
    return el ? String(el.value || '') : '';
  }

  function updateClinicalBar() {
    const bar = $('assistant-clinical-bar');
    const sub = $('assistant-subtitle');
    const q = $('assistant-question');
    const p = clinicalPatientId ? patientById(clinicalPatientId) : null;
    if (bar) {
      bar.classList.toggle('hidden', !clinicalMode);
      const name = bar.querySelector('[data-role="patient"]');
      if (name) name.textContent = p ? p.name : 'se indicará en el mensaje';
    }
    if (sub) sub.textContent = clinicalMode ? 'Modo historia clínica · el contenido se envía a Gemini' : 'En línea · solo datos administrativos';
    if (q) q.placeholder = clinicalMode ? 'Dicta o escribe lo trabajado en la sesión…' : 'Escribe tu pregunta…';
  }

  function startClinicalMode(patientId) {
    clinicalMode = true;
    pendingClinical = null;
    clinicalPatientId = patientId ? String(patientId) : '';
    updateClinicalBar();
    ensureGreeting();
    const p = clinicalPatientId ? patientById(clinicalPatientId) : null;
    appendBotMessage(`<div class="assistant-title">🩺 Modo historia clínica</div><div>${p ? 'Paciente: <b>' + escapeHtml(p.name) + '</b>. ' : 'Indica el paciente en tu mensaje (por ejemplo: «María López: …»). '}Dicta con 🎙️, escribe, o adjunta un audio con 📎. Completaré los campos de la ficha y tú revisas antes de guardar.</div>`);
    const q = $('assistant-question');
    if (q) setTimeout(() => q.focus(), 100);
  }

  function cancelClinicalMode() {
    clinicalMode = false;
    clinicalPatientId = '';
    pendingClinical = null;
    if (clinicalListening && clinicalRecognition) { clinicalUserStopped = true; try { clinicalRecognition.stop(); } catch (_) {} }
    updateClinicalBar();
  }

  // Abre el chat por encima de la ficha clínica ya abierta, con el paciente preseleccionado.
  function openAssistantForClinical(patientId) {
    openAssistantModal();
    const modal = $('assistant-modal');
    if (modal) modal.style.zIndex = '10000';
    startClinicalMode(patientId || openClinicalPatientId());
  }

  function ensureClinicalConsent() {
    if (localStorage.getItem(HC_CONSENT_KEY) === 'yes') return true;
    const ok = confirm('El modo Historia Clínica envía a Gemini (Google) el texto o audio que dictes o adjuntes, solo para ordenarlo en la ficha. Las consultas de agenda siguen resolviéndose en tu navegador.\n\nÚsalo únicamente si cuentas con el consentimiento informado del paciente para este tratamiento de sus datos.\n\n¿Continuar?');
    if (ok) localStorage.setItem(HC_CONSENT_KEY, 'yes');
    return ok;
  }

  function buildClinicalPrompt(hasAudio) {
    const keys = HC_FIELDS.map(f => '"' + f.key + '"').join(', ');
    return `Eres un asistente de redacción clínica para una psicóloga. ${hasAudio ? 'Recibirás un audio (dictado de la profesional o grabación de una sesión)' : 'Recibirás un texto dictado o escrito por la profesional'} con información de un paciente. Tu tarea es ordenar SOLO lo que se dijo dentro de los campos de una historia clínica psicológica.
Devuelve únicamente un objeto JSON con estas claves de tipo texto: ${keys}; y la clave "evolucion", un objeto con "fecha" (AAAA-MM-DD), "sesion" y "texto".
Reglas estrictas:
- Usa únicamente información presente en el contenido. NO inventes, NO completes con suposiciones y NO propongas diagnósticos: "hipotesis" solo si la profesional los formuló explícitamente.
- Si un campo no se menciona, devuélvelo como "" (cadena vacía).
- Redacta en español, en tercera persona, con tono clínico profesional y conciso, fiel a lo dicho; elimina muletillas y repeticiones.
- "estadoCivil" debe ser exactamente uno de: Soltera(o), Casada(o), Viuda(o), Separada(o), Conviviente; o "".
- "evolucion.texto" resume lo ocurrido en la sesión descrita (temas tratados, intervenciones, respuesta del paciente, acuerdos). Déjalo "" si el contenido son solo datos generales de la historia y no describe una sesión concreta.
- "evolucion.fecha": la fecha indicada o, si no se menciona, ${todayLima()}. "evolucion.sesion": por ejemplo "Sesión 3" solo si se menciona; si no, "".
- Responde solo con el JSON, sin comentarios ni markdown.`;
  }

  function parseJsonLoose(raw) {
    let t = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (_) {}
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (_) {} }
    throw new Error('No pude interpretar la respuesta de Gemini. Inténtalo de nuevo.');
  }

  async function extractClinicalWithGemini(content) {
    const key = localStorage.getItem(KEY_NAME);
    if (!key) throw new Error('Configura tu clave de Gemini (botón ⚙️ Gemini, abajo) para usar esta función.');
    const parts = [{ text: buildClinicalPrompt(!!content.audio) }];
    if (content.text) parts.push({ text: 'CONTENIDO:\n' + content.text });
    if (content.audio) parts.push({ inline_data: { mime_type: content.audio.mime, data: content.audio.data } });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: 'application/json' }
      })
    });
    if (!response.ok) {
      let detail = '';
      try { const err = await response.json(); detail = (err && err.error && err.error.message) || ''; } catch (_) {}
      throw new Error('Gemini respondió con HTTP ' + response.status + (detail ? ': ' + detail : ''));
    }
    const data = await response.json();
    const raw = (((data.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
    if (!raw) throw new Error('Gemini no devolvió contenido. Prueba con un texto o audio más claro.');
    return parseJsonLoose(raw);
  }

  function markAiField(el) {
    if (!el) return;
    el.style.boxShadow = '0 0 0 2px #a78bfa';
    el.addEventListener('input', () => { el.style.boxShadow = ''; }, { once: true });
  }

  function clinicalHasContent(data) {
    if (!data || typeof data !== 'object') return false;
    const anyField = HC_FIELDS.some(f => typeof data[f.key] === 'string' && data[f.key].trim());
    const ev = data.evolucion;
    return anyField || !!(ev && typeof ev.texto === 'string' && ev.texto.trim());
  }

  // Rellena el formulario de la historia clínica SIN guardar. Nunca borra ni pisa lo ya escrito:
  // en textos largos añade debajo; en campos cortos solo rellena si están vacíos.
  function applyClinicalToForm(patient, data) {
    const modal = $('clinical-history-modal');
    const openId = openClinicalPatientId();
    if (String(openId) !== String(patient.id)) {
      if (openId && !confirm('Tienes abierta la historia de otro paciente. Si continúas se cerrará sin guardar sus cambios pendientes. ¿Continuar?')) return null;
      if (typeof window.openClinicalHistory !== 'function') throw new Error('No encontré la ventana de Historia Clínica en la página.');
      window.openClinicalHistory(patient.id);
    }
    if (openClinicalPatientId() !== String(patient.id)) throw new Error('No se pudo abrir la historia clínica del paciente.');

    const stamp = todayLima().split('-').reverse().join('/');
    const filled = [], skipped = [], marked = [];
    HC_FIELDS.forEach(f => {
      const el = $(f.id);
      const val = typeof data[f.key] === 'string' ? data[f.key].trim() : '';
      if (!el || !val) return;
      const current = String(el.value || '').trim();
      const same = normalizeQuestion(current) === normalizeQuestion(val);
      if (f.select) {
        const opt = Array.from(el.options).find(o => normalizeQuestion(o.text) === normalizeQuestion(val));
        if (!opt) return;
        if (!current) { el.value = opt.value; filled.push(f.label); marked.push(el); markAiField(el); }
        else if (!same) skipped.push(f.label);
        return;
      }
      if (!current) { el.value = val; filled.push(f.label); marked.push(el); markAiField(el); return; }
      if (f.short) { if (!same) skipped.push(f.label); return; }
      if (!normalizeQuestion(current).includes(normalizeQuestion(val))) {
        el.value = current + '\n\n[Añadido con IA · ' + stamp + ']\n' + val;
        filled.push(f.label + ' (añadido al final)'); marked.push(el); markAiField(el);
      }
    });

    let noteAdded = false;
    const ev = data.evolucion || {};
    const evText = typeof ev.texto === 'string' ? ev.texto.trim() : '';
    if (evText && typeof window.newClinicalNote === 'function') {
      window.newClinicalNote({});
      const cards = document.querySelectorAll('#clinical-notes-container > div');
      const card = cards[cards.length - 1];
      if (card) {
        card.querySelector('.note-date').value = /^\d{4}-\d{2}-\d{2}$/.test(String(ev.fecha || '')) ? ev.fecha : todayLima();
        card.querySelector('.note-session').value = (ev.sesion && String(ev.sesion).trim()) || ('Sesión ' + cards.length);
        const ta = card.querySelector('.note-text');
        ta.value = evText;
        markAiField(ta);
        marked.push(card);
        noteAdded = true;
      }
    }

    // Aviso dentro de la ficha para que la revisión sea evidente.
    const body = modal.querySelector('.overflow-y-auto');
    if (body) {
      const old = $('hc-ai-banner'); if (old) old.remove();
      const banner = document.createElement('div');
      banner.id = 'hc-ai-banner';
      banner.className = 'mb-4 p-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 text-sm flex items-start justify-between gap-3';
      banner.innerHTML = '<div>✨ <b>Completado con IA.</b> Revisa los campos resaltados en violeta' + (noteAdded ? ' y la nueva evolución al final' : '') + '; aún <b>no está guardado</b>. Pulsa «Guardar Historia Clínica» cuando estés conforme.</div><button type="button" class="text-violet-500 hover:text-violet-800 text-lg leading-none" onclick="this.parentElement.remove()">×</button>';
      body.insertBefore(banner, body.firstChild);
      body.scrollTop = 0;
      if (marked[0]) setTimeout(() => { try { marked[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {} }, 300);
    }
    return { filled, skipped, noteAdded };
  }

  async function runClinicalFill(patient, content) {
    if (!ensureClinicalConsent()) {
      appendBotMessage('Entendido, no envié nada a Gemini. Puedes escribir la historia manualmente en la ficha.');
      return;
    }
    showTyping();
    let data;
    try {
      data = await extractClinicalWithGemini(content);
    } catch (e) {
      console.error(e);
      hideTyping();
      appendBotMessage('<div class="assistant-title">⚠️ No pude procesar el contenido</div><div>' + escapeHtml(e.message || 'Error inesperado.') + '</div>');
      return;
    }
    hideTyping();
    if (!clinicalHasContent(data)) {
      appendBotMessage('No encontré información clínica que pueda ordenar en ese contenido. Cuéntame un poco más (motivo, situación actual, lo trabajado en sesión…).');
      return;
    }
    let result;
    try { result = applyClinicalToForm(patient, data); }
    catch (e) { console.error(e); appendBotMessage('⚠️ ' + escapeHtml(e.message || 'No pude abrir la ficha.')); return; }
    if (!result) { appendBotMessage('Cancelado. No modifiqué ninguna ficha.'); pendingClinical = content; clinicalPatientId = ''; return; }

    const lines = [];
    if (result.filled.length) lines.push('<b>Campos:</b> ' + result.filled.map(escapeHtml).join(', '));
    if (result.noteAdded) lines.push('<b>Nueva evolución</b> agregada.');
    if (result.skipped.length) lines.push('No sobrescribí (ya tenían otro valor): ' + result.skipped.map(escapeHtml).join(', '));
    appendBotMessage('<div class="assistant-title">✅ Ficha de ' + escapeHtml(patient.name) + ' completada (sin guardar)</div><div>' + (lines.join('<br>') || 'No había cambios nuevos.') + '</div><div class="mt-2 text-[11px] text-slate-500">Revisa y pulsa «Guardar Historia Clínica».</div>');
    cancelClinicalMode();
    setTimeout(closeAssistantModal, 1100);
  }

  async function handleClinicalInput(content) {
    const text = (content.text || '').trim();
    let patient = null;
    if (clinicalPatientId) patient = patientById(clinicalPatientId);
    if (!patient) {
      const r = findPatientInText(text);
      if (r && r.ambiguous) {
        pendingClinical = content;
        appendBotMessage('Hay varios pacientes que coinciden: <b>' + r.ambiguous.map(p => escapeHtml(p.name)).join('</b>, <b>') + '</b>. Escribe el nombre completo del paciente (o «cancelar»).');
        return;
      }
      if (r && r.patient) patient = r.patient;
    }
    if (!patient) {
      const openId = openClinicalPatientId();
      if (openId) patient = patientById(openId);
    }
    if (!patient) {
      if (!clinicalMode && !content.audio && text.split(/\s+/).length < 8) {
        startClinicalMode('');
        return;
      }
      pendingClinical = content;
      appendBotMessage('¿De qué paciente es? Escribe su nombre completo (o «cancelar»).');
      return;
    }
    // Orden corto sin contenido, p. ej. «historia clínica de María»: entra al modo y espera el dictado.
    if (!clinicalMode && !content.audio && text.split(/\s+/).length < 8) {
      startClinicalMode(patient.id);
      return;
    }
    clinicalPatientId = String(patient.id);
    await runClinicalFill(patient, content);
  }

  async function continuePendingClinical(question) {
    if (/^\s*(cancelar|cancela|olvidalo|olvídalo|no)\s*[.!]?\s*$/i.test(question)) {
      pendingClinical = null;
      appendBotMessage('Listo, descarté ese contenido. No se envió nada a Gemini.');
      return;
    }
    const r = findPatientInText(question);
    if (!r || !r.patient) {
      appendBotMessage(r && r.ambiguous
        ? 'Sigue habiendo más de una coincidencia: ' + r.ambiguous.map(p => escapeHtml(p.name)).join(', ') + '. Escribe el nombre completo.'
        : 'No encontré ese paciente en tu lista. Escribe su nombre tal como aparece en la agenda (o «cancelar»).');
      return;
    }
    const content = pendingClinical;
    pendingClinical = null;
    clinicalPatientId = String(r.patient.id);
    await runClinicalFill(r.patient, content);
  }

  // ---- Audio adjunto ----
  const AUDIO_MIME_BY_EXT = { mp3: 'audio/mp3', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
    m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', aiff: 'audio/aiff', webm: 'audio/webm' };

  function guessAudioMime(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (AUDIO_MIME_BY_EXT[ext]) return AUDIO_MIME_BY_EXT[ext];
    if (file.type === 'audio/mpeg') return 'audio/mp3';
    return file.type || 'audio/ogg';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error('No pude leer el archivo de audio.'));
      r.readAsDataURL(file);
    });
  }

  function pickAssistantAudio() {
    const input = $('assistant-audio-input');
    if (input) input.click();
  }

  async function handleAssistantAudio(inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (inputEl) inputEl.value = '';
    if (!file) return;
    if (file.size > HC_MAX_AUDIO_BYTES) {
      setStatus('El audio pesa ' + (file.size / 1048576).toFixed(1) + ' MB y el máximo es 14 MB. Recórtalo o expórtalo en menor calidad.', 'error');
      return;
    }
    ensureGreeting();
    const q = $('assistant-question');
    const extra = q ? q.value.trim() : '';
    if (q) q.value = '';
    appendUserMessage('🎧 ' + file.name + ' (' + (file.size / 1048576).toFixed(1) + ' MB)' + (extra ? ' — ' + extra : ''));
    if (pendingClinical) {
      // Si ya había contenido esperando paciente, el nombre puede venir en el texto acompañante.
      const r = findPatientInText(extra);
      if (!r || !r.patient) { appendBotMessage('Primero indícame el paciente del contenido anterior (o «cancelar»).'); return; }
    }
    showTyping();
    try {
      const audio = { mime: guessAudioMime(file), data: await fileToBase64(file), name: file.name };
      hideTyping();
      await handleClinicalInput({ text: extra, audio });
    } catch (e) {
      hideTyping();
      appendBotMessage('⚠️ ' + escapeHtml(e.message || 'No pude procesar el audio.'));
    }
  }

  // ---- Dictado largo (modo clínico): continuo, sin enviar solo ----
  function toggleClinicalDictation(SR) {
    if (clinicalListening) {
      clinicalUserStopped = true;
      try { clinicalRecognition.stop(); } catch (_) {}
      return;
    }
    clinicalUserStopped = false;
    clinicalListening = true;
    isListening = true;
    updateVoiceButton();
    setStatus('🎙️ Dictando… habla con calma. Pulsa ⏹️ al terminar y luego ➤ para enviar.', 'info');
    const input = $('assistant-question');
    const startSession = () => {
      const base = input ? input.value.trim() : '';
      let finalText = '';
      const rec = new SR();
      clinicalRecognition = rec;
      rec.lang = 'es-PE';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += t; else interim += t;
        }
        if (input) input.value = (base + ' ' + finalText + interim).trim();
      };
      rec.onend = () => {
        // Chrome corta el reconocimiento tras silencios: se reanuda hasta que la profesional lo detenga.
        if (!clinicalUserStopped && clinicalMode) { try { startSession(); return; } catch (_) {} }
        clinicalListening = false;
        isListening = false;
        updateVoiceButton();
        setStatus('Dictado detenido. Revisa el texto y pulsa ➤ para enviarlo.', 'info');
      };
      rec.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        clinicalUserStopped = true;
        setStatus(event.error === 'not-allowed' ? 'Debes permitir el acceso al micrófono en el navegador.' : 'No se pudo usar el micrófono: ' + event.error, 'error');
      };
      rec.start();
    };
    startSession();
  }

  window.startClinicalMode = startClinicalMode;
  window.cancelClinicalMode = cancelClinicalMode;
  window.openAssistantForClinical = openAssistantForClinical;
  window.pickAssistantAudio = pickAssistantAudio;
  window.handleAssistantAudio = handleAssistantAudio;

  console.info('[Asistente IA] versión', APP_VERSION);
  window.openAssistantModal = openAssistantModal;
  window.closeAssistantModal = closeAssistantModal;
  window.openGeminiConfig = openGeminiConfig;
  window.saveGeminiKey = saveGeminiKey;
  window.clearGeminiKey = clearGeminiKey;
  window.askAssistant = askAssistant;
  window.toggleAssistantVoice = toggleAssistantVoice;
  window.askAssistantExample = askAssistantExample;
  window.speakAnswer = speakAnswer;
  window.stopAnswerVoice = stopAnswerVoice;
  window.toggleAutoVoice = toggleAutoVoice;
  window.hideFabGreetBubble = hideFabGreetBubble;
  window.addEventListener('DOMContentLoaded', () => {
    updateConfigState();
    // Igual que un widget de WhatsApp: a los pocos segundos de cargar la
    // agenda (ya con sesión iniciada) aparece una burbuja invitando a usar
    // el asistente, sin ser intrusiva y solo una vez por sesión.
    setTimeout(showFabGreetBubble, 3500);
  });
})();

/* base ui */
        function switchTab(target) {
            ['citas','pacientes','finanzas'].forEach(t => {
                document.getElementById('sec-' + t).classList.add('hidden');
                document.getElementById('tab-' + t).className =
                    "py-3.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 tab-transition";
            });
            document.getElementById('sec-' + target).classList.remove('hidden');
            document.getElementById('tab-' + target).className =
                "py-3.5 px-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold text-sm flex items-center gap-2 tab-transition";
        }

        function setFilterStatus(status) {
            ['todas','pendiente','completada','no_asistio','cancelada'].forEach(st => {
                document.getElementById('btn-f-' + st).className = st === status ? "v31-filter-active" : "";
            });
            // Puente limpio hacia el scope del módulo
            document.body.dispatchEvent(new CustomEvent('filter-status-changed', { detail: status }));
        }

        function shiftDate(days) {
            const input = document.getElementById('date-filter');
            const d = new Date(input.value + 'T00:00:00');
            d.setDate(d.getDate() + days);
            input.value = d.toISOString().split('T')[0];
            window.renderAppointments();
            if (window.updateStatsDashboard) window.updateStatsDashboard();
        }

        function goToToday() {
            document.getElementById('date-filter').value = new Date().toISOString().split('T')[0];
            window.renderAppointments();
            if (window.updateStatsDashboard) window.updateStatsDashboard();
        }

        function toggleFloatingMenu() {
            const menu    = document.getElementById('fab-menu');
            const mainBtn = document.getElementById('btn-fab-main');
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                setTimeout(() => { menu.classList.remove('scale-95','opacity-0'); menu.classList.add('scale-100','opacity-100'); mainBtn.classList.add('rotate-45','bg-slate-700'); }, 10);
            } else {
                menu.classList.remove('scale-100','opacity-100');
                menu.classList.add('scale-95','opacity-0');
                mainBtn.classList.remove('rotate-45','bg-slate-700');
                setTimeout(() => menu.classList.add('hidden'), 200);
            }
        }

        function openAppointmentModal(editMode) {
            if (!editMode) {
                document.getElementById('appointment-form').reset();
                document.getElementById('app-id').value = '';
                document.getElementById('app-modal-title').innerText = "🗓️ Programar Nueva Cita";
                document.getElementById('app-date').value = document.getElementById('date-filter').value;
                document.getElementById('app-modality-presencial').checked = true;
                document.getElementById('app-attention-individual').checked = true;
                document.getElementById('app-rate-type').value = 'sesion';
                document.getElementById('app-payment').disabled = false;
                document.getElementById('app-package-consumed').value = '';
                updateAppointmentPricing();
            }
            const m = document.getElementById('appointment-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }
        function closeAppointmentModal() {
            const m = document.getElementById('appointment-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function openPatientModal(editMode) {
            if (!editMode) {
                document.getElementById('patient-form').reset();
                document.getElementById('patient-id').value = '';
                const patAgeEl = document.getElementById('pat-age');
                if (patAgeEl) patAgeEl.value = '';
                document.getElementById('patient-modal-title').innerText = "👤 Registrar Paciente Clínico";
            }
            const m = document.getElementById('patient-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }
        function closePatientModal() {
            const m = document.getElementById('patient-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function switchToNewPatientFromAppoint() {
            closeAppointmentModal();
            setTimeout(() => openPatientModal(), 200);
        }

        function setPrintCategory(category) {
            window._printCategory = category;
            const activeCls   = "v31-segment-active";
            const inactiveCls = "";
            document.getElementById('btn-pc-citas').className     = category === 'citas'     ? activeCls : inactiveCls;
            document.getElementById('btn-pc-finanzas').className  = category === 'finanzas'  ? activeCls : inactiveCls;
            document.getElementById('btn-pc-recepcion').className = category === 'recepcion' ? activeCls : inactiveCls;
            const presencialWrap = document.getElementById('print-presencial-wrap');
            const hint = document.getElementById('print-category-hint');
            if (presencialWrap) presencialWrap.classList.toggle('hidden', category !== 'recepcion');
            if (hint) hint.classList.toggle('hidden', category !== 'recepcion');
        }

        function setPrintType(type) {
            window._printType = type;
            const activeCls   = "v31-segment-active";
            const inactiveCls = "";
            document.getElementById('btn-pt-dia').className    = type === 'dia'    ? activeCls : inactiveCls;
            document.getElementById('btn-pt-semana').className = type === 'semana' ? activeCls : inactiveCls;
            document.getElementById('btn-pt-mes').className    = type === 'mes'    ? activeCls : inactiveCls;
            const customBtn = document.getElementById('btn-pt-personalizado');
            if (customBtn) customBtn.className = type === 'personalizado' ? activeCls : inactiveCls;
            // "Día" y "Semana" comparten el mismo selector de fecha (para semana, se
            // usa como una fecha de referencia dentro de la semana a reportar).
            document.getElementById('print-date-wrap').classList.toggle('hidden', type === 'mes' || type === 'personalizado');
            document.getElementById('print-month-wrap').classList.toggle('hidden', type !== 'mes');
            document.getElementById('print-custom-wrap').classList.toggle('hidden', type !== 'personalizado');
            const dateLabel = document.getElementById('print-date-wrap-label');
            if (dateLabel) {
                dateLabel.innerText = type === 'semana' ? 'Fecha dentro de la semana a reportar' : 'Fecha de Reporte';
                if (type === 'personalizado') dateLabel.innerText = 'Rango personalizado';
            }
        }

        function openPrintModal(presetType, presetCategory) {
            document.getElementById('print-date-select').value = document.getElementById('date-filter').value;
            const now = new Date();
            document.getElementById('print-month-select').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const cStart = document.getElementById('print-custom-start');
            const cEnd = document.getElementById('print-custom-end');
            if (cStart) cStart.value = (window._profileState && window._profileState.financeCustomStart) || document.getElementById('print-date-select').value;
            if (cEnd) cEnd.value = (window._profileState && window._profileState.financeCustomEnd) || document.getElementById('print-date-select').value;
            // Auto-cargar nombre del especialista desde el perfil guardado
            const user = window._profileState && window._profileState.currentUser;
            if (user) {
                const saved = JSON.parse(localStorage.getItem('userProfile_' + user.uid) || '{}');
                const name = saved.displayName || user.email.split('@')[0];
                document.getElementById('print-specialist-name').value = name;
            }
            const presencialCheck = document.getElementById('print-only-presencial');
            if (presencialCheck) presencialCheck.checked = true;
            setPrintCategory(presetCategory || 'citas');
            setPrintType(presetType || 'dia');
            const m = document.getElementById('print-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }
        function closePrintModal() {
            const m = document.getElementById('print-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function openProfileModal() {
            const user = window._profileState && window._profileState.currentUser;
            const email = user ? user.email : '';
            document.getElementById('profile-modal-email').innerText = email;

            // Cargar datos guardados del perfil
            const saved = JSON.parse(localStorage.getItem('userProfile_' + (user ? user.uid : '')) || '{}');
            document.getElementById('profile-displayname').value = saved.displayName || '';
            document.getElementById('profile-specialty').value   = saved.specialty   || '';
            document.getElementById('profile-phone').value       = saved.phone       || '';

            // Limpiar campos de clave
            document.getElementById('profile-current-pwd').value  = '';
            document.getElementById('profile-new-pwd').value      = '';
            document.getElementById('profile-confirm-pwd').value  = '';

            // Limpiar mensajes
            ['profile-edit-error','profile-edit-success','profile-pwd-error','profile-pwd-success']
                .forEach(id => document.getElementById(id).classList.add('hidden'));

            // Mostrar tab perfil por defecto
            switchProfileTab('perfil');

            const m = document.getElementById('profile-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }

        function closeProfileModal() {
            const m = document.getElementById('profile-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function switchProfileTab(tab) {
            ['perfil','clave'].forEach(t => {
                document.getElementById('psec-' + t).classList.add('hidden');
                document.getElementById('ptab-' + t).className =
                    'flex-1 py-2 text-xs font-semibold rounded-lg text-indigo-200 hover:bg-indigo-800/50 transition';
            });
            document.getElementById('psec-' + tab).classList.remove('hidden');
            document.getElementById('ptab-' + tab).className =
                'flex-1 py-2 text-xs font-semibold rounded-lg bg-white text-indigo-700 shadow transition';
        }

        function saveProfileData() {
            const errDiv = document.getElementById('profile-edit-error');
            const okDiv  = document.getElementById('profile-edit-success');
            errDiv.classList.add('hidden');
            okDiv.classList.add('hidden');

            const displayName = document.getElementById('profile-displayname').value.trim();
            const specialty   = document.getElementById('profile-specialty').value.trim();
            const phone       = document.getElementById('profile-phone').value.trim();

            if (!displayName) {
                errDiv.innerText = 'El nombre no puede estar vacío.';
                errDiv.classList.remove('hidden');
                return;
            }

            const user = window._profileState && window._profileState.currentUser;
            const key  = 'userProfile_' + (user ? user.uid : 'guest');
            localStorage.setItem(key, JSON.stringify({ displayName, specialty, phone }));

            // Actualizar nombre en el header
            const headerName = document.getElementById('header-user-name');
            if (headerName) headerName.innerText = displayName;

            okDiv.innerText = '✅ Perfil actualizado correctamente.';
            okDiv.classList.remove('hidden');
            setTimeout(() => okDiv.classList.add('hidden'), 3000);
        }




        
        async function saveNewPassword() {
            const errDiv = document.getElementById('profile-pwd-error');
            const okDiv  = document.getElementById('profile-pwd-success');
            errDiv.classList.add('hidden');
            okDiv.classList.add('hidden');

            const currentPwd = document.getElementById('profile-current-pwd').value;
            const newPwd     = document.getElementById('profile-new-pwd').value;
            const confirmPwd = document.getElementById('profile-confirm-pwd').value;

            if (!currentPwd) {
                errDiv.innerText = 'Ingresa tu contraseña actual.';
                errDiv.classList.remove('hidden'); return;
            }
            if (newPwd.length < 8) {
                errDiv.innerText = 'La nueva contraseña debe tener al menos 8 caracteres.';
                errDiv.classList.remove('hidden'); return;
            }
            if (newPwd.startsWith('temp_')) {
                errDiv.innerText = "No puedes usar una contraseña que empiece con 'temp_'.";
                errDiv.classList.remove('hidden'); return;
            }
            if (newPwd !== confirmPwd) {
                errDiv.innerText = 'Las contraseñas no coinciden.';
                errDiv.classList.remove('hidden'); return;
            }

            // Re-autenticar con la contraseña actual antes de cambiar
            try {
                const { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } = window._firebaseAuthRef;
                const auth = getAuth();
                const user = auth.currentUser;
                const credential = EmailAuthProvider.credential(user.email, currentPwd);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPwd);

                okDiv.innerText = '✅ Contraseña actualizada con éxito.';
                okDiv.classList.remove('hidden');
                document.getElementById('profile-current-pwd').value  = '';
                document.getElementById('profile-new-pwd').value      = '';
                document.getElementById('profile-confirm-pwd').value  = '';
                setTimeout(() => okDiv.classList.add('hidden'), 4000);
            } catch (error) {
                let msg = 'Error al actualizar la contraseña. Intenta de nuevo.';
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg = 'La contraseña actual es incorrecta.';
                } else if (error.code === 'auth/too-many-requests') {
                    msg = 'Demasiados intentos. Espera unos minutos.';
                }
                errDiv.innerText = msg;
                errDiv.classList.remove('hidden');
            }
        }


/* v2 */
(function(){
  'use strict';
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  const parseDate=s=>s?new Date(s+'T00:00:00'):null;
  const dateLabel=s=>{const d=parseDate(s);return d?d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}):'—'};
  const getState=()=>window._profileState||{appointments:[],patients:[],histories:[],notes:[]};
  const byPatient=id=>getState().patients.find(p=>String(p.id)===String(id));
  const pName=a=>a.patientName||(byPatient(a.patientId)||{}).name||'Paciente';
  const icon=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
  const statusLabel=s=>({pendiente:'Agendada',confirmada:'Confirmada',arrived:'Llegó',in_session:'En sesión',completada:'Completada',cancelada:'Cancelada',no_asistio:'No asistió'}[s]||s||'Agendada');
  const statusTone=s=>({pendiente:'amber',confirmada:'blue',arrived:'cyan',in_session:'violet',completada:'green',cancelada:'slate',no_asistio:'orange'}[s]||'amber');
  const crmKey=p=>{const s=p.leadStatus||'nuevo';return ['atendido','recurrente'].includes(s)?'tratamiento':s==='cancelo'?'pausado':s==='no_asistio'?'seguimiento':s};
  const crmLabel=p=>({nuevo:'Nuevo',contactado:'Contactado',interesado:'Interesado',cita_agendada:'Primera cita',atendido:'En tratamiento',recurrente:'En tratamiento',no_asistio:'Seguimiento',cancelo:'Pausado',seguimiento:'Seguimiento',pausado:'Pausado',alta:'Alta',inactivo:'Inactivo'}[p.leadStatus]||'Nuevo');
  function daysBetween(a,b){return Math.floor((b-a)/86400000)}
  function patientApps(pid){return (getState().appointments||[]).filter(a=>String(a.patientId)===String(pid))}
  function lastAppointment(pid){return patientApps(pid).filter(a=>a.status!=='cancelada').sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]}
  function nextAppointment(pid){const t=today();return patientApps(pid).filter(a=>(a.date||'')>=t&&!['cancelada','no_asistio'].includes(a.status)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||String(a.time||'').localeCompare(String(b.time||'')))[0]}
  function pendingForPatient(pid){return patientApps(pid).filter(a=>a.status!=='cancelada'&&(a.paymentStatus||'pendiente')!=='pagado').reduce((s,a)=>s+Number(a.cost||0),0)}
  function kpi(label,value,ico,sub=''){return `<div class="v2-kpi v2-kpi-compact"><span class="v2-kpi-icon">${icon(ico)}</span><div><div class="v2-kpi-value">${esc(value)}</div><div class="v2-kpi-label mt-2">${esc(label)}</div>${sub?`<div class="v2-kpi-sub">${esc(sub)}</div>`:''}</div></div>`}
  function empty(msg){return `<div class="v2-empty">${icon('file')}<span>${esc(msg)}</span></div>`}

  window.exportAgendaBackup=function(){const s=getState();const payload={version:'psicologia-pro-v2.3',exportedAt:new Date().toISOString(),appId:'psicologia-agenda-default-v2',appointments:s.appointments||[],patients:s.patients||[],clinicalHistories:s.histories||[],clinicalNotes:s.notes||[]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`respaldo-psicologia-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};

  window.renderV2Dashboard=function(){
    const s=getState(),root=document.getElementById('sec-inicio');if(!root)return;const t=today();const apps=(s.appointments||[]).filter(a=>a.date===t).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
    const completed=apps.filter(a=>a.status==='completada').length,pending=apps.filter(a=>!['completada','cancelada','no_asistio'].includes(a.status)).length,cancelled=apps.filter(a=>['cancelada','no_asistio'].includes(a.status)).length;
    const collected=apps.filter(a=>a.status!=='cancelada'&&a.paymentStatus==='pagado').reduce((x,a)=>x+Number(a.cost||0),0);const receivable=(s.appointments||[]).filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((x,a)=>x+Number(a.cost||0),0);
    const patients=s.patients||[],now=new Date(),monthPrefix=t.slice(0,7);const newMonth=patients.filter(p=>{const own=patientApps(p.id).filter(a=>a.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return String(own[0]?.date||'').startsWith(monthPrefix)}).length;
    const untracked=patients.filter(p=>{const la=lastAppointment(p.id);if(!la)return false;const d=parseDate(la.date);return d&&daysBetween(d,now)>30&&!nextAppointment(p.id)&&!['alta','inactivo'].includes(crmKey(p))}).slice(0,5);
    const packageAlerts=[];patients.forEach(p=>(p.packages||[]).forEach(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0),used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0);if(total&&Math.max(total-used,0)===1)packageAlerts.push({p,pk})}));
    const unpaidPatients=patients.map(p=>({p,amount:pendingForPatient(p.id)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,4);
    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};set('v2-kpi-today',apps.length);set('v2-kpi-completed',completed);set('v2-kpi-pending',pending);set('v2-kpi-cancelled',cancelled);set('v2-kpi-collected',money(collected));set('v2-kpi-receivable',money(receivable));set('v2-kpi-patients',patients.length);set('v2-kpi-new',newMonth);
    const list=document.getElementById('v2-today-list');if(list)list.innerHTML=apps.length?apps.map(a=>`<div class="v2-appointment-row"><div class="v2-time">${esc(a.time||'--:--')}</div><div class="min-w-0"><div class="text-sm font-extrabold text-slate-700 truncate">${esc(pName(a))}</div><div class="text-[11px] text-slate-400 mt-0.5">${esc(a.attentionType||a.type||'Sesión')} · ${esc(a.modality||'Sin modalidad')} · ${money(a.cost)}</div></div><span class="v2-status tone-${statusTone(a.status)}">${esc(statusLabel(a.status))}</span></div>`).join(''):empty('No hay citas programadas para hoy.');
    const alerts=document.getElementById('v2-alerts');if(alerts){const arr=[];if(unpaidPatients.length)arr.push(`<button onclick="switchTab('alertas')" class="v2-alert">${icon('money')}<div><strong>${unpaidPatients.length} paciente(s) con pagos pendientes</strong><span>${money(unpaidPatients.reduce((x,i)=>x+i.amount,0))} en seguimiento.</span></div></button>`);if(untracked.length)arr.push(`<button onclick="switchTab('alertas')" class="v2-alert">${icon('bell')}<div><strong>${untracked.length} paciente(s) sin seguimiento</strong><span>Más de 30 días sin próxima cita.</span></div></button>`);if(packageAlerts.length)arr.push(`<button onclick="switchTab('alertas')" class="v2-alert">${icon('clock')}<div><strong>${packageAlerts.length} paquete(s) por terminar</strong><span>Queda una sesión disponible.</span></div></button>`);if(!arr.length)arr.push(`<div class="v2-alert">${icon('check')}<div><strong>Todo en orden</strong><span>No hay alertas operativas prioritarias.</span></div></div>`);alerts.innerHTML=arr.join('')}
    const greet=document.getElementById('v2-greeting');if(greet){const h=new Date().getHours();greet.textContent=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches'}const fd=document.getElementById('v2-full-date');if(fd)fd.textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  };

  window.renderV2Reception=function(){const s=getState(),input=document.getElementById('v2-reception-date');if(!input)return;if(!input.value)input.value=today();const d=input.value,apps=(s.appointments||[]).filter(a=>a.date===d).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));const active=apps.filter(a=>!['cancelada','no_asistio','completada'].includes(a.status)).length;const waiting=apps.filter(a=>a.status==='arrived').length;const inSession=apps.filter(a=>a.status==='in_session').length;const done=apps.filter(a=>a.status==='completada').length;const pendingPay=apps.filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((x,a)=>x+Number(a.cost||0),0);document.getElementById('v2-reception-kpis').innerHTML=kpi('Citas',apps.length,'calendar')+kpi('Por atender',active,'clock')+kpi('En espera',waiting,'reception')+kpi('En sesión',inSession,'clinical')+kpi('Pendiente cobro',money(pendingPay),'money');const root=document.getElementById('v2-reception-list');if(!apps.length){root.innerHTML=empty('No hay citas para esta fecha.');return}const nextMap={pendiente:['confirmada','Confirmar'],confirmada:['arrived','Registrar llegada'],arrived:['in_session','Iniciar sesión'],in_session:['completada','Completar sesión']};root.innerHTML=apps.map(a=>{const next=nextMap[a.status];return `<div class="v2-reception-row"><div class="v2-reception-time">${esc(a.time||'--:--')}</div><div class="v2-reception-main"><div class="flex items-center gap-2 flex-wrap"><strong>${esc(pName(a))}</strong><span class="v2-status tone-${statusTone(a.status)}">${esc(statusLabel(a.status))}</span>${a.paymentStatus==='pagado'?'<span class="v2-paid">Pagado</span>':'<span class="v2-unpaid">Pendiente</span>'}</div><span>${esc(a.attentionType||'Sesión')} · ${esc(a.modality||'')} · ${money(a.cost)}</span></div><div class="v2-reception-actions">${next?`<button class="v2-primary-btn sm" onclick="updateAppointmentStatus('${a.id}','${next[0]}').then(()=>renderV2Reception())">${icon('arrow')}${next[1]}</button>`:''}<button class="v2-secondary-btn sm" onclick="quickTogglePayment('${a.id}').then(()=>renderV2Reception())">${icon('money')}${a.paymentStatus==='pagado'?'Marcar pendiente':'Registrar pago'}</button><button class="v2-icon-btn" title="Editar cita" onclick="editAppointment('${a.id}')">${icon('edit')}</button>${!['cancelada','completada'].includes(a.status)?`<button class="v2-icon-btn danger" title="No asistió" onclick="updateAppointmentStatus('${a.id}','no_asistio').then(()=>renderV2Reception())">${icon('x')}</button>`:''}</div></div>`}).join('')};

  window.renderV2CRM=function(){const s=getState(),root=document.getElementById('v2-crm-table');if(!root)return;const f=document.getElementById('v2-crm-filter')?.value||'todos',q=(document.getElementById('v2-crm-search')?.value||'').toLowerCase();let rows=(s.patients||[]).map(p=>{const last=lastAppointment(p.id),next=nextAppointment(p.id),debt=pendingForPatient(p.id);return {p,last,next,debt,key:crmKey(p)}});if(f!=='todos')rows=rows.filter(r=>r.key===f);if(q)rows=rows.filter(r=>(r.p.name||'').toLowerCase().includes(q)||(r.p.phone||'').toLowerCase().includes(q)||(r.p.dni||'').toLowerCase().includes(q));const patients=s.patients||[],follow=patients.filter(p=>{const l=lastAppointment(p.id),d=l&&parseDate(l.date);return d&&daysBetween(d,new Date())>30&&!nextAppointment(p.id)&&!['alta','inactivo'].includes(crmKey(p))}).length;document.getElementById('v2-crm-summary').innerHTML=kpi('Pacientes',patients.length,'users')+kpi('En tratamiento',patients.filter(p=>crmKey(p)==='tratamiento').length,'clinical')+kpi('Seguimiento',follow,'bell')+kpi('Con deuda',patients.filter(p=>pendingForPatient(p.id)>0).length,'money');if(!rows.length){root.innerHTML=empty('No hay pacientes con estos filtros.');return}root.innerHTML=`<table class="v2-table"><thead><tr><th>Paciente</th><th>Estado CRM</th><th>Última sesión</th><th>Próxima cita</th><th>Saldo</th><th></th></tr></thead><tbody>${rows.sort((a,b)=>(a.p.name||'').localeCompare(b.p.name||'')).map(r=>`<tr><td><strong>${esc(r.p.name||'Paciente')}</strong><span>${esc(r.p.phone||r.p.dni||'Sin contacto')}</span></td><td><select class="v2-inline-select" onchange="updatePatientCRMStatus('${r.p.id}',this.value).then(()=>renderV2CRM())"><option value="nuevo" ${r.key==='nuevo'?'selected':''}>Nuevo</option><option value="contactado" ${r.key==='contactado'?'selected':''}>Contactado</option><option value="interesado" ${r.key==='interesado'?'selected':''}>Interesado</option><option value="cita_agendada" ${r.key==='cita_agendada'?'selected':''}>Primera cita</option><option value="recurrente" ${r.key==='tratamiento'?'selected':''}>En tratamiento</option><option value="seguimiento" ${r.key==='seguimiento'?'selected':''}>Seguimiento</option><option value="pausado" ${r.key==='pausado'?'selected':''}>Pausado</option><option value="alta" ${r.key==='alta'?'selected':''}>Alta</option><option value="inactivo" ${r.key==='inactivo'?'selected':''}>Inactivo</option></select></td><td>${r.last?dateLabel(r.last.date):'—'}</td><td>${r.next?`${dateLabel(r.next.date)} · ${esc(r.next.time||'')}`:'—'}</td><td class="${r.debt>0?'v2-debt':''}">${money(r.debt)}</td><td><button class="v2-link-btn" onclick="openPatient360('${r.p.id}')">Ver 360 ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table>`};

  window.renderV2Clinical=function(){const s=getState(),root=document.getElementById('v2-clinical-table');if(!root)return;const q=(document.getElementById('v2-clinical-search')?.value||'').toLowerCase(),histIds=new Set((s.histories||[]).map(h=>String(h.id))),notesBy={};(s.notes||[]).forEach(n=>{const id=String(n.patientId||n.pid||'');notesBy[id]=(notesBy[id]||0)+1});let patients=(s.patients||[]).filter(p=>!q||(p.name||'').toLowerCase().includes(q));const withHist=patients.filter(p=>histIds.has(String(p.id))).length;document.getElementById('v2-clinical-kpis').innerHTML=kpi('Pacientes',patients.length,'users')+kpi('Con historia',withHist,'clinical')+kpi('Historia pendiente',Math.max(patients.length-withHist,0),'file')+kpi('Notas clínicas',(s.notes||[]).length,'report');if(!patients.length){root.innerHTML=empty('No hay pacientes para mostrar.');return}root.innerHTML=`<table class="v2-table"><thead><tr><th>Paciente</th><th>Historia clínica</th><th>Notas</th><th>Última sesión</th><th>Acciones</th></tr></thead><tbody>${patients.map(p=>{const has=histIds.has(String(p.id)),last=lastAppointment(p.id),n=notesBy[String(p.id)]||0;return `<tr><td><strong>${esc(p.name||'Paciente')}</strong><span>${esc(p.phone||'')}</span></td><td><span class="v2-status ${has?'tone-green':'tone-amber'}">${has?'Registrada':'Pendiente'}</span></td><td>${n}</td><td>${last?dateLabel(last.date):'—'}</td><td><div class="flex gap-2"><button class="v2-secondary-btn sm" onclick="openClinicalHistory('${p.id}')">${icon('clinical')}Abrir historia</button><button class="v2-link-btn" onclick="openPatient360('${p.id}')">Ficha 360</button></div></td></tr>`}).join('')}</tbody></table>`};

  window.renderV2Cash=function(){const s=getState(),input=document.getElementById('v2-cash-date');if(!input)return;if(!input.value)input.value=today();const d=input.value,apps=(s.appointments||[]).filter(a=>a.date===d&&a.status!=='cancelada'),paid=apps.filter(a=>a.paymentStatus==='pagado'),pending=apps.filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado'),income=paid.reduce((x,a)=>x+Number(a.cost||0),0),due=pending.reduce((x,a)=>x+Number(a.cost||0),0),projected=apps.filter(a=>a.status!=='no_asistio').reduce((x,a)=>x+Number(a.cost||0),0);document.getElementById('v2-cash-kpis').innerHTML=kpi('Cobrado',money(income),'money')+kpi('Pendiente',money(due),'wallet')+kpi('Proyección día',money(projected),'report')+kpi('Operaciones pagadas',paid.length,'check');const renderRows=list=>list.length?list.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).map(a=>`<div class="v2-money-row"><div><strong>${esc(pName(a))}</strong><span>${esc(a.time||'')} · ${esc(a.modality||'')}</span></div><b>${money(a.cost)}</b></div>`).join(''):empty('Sin movimientos para esta fecha.');document.getElementById('v2-cash-paid').innerHTML=renderRows(paid);document.getElementById('v2-cash-pending').innerHTML=pending.length?pending.map(a=>`<div class="v2-money-row"><div><strong>${esc(pName(a))}</strong><span>${esc(a.time||'')} · sesión completada</span></div><button class="v2-secondary-btn sm" onclick="quickTogglePayment('${a.id}').then(()=>renderV2Cash())">Cobrar ${money(a.cost)}</button></div>`).join(''):empty('No hay cobros pendientes del día.')};

  window.renderV2Alerts=function(){const s=getState(),patients=s.patients||[],now=new Date(),histIds=new Set((s.histories||[]).map(h=>String(h.id)));const overdue=patients.map(p=>({p,amount:patientApps(p.id).filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((x,a)=>x+Number(a.cost||0),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);const follow=patients.map(p=>({p,last:lastAppointment(p.id)})).filter(x=>{const d=x.last&&parseDate(x.last.date);return d&&daysBetween(d,now)>30&&!nextAppointment(x.p.id)&&!['alta','inactivo'].includes(crmKey(x.p))});const incomplete=patients.filter(p=>!histIds.has(String(p.id)));const packages=[];patients.forEach(p=>(p.packages||[]).forEach(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0),used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0);if(total&&Math.max(total-used,0)<=1&&Math.max(total-used,0)>=0)packages.push({p,remaining:Math.max(total-used,0)})}));document.getElementById('v2-alert-kpis').innerHTML=kpi('Cobros vencidos',overdue.length,'money')+kpi('Sin seguimiento',follow.length,'bell')+kpi('Historias pendientes',incomplete.length,'file')+kpi('Paquetes por terminar',packages.length,'clock');const group=(title,ico,items,render)=>`<div class="v2-panel p-4 md:p-5"><div class="flex items-center gap-2 mb-3"><span class="v2-mini-icon">${icon(ico)}</span><h3 class="v2-section-title">${title}</h3></div>${items.length?items.slice(0,12).map(render).join(''):empty('Sin alertas en esta categoría.')}</div>`;document.getElementById('v2-alert-center').innerHTML=group('Cobros pendientes','money',overdue,x=>`<div class="v2-alert-line"><div><strong>${esc(x.p.name)}</strong><span>${money(x.amount)} pendiente</span></div><button class="v2-link-btn" onclick="openPatient360('${x.p.id}')">Ver ficha</button></div>`)+group('Seguimiento clínico','bell',follow,x=>`<div class="v2-alert-line"><div><strong>${esc(x.p.name)}</strong><span>Última sesión: ${x.last?dateLabel(x.last.date):'—'}</span></div><button class="v2-link-btn" onclick="markPatientFollowUp('${x.p.id}').then(()=>renderV2Alerts())">Marcar seguimiento</button></div>`)+group('Historia clínica pendiente','file',incomplete,p=>`<div class="v2-alert-line"><div><strong>${esc(p.name)}</strong><span>Sin historia clínica registrada</span></div><button class="v2-link-btn" onclick="openClinicalHistory('${p.id}')">Completar</button></div>`)+group('Paquetes por terminar','clock',packages,x=>`<div class="v2-alert-line"><div><strong>${esc(x.p.name)}</strong><span>${x.remaining===0?'Paquete agotado':'Queda 1 sesión'}</span></div><button class="v2-link-btn" onclick="openPatient360('${x.p.id}')">Ver paquete</button></div>`)};

  window.openPatient360=function(pid){const s=getState(),p=s.patients.find(x=>String(x.id)===String(pid));if(!p)return;const apps=patientApps(pid).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.time||'').localeCompare(String(a.time||''))),completed=apps.filter(a=>a.status==='completada').length,next=nextAppointment(pid),last=lastAppointment(pid),debt=pendingForPatient(pid),hist=(s.histories||[]).find(h=>String(h.id)===String(pid)),notes=(s.notes||[]).filter(n=>String(n.patientId||n.pid||'')===String(pid));document.getElementById('p360-name').textContent=p.name||'Paciente';document.getElementById('p360-status').textContent=crmLabel(p);document.getElementById('p360-phone').textContent=p.phone||'—';document.getElementById('p360-birth').textContent=p.birth||'—';document.getElementById('p360-sessions').textContent=completed;document.getElementById('p360-debt').textContent=money(debt);document.getElementById('p360-last').textContent=last?dateLabel(last.date):'Sin sesiones';document.getElementById('p360-next').textContent=next?`${dateLabel(next.date)} · ${next.time||''}`:'Sin próxima cita';document.getElementById('p360-clinical').textContent=hist?'Historia clínica registrada':'Historia clínica pendiente';document.getElementById('p360-notes').textContent=`${notes.length} nota(s) clínica(s)`;const pkgs=p.packages||[];document.getElementById('p360-packages').innerHTML=pkgs.length?pkgs.slice().reverse().map(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0),used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0);return `<div class="v2-360-card"><div class="text-xs font-extrabold text-slate-700">${esc(pk.name||pk.label||'Paquete')}</div><div class="text-[11px] text-slate-400 mt-1">Sesiones: ${used}${total?' / '+total:''}</div></div>`}).join(''):'<div class="text-sm text-slate-400">No tiene paquetes registrados.</div>';document.getElementById('p360-timeline').innerHTML=apps.slice(0,8).map(a=>`<div class="v2-timeline-item"><div class="text-xs font-extrabold text-slate-700">${dateLabel(a.date)} · ${esc(a.time||'')}</div><div class="text-[11px] text-slate-400">${esc(statusLabel(a.status))} · ${esc(a.modality||'')} · ${money(a.cost)}</div></div>`).join('')||'<div class="text-sm text-slate-400">Sin actividad registrada.</div>';document.getElementById('p360-open-history').onclick=()=>{closePatient360();window.openPatientHistory&&window.openPatientHistory(pid)};document.getElementById('p360-open-clinical').onclick=()=>{closePatient360();window.openClinicalHistory&&window.openClinicalHistory(pid)};document.getElementById('p360-edit').onclick=()=>{closePatient360();window.editPatient&&window.editPatient(pid)};const m=document.getElementById('patient-360-modal');m.classList.remove('hidden');m.classList.add('flex')};
  window.closePatient360=function(){const m=document.getElementById('patient-360-modal');if(m){m.classList.add('hidden');m.classList.remove('flex')}};

  function syncNav(target){document.querySelectorAll('[data-v2-nav]').forEach(b=>b.classList.toggle('v2-nav-active',b.dataset.v2Nav===target))}
  const oldSwitch=window.switchTab;
  window.switchTab=function(target){const all=['inicio','citas','recepcion','pacientes','clinica','finanzas','caja','alertas'];all.forEach(t=>document.getElementById('sec-'+t)?.classList.add('hidden'));const legacy=['citas','pacientes','finanzas'];if(legacy.includes(target)&&typeof oldSwitch==='function')oldSwitch(target);else{document.getElementById('sec-'+target)?.classList.remove('hidden')}syncNav(target);if(target==='inicio')renderV2Dashboard();if(target==='recepcion')renderV2Reception();if(target==='pacientes')setTimeout(renderV2CRM,0);if(target==='clinica')renderV2Clinical();if(target==='caja')renderV2Cash();if(target==='alertas')renderV2Alerts();try{localStorage.setItem('agendaV2LastTab',target)}catch(_){}};

  document.addEventListener('DOMContentLoaded',()=>{const d=today();['v2-reception-date','v2-cash-date','finance-reference-date'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=d});syncNav('inicio');setTimeout(()=>{window.switchTab('inicio');renderV2Dashboard()},300);setInterval(()=>{const visible=['inicio','recepcion','pacientes','clinica','caja','alertas'].find(t=>!document.getElementById('sec-'+t)?.classList.contains('hidden'));if(visible==='inicio')renderV2Dashboard();if(visible==='recepcion')renderV2Reception();if(visible==='pacientes')renderV2CRM();if(visible==='clinica')renderV2Clinical();if(visible==='caja')renderV2Cash();if(visible==='alertas')renderV2Alerts()},15000)});
})();

/* v3 */
(function(){
'use strict';
const q=(id)=>document.getElementById(id), esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const S=()=>window._profileState||{appointments:[],patients:[],histories:[],notes:[]};
const limaToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=s=>s?new Date(s+'T00:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}):'—';
const ico=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
const patient=id=>S().patients.find(p=>String(p.id)===String(id));
const pName=a=>a.patientName||patient(a.patientId)?.name||'Paciente';
const patientApps=id=>S().appointments.filter(a=>String(a.patientId)===String(id)&&a.recordType!=='manual_block');
const isValidApp=a=>a&&a.recordType!=='manual_block';
const appStatus=s=>({pendiente:'Agendada',confirmada:'Confirmada',arrived:'Llegó',in_session:'En sesión',completada:'Completada',cancelada:'Cancelada',no_asistio:'No asistió'}[s]||s||'Agendada');
const statusTone=s=>({completada:'green',cancelada:'red',no_asistio:'red',confirmada:'blue',arrived:'blue',in_session:'amber'}[s]||'amber');
const ageDays=s=>s?Math.floor((new Date()-new Date(s+'T00:00:00'))/86400000):9999;
function toast(msg,type='ok'){let el=q('v3-toast');if(!el){el=document.createElement('div');el.id='v3-toast';el.style='position:fixed;right:18px;bottom:86px;z-index:120;padding:11px 14px;border-radius:12px;background:#173f39;color:white;font:700 11px Inter;box-shadow:0 15px 45px rgba(0,0,0,.2);opacity:0;transition:.2s';document.body.appendChild(el)}el.textContent=msg;el.style.background=type==='err'?'#8a3e4b':'#173f39';el.style.opacity='1';clearTimeout(window.__v3Toast);window.__v3Toast=setTimeout(()=>el.style.opacity='0',2400)}
function initials(name){return String(name||'P').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function completedCount(pid){return patientApps(pid).filter(a=>a.status==='completada').length}
function debt(pid){return patientApps(pid).filter(a=>!['cancelada','no_asistio'].includes(a.status)&&(a.paymentStatus||'pendiente')!=='pagado').reduce((n,a)=>n+window.CRMCore.remaining(a),0)}
function nextApp(pid){const t=limaToday();return patientApps(pid).filter(a=>a.date>=t&&!['cancelada','no_asistio','completada'].includes(a.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0]}
function lastApp(pid){return patientApps(pid).filter(a=>a.date&&a.status!=='cancelada').sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0]}
function clinicalNoteCount(pid){return S().notes.filter(n=>String(n.patientId||n.pid||'')===String(pid)).length}
function hasHistory(pid){return S().histories.some(h=>String(h.id||h.patientId||'')===String(pid))}

function installShell(){
  document.title='Psicología Pro V3 · Gestión Integral';
  const ver=document.querySelector('.v2-brand-title span'); if(ver) ver.textContent='V3';
  const headerActions=document.querySelector('.v2-header-inner > div:last-child');
  if(headerActions&&!q('v3-global-search')){
    const search=document.createElement('div');search.className='v3-header-search';search.innerHTML=`${ico('search')}<input id="v3-global-search" placeholder="Buscar paciente, cita, teléfono..." readonly onclick="openV3Search()"><span class="v3-kbd">Ctrl K</span>`;
    headerActions.insertBefore(search,headerActions.firstChild);
    const add=document.createElement('button');add.className='v3-quick-add';add.innerHTML=`${ico('plus')}<span>Nuevo</span>`;add.onclick=()=>openV3Quick();headerActions.insertBefore(add,search.nextSibling);
  }
  const nav=document.querySelector('.v2-sidebar>div');
  if(nav&&!q('v3-nav-sesiones')){
    const ref=[...nav.querySelectorAll('button')].find(b=>b.dataset.v2Nav==='clinica');
    const btn=(id,target,icon,label)=>{const b=document.createElement('button');b.id=id;b.dataset.v2Nav=target;b.onclick=()=>window.switchTab(target);b.className='py-3 px-3 text-sm flex items-center gap-2';b.innerHTML=`${ico(icon)}<span>${label}</span>`;return b};
    ref?.after(btn('v3-nav-sesiones','sesiones','session','Sesiones'));
    const fin=[...nav.querySelectorAll('button')].find(b=>b.dataset.v2Nav==='finanzas');
    fin?.before(btn('v3-nav-evaluaciones','evaluaciones','test','Evaluaciones'));
    fin?.before(btn('v3-nav-documentos','documentos','folder','Documentos'));
  }
}
function injectSymbols(){const svg=document.querySelector('.v2-svg-sprite');if(!svg||q('v3-symbol-marker'))return;svg.insertAdjacentHTML('beforeend',`<symbol id="i-session" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h3"/></symbol><symbol id="i-test" viewBox="0 0 24 24"><path d="M7 3h10v4H7z"/><path d="M5 5h14v16H5z"/><path d="m8 12 2 2 4-4M8 17h8"/></symbol><symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></symbol><symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></symbol><symbol id="i-command" viewBox="0 0 24 24"><path d="M9 6a3 3 0 1 1-3-3v15a3 3 0 1 1 3-3H6h12a3 3 0 1 1 3-3H6h12a3 3 0 1 1 0-6h-3v12a3 3 0 1 1-3 3V6z"/></symbol><g id="v3-symbol-marker"></g>`)}
function injectSections(){
 const main=document.querySelector('main'); if(!main)return;
 if(!q('sec-sesiones')) main.insertAdjacentHTML('beforeend',`<section id="sec-sesiones" class="space-y-5 hidden"><div class="v3-section-head"><div><span class="v3-eyebrow" style="color:#4f8e86">Práctica clínica</span><h2>Sesiones</h2><p>Convierte la cita en una unidad clínica: atención, evolución, cobro y continuidad.</p></div><div class="v3-head-actions"><button class="v3-secondary" onclick="switchTab('citas')">${ico('calendar')}Agenda</button><button class="v3-primary" onclick="openAppointmentModal()">${ico('plus')}Nueva cita</button></div></div><div id="v3-session-kpis" class="v3-kpi-grid"></div><div class="v3-card"><div class="v3-card-head"><div><h3>Registro de sesiones</h3><div class="v3-card-sub">Vista longitudinal de atenciones reales.</div></div><div class="v3-toolbar"><input id="v3-session-search" class="v3-input" placeholder="Buscar paciente..." oninput="renderV3Sessions()"><select id="v3-session-status" class="v3-select" onchange="renderV3Sessions()"><option value="all">Todos</option><option value="pendiente">Pendientes</option><option value="completada">Completadas</option><option value="no_asistio">No asistió</option><option value="cancelada">Canceladas</option></select></div></div><div id="v3-session-table"></div></div></section>`);
 if(!q('sec-evaluaciones')) main.insertAdjacentHTML('beforeend',`<section id="sec-evaluaciones" class="space-y-5 hidden"><div class="v3-section-head"><div><span class="v3-eyebrow" style="color:#4f8e86">Medición clínica</span><h2>Evaluaciones</h2><p>Registra instrumentos y evolución sin modificar las historias ya almacenadas.</p></div><div class="v3-head-actions"><button class="v3-primary" onclick="openV3EvaluationModal()">${ico('plus')}Registrar evaluación</button></div></div><div id="v3-eval-kpis" class="v3-kpi-grid"></div><div class="v3-card"><div class="v3-card-head"><div><h3>Resultados registrados</h3><div class="v3-card-sub">PHQ-9, GAD-7, PSS, DASS-21 y pruebas personalizadas.</div></div><input id="v3-eval-search" class="v3-input" placeholder="Buscar paciente..." oninput="renderV3Evaluations()"></div><div id="v3-eval-table"></div></div></section>`);
 if(!q('sec-documentos')) main.insertAdjacentHTML('beforeend',`<section id="sec-documentos" class="space-y-5 hidden"><div class="v3-section-head"><div><span class="v3-eyebrow" style="color:#4f8e86">Expediente digital</span><h2>Documentos</h2><p>Organiza enlaces a consentimientos, informes, recetas y documentos externos por paciente.</p></div><div class="v3-head-actions"><button class="v3-primary" onclick="openV3DocumentModal()">${ico('plus')}Añadir documento</button></div></div><div id="v3-doc-kpis" class="v3-kpi-grid"></div><div class="v3-card"><div class="v3-card-head"><div><h3>Repositorio por paciente</h3><div class="v3-card-sub">Metadatos compatibles guardados en la ficha actual del paciente.</div></div><input id="v3-doc-search" class="v3-input" placeholder="Buscar..." oninput="renderV3Documents()"></div><div id="v3-doc-table"></div></div></section>`);
}
function installOverlays(){if(q('v3-command-overlay'))return;document.body.insertAdjacentHTML('beforeend',`
<div id="v3-command-overlay" class="v3-overlay hidden" onclick="if(event.target===this)closeV3Search()"><div class="v3-command"><div class="v3-command-search">${ico('search')}<input id="v3-command-input" placeholder="Busca pacientes, citas o escribe una acción..." oninput="renderV3SearchResults(this.value)"><span class="v3-kbd">ESC</span></div><div id="v3-command-results" class="v3-command-body"></div></div></div>
<div id="v3-drawer-backdrop" class="v3-drawer-backdrop hidden" onclick="closeV3Patient()"></div><aside id="v3-patient-drawer" class="v3-patient-drawer hidden"><div id="v3-patient-content"></div></aside>
<div id="v3-form-overlay" class="v3-overlay hidden" onclick="if(event.target===this)closeV3Form()"><div id="v3-form-modal" class="v3-modal"></div></div>`)}

window.openV3Search=function(){q('v3-command-overlay')?.classList.remove('hidden');const i=q('v3-command-input');if(i){i.value='';setTimeout(()=>i.focus(),30)}renderV3SearchResults('')};window.closeV3Search=()=>q('v3-command-overlay')?.classList.add('hidden');
window.renderV3SearchResults=function(term=''){const root=q('v3-command-results');if(!root)return;const t=term.trim().toLowerCase();let html='<div class="v3-command-group">Acciones rápidas</div>';const actions=[['Nueva cita','Crear una cita en la agenda','calendar',"closeV3Search();openAppointmentModal()"],['Nuevo paciente','Registrar paciente','users',"closeV3Search();openPatientModal()"],['Registrar evaluación','Añadir resultado clínico','test',"closeV3Search();openV3EvaluationModal()"],['Bloquear horario','Crear rango no disponible','lock',"closeV3Search();switchTab('citas');setTimeout(()=>openHorarioModal(),100)"],['Finanzas','Abrir análisis financiero','wallet',"closeV3Search();switchTab('finanzas')"]];
 actions.filter(x=>!t||x[0].toLowerCase().includes(t)||x[1].toLowerCase().includes(t)).forEach(x=>html+=`<button class="v3-command-item" onclick="${x[3]}"><span class="ico">${ico(x[2])}</span><span><strong>${x[0]}</strong><span>${x[1]}</span></span></button>`);
 const pats=S().patients.filter(p=>!t||[p.name,p.phone,p.dni].some(v=>String(v||'').toLowerCase().includes(t))).slice(0,8);if(pats.length){html+='<div class="v3-command-group">Pacientes</div>';pats.forEach(p=>html+=`<button class="v3-command-item" onclick="closeV3Search();openV3Patient('${p.id}')"><span class="ico">${ico('users')}</span><span><strong>${esc(p.name)}</strong><span>${esc(p.phone||p.dni||'Paciente registrado')}</span></span></button>`)}
 const apps=S().appointments.filter(isValidApp).filter(a=>t&&(pName(a)+' '+(a.date||'')+' '+(a.time||'')).toLowerCase().includes(t)).slice(0,6);if(apps.length){html+='<div class="v3-command-group">Citas</div>';apps.forEach(a=>html+=`<button class="v3-command-item" onclick="closeV3Search();editAppointment('${a.id}')"><span class="ico">${ico('calendar')}</span><span><strong>${esc(pName(a))}</strong><span>${dateLabel(a.date)} · ${esc(a.time||'')} · ${appStatus(a.status)}</span></span></button>`)}root.innerHTML=html||'<div class="v3-empty">Sin resultados.</div>'};
window.openV3Quick=function(){openV3Search();setTimeout(()=>{q('v3-command-input').placeholder='Elige o busca una acción…'},20)};

function kpi(label,val,icon,trend=''){return `<div class="v3-kpi"><div class="v3-kpi-top"><span class="v3-kpi-icon">${ico(icon)}</span>${trend?`<span class="v3-kpi-trend">${esc(trend)}</span>`:''}</div><div><div class="v3-kpi-value">${esc(val)}</div><div class="v3-kpi-label">${esc(label)}</div></div></div>`}
window.renderV3Dashboard=function(){const root=q('sec-inicio');if(!root)return;const st=S(),today=limaToday(),apps=st.appointments.filter(isValidApp),todayApps=apps.filter(a=>a.date===today).sort((a,b)=>String(a.time).localeCompare(String(b.time))),month=today.slice(0,7),monthApps=apps.filter(a=>String(a.date||'').startsWith(month)&&a.status!=='cancelada');const collected=monthApps.filter(a=>a.paymentStatus==='pagado').reduce((n,a)=>n+Number(a.cost||0),0),pending=apps.filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((n,a)=>n+window.CRMCore.remaining(a),0),active=st.patients.filter(p=>!['alta','inactivo'].includes(p.leadStatus)).length,waiting=todayApps.filter(a=>['arrived','in_session'].includes(a.status)).length;
 const last7=[...Array(7)].map((_,i)=>{const d=new Date(today+'T00:00:00');d.setDate(d.getDate()-(6-i));const ds=d.toLocaleDateString('en-CA');return {d,ds,val:apps.filter(a=>a.date===ds&&a.paymentStatus==='pagado'&&a.status!=='cancelada').reduce((n,a)=>n+Number(a.cost||0),0)}}),max=Math.max(1,...last7.map(x=>x.val));
 const noFollow=st.patients.map(p=>({p,last:lastApp(p.id),next:nextApp(p.id)})).filter(x=>x.last&&ageDays(x.last.date)>30&&!x.next&&!['alta','inactivo'].includes(x.p.leadStatus)).slice(0,4),unpaid=st.patients.map(p=>({p,amount:debt(p.id)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,4);
 const nm=(window.getAgendaSpecialistFirstName?.()||'Lisbeth');root.innerHTML=`<div class="v3-shell"><div class="v3-hero"><div class="v3-hero-grid"><div><div class="v3-eyebrow">Panel de práctica clínica</div><h1>Buenos días, ${esc(nm)}</h1><p>${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}. Tienes ${todayApps.length} cita(s) y ${waiting} paciente(s) en flujo de atención.</p></div><div class="v3-hero-actions"><button class="v3-hero-btn" onclick="openAppointmentModal()">${ico('plus')}Nueva cita</button><button class="v3-hero-btn ghost" onclick="openV3Search()">${ico('search')}Buscar</button><button class="v3-hero-btn ghost" onclick="openAssistantModal()">${ico('spark')}Asistente IA</button></div></div></div>
 <div class="v3-kpi-grid">${kpi('Citas hoy',todayApps.length,'calendar')}${kpi('En flujo',waiting,'reception')}${kpi('Pacientes activos',active,'users')}${kpi('Cobrado este mes',money(collected),'money')}${kpi('Por cobrar',money(pending),'wallet')}${kpi('Historias pendientes',st.patients.filter(p=>!hasHistory(p.id)).length,'clinical')}</div>
 <div class="v3-grid-2"><div class="v3-card"><div class="v3-card-head"><div><h3>Agenda de hoy</h3><div class="v3-card-sub">Atenciones ordenadas por hora y estado.</div></div><button class="v3-link-btn" onclick="switchTab('citas')">Abrir agenda</button></div>${todayApps.length?todayApps.map(a=>`<div class="v3-agenda-row"><div class="v3-agenda-time">${esc(a.time||'--:--')}</div><div class="v3-agenda-line"></div><div><div class="v3-agenda-name">${esc(pName(a))}</div><div class="v3-agenda-meta">${esc(a.attentionType||a.type||'Sesión')} · ${esc(a.modality||'')} · ${money(a.cost)}</div></div><span class="v3-chip ${statusTone(a.status)}">${appStatus(a.status)}</span></div>`).join(''):'<div class="v3-empty">No hay citas programadas para hoy.</div>'}</div>
 <div class="v3-card"><div class="v3-card-head"><div><h3>Ingresos · últimos 7 días</h3><div class="v3-card-sub">Cobros registrados por día.</div></div><button class="v3-link-btn" onclick="switchTab('finanzas')">Ver finanzas</button></div><div class="v3-bars">${last7.map(x=>`<div class="v3-bar-wrap"><div class="v3-bar-value">${x.val?Math.round(x.val):''}</div><div class="v3-bar" style="height:${Math.max(4,(x.val/max)*100)}%"></div><div class="v3-bar-label">${x.d.toLocaleDateString('es-PE',{weekday:'short'}).slice(0,2)}</div></div>`).join('')}</div></div></div>
 <div class="v3-grid-3"><div class="v3-card"><div class="v3-card-head"><div><h3>Prioridades</h3><div class="v3-card-sub">Seguimientos que requieren acción.</div></div><button class="v3-link-btn" onclick="switchTab('alertas')">Todas</button></div>${[...unpaid.map(x=>['wallet',`${x.p.name}: pago pendiente`,money(x.amount)]),...noFollow.map(x=>['bell',`${x.p.name}: sin seguimiento`,`${ageDays(x.last.date)} días desde última atención`])].slice(0,5).map(x=>`<div class="v3-alert-row"><span class="v3-alert-ico">${ico(x[0])}</span><div><strong>${esc(x[1])}</strong><span>${esc(x[2])}</span></div></div>`).join('')||'<div class="v3-empty">No hay prioridades críticas.</div>'}</div>
 <div class="v3-card"><div class="v3-card-head"><div><h3>Continuidad clínica</h3><div class="v3-card-sub">Estado documental.</div></div></div><div class="v3-mini-stat"><strong>${st.histories.length}</strong><span>Historias registradas</span></div><div class="v3-mini-stat" style="margin-top:8px"><strong>${st.notes.length}</strong><span>Notas clínicas</span></div><button class="v3-primary" style="width:100%;justify-content:center;margin-top:10px" onclick="switchTab('clinica')">${ico('clinical')}Gestión clínica</button></div>
 <div class="v3-card"><div class="v3-card-head"><div><h3>Accesos rápidos</h3><div class="v3-card-sub">Acciones frecuentes.</div></div></div><button class="v3-secondary" style="width:100%;justify-content:flex-start;margin-bottom:7px" onclick="openPatientModal()">${ico('users')}Nuevo paciente</button><button class="v3-secondary" style="width:100%;justify-content:flex-start;margin-bottom:7px" onclick="switchTab('sesiones')">${ico('session')}Ver sesiones</button><button class="v3-secondary" style="width:100%;justify-content:flex-start" onclick="openV3EvaluationModal()">${ico('test')}Registrar evaluación</button></div></div></div>`};

window.renderV3Sessions=function(){const apps=S().appointments.filter(isValidApp),term=(q('v3-session-search')?.value||'').toLowerCase(),status=q('v3-session-status')?.value||'all';let list=apps.filter(a=>status==='all'||a.status===status).filter(a=>!term||pName(a).toLowerCase().includes(term)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));const completed=apps.filter(a=>a.status==='completada').length,inSession=apps.filter(a=>a.status==='in_session').length,waiting=apps.filter(a=>a.status==='arrived').length,noShow=apps.filter(a=>a.status==='no_asistio').length;q('v3-session-kpis').innerHTML=kpi('Completadas',completed,'check')+kpi('En sesión',inSession,'session')+kpi('En espera',waiting,'reception')+kpi('No asistió',noShow,'x');q('v3-session-table').innerHTML=list.length?`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Atención</th><th>Estado</th><th>Pago</th><th>Acciones</th></tr></thead><tbody>${list.slice(0,100).map(a=>`<tr><td>${dateLabel(a.date)}<br><small>${esc(a.time||'')}</small></td><td class="name">${esc(pName(a))}</td><td>${esc(a.attentionType||'Sesión')} · ${esc(a.modality||'')}</td><td><span class="v3-chip ${statusTone(a.status)}">${appStatus(a.status)}</span></td><td>${a.paymentStatus==='pagado'?'<span class="v3-chip green">Pagado</span>':'<span class="v3-chip amber">Pendiente</span>'}</td><td><div class="v3-table-actions"><button class="v3-icon-action" title="Paciente 360" onclick="openV3Patient('${a.patientId}')">${ico('users')}</button><button class="v3-icon-action" title="Historia clínica" onclick="openClinicalHistory('${a.patientId}')">${ico('clinical')}</button><button class="v3-icon-action" title="Editar cita" onclick="editAppointment('${a.id}')">${ico('edit')}</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="v3-empty">No hay sesiones para los filtros seleccionados.</div>'};
function allEvaluations(){return S().patients.flatMap(p=>(p.evaluations||[]).map(e=>({...e,patientId:p.id,patientName:p.name})))}
window.renderV3Evaluations=function(){const all=allEvaluations(),term=(q('v3-eval-search')?.value||'').toLowerCase(),list=all.filter(e=>!term||String(e.patientName||'').toLowerCase().includes(term)||String(e.type||'').toLowerCase().includes(term)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),types=new Set(all.map(e=>e.type)).size,patients=new Set(all.map(e=>e.patientId)).size;q('v3-eval-kpis').innerHTML=kpi('Evaluaciones',all.length,'test')+kpi('Pacientes evaluados',patients,'users')+kpi('Instrumentos',types,'file')+kpi('Este mes',all.filter(e=>String(e.date||'').startsWith(limaToday().slice(0,7))).length,'calendar');q('v3-eval-table').innerHTML=list.length?`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Instrumento</th><th>Resultado</th><th>Interpretación</th><th>Acciones</th></tr></thead><tbody>${list.map(e=>{const max=Number(e.max||100),score=Number(e.score||0),pct=Math.max(0,Math.min(100,score/max*100));return `<tr><td>${dateLabel(e.date)}</td><td class="name">${esc(e.patientName)}</td><td>${esc(e.type||'Evaluación')}</td><td><div class="v3-eval-score"><span class="v3-score-ring" style="--pct:${pct}%"><strong>${score}</strong></span><span>/ ${max}</span></div></td><td>${esc(e.interpretation||'Sin interpretación')}</td><td><button class="v3-icon-action" onclick="openV3Patient('${e.patientId}')">${ico('users')}</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="v3-empty">Todavía no hay evaluaciones registradas.</div>'};
window.openV3EvaluationModal=function(pid=''){const options=S().patients.map(p=>`<option value="${p.id}" ${String(p.id)===String(pid)?'selected':''}>${esc(p.name)}</option>`).join('');q('v3-form-modal').innerHTML=`<h3>Registrar evaluación</h3><p class="v3-card-sub">Se guarda como un campo adicional en la ficha actual del paciente; no mueve datos existentes.</p><div class="v3-form-grid"><div class="v3-field full"><label>Paciente</label><select id="v3-eval-patient">${options}</select></div><div class="v3-field"><label>Instrumento</label><select id="v3-eval-type" onchange="v3EvalPreset()"><option value="PHQ-9">PHQ-9</option><option value="GAD-7">GAD-7</option><option value="PSS-14">PSS-14</option><option value="DASS-21">DASS-21</option><option value="Rosenberg">Rosenberg</option><option value="Personalizada">Personalizada</option></select></div><div class="v3-field"><label>Fecha</label><input type="date" id="v3-eval-date" value="${limaToday()}"></div><div class="v3-field"><label>Puntaje</label><input type="number" id="v3-eval-score" min="0" value="0"></div><div class="v3-field"><label>Máximo</label><input type="number" id="v3-eval-max" min="1" value="27"></div><div class="v3-field full"><label>Interpretación / observación</label><textarea id="v3-eval-interpretation" placeholder="Ej. Moderado, seguimiento recomendado..."></textarea></div></div><div class="v3-head-actions" style="justify-content:flex-end;margin-top:15px"><button class="v3-secondary" onclick="closeV3Form()">Cancelar</button><button class="v3-primary" onclick="saveV3Evaluation()">Guardar evaluación</button></div>`;q('v3-form-overlay').classList.remove('hidden')};
window.v3EvalPreset=function(){const m={'PHQ-9':27,'GAD-7':21,'PSS-14':56,'DASS-21':63,'Rosenberg':40};const v=q('v3-eval-type')?.value;if(m[v])q('v3-eval-max').value=m[v]};
window.saveV3Evaluation=async function(){const pid=q('v3-eval-patient').value,p=patient(pid);if(!p)return;const item={id:'eval_'+Date.now(),type:q('v3-eval-type').value,date:q('v3-eval-date').value,score:Number(q('v3-eval-score').value||0),max:Number(q('v3-eval-max').value||1),interpretation:q('v3-eval-interpretation').value.trim(),createdAt:new Date().toISOString()};try{await window.updatePatientV3(pid,{evaluations:[...(p.evaluations||[]),item]});closeV3Form();toast('Evaluación registrada');setTimeout(renderV3Evaluations,400)}catch(e){toast(e.message||'No se pudo guardar','err')}};
function allDocs(){return S().patients.flatMap(p=>(p.documents||[]).map(d=>({...d,patientId:p.id,patientName:p.name})))}
window.renderV3Documents=function(){const all=allDocs(),term=(q('v3-doc-search')?.value||'').toLowerCase(),list=all.filter(d=>!term||[d.patientName,d.title,d.type].some(x=>String(x||'').toLowerCase().includes(term))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));q('v3-doc-kpis').innerHTML=kpi('Documentos',all.length,'folder')+kpi('Pacientes con archivos',new Set(all.map(d=>d.patientId)).size,'users')+kpi('Informes',all.filter(d=>String(d.type).toLowerCase().includes('informe')).length,'report')+kpi('Consentimientos',all.filter(d=>String(d.type).toLowerCase().includes('consent')).length,'file');q('v3-doc-table').innerHTML=list.length?`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Documento</th><th>Tipo</th><th>Acciones</th></tr></thead><tbody>${list.map(d=>`<tr><td>${dateLabel(d.date)}</td><td class="name">${esc(d.patientName)}</td><td>${esc(d.title)}</td><td><span class="v3-chip blue">${esc(d.type||'Documento')}</span></td><td><div class="v3-table-actions">${d.url?`<a class="v3-icon-action" target="_blank" rel="noopener" href="${esc(window.CRMCore.safeURL(d.url))}" title="Abrir">${ico('arrow')}</a>`:''}<button class="v3-icon-action" onclick="openV3Patient('${d.patientId}')">${ico('users')}</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="v3-empty">No hay documentos registrados. Puedes añadir enlaces a archivos almacenados en Drive u otro repositorio seguro.</div>'};
window.openV3DocumentModal=function(pid=''){const options=S().patients.map(p=>`<option value="${p.id}" ${String(p.id)===String(pid)?'selected':''}>${esc(p.name)}</option>`).join('');q('v3-form-modal').innerHTML=`<h3>Añadir documento</h3><p class="v3-card-sub">Registra el enlace y metadatos sin alterar la estructura actual de Firebase.</p><div class="v3-form-grid"><div class="v3-field full"><label>Paciente</label><select id="v3-doc-patient">${options}</select></div><div class="v3-field"><label>Título</label><input id="v3-doc-title" placeholder="Consentimiento informado"></div><div class="v3-field"><label>Tipo</label><select id="v3-doc-type"><option>Consentimiento</option><option>Informe psicológico</option><option>Receta</option><option>Evaluación</option><option>Otro</option></select></div><div class="v3-field"><label>Fecha</label><input type="date" id="v3-doc-date" value="${limaToday()}"></div><div class="v3-field"><label>URL segura</label><input id="v3-doc-url" placeholder="https://..."></div></div><div class="v3-head-actions" style="justify-content:flex-end;margin-top:15px"><button class="v3-secondary" onclick="closeV3Form()">Cancelar</button><button class="v3-primary" onclick="saveV3Document()">Guardar documento</button></div>`;q('v3-form-overlay').classList.remove('hidden')};
window.saveV3Document=async function(){const pid=q('v3-doc-patient').value,p=patient(pid);if(!p)return;const item={id:'doc_'+Date.now(),title:q('v3-doc-title').value.trim(),type:q('v3-doc-type').value,date:q('v3-doc-date').value,url:window.CRMCore.safeURL(q('v3-doc-url').value.trim()),createdAt:new Date().toISOString()};if(!item.title)return toast('Ingresa un título','err');if(q('v3-doc-url').value.trim()&&!item.url)return toast('Usa un enlace válido con https:// o http://','err');try{await window.updatePatientV3(pid,{documents:[...(p.documents||[]),item]});closeV3Form();toast('Documento añadido');setTimeout(renderV3Documents,400)}catch(e){toast(e.message||'No se pudo guardar','err')}};
window.closeV3Form=()=>q('v3-form-overlay')?.classList.add('hidden');

window.openV3Patient=function(pid,tab='resumen'){const p=patient(pid);if(!p)return;window.__v3Patient=pid;q('v3-drawer-backdrop').classList.remove('hidden');q('v3-patient-drawer').classList.remove('hidden');renderV3PatientTab(tab)};window.closeV3Patient=function(){q('v3-drawer-backdrop')?.classList.add('hidden');q('v3-patient-drawer')?.classList.add('hidden')};
window.renderV3PatientTab=function(tab='resumen'){const p=patient(window.__v3Patient);if(!p)return;const pid=p.id,apps=patientApps(pid).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)),evals=p.evaluations||[],docs=p.documents||[],notes=S().notes.filter(n=>String(n.patientId||n.pid||'')===String(pid)),last=lastApp(pid),next=nextApp(pid);let body='';if(tab==='resumen')body=`<div class="v3-patient-kpis"><div class="v3-mini-stat"><strong>${completedCount(pid)}</strong><span>Sesiones</span></div><div class="v3-mini-stat"><strong>${money(debt(pid))}</strong><span>Saldo</span></div><div class="v3-mini-stat"><strong>${evals.length}</strong><span>Evaluaciones</span></div><div class="v3-mini-stat"><strong>${docs.length}</strong><span>Documentos</span></div></div><div class="v3-grid-2"><div class="v3-card"><h3>Actividad reciente</h3><div class="v3-timeline" style="margin-top:14px">${apps.slice(0,8).map(a=>`<div class="v3-timeline-item"><strong>${dateLabel(a.date)} · ${esc(a.time||'')} · ${appStatus(a.status)}</strong><span>${esc(a.attentionType||'Sesión')} · ${esc(a.modality||'')} · ${money(a.cost)}</span></div>`).join('')||'<div class="v3-empty">Sin actividad.</div>'}</div></div><div class="v3-card"><h3>Resumen clínico-administrativo</h3><div class="v3-alert-row"><span class="v3-alert-ico">${ico('calendar')}</span><div><strong>Próxima cita</strong><span>${next?dateLabel(next.date)+' · '+(next.time||''):'Sin próxima cita'}</span></div></div><div class="v3-alert-row"><span class="v3-alert-ico">${ico('clinical')}</span><div><strong>Historia clínica</strong><span>${hasHistory(pid)?'Registrada':'Pendiente'}</span></div></div><div class="v3-alert-row"><span class="v3-alert-ico">${ico('file')}</span><div><strong>Notas clínicas</strong><span>${notes.length} registro(s)</span></div></div></div></div>`;
 if(tab==='sesiones')body=`<div class="v3-card"><div class="v3-card-head"><h3>Sesiones y citas</h3><button class="v3-primary" onclick="closeV3Patient();openAppointmentModal()">${ico('plus')}Nueva cita</button></div>${apps.length?apps.map(a=>`<div class="v3-agenda-row"><div class="v3-agenda-time">${dateLabel(a.date)}</div><div class="v3-agenda-line"></div><div><div class="v3-agenda-name">${esc(a.time||'')} · ${appStatus(a.status)}</div><div class="v3-agenda-meta">${esc(a.modality||'')} · ${money(a.cost)}</div></div><button class="v3-icon-action" onclick="editAppointment('${a.id}')">${ico('edit')}</button></div>`).join(''):'<div class="v3-empty">Sin sesiones.</div>'}</div>`;
 if(tab==='clinica')body=`<div class="v3-card"><div class="v3-card-head"><div><h3>Gestión clínica</h3><div class="v3-card-sub">Historia y evolución existente.</div></div><button class="v3-primary" onclick="openClinicalHistory('${pid}')">${ico('clinical')}Abrir historia</button></div><div class="v3-patient-kpis"><div class="v3-mini-stat"><strong>${hasHistory(pid)?'Sí':'No'}</strong><span>Historia clínica</span></div><div class="v3-mini-stat"><strong>${notes.length}</strong><span>Notas</span></div><div class="v3-mini-stat"><strong>${last?dateLabel(last.date):'—'}</strong><span>Última sesión</span></div><div class="v3-mini-stat"><strong>${p.leadStatus||'nuevo'}</strong><span>Estado CRM</span></div></div></div>`;
 if(tab==='evaluaciones')body=`<div class="v3-card"><div class="v3-card-head"><h3>Evaluaciones</h3><button class="v3-primary" onclick="openV3EvaluationModal('${pid}')">${ico('plus')}Registrar</button></div>${evals.length?evals.slice().reverse().map(e=>`<div class="v3-alert-row"><span class="v3-alert-ico">${ico('test')}</span><div><strong>${esc(e.type)} · ${e.score}/${e.max}</strong><span>${dateLabel(e.date)} · ${esc(e.interpretation||'Sin interpretación')}</span></div></div>`).join(''):'<div class="v3-empty">Sin evaluaciones registradas.</div>'}</div>`;
 if(tab==='documentos')body=`<div class="v3-card"><div class="v3-card-head"><h3>Documentos</h3><button class="v3-primary" onclick="openV3DocumentModal('${pid}')">${ico('plus')}Añadir</button></div>${docs.length?docs.slice().reverse().map(d=>`<div class="v3-alert-row"><span class="v3-alert-ico">${ico('folder')}</span><div style="flex:1"><strong>${esc(d.title)}</strong><span>${esc(d.type||'Documento')} · ${dateLabel(d.date)}</span></div>${d.url?`<a class="v3-icon-action" target="_blank" rel="noopener" href="${esc(window.CRMCore.safeURL(d.url))}">${ico('arrow')}</a>`:''}</div>`).join(''):'<div class="v3-empty">Sin documentos registrados.</div>'}</div>`;
 if(tab==='finanzas')body=`<div class="v3-card"><h3>Estado financiero del paciente</h3><div class="v3-patient-kpis" style="margin-top:12px"><div class="v3-mini-stat"><strong>${money(apps.filter(a=>a.paymentStatus==='pagado').reduce((n,a)=>n+Number(a.cost||0),0))}</strong><span>Pagado</span></div><div class="v3-mini-stat"><strong>${money(debt(pid))}</strong><span>Pendiente</span></div><div class="v3-mini-stat"><strong>${apps.filter(a=>a.paymentStatus==='pagado').length}</strong><span>Operaciones</span></div><div class="v3-mini-stat"><strong>${(p.packages||[]).length}</strong><span>Paquetes</span></div></div></div>`;
 q('v3-patient-content').innerHTML=`<div class="v3-drawer-head"><div class="v3-drawer-top"><div style="display:flex;gap:12px;align-items:center"><div class="v3-avatar">${initials(p.name)}</div><div><h2>${esc(p.name||'Paciente')}</h2><p>${esc(p.phone||'Sin teléfono')} · ${esc(p.dni||'Sin DNI')} · ${esc(p.leadStatus||'nuevo')}</p></div></div><button class="v3-hero-btn ghost" style="width:36px;padding:0;justify-content:center" onclick="closeV3Patient()">${ico('x')}</button></div><div class="v3-drawer-tabs">${[['resumen','Resumen'],['sesiones','Sesiones'],['clinica','Clínica'],['evaluaciones','Evaluaciones'],['documentos','Documentos'],['finanzas','Finanzas']].map(x=>`<button class="${tab===x[0]?'active':''}" onclick="renderV3PatientTab('${x[0]}')">${x[1]}</button>`).join('')}</div></div><div class="v3-drawer-body">${body}<div class="v3-head-actions" style="margin-top:12px"><button class="v3-secondary" onclick="closeV3Patient();editPatient('${pid}')">${ico('edit')}Editar datos</button><button class="v3-secondary" onclick="closeV3Patient();openPatientHistory('${pid}')">${ico('calendar')}Historial</button></div></div>`};

function financeRange(){const st=S(),ref=st.financeReferenceDate||limaToday(),period=st.financePeriod||'todo';if(period==='todo')return [null,null];if(period==='personalizado')return [st.financeCustomStart,st.financeCustomEnd];const d=new Date(ref+'T00:00:00');if(period==='dia')return [ref,ref];if(period==='semana'){const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const a=d.toLocaleDateString('en-CA');d.setDate(d.getDate()+6);return[a,d.toLocaleDateString('en-CA')]}if(period==='mes'){const y=d.getFullYear(),m=d.getMonth();return[new Date(y,m,1).toLocaleDateString('en-CA'),new Date(y,m+1,0).toLocaleDateString('en-CA')]}return[null,null]}
function renderV3FinanceInsights(){if(window.renderCRMFinanceInsights){const [start,end]=financeRange();return window.renderCRMFinanceInsights(start,end);}const sec=q('sec-finanzas');if(!sec)return;let root=q('v3-finance-insights-root');if(!root){root=document.createElement('div');root.id='v3-finance-insights-root';sec.insertBefore(root,sec.children[1]||null)}const [from,to]=financeRange();let apps=S().appointments.filter(isValidApp).filter(a=>a.status!=='cancelada'&&(!from||a.date>=from)&&(!to||a.date<=to));const paid=apps.filter(a=>a.paymentStatus==='pagado'),collected=paid.reduce((n,a)=>n+Number(a.cost||0),0),projected=apps.filter(a=>!['cancelada','no_asistio'].includes(a.status)).reduce((n,a)=>n+Number(a.cost||0),0),pending=apps.filter(a=>a.paymentStatus!=='pagado'&&!['cancelada','no_asistio'].includes(a.status)).reduce((n,a)=>n+window.CRMCore.remaining(a),0);const byMethod={};paid.forEach(a=>{const m=a.paymentMethod||a.payMethod||'Sin especificar';byMethod[m]=(byMethod[m]||0)+Number(a.cost||0)});const total=Math.max(1,Object.values(byMethod).reduce((a,b)=>a+b,0));const buckets={};apps.forEach(a=>{const k=(a.date||'').slice(5);if(k)buckets[k]=(buckets[k]||0)+(a.paymentStatus==='pagado'?Number(a.cost||0):0)});const entries=Object.entries(buckets).sort().slice(-12),max=Math.max(1,...entries.map(x=>x[1]));root.innerHTML=`<div class="v3-finance-insights"><div class="v3-card"><div class="v3-card-head"><div><h3>Rendimiento del periodo</h3><div class="v3-card-sub">Cobrado ${money(collected)} · Pendiente ${money(pending)} · Proyectado ${money(projected)}</div></div></div><div class="v3-bars">${entries.length?entries.map(([d,v])=>`<div class="v3-bar-wrap"><div class="v3-bar-value">${v?Math.round(v):''}</div><div class="v3-bar" style="height:${Math.max(4,v/max*100)}%"></div><div class="v3-bar-label">${esc(d)}</div></div>`).join(''):'<div class="v3-empty">Sin movimientos en el periodo.</div>'}</div></div><div class="v3-card"><div class="v3-card-head"><div><h3>Métodos de pago</h3><div class="v3-card-sub">Distribución de cobros.</div></div></div><div class="v3-pay-methods">${Object.entries(byMethod).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<div class="v3-method-row"><span>${esc(m)}</span><div class="v3-method-track"><div class="v3-method-fill" style="width:${v/total*100}%"></div></div><strong>${Math.round(v/total*100)}%</strong></div>`).join('')||'<div class="v3-empty">Sin cobros registrados.</div>'}</div></div></div>`}

const oldOpen360=window.openPatient360;window.openPatient360=function(pid){openV3Patient(pid)};
function installRouter(){const old=window.switchTab;window.__v3OldSwitch=old;window.switchTab=function(target){const extra=['sesiones','evaluaciones','documentos'];if(extra.includes(target)){document.querySelectorAll('main>section[id^="sec-"]').forEach(s=>s.classList.add('hidden'));q('sec-'+target)?.classList.remove('hidden');document.querySelectorAll('[data-v2-nav]').forEach(b=>b.classList.toggle('v2-nav-active',b.dataset.v2Nav===target));if(target==='sesiones')renderV3Sessions();if(target==='evaluaciones')renderV3Evaluations();if(target==='documentos')renderV3Documents();try{localStorage.setItem('agendaV3LastTab',target)}catch(_){}return}old?.(target);if(target==='inicio')setTimeout(renderV3Dashboard,10);if(target==='finanzas')setTimeout(renderV3FinanceInsights,30);};const oldFin=window.setFinancePeriod;if(oldFin)window.setFinancePeriod=function(...args){const r=oldFin.apply(this,args);setTimeout(renderV3FinanceInsights,30);return r}}
function bindKeys(){document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openV3Search()}if(e.key==='Escape'){closeV3Search();closeV3Form();closeV3Patient()}})}
function refreshVisible(){if(!q('app-container')||q('app-container').classList.contains('hidden'))return;const vis=[...document.querySelectorAll('main>section[id^="sec-"]')].find(x=>!x.classList.contains('hidden'))?.id?.replace('sec-','');if(vis==='inicio')renderV3Dashboard();if(vis==='sesiones')renderV3Sessions();if(vis==='evaluaciones')renderV3Evaluations();if(vis==='documentos')renderV3Documents();if(vis==='finanzas')renderV3FinanceInsights()}
function boot(){injectSymbols();installShell();injectSections();installOverlays();installRouter();bindKeys();setTimeout(()=>{if(!q('app-container')?.classList.contains('hidden'))renderV3Dashboard()},600);setInterval(refreshVisible,12000)}
document.addEventListener('DOMContentLoaded',boot);
})();

/* v3.2 */
(function(){
'use strict';
const st=()=>window._profileState||{appointments:[],patients:[],histories:[],notes:[]};
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const icon=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=s=>{if(!s)return '—';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'})};
const finalStatuses=['completada','no_asistio','cancelada'];
const isPending=s=>!finalStatuses.includes(s);
const patient=id=>st().patients.find(p=>String(p.id)===String(id));
const pname=a=>a.patientName||patient(a.patientId)?.name||'Paciente';
const pages={crm:1,clinical:1,sessions:1,history:1,alert_overdue:1,alert_follow:1,alert_incomplete:1,alert_packages:1};
const sizes={crm:10,clinical:10,sessions:10,history:10};
function toast(msg,error=false){document.querySelector('.v32-toast')?.remove();const el=document.createElement('div');el.className='v32-toast'+(error?' error':'');el.innerHTML=`${icon(error?'x':'check')}<span>${esc(msg)}</span>`;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
window.v32Toast=toast;
function pager(key,total,onRender){const size=sizes[key]||10,totalPages=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(Math.max(1,pages[key]||1),totalPages);const p=pages[key],start=total?((p-1)*size+1):0,end=Math.min(total,p*size);let nums=[];for(let i=Math.max(1,p-2);i<=Math.min(totalPages,p+2);i++)nums.push(i);return `<div class="v32-pager"><div class="v32-pager-info">${start}-${end} de ${total} registros</div><div class="v32-pager-actions"><select class="v32-page-size" onchange="v32SetSize('${key}',this.value,'${onRender}')"><option ${size===10?'selected':''}>10</option><option ${size===20?'selected':''}>20</option><option ${size===50?'selected':''}>50</option></select><button class="v32-page-btn" ${p<=1?'disabled':''} onclick="v32GoPage('${key}',${p-1},'${onRender}')">‹</button>${nums.map(n=>`<button class="v32-page-btn ${n===p?'active':''}" onclick="v32GoPage('${key}',${n},'${onRender}')">${n}</button>`).join('')}<button class="v32-page-btn" ${p>=totalPages?'disabled':''} onclick="v32GoPage('${key}',${p+1},'${onRender}')">›</button></div></div>`}
window.v32GoPage=function(key,p,fn){pages[key]=Math.max(1,p);window[fn]?.()};
window.v32SetSize=function(key,v,fn){sizes[key]=Number(v)||10;pages[key]=1;window[fn]?.()};
function paginateRows(root,key,fn){const table=root?.querySelector('table');if(!table)return;const rows=[...table.querySelectorAll('tbody tr')],size=sizes[key]||10,total=rows.length,totalPages=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(pages[key]||1,totalPages);const p=pages[key];rows.forEach((r,i)=>r.style.display=(i>=(p-1)*size&&i<p*size)?'':'none');root.querySelector('.v32-pager')?.remove();root.insertAdjacentHTML('beforeend',pager(key,total,fn));}

/* CRM y clínica: conserva lógica existente, añade paginación */
const oldCRM=window.renderV2CRM; if(typeof oldCRM==='function') window.renderV2CRM=function(){oldCRM();paginateRows(document.getElementById('v2-crm-table'),'crm','renderV2CRM')};
const oldClinical=window.renderV2Clinical; if(typeof oldClinical==='function') window.renderV2Clinical=function(){oldClinical();paginateRows(document.getElementById('v2-clinical-table'),'clinical','renderV2Clinical')};

/* Sesiones: estados simplificados + KPIs solicitados + paginación */
window.renderV3Sessions=function(){
 const apps=(st().appointments||[]).filter(a=>!a.isManualBlock),term=(document.getElementById('v3-session-search')?.value||'').toLowerCase(),filter=document.getElementById('v3-session-status')?.value||'all';
 let list=apps.filter(a=>{if(filter==='all')return true;if(filter==='pendiente')return isPending(a.status);return a.status===filter}).filter(a=>!term||pname(a).toLowerCase().includes(term)).sort((a,b)=>String((b.date||'')+(b.time||'')).localeCompare(String((a.date||'')+(a.time||''))));
 const counts={completada:apps.filter(a=>a.status==='completada').length,no_asistio:apps.filter(a=>a.status==='no_asistio').length,cancelada:apps.filter(a=>a.status==='cancelada').length,pendiente:apps.filter(a=>isPending(a.status)).length};
 const kp=document.getElementById('v3-session-kpis');if(kp){kp.className='v32-kpi-grid';kp.innerHTML=[['Completadas',counts.completada,'check'],['No asistió',counts.no_asistio,'x'],['Canceladas',counts.cancelada,'trash'],['Pendientes',counts.pendiente,'clock']].map(x=>`<div class="v32-kpi"><div class="v32-kpi-ico">${icon(x[2])}</div><div><strong>${x[1]}</strong><span>${x[0]}</span></div></div>`).join('')}
 const size=sizes.sessions||10,total=list.length,totalPages=Math.max(1,Math.ceil(total/size));pages.sessions=Math.min(pages.sessions||1,totalPages);const slice=list.slice((pages.sessions-1)*size,pages.sessions*size),root=document.getElementById('v3-session-table');if(!root)return;
 root.innerHTML=slice.length?`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Atención</th><th>Estado</th><th>Pago</th><th>Acciones</th></tr></thead><tbody>${slice.map(a=>`<tr><td>${dateLabel(a.date)}<br><small>${esc(a.time||'')}</small></td><td class="name">${esc(pname(a))}</td><td>${esc(a.attentionType||'Sesión')} · ${esc(a.modality||'')}</td><td><span class="v3-chip ${a.status==='completada'?'green':a.status==='cancelada'||a.status==='no_asistio'?'red':'amber'}">${a.status==='completada'?'Completada':a.status==='cancelada'?'Cancelada':a.status==='no_asistio'?'No asistió':'Pendiente'}</span></td><td>${a.paymentStatus==='pagado'?'<span class="v3-chip green">Pagado</span>':'<span class="v3-chip amber">Pendiente</span>'}</td><td><div class="v3-table-actions"><button class="v3-icon-action" title="Paciente" onclick="openV3Patient('${a.patientId}')">${icon('users')}</button><button class="v3-icon-action" title="Historia clínica" onclick="openClinicalHistory('${a.patientId}')">${icon('clinical')}</button><button class="v3-icon-action" title="Editar cita" onclick="editAppointment('${a.id}')">${icon('edit')}</button></div></td></tr>`).join('')}</tbody></table></div>${pager('sessions',total,'renderV3Sessions')}`:'<div class="v3-empty">No hay sesiones para los filtros seleccionados.</div>';
};

/* Alertas por bloques, 10 por página. Seguimiento deja de reaparecer una vez marcado. */
function days(a,b){return Math.floor((b-a)/86400000)}
function appByPatient(pid){return(st().appointments||[]).filter(a=>String(a.patientId)===String(pid)&&!a.isManualBlock)}
function lastApp(pid){return appByPatient(pid).filter(a=>a.status!=='cancelada').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]}
function nextApp(pid){const t=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});return appByPatient(pid).filter(a=>String(a.date||'')>=t&&!['cancelada','no_asistio'].includes(a.status)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0]}
function alertGroup(key,title,items,row){const size=10,total=items.length,tp=Math.max(1,Math.ceil(total/size));pages[key]=Math.min(pages[key]||1,tp);const p=pages[key],slice=items.slice((p-1)*size,p*size);return `<div class="v32-alert-card"><div class="v32-alert-head"><h3>${esc(title)}</h3><span class="v32-alert-count">${total}</span></div>${slice.length?slice.map(row).join(''):'<div class="v3-empty">Sin alertas en esta categoría.</div>'}${total>size?`<div class="v32-pager"><div class="v32-pager-info">${(p-1)*size+1}-${Math.min(total,p*size)} de ${total}</div><div class="v32-pager-actions"><button class="v32-page-btn" ${p<=1?'disabled':''} onclick="v32AlertPage('${key}',${p-1})">‹</button><button class="v32-page-btn active">${p}/${tp}</button><button class="v32-page-btn" ${p>=tp?'disabled':''} onclick="v32AlertPage('${key}',${p+1})">›</button></div></div>`:''}</div>`}
window.v32AlertPage=(key,p)=>{pages[key]=Math.max(1,p);renderV2Alerts()};
window.renderV2Alerts=function(){
 const s=st(),patients=s.patients||[],now=new Date(),histIds=new Set((s.histories||[]).map(h=>String(h.id)));
 const overdue=patients.map(p=>({p,amount:appByPatient(p.id).filter(a=>a.status==='completada'&&a.paymentStatus!=='pagado').reduce((n,a)=>n+Number(a.cost||0),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const follow=patients.map(p=>({p,last:lastApp(p.id)})).filter(x=>{const d=x.last&&new Date(x.last.date+'T00:00:00');return d&&days(d,now)>30&&!nextApp(x.p.id)&&!['alta','inactivo','seguimiento'].includes(x.p.leadStatus||'nuevo')});
 const incomplete=patients.filter(p=>!histIds.has(String(p.id)));const packages=[];patients.forEach(p=>(p.packages||[]).forEach(pk=>{const total=Number(pk.sessionsTotal||pk.sessions||pk.totalSessions||pk.total||0),used=Number(pk.sessionsUsed||pk.usedSessions||pk.used||0),r=Math.max(total-used,0);if(total&&r<=1)packages.push({p,remaining:r})}));
 const k=document.getElementById('v2-alert-kpis');if(k)k.innerHTML=`<div class="v32-kpi-grid" style="grid-column:1/-1"><div class="v32-kpi"><div class="v32-kpi-ico">${icon('money')}</div><div><strong>${overdue.length}</strong><span>Cobros pendientes</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('bell')}</div><div><strong>${follow.length}</strong><span>Sin seguimiento</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('file')}</div><div><strong>${incomplete.length}</strong><span>Historias pendientes</span></div></div><div class="v32-kpi"><div class="v32-kpi-ico">${icon('clock')}</div><div><strong>${packages.length}</strong><span>Paquetes por terminar</span></div></div></div>`;
 const root=document.getElementById('v2-alert-center');if(!root)return;root.innerHTML=
 alertGroup('alert_overdue','Cobros pendientes',overdue,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>${money(x.amount)} pendiente</span></div><button class="v32-follow-btn" onclick="openPatient360('${x.p.id}')">Ver ficha</button></div>`)+
 alertGroup('alert_follow','Seguimiento clínico',follow,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>Última sesión: ${x.last?dateLabel(x.last.date):'—'}</span></div><button class="v32-follow-btn" onclick="v32MarkFollow('${x.p.id}')">Marcar seguimiento</button></div>`)+
 alertGroup('alert_incomplete','Historia clínica pendiente',incomplete,p=>`<div class="v32-alert-row"><div><strong>${esc(p.name)}</strong><span>Sin historia clínica registrada</span></div><button class="v32-follow-btn" onclick="openClinicalHistory('${p.id}')">Completar</button></div>`)+
 alertGroup('alert_packages','Paquetes por terminar',packages,x=>`<div class="v32-alert-row"><div><strong>${esc(x.p.name)}</strong><span>${x.remaining===0?'Paquete agotado':'Queda 1 sesión'}</span></div><button class="v32-follow-btn" onclick="openPatient360('${x.p.id}')">Ver paquete</button></div>`);
};
window.v32MarkFollow=async function(pid){try{if(typeof window.markPatientFollowUp!=='function')throw new Error('Función no disponible');await window.markPatientFollowUp(pid);const p=patient(pid);if(p){p.leadStatus='seguimiento';p.followUpAt=new Date().toISOString()}toast('Paciente marcado para seguimiento');renderV2Alerts();window.renderV2CRM?.()}catch(e){console.error(e);toast('No se pudo marcar el seguimiento',true)}};

/* Historial: paginar citas antiguas sin alterar datos */
function applyHistoryPagination(){const list=document.getElementById('hist-appointments-list');if(!list)return;const rows=[...list.children].filter(x=>!x.classList.contains('v32-pager'));if(!rows.length)return;const size=sizes.history||10,total=rows.length,tp=Math.max(1,Math.ceil(total/size));pages.history=Math.min(pages.history||1,tp);const p=pages.history;rows.forEach((r,i)=>r.style.display=(i>=(p-1)*size&&i<p*size)?'':'none');list.querySelector('.v32-pager')?.remove();list.insertAdjacentHTML('beforeend',pager('history',total,'v32RefreshHistory'))}
window.v32RefreshHistory=function(){applyHistoryPagination()};
function wrapHistory(){if(typeof window.openPatientHistory!=='function'||window.openPatientHistory.__v32)return false;const old=window.openPatientHistory;const wrapped=function(pid){pages.history=1;old(pid);setTimeout(applyHistoryPagination,0)};wrapped.__v32=true;window.openPatientHistory=wrapped;return true}
let tries=0;const timer=setInterval(()=>{if(wrapHistory()||++tries>30)clearInterval(timer)},200);

/* Normaliza visualmente etiquetas antiguas al abrir modales */
document.addEventListener('DOMContentLoaded',()=>{
 const sel=document.getElementById('v3-session-status');if(sel)sel.innerHTML='<option value="all">Todos</option><option value="pendiente">Pendientes</option><option value="completada">Completadas</option><option value="no_asistio">No asistió</option><option value="cancelada">Canceladas</option>';
 const title=document.querySelector('#profile-modal h3');if(title)title.textContent='Mi cuenta';
 const p1=document.getElementById('ptab-perfil'),p2=document.getElementById('ptab-clave');if(p1)p1.textContent='Editar perfil';if(p2)p2.textContent='Cambiar clave';
});
})();

/* v3.3 */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
const clean=t=>String(t||'').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu,'').replace(/\s+/g,' ').trim();

function iconTitle(el,name,text){
  if(!el||el.dataset.v33done==='1') return;
  el.dataset.v33done='1';
  el.innerHTML=`<span class="v33-modal-title-icon">${svg(name)}</span><span>${text||clean(el.textContent)}</span>`;
}

function addHint(target,text){
  if(!target||target.querySelector('.v33-modal-hint')) return;
  const p=document.createElement('p');
  p.className='v33-modal-hint';
  p.textContent=text;
  target.appendChild(p);
}

function stripOptionEmoji(){
  qa('#app-rate-type option,#pat-currency option,#pat-origen option,#pat-canal option').forEach(o=>o.textContent=clean(o.textContent));
  qa('#appointment-form label,#patient-form label').forEach(el=>{ if(el.childElementCount===0) el.textContent=clean(el.textContent); });
}

function enhanceModals(){
  iconTitle(q('#app-modal-title'),'calendar','Programar cita');
  addHint(q('#app-modal-title')?.parentElement,'Agenda clínica, modalidad y cobro en una sola ficha.');
  iconTitle(q('#patient-modal-title'),'users','Registrar paciente');
  addHint(q('#patient-modal-title')?.parentElement,'Datos generales, procedencia y seguimiento comercial-clínico.');
  iconTitle(q('#profile-modal h3'),'edit','Mi cuenta');
  iconTitle(q('#assistant-modal h3'),'clinical','Asistente personal');

  const histTitle=q('#patient-history-modal h3');
  if(histTitle && !histTitle.dataset.v33done){
    histTitle.dataset.v33done='1';
    histTitle.classList.add('v33-history-top');
  }

  const appSave=q('#appointment-form button[type="submit"]');
  if(appSave && !appSave.dataset.v33done){appSave.dataset.v33done='1'; appSave.innerHTML=`${svg('check')}<span>Guardar cita</span>`; appSave.classList.add('flex','items-center','justify-center','gap-2');}
  const patSave=q('#patient-form button[type="submit"]');
  if(patSave && !patSave.dataset.v33done){patSave.dataset.v33done='1'; patSave.innerHTML=`${svg('check')}<span>Guardar paciente</span>`; patSave.classList.add('flex','items-center','justify-center','gap-2');}
  const appNew=q('#appointment-form button[onclick="switchToNewPatientFromAppoint()"]');
  if(appNew && !appNew.dataset.v33done){appNew.dataset.v33done='1'; appNew.innerHTML=`${svg('plus')} <span>Nuevo</span>`; appNew.classList.add('inline-flex','items-center','gap-1');}
  const appCancel=q('#appointment-form button[onclick="closeAppointmentModal()"]');
  if(appCancel) appCancel.textContent='Cancelar';
  const patCancel=q('#patient-form button[onclick="closePatientModal()"]');
  if(patCancel) patCancel.textContent='Cancelar';
  const ptab=q('#ptab-perfil'); if(ptab) ptab.innerHTML=`${svg('edit')} <span>Perfil</span>`;
  const pkey=q('#ptab-clave'); if(pkey) pkey.innerHTML=`${svg('lock')} <span>Seguridad</span>`;
  stripOptionEmoji();
}

function enhanceFinance(){
  const sec=q('#sec-finanzas');
  if(!sec) return;
  sec.classList.add('v33-finance');

  const head=q('.v23-finance-toolbar-head h2',sec);
  if(head && !head.dataset.v33done){
    head.dataset.v33done='1';
    head.classList.add('v33-fin-title');
    head.innerHTML=`<span class="v33-fin-ico">${svg('wallet')}</span><span>Finanzas del consultorio</span>`;
  }
  const eyebrow=q('.v23-finance-toolbar-head .v2-eyebrow',sec);
  if(eyebrow) eyebrow.textContent='Panel financiero';
  const excel=[...qa('.v23-toolbar-actions button',sec)].find(b=>/excel/i.test(b.textContent||''));
  if(excel) excel.innerHTML=`${svg('download')} <span>Exportar Excel</span>`;
  const report=[...qa('.v23-toolbar-actions button',sec)].find(b=>/reporte/i.test(b.textContent||''));
  if(report) report.innerHTML=`${svg('report')} <span>Generar reporte</span>`;
  const summaryLabel=q('#finance-period-summary-label',sec);
  if(summaryLabel){summaryLabel.className='v33-soft-note'; summaryLabel.innerHTML=`${svg('calendar')} <span>Los indicadores responden al filtro superior</span>`;}

  const metricCards=qa(':scope > div.bg-white:first-of-type .grid > div',sec);
  const metricMeta=[
    ['money','Monto total facturado','neutral'],
    ['wallet','Cobrado en caja','success'],
    ['report','Pendiente de cobro','warn'],
    ['check','Tasa de cobranza','info']
  ];
  metricCards.slice(0,4).forEach((card,i)=>{
    card.classList.add('v33-metric-card');
    card.dataset.tone=metricMeta[i][2];
    const title=card.querySelector('span');
    if(title && !card.dataset.v33done){
      card.dataset.v33done='1';
      title.classList.add('v33-card-headline');
      title.innerHTML=`<span class="v33-minibadge">${svg(metricMeta[i][0])}</span><strong>${metricMeta[i][1]}</strong>`;
    }
  });

  const blockIcons=['money','users','report','calendar','check','clock','wallet','folder'];
  qa('section#sec-finanzas > .bg-white h3, section#sec-finanzas > .grid .bg-white h3').forEach((h3,idx)=>{
    if(h3.dataset.v33done==='1') return;
    h3.dataset.v33done='1';
    const txt=clean(h3.textContent);
    h3.classList.add('v33-block-title');
    h3.innerHTML=`<span class="v33-fin-ico">${svg(blockIcons[idx]||'report')}</span><span>${txt}</span>`;
  });
}

function enhanceDocuments(){
  const sec=q('#sec-documentos');
  if(!sec) return;
  const eyebrow=q('.v3-eyebrow',sec); if(eyebrow) eyebrow.classList.add('v33-hidden');
  const desc=q('.v3-section-head p',sec); if(desc) desc.textContent='Centraliza por paciente enlaces a consentimientos, informes, recetas y otros archivos de apoyo.';
  qa('p').forEach(p=>{
    if(!sec.contains(p) && /consentimientos, informes, recetas/i.test(p.textContent||'')) p.remove();
    if(!sec.contains(p) && /expediente digital/i.test(p.textContent||'')) p.remove();
  });
}

function enhanceReports(){
  const title=q('#print-modal .v31-report-modal-head h3');
  if(title && !title.dataset.v33done){
    title.dataset.v33done='1';
    title.textContent='Centro de reportes';
  }
  const subtitle=q('#print-modal .v31-report-modal-head p');
  if(subtitle) subtitle.textContent='Genera reportes con una presentación unificada para agenda, finanzas y recepción.';
  const cats=[['btn-pc-citas','calendar','Agenda'],['btn-pc-finanzas','wallet','Finanzas'],['btn-pc-recepcion','reception','Recepción']];
  cats.forEach(([id,ico,txt])=>{const b=q('#'+id); if(b && !b.dataset.v33done){b.dataset.v33done='1'; b.innerHTML=`${svg(ico)}<span>${txt}</span>`;}})
  const printBtn=[...qa('#print-modal .v31-report-actions .v31-btn')].find(b=>/vista|impresión/i.test(b.textContent||''));
  if(printBtn && !printBtn.dataset.v33done){printBtn.dataset.v33done='1'; printBtn.innerHTML=`${svg('printer')}<span>Vista de impresión</span>`;}
}

function enhanceMisc(){
  const aiNav=[...qa('button[data-v2-nav] span, .v2-sidebar button span')].find(el=>clean(el.textContent)==='Asistente IA');
  if(aiNav) aiNav.textContent='Asistente';
  qa('#patient-form .text-amber-600, #patient-form .text-indigo-500').forEach(el=>el.textContent=clean(el.textContent));
}

function init(){
  enhanceModals();
  enhanceFinance();
  enhanceDocuments();
  enhanceReports();
  enhanceMisc();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{init(); setTimeout(init,300); setTimeout(init,1200);});
else {init(); setTimeout(init,300); setTimeout(init,1200);} 

// V3.4: se elimina el observador global para evitar ciclos de renderizado.
})();

/* v3.5 */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const ico=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;

function buildPageHeads(){
  const patients=q('#sec-pacientes');
  if(patients && !q('.v35-page-head',patients)){
    patients.insertAdjacentHTML('afterbegin',`<div class="v35-page-head"><div class="v35-page-head-left"><span class="v35-page-icon">${ico('users')}</span><div><span class="v35-eyebrow">Pacientes</span><h2>CRM clínico</h2><p>Un único listado para buscar, segmentar y abrir la ficha 360 de cada paciente.</p></div></div><button class="v35-primary" onclick="openPatientModal()">${ico('plus')}<span>Nuevo paciente</span></button></div>`);
  }
  if(patients){
    const children=[...patients.children];
    children.forEach((el,i)=>{
      if(i===0) return; // page head inserted
      if(el.classList.contains('v2-panel')) return; // keep CRM panel
      el.classList.add('v35-legacy-hidden');
    });
  }

  const alerts=q('#sec-alertas');
  if(alerts && !q('.v35-page-head',alerts)){
    alerts.insertAdjacentHTML('afterbegin',`<div class="v35-page-head"><div class="v35-page-head-left"><span class="v35-page-icon">${ico('bell')}</span><div><span class="v35-eyebrow">Seguimiento</span><h2>Centro de alertas</h2><p>Solo incidencias que requieren acción: cobros, seguimiento, historias pendientes y paquetes por terminar.</p></div></div><button class="v35-primary" onclick="renderV2Alerts()">${ico('bell')}<span>Actualizar</span></button></div>`);
  }
}

function isolateModules(){
  if(window.__v35RouterInstalled) return;
  const old=window.switchTab;
  if(typeof old!=='function') return;
  window.__v35RouterInstalled=true;
  window.switchTab=function(target){
    qa('main>section[id^="sec-"]').forEach(s=>s.classList.add('hidden'));
    const result=old.apply(this,arguments);
    // hard isolation after legacy routers execute
    setTimeout(()=>{
      qa('main>section[id^="sec-"]').forEach(s=>{
        if(s.id!==`sec-${target}`) s.classList.add('hidden');
      });
      const targetSec=q(`#sec-${target}`);
      if(targetSec) targetSec.classList.remove('hidden');
    },0);
    return result;
  };
}

function appointmentForm(){
  const modal=q('#appointment-modal>div'), form=q('#appointment-form');
  if(!modal||!form||form.dataset.v35==='1') return;
  form.dataset.v35='1';
  const hiddenValues={};
  ['app-id','app-package-id','app-package-type','app-session-value','app-package-consumed'].forEach(id=>{hiddenValues[id]=q('#'+id)?.value||''});
  modal.querySelector(':scope>div:first-child').outerHTML=`<div class="v35-modal-head"><div class="v35-modal-heading"><span class="v35-modal-icon">${ico('calendar')}</span><div><h3 id="app-modal-title">Programar cita</h3><p>Paciente, horario, atención y cobro en una ficha compacta.</p></div></div><button type="button" class="v35-close" onclick="closeAppointmentModal()" aria-label="Cerrar">${ico('x')}</button></div>`;
  form.className='v35-form';
  form.innerHTML=`
    <input type="hidden" id="app-id" value="${hiddenValues['app-id']}">
    <input type="hidden" id="app-package-id" value="${hiddenValues['app-package-id']}">
    <input type="hidden" id="app-package-type" value="${hiddenValues['app-package-type']}">
    <input type="hidden" id="app-session-value" value="${hiddenValues['app-session-value']}">
    <input type="hidden" id="app-package-consumed" value="${hiddenValues['app-package-consumed']}">

    <section class="v35-section">
      <div class="v35-section-title">${ico('calendar')} Datos de la cita</div>
      <div class="v35-grid-3">
        <div class="v35-field full"><label>Paciente clínico *</label><div style="display:flex;gap:8px"><select id="app-patient-select" required onchange="autoSelectPatientPackage(); updateAppointmentPricing()" style="flex:1"></select><button type="button" onclick="switchToNewPatientFromAppoint()" class="v35-inline-new">${ico('plus')} Nuevo</button></div></div>
        <div class="v35-field"><label>Fecha *</label><input type="date" id="app-date" required></div>
        <div class="v35-field"><label>Hora *</label><input type="time" id="app-time" required></div>
        <div class="v35-field"><label>Estado *</label><select id="app-status"><option value="pendiente">Pendiente</option><option value="completada">Completada</option><option value="no_asistio">No asistió</option><option value="cancelada">Cancelada</option></select></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('clinical')} Atención</div>
      <div class="v35-grid-2">
        <div class="v35-field"><label>Tipo de atención *</label><div class="v35-choice-grid"><label class="v35-choice"><input type="radio" name="app-attention-type" id="app-attention-individual" value="individual" checked onchange="autoSelectPatientPackage(); updateAppointmentPricing()"> Individual</label><label class="v35-choice"><input type="radio" name="app-attention-type" id="app-attention-pareja" value="pareja" onchange="autoSelectPatientPackage(); updateAppointmentPricing()"> Pareja</label></div></div>
        <div class="v35-field"><label>Modalidad *</label><div class="v35-choice-grid"><label class="v35-choice"><input type="radio" name="app-modality" id="app-modality-presencial" value="presencial" checked onchange="updateAppointmentPricing()"> Presencial</label><label class="v35-choice"><input type="radio" name="app-modality" id="app-modality-virtual" value="virtual" onchange="updateAppointmentPricing()"> Virtual</label></div></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('wallet')} Cobro</div>
      <div class="v35-grid-3">
        <div class="v35-field"><label>Tarifa *</label><select id="app-rate-type" onchange="updateAppointmentPricing()"><option value="sesion">Sesión individual</option><option value="paquete6">Paquete de 6 sesiones</option><option value="paquete8">Paquete de 8 sesiones</option></select></div>
        <div class="v35-field"><label id="app-cost-label">Precio (S/) *</label><input type="number" id="app-cost" min="0" step="0.50" value="50.00" required><span class="v35-help">Editable si necesitas ajustar la tarifa.</span></div>
        <div class="v35-field"><label>Estado de pago *</label><select id="app-payment"><option value="pendiente">Pendiente de cobro</option><option value="pagado">Pagado</option></select></div>
      </div>
      <div id="app-package-info" class="hidden" style="margin-top:12px"></div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('edit')} Nota administrativa</div>
      <div class="v35-field"><label>Observaciones</label><textarea id="app-notes" rows="3" placeholder="Observaciones relacionadas con la cita..."></textarea></div>
    </section>
    <div class="v35-form-actions"><button type="button" onclick="closeAppointmentModal()" class="v35-btn-cancel">Cancelar</button><button type="submit" class="v35-btn-save">${ico('check')} Guardar cita</button></div>`;
  try{window.updatePatientDropdowns?.()}catch(_){}
}

function patientForm(){
  const modal=q('#patient-modal>div'), form=q('#patient-form');
  if(!modal||!form||form.dataset.v35==='1') return;
  form.dataset.v35='1';
  const pid=q('#patient-id')?.value||'';
  modal.querySelector(':scope>div:first-child').outerHTML=`<div class="v35-modal-head"><div class="v35-modal-heading"><span class="v35-modal-icon">${ico('users')}</span><div><h3 id="patient-modal-title">Registrar paciente</h3><p>Datos esenciales y seguimiento, sin campos repetidos.</p></div></div><button type="button" class="v35-close" onclick="closePatientModal()" aria-label="Cerrar">${ico('x')}</button></div>`;
  form.className='v35-form';
  form.innerHTML=`
    <input type="hidden" id="patient-id" value="${pid}">
    <section class="v35-section">
      <div class="v35-section-title">${ico('users')} Datos personales</div>
      <div class="v35-grid-2">
        <div class="v35-field full"><label>Nombre completo *</label><input type="text" id="pat-name" required placeholder="Ej. Alejandra Ruiz Medina"></div>
        <div class="v35-field"><label>DNI</label><input type="text" id="pat-dni" placeholder="12345678"></div>
        <div class="v35-field"><label>Teléfono *</label><input type="tel" id="pat-phone" required placeholder="987654321"></div>
        <div class="v35-field"><label>Fecha de nacimiento</label><input type="date" id="pat-birth"></div>
        <div class="v35-field"><label>Edad</label><input type="text" id="pat-age" placeholder="Edad"></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('report')} Seguimiento</div>
      <div class="v35-grid-3">
        <div class="v35-field"><label>Origen del contacto</label><select id="pat-origen"><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="marketplace">Facebook Marketplace</option><option value="web">Página web</option><option value="whatsapp">WhatsApp directo</option><option value="calendly">Calendly</option><option value="google">Google</option><option value="referido">Referido</option><option value="otro" selected>Otro</option></select></div>
        <div class="v35-field"><label>Canal</label><select id="pat-canal"><option value="whatsapp" selected>WhatsApp</option><option value="llamada">Llamada telefónica</option><option value="presencial">Presencial</option><option value="email">Email</option><option value="otro">Otro</option></select></div>
        <div class="v35-field"><label>Estado CRM</label><select id="pat-lead-status"><option value="nuevo" selected>Nuevo</option><option value="contactado">Contactado</option><option value="interesado">Interesado</option><option value="cita_agendada">Cita agendada</option><option value="atendido">Atendido</option><option value="recurrente">En tratamiento</option><option value="seguimiento">Seguimiento</option><option value="pausado">Pausado</option><option value="alta">Alta terapéutica</option><option value="inactivo">Inactivo</option></select></div>
        <div class="v35-field"><label>Moneda</label><select id="pat-currency"><option value="PEN" selected>Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></div>
      </div>
    </section>

    <section class="v35-section">
      <div class="v35-section-title">${ico('clinical')} Antecedentes generales</div>
      <div class="v35-field"><label>Observaciones administrativas / antecedentes breves</label><textarea id="pat-history" rows="4" placeholder="Información general relevante para la ficha del paciente..."></textarea><span class="v35-help">La historia clínica detallada se registra en su módulo clínico, no aquí.</span></div>
    </section>
    <div class="v35-form-actions"><button type="button" onclick="closePatientModal()" class="v35-btn-cancel">Cancelar</button><button type="submit" class="v35-btn-save">${ico('check')} Guardar paciente</button></div>`;
}


function normalizeModalTitles(){
  const at=q('#app-modal-title');
  if(at) at.textContent=(q('#app-id')?.value?'Editar cita':'Programar cita');
  const pt=q('#patient-modal-title');
  if(pt) pt.textContent=(q('#patient-id')?.value?'Editar paciente':'Registrar paciente');
}

function wrapModalOpeners(){
  if(window.__v35ModalWrappers) return;
  const oa=window.openAppointmentModal, op=window.openPatientModal, ea=window.editAppointment, ep=window.editPatient;
  if(typeof oa==='function') window.openAppointmentModal=function(){const r=oa.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof op==='function') window.openPatientModal=function(){const r=op.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof ea==='function') window.editAppointment=function(){const r=ea.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  if(typeof ep==='function') window.editPatient=function(){const r=ep.apply(this,arguments);setTimeout(normalizeModalTitles,0);return r};
  window.__v35ModalWrappers=true;
}

function refreshFormsData(){
  try{
    const sel=q('#app-patient-select');
    const s=window._profileState;
    if(sel && s?.patients){sel.innerHTML=s.patients.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(p=>`<option value="${p.id}">${p.name||'Paciente'}</option>`).join('')||'<option value="">Sin pacientes</option>';}
  }catch(_){}
}

function init(){
  buildPageHeads();
  isolateModules();
  appointmentForm();
  patientForm();
  refreshFormsData();
  wrapModalOpeners();
  normalizeModalTitles();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{init();setTimeout(init,500);setTimeout(init,1600)});
else {init();setTimeout(init,500);setTimeout(init,1600)}
})();

/* v3.6 + v3.6.2 mobile assistant fix */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=n=>`<svg class="v2-icon"><use href="#i-${n}"></use></svg>`;
let moreOpen=false;

function installMoreSheet(){
 if(q('#v36-mobile-more')) return;
 const el=document.createElement('div');
 el.id='v36-mobile-more'; el.className='v36-mobile-more no-print';
 el.innerHTML=`<div class="v36-more-sheet" role="dialog" aria-modal="true" aria-label="Más módulos">
   <div class="v36-more-head"><div><h3>Más módulos</h3><p>Accesos secundarios del sistema</p></div><button class="v36-more-close" onclick="closeV36More()" aria-label="Cerrar">${svg('x')}</button></div>
   <div class="v36-more-grid">
    <button class="v36-more-item" onclick="v36Go('recepcion')"><span class="v36-more-icon">${svg('reception')}</span><div><strong>Recepción</strong><span>Atenciones del día</span></div></button>
    <button class="v36-more-item" onclick="v36Go('clinica')"><span class="v36-more-icon">${svg('clinical')}</span><div><strong>Gestión clínica</strong><span>Historias y evolución</span></div></button>
    <button class="v36-more-item" onclick="v36Go('sesiones')"><span class="v36-more-icon">${svg('calendar')}</span><div><strong>Sesiones</strong><span>Seguimiento de atenciones</span></div></button>
    <button class="v36-more-item" onclick="v36Go('evaluaciones')"><span class="v36-more-icon">${svg('check')}</span><div><strong>Evaluaciones</strong><span>Instrumentos y resultados</span></div></button>
    <button class="v36-more-item" onclick="v36Go('documentos')"><span class="v36-more-icon">${svg('file')}</span><div><strong>Documentos</strong><span>Archivos por paciente</span></div></button>
    <button class="v36-more-item" onclick="v36Go('caja')"><span class="v36-more-icon">${svg('money')}</span><div><strong>Caja diaria</strong><span>Ingresos y pendientes</span></div></button>
    <button class="v36-more-item" onclick="v36Go('alertas')"><span class="v36-more-icon">${svg('bell')}</span><div><strong>Alertas</strong><span>Seguimiento y pendientes</span></div></button>
    <button class="v36-more-item" onclick="closeV36More(); openConsultorioTasks()"><span class="v36-more-icon">${svg('check')}</span><div><strong>Tareas</strong><span>Pendientes administrativos</span></div></button>
    <button class="v36-more-item" onclick="closeV36More(); openPrintModal('dia','citas')"><span class="v36-more-icon">${svg('report')}</span><div><strong>Reportes</strong><span>Agenda, finanzas y recepción</span></div></button>
    <button class="v36-more-item" onclick="closeV36More(); openAssistantModal()"><span class="v36-more-icon">${svg('spark')}</span><div><strong>Asistente</strong><span>Consultas administrativas</span></div></button>
   </div>
 </div>`;
 document.body.appendChild(el);
 el.addEventListener('click',e=>{if(e.target===el) closeV36More();});
}
window.openV36More=function(){installMoreSheet();moreOpen=true;q('#v36-mobile-more')?.classList.add('open');q('#v36-mobile-more-btn')?.classList.add('v36-more-active');};
window.closeV36More=function(){moreOpen=false;q('#v36-mobile-more')?.classList.remove('open');q('#v36-mobile-more-btn')?.classList.remove('v36-more-active');};
window.toggleV36More=function(){moreOpen?closeV36More():openV36More();};
window.v36Go=function(tab){closeV36More(); window.switchTab?.(tab);};

function rebuildMobileNav(){
 const nav=q('.v2-mobile-nav'); if(!nav||nav.dataset.v36done==='1') return;
 nav.dataset.v36done='1';
 nav.innerHTML=`
  <button data-v2-nav="inicio" onclick="switchTab('inicio')" class="v2-nav-active">${svg('home')}<span>Inicio</span></button>
  <button data-v2-nav="citas" onclick="switchTab('citas')">${svg('calendar')}<span>Agenda</span></button>
  <button data-v2-nav="pacientes" onclick="switchTab('pacientes')">${svg('users')}<span>Pacientes</span></button>
  <button data-v2-nav="finanzas" onclick="switchTab('finanzas')">${svg('wallet')}<span>Finanzas</span></button>
  <button id="v36-mobile-more-btn" type="button" onclick="toggleV36More()">${svg('plus')}<span>Más</span></button>`;
}

function wrapRouter(){
 if(typeof window.switchTab!=='function'||window.switchTab.__v36) return false;
 const old=window.switchTab;
 const fn=function(target){closeV36More();const out=old.apply(this,arguments);setTimeout(()=>{
   qa('.v2-mobile-nav [data-v2-nav]').forEach(b=>b.classList.toggle('v2-nav-active',b.dataset.v2Nav===target));
   q('#v36-mobile-more-btn')?.classList.toggle('v36-more-active',!['inicio','citas','pacientes','finanzas'].includes(target));
 },0);return out;};
 fn.__v36=true;window.switchTab=fn;return true;
}

function ensureFab(){
 const fab=q('#btn-fab-main'); if(fab) fab.setAttribute('aria-label','Crear nuevo');
}
function init(){installMoreSheet();rebuildMobileNav();ensureFab();wrapRouter();}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
let tries=0;const t=setInterval(()=>{init();if(++tries>20)clearInterval(t)},250);
})();
