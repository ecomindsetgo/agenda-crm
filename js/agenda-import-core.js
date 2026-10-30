/* Importación de agenda: análisis y validaciones sin modificar Firebase. */
(function (global) {
  'use strict';
  const text = v => String(v ?? '').trim();
  const key = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const col = v => key(v).replace(/\s/g, '');
  const aliases = {
    patient: ['paciente','nombre','nombrepaciente','nombresyapellidos','nombres','patient'],
    date: ['fecha','fechacita','dia','date'],
    time: ['hora','horacita','horario','inicio','time'],
    modality: ['modalidad','modalidadatencion','mode'],
    attentionType: ['tipoatencion','tipodeatencion','tipo','atencion'],
    price: ['precio','costo','tarifa','importe'],
    paid: ['cobrado','montocobrado','importeabonado','abono'],
    paidFlag: ['si','pagado','pago','estadopago'],
    status: ['estado','estadocita','situacion'],
    notes: ['observacion','observaciones','notas','comentario'],
    phone: ['telefono','celular','movil','phone'],
    dni: ['dni','documento','nrodocumento'],
    currency: ['moneda','currency']
  };
  function mapping(row) {
    const m = {};
    row.forEach((name, index) => {
      const candidate = col(name);
      Object.keys(aliases).forEach(field => {
        if (m[field] === undefined && aliases[field].includes(candidate)) m[field] = index;
      });
    });
    return m;
  }
  function excelDate(value) {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0,10);
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 1 || value > 2958465) return '';
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0,10);
    }
    const t = text(value);
    let y, m, d, match;
    if ((match = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s.*)?$/))) {
      [, y, m, d] = match;
    } else if ((match = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s.*)?$/))) {
      [, d, m, y] = match; // Perú: día/mes/año
    } else return '';
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const date = new Date(iso + 'T12:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === iso ? iso : '';
  }
  function excelTime(value) {
    if (value instanceof Date) return `${String(value.getUTCHours()).padStart(2,'0')}:${String(value.getUTCMinutes()).padStart(2,'0')}`;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const minutes = value >= 0 && value < 1 ? Math.round(value * 1440) :
                      Number.isInteger(value) && value < 24 ? value * 60 : -1;
      if (minutes >= 0 && minutes < 1440) return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
      return '';
    }
    let t = text(value).toLowerCase().replace(/\s+/g, '');
    const pm = /p\.?m\.?$/.test(t), am = /a\.?m\.?$/.test(t);
    t = t.replace(/[ap]\.?m\.?$/, '');
    const match = t.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?$/);
    if (!match) return '';
    let hour = Number(match[1]), min = Number(match[2] || 0);
    if ((am || pm) && (hour < 1 || hour > 12)) return '';
    if (pm && hour < 12) hour += 12;
    if (am && hour === 12) hour = 0;
    if (hour > 23 || min > 59) return '';
    return `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  function amount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    let s = text(value).replace(/[S/$€\s]/gi,'');
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
    else if (s.includes(',')) s = s.replace(',','.');
    return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  function parseStatus(v) {
    const s = key(v);
    if (!s) return '';
    if (/^(completad|realizad|atendid)/.test(s)) return 'completada';
    if (/^(cancelad|anulad)/.test(s)) return 'cancelada';
    if (/^(no asistio|inasistenc)/.test(s)) return 'no_asistio';
    if (/^(pendient|programad|confirmad|reprogramad)/.test(s)) return 'pendiente';
    return '';
  }
  function parseRows(rows) {
    if (!Array.isArray(rows)) throw Error('El formato del archivo no es válido.');
    const headerAt = rows.findIndex(row => {
      if (!Array.isArray(row)) return false;
      const m = mapping(row);
      return m.patient !== undefined && m.date !== undefined && m.time !== undefined;
    });
    if (headerAt < 0) throw Error('No encuentro las columnas PACIENTE, FECHA y HORA. Usa la plantilla de importación.');
    const m = mapping(rows[headerAt]);
    const output = [];
    for (let i = headerAt + 1; i < rows.length; i++) {
      const source = rows[i] || [];
      if (!Array.isArray(source) || !source.some(v => text(v))) continue;
      const get = k => m[k] === undefined ? '' : source[m[k]];
      // Totales y pies de la ficha exportada no son citas.
      if (key(get('patient')) === 'total' || (!text(get('patient')) && /total/.test(key(get('time'))))) continue;
      const label = text(get('notes'));
      let status = parseStatus(get('status')) || parseStatus(label) || 'pendiente';
      const statusFromNotes = parseStatus(label);
      const notes = statusFromNotes && !text(get('status')) ? (/[—–-]/.test(label) ? label.replace(/^[^—–-]*[—–-]\s*/, '').trim() : '') : label;
      output.push({
        line: i + 1,
        patientName: text(get('patient')),
        date: excelDate(get('date')),
        time: excelTime(get('time')),
        invalidDate: text(get('date')) && !excelDate(get('date')),
        invalidTime: text(get('time')) && !excelTime(get('time')),
        modality: /virtual|online|remoto/.test(key(get('modality'))) ? 'virtual' : 'presencial',
        attentionType: /pareja|familiar/.test(key(get('attentionType'))) ? 'pareja' : 'individual',
        price: amount(get('price')),
        paid: amount(get('paid')),
        paidFlag: /^(si|s|yes|pagado|pago|true|1)$/.test(key(get('paidFlag'))),
        status,
        notes: notes.slice(0,500),
        phone: text(get('phone')),
        dni: text(get('dni')),
        currency: /usd|dolar|us\$/.test(key(get('currency'))) ? 'USD' : /pen|soles|sol/.test(key(get('currency'))) ? 'PEN' : ''
      });
    }
    if (!output.length) throw Error('El archivo no contiene citas debajo de los encabezados.');
    if (output.length > 500) throw Error('Importa como máximo 500 citas por archivo. Divide el Excel en varios lotes.');
    return output;
  }
  function clock(v) { const parts = text(v).slice(0,5).split(':').map(Number); return parts.length === 2 && parts.every(Number.isFinite) ? parts[0]*60+parts[1] : NaN; }
  function overlap(a, b, c, d) { return a < d && b > c; }
  function review(rows, opts) {
    const patients = opts.patients || [], appointments = opts.appointments || [], blocks = opts.blocks || [];
    const createPatients = !!opts.createPatients;
    const reserved = appointments.filter(a => !['cancelada','no_asistio'].includes(a.status));
    const pending = [];
    const prepared = [];
    const byName = name => patients.filter(p => key(p.name) === key(name));
    for (const original of rows) {
      const r = {...original, issues: [], state: 'ready', patientId: '', newPatientKey: ''};
      const invalid = reason => { r.issues.push(reason); r.state = 'skip'; };
      if (!r.patientName) invalid('Paciente vacío');
      if (!r.date || r.invalidDate) invalid('Fecha inválida (usa dd/mm/aaaa)');
      if (!r.time || r.invalidTime) invalid('Hora inválida (usa HH:MM)');
      const start = clock(r.time);
      if (Number.isFinite(start) && start + 60 > 1440) invalid('La sesión de 60 min debe terminar el mismo día');
      if (r.price !== null && (!Number.isFinite(r.price) || r.price < 0)) invalid('Precio inválido');
      if (r.paid !== null && (!Number.isFinite(r.paid) || r.paid < 0)) invalid('Importe cobrado inválido');
      if (r.dni && !/^\d{8,12}$/.test(r.dni)) invalid('DNI/documento inválido');
      let matches = r.dni ? patients.filter(p => text(p.dni) && text(p.dni) === r.dni) : [];
      if (!matches.length) matches = byName(r.patientName);
      if (matches.length > 1 && r.phone) matches = matches.filter(p => text(p.phone) === r.phone);
      if (matches.length > 1) invalid('Nombre duplicado entre pacientes: agrega DNI o teléfono');
      if (matches.length === 1) {
        r.patientId = matches[0].id;
        if (r.dni && key(matches[0].name) !== key(r.patientName)) invalid('El nombre no coincide con el DNI registrado');
        if (r.dni && text(matches[0].dni) && text(matches[0].dni) !== r.dni) invalid('El DNI no coincide con el paciente registrado');
      } else if (r.patientName && matches.length === 0) {
        r.newPatientKey = key(r.patientName) + '|' + r.dni + '|' + r.phone;
        if (!createPatients) invalid('Paciente no registrado');
        else r.state = r.issues.length ? 'skip' : 'new';
      }
      const patient = matches[0];
      r.currency = r.currency || (patient?.currency === 'USD' ? 'USD' : 'PEN');
      if (patient && r.currency !== (patient.currency === 'USD' ? 'USD' : 'PEN')) invalid('Moneda diferente a la ficha del paciente');
      const price = r.price === null ? (opts.defaultRate ? opts.defaultRate(r.attentionType, r.modality, r.currency) : 0) : r.price;
      r.cost = Math.round(price * 100) / 100;
      r.paidAmount = r.paid === null ? (r.paidFlag ? r.cost : 0) : Math.round(r.paid * 100) / 100;
      if (r.newPatientKey && pending.some(a => a.newPatientKey === r.newPatientKey && a.currency !== r.currency)) invalid('El mismo paciente nuevo tiene monedas diferentes en el Excel');
      if (r.paidAmount > r.cost) invalid('Cobrado superior al precio');
      if (r.paidAmount > 0 && ['cancelada','no_asistio'].includes(r.status)) invalid('Revisa pago de cita cancelada/no asistida');
      if (r.date && r.time && Number.isFinite(start)) {
        if (blocks.some(b => b.date === r.date && overlap(start,start+60,clock(b.blockStart),clock(b.blockEnd)))) invalid('Cruce con bloqueo manual');
        if (reserved.some(a => a.date === r.date && overlap(start,start+60,clock(a.time),clock(a.time)+60))) invalid('Horario ocupado por cita existente');
        if (pending.some(a => a.date === r.date && overlap(start,start+60,clock(a.time),clock(a.time)+60))) invalid('Cruce con otra fila del Excel');
        if ((r.patientId || r.newPatientKey) && reserved.some(a => a.date===r.date && (r.patientId ? a.patientId===r.patientId : key(a.patientName)===key(r.patientName)))) invalid('Paciente ya tiene cita ese día');
        if ((r.patientId || r.newPatientKey) && pending.some(a => a.date===r.date && (r.patientId ? a.patientId===r.patientId : a.newPatientKey===r.newPatientKey))) invalid('Paciente repetido ese día en el Excel');
      }
      if (r.state !== 'skip') pending.push(r);
      prepared.push(r);
    }
    return {
      rows: prepared,
      ready: prepared.filter(r => r.state !== 'skip'),
      skipped: prepared.filter(r => r.state === 'skip'),
      newPatients: new Set(prepared.filter(r => r.state === 'new').map(r => r.newPatientKey)).size
    };
  }
  global.AgendaImportCore = { key, mapping, excelDate, excelTime, amount, parseStatus, parseRows, review };
})(typeof window !== 'undefined' ? window : globalThis);
