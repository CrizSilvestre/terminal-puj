// Mejoras de la oficina: Libro de vuelo, Dundies, logros, megafonía, avisos, clima real, junta y paleta de comandos.
import { CAST, CEO_IDS, DM_IDS, PP_IDS, Flights, nick, shortName, fmtTime, pujDayStart, pujHour, pick } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = async u => { try { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? r.json() : null; } catch { return null; } };
const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(n || 0);
const fmtDur = s => !s ? '—' : s < 60 ? Math.round(s) + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : (s / 3600).toFixed(1).replace('.', ',') + ' h';
const dayKey = ts => { const d = new Date((ts - 4 * 3600) * 1000); return d.toISOString().slice(0, 10); }; // día en PUJ (UTC−4)
const AGENTS = [...CEO_IDS, ...DM_IDS, ...PP_IDS].filter(id => id !== 'ceo');

// ---------- logros ----------
const LOGROS = [
  ['primer_vuelo', 'Primer despegue', 'Un agente aterrizó su primera tarea.'],
  ['diez_vuelos', 'Aerolínea en marcha', '10 vuelos aterrizados.'],
  ['cincuenta', 'Hub del Caribe', '50 vuelos aterrizados.'],
  ['puente_aereo', 'Puente aéreo', '3 vuelos en el aire a la vez.'],
  ['otp_perfecto', 'OTP perfecto', 'Un día con 5 vuelos o más, todos en 15 minutos o menos.'],
  ['nocturno', 'Vuelo nocturno', 'Una tarea despegó después de las 10 de la noche.'],
  ['hooli', 'Contratistas a bordo', 'Una tarea de Antigravity aterrizó.'],
  ['charla5', 'Puertas abiertas', 'Hablaste con 5 agentes distintos.'],
  ['hamaca', 'Vacaciones forzadas', 'Soltaste a alguien en la hamaca.'],
  ['mareo', 'Turbulencia', 'Mareaste a alguien de tanto sacudirlo.'],
  ['jim_dwight', 'Rivales de escritorio', 'Juntaste a Jim y a Dwight.'],
  ['simulacro', 'Salida de emergencia', 'Completaste un simulacro de incendio.'],
  ['junta', 'Reunión de las 9', 'Convocaste una junta del equipo.'],
  ['kevin', 'Hora del snack', 'Mandaste a Kevin a la máquina.'],
  ['gato', 'Amigo felino', 'Tocaste al gato de Angela.'],
  ['anton', 'No toques a Anton', 'Tocaste a Anton.'],
  ['ceo_volador', 'CEO volador', 'Te agarraste a ti mismo.'],
  ['torre', 'Intruso en la torre', 'Soltaste a alguien en la Torre de Michael.'],
  ['dundies', 'Noche de los Dundies', 'Abriste los premios Dundie.'],
  ['megafonia', 'Atención, pasajeros', 'Encendiste la megafonía.'],
];

export function createExtras(ctx) {
  const { sim, ui, sky } = ctx;
  let DUNDIES = null, PA = null, history = [], chatStats = {}, range = 30, metar = null;
  const unlocked = new Set(ls.get('dm-logros', []));
  const grabs = ls.get('dm-agarrados', {});
  load('static/dundies.json').then(d => { DUNDIES = d; });
  load('static/megafonia.json').then(d => { PA = d; });

  // ================= logros =================
  function unlock(id) {
    if (unlocked.has(id)) return;
    const l = LOGROS.find(x => x[0] === id); if (!l) return;
    unlocked.add(id); ls.set('dm-logros', [...unlocked]);
    let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="medal">★</span><div><b>Logro desbloqueado</b><span>${esc(l[1])} · ${esc(l[2])}</span></div>`;
    box.appendChild(t); setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 4700);
    ctx.chime('assign');
    if (!$('#book').hidden && tab === 'logros') renderTab();
  }
  function game(name, data) {
    if (name === 'grab') { grabs[data] = (grabs[data] || 0) + 1; ls.set('dm-agarrados', grabs); if (data === 'ceo') unlock('ceo_volador'); }
    if (name === 'hamaca') unlock('hamaca');
    if (name === 'mareo') unlock('mareo');
    if (name === 'torre') unlock('torre');
    if (name === 'pareja' && data === 'dwight+jim') unlock('jim_dwight');
    if (name === 'simulacro') unlock('simulacro');
    if (name === 'junta') unlock('junta');
    if (name === 'poke') ({ vending: () => unlock('kevin'), cat: () => unlock('gato'), anton: () => unlock('anton') })[data]?.();
  }

  // ================= megafonía (voz del navegador) =================
  let paOn = ls.get('dm-pa', false), voice = null;
  const pickVoice = () => { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /es-(MX|US|419)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; };
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  const PA_FALLBACK = { embarque: ['Atención, por favor. Embarca el vuelo {vuelo} con destino {destino}, a cargo de {agente}, por la puerta {puerta}.'],
    aterrizaje: ['Atención. El vuelo {vuelo} procedente de {destino} ha aterrizado. Buen trabajo, {agente}.'],
    demora: ['El vuelo {vuelo} lleva {min} minutos en el aire. Seguimos esperando a {agente}.'],
    cancelado: ['Lamentamos informar que el vuelo {vuelo} con destino {destino} ha sido cancelado.'],
    simulacro: ['Atención: simulacro de incendio. Diríjanse con calma a la puerta A uno.'],
    junta: ['Atención, equipo: junta general en la zona del café.'], pedido: ['Atención, torre: nuevo memo del CEO.'] };
  function speak(kind, vars = {}) {
    if (!paOn || !('speechSynthesis' in window)) return;
    if (speechSynthesis.pending) return; // nunca acumular anuncios
    let t = pick((PA && PA[kind]) || PA_FALLBACK[kind] || ['']);
    const v = { ...vars, vuelo: String(vars.vuelo || '').replace(/^([A-Z]+)(\d+)$/, '$1 $2'), puerta: String(vars.puerta || '').replace(/^([A-Z])(\d)$/, '$1 $2') };
    for (const [k, val] of Object.entries(v)) t = t.split('{' + k + '}').join(val ?? '');
    const u = new SpeechSynthesisUtterance(t); if (voice) u.voice = voice; u.lang = voice?.lang || 'es-MX'; u.rate = 1.02; u.pitch = 1;
    setTimeout(() => speechSynthesis.speak(u), 900); // después de la campanita
  }
  const paBtn = $('#paBtn');
  const paintPA = () => { paBtn.setAttribute('aria-pressed', paOn); };
  paBtn.onclick = () => { paOn = !paOn; ls.set('dm-pa', paOn); paintPA(); if (paOn) { unlock('megafonia'); speak('pedido'); } else speechSynthesis?.cancel(); };
  paintPA();

  // ================= avisos del sistema =================
  let notifOn = ls.get('dm-avisos', false) && window.Notification?.permission === 'granted';
  const nBtn = $('#notifBtn');
  const paintN = () => nBtn.setAttribute('aria-pressed', notifOn);
  nBtn.onclick = async () => {
    if (!('Notification' in window)) { ui.bubble('michael', 'Este navegador no permite avisos.', 2600, 'event'); return; }
    if (!notifOn && Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') return; }
    notifOn = !notifOn; ls.set('dm-avisos', notifOn); paintN();
  };
  paintN();
  function notify(title, body) {
    if (!notifOn || !document.hidden || window.Notification?.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'static/icon/icon-1024.png', tag: 'terminal-puj-' + title }); } catch {}
  }

  // ================= eventos de vuelos (desde main) =================
  function onAct(a) {
    if (!a) return;
    const f = a.flight, vars = f ? { vuelo: f.no, agente: nick(f.agent), destino: f.dest.name, puerta: f.gate } : {};
    if (a.type === 'request') speak('pedido');
    else if (a.type === 'assign') { speak('embarque', vars); const n = ctx.flights().active(Date.now() / 1000).length; if (n >= 3) unlock('puente_aereo'); if (pujHour() >= 22 || pujHour() < 4) unlock('nocturno'); }
    else if (a.type === 'land') { speak('aterrizaje', vars); notify(`${nick(f.agent)} aterrizó · ${f.no}`, f.result || f.desc); if (f.agent === 'hooli') unlock('hooli'); refreshCounts(); }
    else if (a.type === 'cancel') { speak('cancelado', vars); notify(`Vuelo cancelado · ${f.no}`, `${nick(f.agent)}: ${f.desc}`); }
    else if (a.type === 'delay') { speak('demora', { ...vars, min: a.min }); notify(`Vuelo demorado · ${f.no}`, `${nick(f.agent)} lleva ${a.min} min: ${f.desc}`); }
    else if (a.type === 'drill') speak('simulacro');
  }

  // ================= historial =================
  async function loadHistory() {
    if (ctx.isPublic()) { history = buildFlights([...ctx.flights().map.values()]); chatStats = {}; return; }
    const [evs, cs] = await Promise.all([load('api/history?days=' + Math.max(range, 2)), load('api/chats')]);
    chatStats = cs || {};
    const F = new Flights(); for (const e of evs || []) F.apply(e);
    history = buildFlights([...F.map.values()]); history.requests = F.requests;
  }
  const buildFlights = list => list.filter(f => f.start).sort((a, b) => b.start - a.start);
  async function refreshCounts() {
    if (ctx.isPublic()) return;
    const evs = await load('api/history?days=400'); if (!evs) return;
    const F = new Flights(); for (const e of evs) F.apply(e);
    const all = [...F.map.values()], landed = all.filter(f => f.end && f.ok);
    if (landed.length >= 1) unlock('primer_vuelo'); if (landed.length >= 10) unlock('diez_vuelos'); if (landed.length >= 50) unlock('cincuenta');
    if (landed.some(f => f.agent === 'hooli')) unlock('hooli');
    const byDay = {}; for (const f of all) (byDay[dayKey(f.start)] ||= []).push(f);
    if (Object.values(byDay).some(d => d.length >= 5 && d.every(f => f.end && f.ok && f.end - f.start <= 900))) unlock('otp_perfecto');
    const cs = await load('api/chats'); if (cs && Object.values(cs).filter(s => s.msgs > 0).length >= 5) unlock('charla5');
  }

  // ================= Libro de vuelo (modal) =================
  let tab = 'resumen';
  const book = $('#book');
  $('#bookBtn').onclick = async () => { book.hidden = false; $('#bookBody').innerHTML = '<p class="bk-load">Cargando bitácora…</p>'; await loadHistory(); renderTab(); };
  $('#bookClose').onclick = () => { book.hidden = true; };
  book.addEventListener('click', e => { if (e.target === book) book.hidden = true; });
  document.querySelectorAll('[data-btab]').forEach(b => b.onclick = () => { tab = b.dataset.btab; document.querySelectorAll('[data-btab]').forEach(x => x.setAttribute('aria-selected', x === b)); renderTab(); if (tab === 'dundies') unlock('dundies'); });
  $('#bookRange').onchange = async e => { range = +e.target.value; await loadHistory(); renderTab(); };

  function inRange() { const cut = Date.now() / 1000 - range * 86400; return history.filter(f => f.start >= cut); }
  function renderTab() {
    const body = $('#bookBody');
    if (tab === 'resumen') body.innerHTML = renderResumen();
    else if (tab === 'bitacora') { body.innerHTML = renderBitacora(); wireBitacora(); }
    else if (tab === 'dundies') { body.innerHTML = renderDundies(); paintPortraits(body); }
    else body.innerHTML = renderLogros();
    wireTips(body);
  }

  // ---- Resumen: indicadores + 2 gráficas de una sola serie ----
  function renderResumen() {
    const fl = inRange(), landed = fl.filter(f => f.end && f.ok), ontime = landed.filter(f => f.end - f.start <= 900);
    const fuelFlights = fl.reduce((a, f) => a + (f.tokens || 0), 0), cut = Date.now() / 1000 - range * 86400;
    const fuelChat = Object.values(chatStats).reduce((a, s) => a + (s.replies || []).filter(r => r[0] >= cut).reduce((b, r) => b + r[1], 0), 0);
    const block = landed.length ? landed.reduce((a, f) => a + f.end - f.start, 0) / landed.length : 0;
    const tiles = [['Vuelos', fl.length], ['OTP A15', landed.length ? Math.round(100 * ontime.length / landed.length) + '%' : '—'],
      ['Combustible', fmtTok(fuelFlights + fuelChat)], ['Bloque medio', fmtDur(block)], ['Cancelados', fl.filter(f => f.end && !f.ok).length]];
    // vuelos por día
    const days = []; for (let i = range - 1; i >= 0; i--) days.push(dayKey(Date.now() / 1000 - i * 86400));
    const perDay = Object.fromEntries(days.map(d => [d, 0])); for (const f of fl) { const k = dayKey(f.start); if (k in perDay) perDay[k]++; }
    // combustible por agente (vuelos + chat)
    const fuel = {};
    for (const f of fl) fuel[f.agent] = (fuel[f.agent] || 0) + (f.tokens || 0);
    for (const [a, st] of Object.entries(chatStats)) fuel[a] = (fuel[a] || 0) + (st.replies || []).filter(r => r[0] >= cut).reduce((b, r) => b + r[1], 0);
    const fuelRows = Object.entries(fuel).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return `<div class="bk-tiles">${tiles.map(([l, v]) => `<div class="bk-tile"><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div>
      <div class="bk-charts">
        <figure><figcaption>Vuelos por día</figcaption>${barsV(days.map(d => [d.slice(5).split('-').reverse().join('/'), perDay[d]]))}</figure>
        <figure><figcaption>Combustible por agente <span>tokens · vuelos + chat</span></figcaption>${fuelRows.length ? barsH(fuelRows.map(([a, v]) => [a === 'hooli' ? 'Hooli' : nick(a), v])) : '<p class="bk-empty">Aún sin datos de consumo: se registran desde hoy.</p>'}</figure>
      </div>
      <p class="bk-note">El combustible cuenta los tokens que reporta cada agente al aterrizar y los de cada respuesta del chat. Tu conversación principal conmigo no se cuenta aquí.</p>`;
  }
  // barras verticales (una serie) con tooltip
  function barsV(rows) {
    const Wd = 440, Hh = 150, pad = 22, max = Math.max(1, ...rows.map(r => r[1])), bw = (Wd - pad) / rows.length;
    const ticks = [0, Math.ceil(max / 2), max];
    const step = Math.ceil(rows.length / 7), last = rows.length - 1;
    const label = (i) => rows.length <= 8 || i === last || (i % step === 0 && last - i >= step * 0.75);
    return `<svg class="bk-svg" viewBox="0 0 ${Wd} ${Hh + 22}" role="img" aria-label="Vuelos por día">
      ${ticks.map(t => { const y = Hh - (t / max) * (Hh - 10); return `<line x1="${pad}" x2="${Wd}" y1="${y}" y2="${y}" class="grid"/><text x="${pad - 6}" y="${y + 3}" class="ax" text-anchor="end">${t}</text>`; }).join('')}
      ${rows.map(([k, v], i) => { const h = (v / max) * (Hh - 10), x = pad + i * bw + 1, w = Math.max(2, bw - 2);
        return `<g class="tipT" data-tip="${esc(k)} · ${v} vuelo${v === 1 ? '' : 's'}"><rect x="${x}" y="0" width="${w}" height="${Hh}" class="hit"/>${v ? `<path class="bar" d="M${x},${Hh} v${-Math.max(0, h - 3)} q0,-3 3,-3 h${Math.max(0, w - 6)} q3,0 3,3 v${Math.max(0, h - 3)} z"/>` : ''}${label(i) ? `<text x="${i === last ? x + w : i === 0 ? x : x + w / 2}" y="${Hh + 14}" class="ax" text-anchor="${i === last ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(k)}</text>` : ''}</g>`; }).join('')}
    </svg>`;
  }
  // barras horizontales (una serie) con etiqueta directa
  function barsH(rows) {
    const Wd = 440, rh = 26, lw = 84, max = Math.max(1, ...rows.map(r => r[1])), Hh = rows.length * rh;
    return `<svg class="bk-svg" viewBox="0 0 ${Wd} ${Hh}" role="img" aria-label="Combustible por agente">
      ${rows.map(([k, v], i) => { const y = i * rh, w = Math.max(3, (v / max) * (Wd - lw - 56));
        return `<g class="tipT" data-tip="${esc(k)} · ${v.toLocaleString('es-DO')} tokens"><rect x="0" y="${y}" width="${Wd}" height="${rh}" class="hit"/>
          <text x="${lw - 8}" y="${y + 16}" class="lb" text-anchor="end">${esc(k)}</text>
          <path class="bar" d="M${lw},${y + 5} h${w - 3} q3,0 3,3 v8 q0,3 -3,3 h${-(w - 3)} z"/>
          <text x="${lw + w + 6}" y="${y + 16}" class="ax">${fmtTok(v)}</text></g>`; }).join('')}
    </svg>`;
  }
  function wireTips(root) {
    const tip = $('#bkTip');
    root.querySelectorAll('.tipT').forEach(g => {
      g.addEventListener('mousemove', e => { tip.hidden = false; tip.textContent = g.dataset.tip; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px'; g.classList.add('on'); });
      g.addEventListener('mouseleave', () => { tip.hidden = true; g.classList.remove('on'); });
    });
  }

  // ---- Bitácora: tabla filtrable + exportar CSV ----
  let fAgent = '', fText = '';
  function renderBitacora() {
    const agents = [...new Set(inRange().map(f => f.agent))];
    return `<div class="bk-filters"><select id="bkAgent" aria-label="Agente"><option value="">Todos los agentes</option>${agents.map(a => `<option value="${a}" ${a === fAgent ? 'selected' : ''}>${esc(a === 'hooli' ? 'Hooli XYZ' : nick(a))}</option>`).join('')}</select>
      <input id="bkText" type="search" placeholder="Buscar en tareas y resultados…" value="${esc(fText)}"><button class="btn" id="bkCsv" type="button">Exportar CSV</button></div>
      <div class="bk-tableWrap"><table class="bk-table"><thead><tr><th>Fecha</th><th>Vuelo</th><th>Agente</th><th>Proyecto</th><th>Estado</th><th>Bloque</th><th>Tokens</th><th>Tarea y resultado</th></tr></thead><tbody id="bkRows"></tbody></table></div>`;
  }
  const filtered = () => inRange().filter(f => (!fAgent || f.agent === fAgent) && (!fText || (f.desc + ' ' + (f.result || '') + ' ' + f.dest.name).toLowerCase().includes(fText.toLowerCase())));
  const statusOf = f => ctx.flights().status(f, Date.now() / 1000);
  function wireBitacora() {
    const paint = () => {
      const rows = filtered();
      $('#bkRows').innerHTML = rows.slice(0, 400).map(f => { const st = statusOf(f); return `<tr><td>${esc(new Date(f.start * 1000).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', timeZone: 'America/Santo_Domingo' }))} ${esc(fmtTime(f.start))}</td><td><code>${esc(f.no)}</code></td><td>${esc(f.agent === 'hooli' ? 'Hooli XYZ' : nick(f.agent))}</td><td>${esc(f.dest.name)}</td><td><span class="st st-${st === 'ATERRIZÓ' ? 'ok' : st === 'CANCELADO' ? 'bad' : 'run'}">${esc(st)}</span></td><td>${f.end ? fmtDur(f.end - f.start) : '—'}</td><td>${f.tokens ? fmtTok(f.tokens) : '—'}</td><td>${esc(f.desc)}${f.result ? `<small>✓ ${esc(f.result)}</small>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="bk-empty">Sin vuelos con esos filtros.</td></tr>';
    };
    paint();
    $('#bkAgent').onchange = e => { fAgent = e.target.value; paint(); };
    $('#bkText').oninput = e => { fText = e.target.value; paint(); };
    $('#bkCsv').onclick = () => {
      const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const lines = [['fecha', 'hora', 'vuelo', 'agente', 'proyecto', 'estado', 'bloque_s', 'tokens', 'tarea', 'resultado'].join(',')]
        .concat(filtered().map(f => [new Date(f.start * 1000).toISOString().slice(0, 10), fmtTime(f.start), f.no, f.agent, f.dest.name, statusOf(f), f.end ? Math.round(f.end - f.start) : '', f.tokens || '', f.desc, f.result || ''].map(q).join(',')));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
      a.download = `libro-de-vuelo-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  }

  // ---- Dundies: premios con datos reales ----
  function computeDundies() {
    const fl = inRange(), by = {};
    for (const f of fl) (by[f.agent] ||= []).push(f);
    const stats = Object.entries(by).filter(([a]) => a !== 'hooli').map(([a, list]) => {
      const landed = list.filter(f => f.end && f.ok), tok = list.filter(f => f.tokens);
      return { a, n: list.length, landed: landed.length, otp: landed.length ? landed.filter(f => f.end - f.start <= 900).length / landed.length : null,
        blk: landed.length ? landed.reduce((s, f) => s + f.end - f.start, 0) / landed.length : null, fails: list.filter(f => f.end && !f.ok).length,
        fuel: list.reduce((s, f) => s + (f.tokens || 0), 0), eff: tok.length >= 2 ? tok.reduce((s, f) => s + f.tokens, 0) / tok.length : null,
        early: Math.min(...list.map(f => { const h = pujHour(new Date(f.start * 1000)); return h < 4 ? 99 : h; })),
        late: Math.max(...list.map(f => { const h = pujHour(new Date(f.start * 1000)); return h < 4 ? h + 24 : h; })) };
    });
    const best = (key, cmp, filter = () => true, fmt) => { const c = stats.filter(s => s[key] != null && filter(s)).sort(cmp)[0]; return c ? { a: c.a, val: fmt(c[key]) } : null; };
    const hh = h => { h = h % 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0'); };
    const chats = Object.entries(chatStats).map(([a, s]) => ({ a, n: s.msgs })).filter(x => x.n > 0 && x.a !== 'ceo').sort((x, y) => y.n - x.n)[0];
    const dragged = Object.entries(grabs).filter(([a]) => a !== 'ceo').sort((x, y) => y[1] - x[1])[0];
    return [
      ['mas_vuelos', best('n', (x, y) => y.n - x.n, s => s.a !== 'creed', v => v + (v === 1 ? ' vuelo' : ' vuelos'))],
      ['mejor_otp', best('otp', (x, y) => y.otp - x.otp || y.landed - x.landed, s => s.landed >= 3, v => Math.round(v * 100) + '% a tiempo')],
      ['mas_rapido', best('blk', (x, y) => x.blk - y.blk, s => s.landed >= 2, v => fmtDur(v) + ' de media')],
      ['mas_lento', best('blk', (x, y) => y.blk - x.blk, s => s.landed >= 2, v => fmtDur(v) + ' de media')],
      ['mas_cancelados', best('fails', (x, y) => y.fails - x.fails, s => s.fails > 0, v => v + (v === 1 ? ' cancelado' : ' cancelados'))],
      ['mas_combustible', best('fuel', (x, y) => y.fuel - x.fuel, s => s.fuel > 0, v => fmtTok(v) + ' tokens')],
      ['mas_eficiente', best('eff', (x, y) => x.eff - y.eff, () => true, v => fmtTok(Math.round(v)) + ' por vuelo')],
      ['mas_charlas', chats ? { a: chats.a, val: chats.n + ' mensajes' } : null],
      ['madrugador', best('early', (x, y) => x.early - y.early, s => s.early < 10, v => 'desde las ' + hh(v))],
      ['noctambulo', best('late', (x, y) => y.late - x.late, s => s.late >= 19, v => 'hasta las ' + hh(v))],
      ['mas_arrastrado', dragged ? { a: dragged[0], val: dragged[1] + ' vuelos sin avión' } : null],
      ['misterio', by.creed ? { a: 'creed', val: by.creed.length + ' tareas misteriosas' } : null],
    ].filter(([, w]) => w).filter(([k, w], _, all) => {
      // un mismo agente no puede ser a la vez el más rápido y el más lento (ni el que más gasta y el más eficiente)
      const twin = { mas_lento: 'mas_rapido', mas_eficiente: 'mas_combustible' }[k];
      return !twin || all.find(([k2]) => k2 === twin)?.[1].a !== w.a;
    });
  }
  function renderDundies() {
    const list = computeDundies(), seed = Math.floor(Date.now() / 86400000);
    if (!list.length) return '<p class="bk-empty">Todavía no hay datos suficientes para los Dundies. Delega unas cuantas tareas y vuelve.</p>';
    return `<div class="dundie-head"><b>Los Dundies</b><span>Sucursal Punta Cana · últimos ${range} días · presenta Michael Scott</span></div>
      <div class="dundies">${list.map(([k, w], i) => { const D = DUNDIES?.[k], title = D ? D.premios[(seed + i) % D.premios.length] : k, speech = D ? D.discurso[(seed + i) % D.discurso.length].split('{agente}').join(nick(w.a)) : '';
        return `<article class="dundie"><div class="trophy">🏆</div><canvas width="12" height="20" data-pid="${w.a}"></canvas><h4>${esc(title)}</h4><p class="win">${esc(nick(w.a))} <span>${esc(w.val)}</span></p>${speech ? `<p class="speech">«${esc(speech)}»</p>` : ''}</article>`; }).join('')}</div>`;
  }
  function paintPortraits(root) { root.querySelectorAll('canvas[data-pid]').forEach(c => { const ch = sim.chars[c.dataset.pid]; if (ch) c.getContext('2d').drawImage(ch.sp.portrait, 0, 0); }); }

  function renderLogros() {
    return `<p class="bk-note">${unlocked.size} de ${LOGROS.length} logros. Algunos salen trabajando de verdad; otros, jugando con la oficina.</p>
      <div class="logros">${LOGROS.map(([id, t, d]) => `<div class="logro ${unlocked.has(id) ? 'got' : ''}"><span class="medal">${unlocked.has(id) ? '★' : '☆'}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>`;
  }

  // ================= clima real de PUJ =================
  async function pollMetar() {
    if (ctx.isPublic()) return;
    const m = await load('api/metar'); if (!m || !m.available) { $('#metar').hidden = true; return; }
    metar = m;
    const cov = (m.clouds || []).map(c => c.cover), order = ['CLR', 'SKC', 'FEW', 'SCT', 'BKN', 'OVC', 'VV'];
    const cover = cov.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] || 'CLR', wx = m.wxString || '';
    sky.weather = { cover, rain: /RA|DZ|SH|TS/.test(wx), storm: /TS/.test(wx), wdir: typeof m.wdir === 'number' ? m.wdir : null, wspd: m.wspd || 0 };
    const el = $('#metar'); el.hidden = false; el.dataset.cat = m.fltCat || '';
    const wind = typeof m.wdir === 'number' ? `${String(m.wdir).padStart(3, '0')}°/${m.wspd} kt` : `VRB/${m.wspd} kt`;
    el.innerHTML = `<b>MDPC</b><span>${m.temp}°C</span><span>${wind}${m.wgst ? ' G' + m.wgst : ''}</span><span>${esc(wx || cover)}</span><em>${esc(m.fltCat || '')}</em>`;
    el.title = m.rawOb + '\n\nMETAR real de Punta Cana (aviationweather.gov). Se actualiza cada 10 minutos.';
  }
  pollMetar(); setInterval(pollMetar, 600000);

  // ================= junta del equipo =================
  async function junta() {
    if (!ctx.isPublic()) await loadHistory();
    const now = Date.now() / 1000, s0 = pujDayStart(now), y0 = s0 - 86400;
    const all = ctx.isPublic() ? [...ctx.flights().map.values()] : history;
    const hoy = all.filter(f => f.start >= s0), ayer = all.filter(f => f.start >= y0 && f.start < s0);
    const sum = list => { const l = list.filter(f => f.end && f.ok); return { n: list.length, otp: l.length ? Math.round(100 * l.filter(f => f.end - f.start <= 900).length / l.length) : null, fails: list.filter(f => f.end && !f.ok).length }; };
    const top = list => { const c = {}; for (const f of list) if (f.agent !== 'hooli') c[f.agent] = (c[f.agent] || 0) + 1; const t = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return t ? nick(t[0]) : null; };
    const A = sum(ayer), H = sum(hoy), lines = ['¡Atención, equipo! Junta rápida, prometo que es corta.'];
    lines.push(A.n ? `Ayer volamos ${A.n} tareas${A.otp != null ? ` con OTP de ${A.otp}%` : ''}${A.fails ? ` y ${A.fails} cancelada${A.fails > 1 ? 's' : ''}` : ''}.` : 'Ayer no hubo vuelos. Ni uno. Nadie dice nada.');
    if (top(ayer)) lines.push(`Mención especial para ${top(ayer)}, el que más voló ayer.`);
    lines.push(H.n ? `Hoy llevamos ${H.n}${H.otp != null ? `, a ${H.otp}% de puntualidad` : ''}. ¡Sigan así!` : 'Hoy la pista está libre. El CEO espera grandes cosas.');
    if (metar) lines.push(`El clima en PUJ: ${metar.temp} grados, viento de ${metar.wspd} nudos, ${metar.fltCat === 'VFR' ? 'cielo para volar' : 'ojo con el tiempo'}.`);
    lines.push('Eso es todo. ¡A trabajar! Y que alguien le dé de comer al gato.');
    if (sim.meeting(lines)) { speak('junta'); ctx.chime('assign'); }
  }
  $('#juntaBtn').onclick = junta;

  // ================= paleta de comandos (⌘K / Ctrl+K) =================
  const pal = $('#palette'), pin = $('#palInput'), plist = $('#palList');
  const COMMANDS = [['simulacro', 'Simulacro de incendio', () => $('#fireBtn').click()], ['junta', 'Convocar junta del equipo', junta],
    ['libro', 'Abrir el Libro de vuelo', () => $('#bookBtn').click()], ['dundies', 'Ver los Dundies', async () => { tab = 'dundies'; $('#bookBtn').click(); setTimeout(() => document.querySelector('[data-btab=dundies]').click(), 300); }],
    ['tv', 'Modo TV', () => $('#tvBtn').click()], ['demo', 'Simular una jornada', () => $('#demoBtn').click()]];
  let sel = 0, opts = [];
  function openPalette(prefill = '') { pal.hidden = false; pin.value = prefill; sel = 0; paintPal(); setTimeout(() => pin.focus(), 20); }
  function paintPal() {
    const v = pin.value.trim(), m = v.match(/^@(\S*)\s*(.*)$/s);
    if (m) {
      const q = m[1].toLowerCase(), cands = ['michael', ...AGENTS.filter(a => a !== 'michael')].filter(a => a.startsWith(q) || nick(a).toLowerCase().startsWith(q));
      opts = cands.slice(0, 7).map(a => ({ label: `Hablar con ${nick(a)}`, hint: m[2] ? `«${m[2].slice(0, 60)}»` : CAST[a].role, run: () => { ctx.openChat(a, m[2]); } }));
    } else {
      const q = v.toLowerCase();
      opts = COMMANDS.filter(c => !q || c[1].toLowerCase().includes(q) || c[0].includes(q)).map(c => ({ label: c[1], hint: '', run: c[2] }));
      if (q) opts.push(...AGENTS.filter(a => nick(a).toLowerCase().includes(q)).slice(0, 4).map(a => ({ label: `Hablar con ${nick(a)}`, hint: CAST[a].role, run: () => ctx.openChat(a) })));
    }
    sel = Math.min(sel, Math.max(0, opts.length - 1));
    plist.innerHTML = opts.map((o, i) => `<li class="${i === sel ? 'on' : ''}" data-i="${i}"><b>${esc(o.label)}</b><span>${esc(o.hint)}</span></li>`).join('') || '<li class="none">Escribe @ y el nombre de un agente, o un comando.</li>';
    plist.querySelectorAll('li[data-i]').forEach(li => li.onclick = () => { sel = +li.dataset.i; runSel(); });
  }
  function runSel() { const o = opts[sel]; if (!o) return; pal.hidden = true; o.run(); }
  pin.oninput = () => { sel = 0; paintPal(); };
  pin.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(opts.length - 1, sel + 1); paintPal(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paintPal(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(); }
    else if (e.key === 'Escape') pal.hidden = true;
  };
  pal.addEventListener('click', e => { if (e.target === pal) pal.hidden = true; });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : (pal.hidden = true); }
    if (e.key === 'Escape') { if (!book.hidden) book.hidden = true; }
  });
  $('#palBtn').onclick = () => openPalette('@');

  refreshCounts();
  return { onAct, game, junta, openPalette };
}
