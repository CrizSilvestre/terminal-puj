import { W, H, CAST, Flights, pujHour, pujDayStart, pick, fmtTime, nick } from './data.js';
import { buildStatic, buildProps, Sky, drawWallDynamic, drawLighting, nightness } from './world.js';
import { Sim } from './sim.js';
import { UI } from './ui.js';
import { createExtras } from './extras.js';

// ---------- contenido (diálogos y radio de Antigravity, con respaldo) ----------
let LINES = null, RADIO = null, PROFILES = null;
const RADIO_FALLBACK = {
  pedido: ['Torre: {vuelo}, pedido recibido. {desc}.'], asignado: ['Torre: {vuelo}, autorizado a rodar rumbo {destino}. {agente} al mando.'],
  despegue: ['{vuelo}: en el aire rumbo {destino}.'], demorado: ['Torre: {vuelo}, {min} minutos en vuelo. Reporte posición.'],
  aterrizado: ['Torre: {vuelo}, aterrizado. Bienvenido a {destino}.'], cancelado: ['Torre: {vuelo}, motor y al aire. {agente}, regrese a base.'],
  fin: ['Torre: {vuelo}, cierre frecuencia. Buen trabajo.'],
};
const load = async (u) => { try { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? r.json() : null; } catch { return null; } };

// ---------- lienzo ----------
const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
const wrap = document.getElementById('stageWrap');
let scale = 2;
function fit() {
  const fs = !!document.fullscreenElement;
  const w = wrap.clientWidth, hmax = fs ? window.innerHeight - 90 : Infinity; let s = Math.min(w / W, hmax / H);
  if (!fs && w < 640) s = Math.max(s, 1.5); // en el celular se desliza en lugar de encoger
  scale = !fs && s >= 2 ? Math.floor(s) : s;
  canvas.style.width = Math.round(W * scale) + 'px'; canvas.style.height = Math.round(H * scale) + 'px';
}
new ResizeObserver(fit).observe(wrap);

const STATIC = buildStatic(), PROPS = buildProps(), sky = new Sky();
let extras = null;
const sim = new Sim({ bubble: (id, t, ms, k) => ui.bubble(id, t, ms, k), lines: () => LINES, game: (n, d) => extras && extras.game(n, d) });
const ui = new UI(sim, () => PROFILES);
ui.requests = () => flights.requests;
window.__oficina = { sim, ui, sky }; // para depurar desde la consola
let flights = new Flights();

// ---------- sonido (campanita de aeropuerto) ----------
let audio = null, soundOn = false;
try { soundOn = localStorage.getItem('dm-sound') === '1'; } catch {}
function chime(kind = 'land') {
  if (!soundOn) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'land' ? [659.25, 523.25] : kind === 'fail' ? [392, 311.13] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + i * 0.32;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.1);
      o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + 1.2);
    });
  } catch {}
}

// ---------- radio ----------
function say(kind, vars) {
  const set = (RADIO && RADIO[kind]?.length ? RADIO : RADIO_FALLBACK)[kind];
  let txt = pick(set);
  for (const [k, v] of Object.entries(vars)) txt = txt.split('{' + k + '}').join(v ?? '');
  ui.radio(txt, kind);
}
const LIVERY = f => f.agent === 'hooli' ? 'hooli' : f.agent === 'creed' ? 'creed' : CAST[f.agent]?.wing === 'pp' ? 'pp' : 'dm';
const agentName = f => nick(f.agent);

// ---------- acciones (eventos → animación) ----------
function act(a, silent) {
  if (!a) return;
  if (!silent && extras) extras.onAct(a);
  const now = Date.now() / 1000;
  if (a.type === 'request') {
    if (silent) return;
    say('pedido', { vuelo: a.req.no, destino: 'TORRE', desc: trim(a.req.desc, 70), agente: 'Michael' });
    sim.memo(); // el memo sale de la oficina del CEO
    ui.bubble('ceo', trim(a.req.desc, 70), 4200, 'event');
    const g = gen; setTimeout(() => { if (g === gen) ui.bubble('michael', pick(['Recibido, jefe. Despachando.', 'Copiado, CEO. Ya reparto.', '¡Memo del CEO! Todos a sus puestos.']), 3200, 'event'); }, 2200);
  } else if (a.type === 'stop') {
    if (silent || !a.req) return;
    say('fin', { vuelo: a.req?.no || 'MS100', destino: a.req ? 'PUJ' : 'PUJ', agente: 'Michael' });
  } else if (a.type === 'assign') {
    const f = a.flight;
    if (silent) { if (now - f.start > 900) f.delayedNoted = true; return; }
    f.visibleAt = now + 2.4;
    if (f.agent === 'hooli') { sim.paperPlane({ x: 240, y: 84 }, { x: 404, y: 210 }, null, 'out'); }
    else sim.assign(f.agent);
    sky.spawn('takeoff', LIVERY(f));
    say('asignado', { vuelo: f.no, destino: f.dest.name, agente: agentName(f), desc: trim(f.desc, 60) });
    const g = gen; setTimeout(() => { if (g === gen) say('despegue', { vuelo: f.no, destino: f.dest.name, agente: agentName(f), desc: trim(f.desc, 60) }); }, 2600);
    chime('assign');
  } else if (a.type === 'land' || a.type === 'cancel') {
    const f = a.flight, ok = a.type === 'land';
    if (silent) return;
    if (f.agent === 'hooli') sim.deliverHooli(ok); else sim.deliver(f.agent, ok);
    sky.spawn(ok ? 'land' : 'goaround', LIVERY(f));
    say(ok ? 'aterrizado' : 'cancelado', { vuelo: f.no, destino: f.dest.name, agente: agentName(f), desc: trim(f.desc, 60) });
    const ent = LINES?.entrega?.[f.agent];
    if (ok && ent?.length) ui.bubble(f.agent, pick(ent), 4200, 'event');
    if (!ok) ui.bubble(f.agent, 'No pude con esto: ' + trim(f.desc, 50), 4200, 'event');
    chime(ok ? 'land' : 'fail');
  }
}
const trim = (s, n) => (s || '').length > n ? s.slice(0, n - 1) + '…' : (s || '');

// ---------- datos en vivo ----------
let PUBLIC = false; // sin servidor (GitHub Pages): demo en bucle
let lastTs = 0, initial = true, demo = false, liveOk = false, agyInit = true, polling = false, gen = 0;
async function poll() {
  if (demo || polling || PUBLIC) return; // nunca dos sondeos a la vez: el segundo reproduciría el historial
  polling = true; const myGen = gen;
  try {
    const r = await fetch('api/events?since=' + lastTs, { cache: 'no-store' });
    const evs = await r.json();
    if (myGen !== gen || demo) return; // la demo empezó o terminó mientras tanto
    for (const e of evs) { act(flights.apply(e), initial); lastTs = Math.max(lastTs, e.ts); }
    initial = false; liveOk = true;
  } catch { liveOk = false; }
  finally { polling = false; }
  setStatus();
}
async function pollAgy() {
  if (demo || PUBLIC) return;
  const d = await load('api/agy');
  if (!d || !d.available) { document.getElementById('agyState').textContent = 'Antigravity: sin datos'; return; }
  for (const a of flights.syncHooli(d.tasks || [])) act(a, agyInit);
  agyInit = false;
  document.getElementById('agyState').textContent = `Antigravity: ${d.running} en curso · ${d.done} hechas hoy`;
}
function setStatus() {
  const dot = document.getElementById('liveDot'), txt = document.getElementById('liveTxt');
  if (PUBLIC) { dot.className = 'dot demo'; txt.textContent = 'Demo pública'; }
  else if (demo) { dot.className = 'dot demo'; txt.textContent = 'Simulación'; }
  else if (liveOk) { dot.className = 'dot live'; txt.textContent = 'En vivo'; }
  else { dot.className = 'dot'; txt.textContent = 'Sin servidor'; }
}

// ---------- simulación de una jornada ----------
const DEMO = [
  [0, 'UserPromptSubmit', null, 'Arregla el parser de TS.xls y revisa que nada se rompa', 'aerogate'],
  [1.5, 'PreToolUse', 'richard', 'Diseñar el arreglo del parser de TS.xls', 'aerogate'],
  [7, 'PostToolUse', 'richard', 'Diseñar el arreglo del parser de TS.xls', 'aerogate'],
  [8, 'PreToolUse', 'jim', 'Corregir lectura de fechas en TS.xls', 'aerogate'],
  [8.6, 'PreToolUse', 'dinesh', 'Prueba que reproduce el bug de fechas', 'aerogate'],
  [9.2, 'PreToolUse', 'kevin', 'Listar fixtures en Itinerarios Prueba', 'aerogate'],
  [13, 'PostToolUse', 'kevin', 'Listar fixtures en Itinerarios Prueba', 'aerogate'],
  [17, 'PostToolUse', 'dinesh', 'Prueba que reproduce el bug de fechas', 'aerogate'],
  [20, 'PostToolUse', 'jim', 'Corregir lectura de fechas en TS.xls', 'aerogate'],
  [21, 'PreToolUse', 'dwight', 'Revisar el arreglo y casos borde', 'aerogate'],
  [21.5, 'PreToolUse', 'darryl', 'Validar pernoctas contra la operación real', 'aerogate'],
  [22, 'PreToolUse', 'toby', 'Buscar secretos antes del push', 'aerogate'],
  [26, 'PostToolUseFailure', 'toby', 'Buscar secretos antes del push', 'aerogate'],
  [29, 'PostToolUse', 'darryl', 'Validar pernoctas contra la operación real', 'aerogate'],
  [31, 'PostToolUse', 'dwight', 'Revisar el arreglo y casos borde', 'aerogate'],
  [32, 'Stop', null, '', 'aerogate'],
  [33, 'UserPromptSubmit', null, 'Prepara la Unidad 4 y 5 títulos para el Short de mañana', 'tesis-otp'],
  [34, 'PreToolUse', 'angela', 'Formato UAPA y APA de la Unidad 4', 'tesis-otp'],
  [34.5, 'PreToolUse', 'oscar', 'Reproducir AUC 0,845 con la data nueva', 'tesis-otp'],
  [35, 'PreToolUse', 'erlich', 'Cinco títulos para el Short de GTA VI', 'GTA VI Clip'],
  [35.5, 'PreToolUse', 'bighead', 'Encargar a Antigravity el glosario SSIM', 'aerogate'],
  [36, 'HOOLI', 2], [41, 'PostToolUse', 'erlich', 'Cinco títulos para el Short de GTA VI', 'GTA VI Clip'],
  [44, 'PostToolUse', 'oscar', 'Reproducir AUC 0,845 con la data nueva', 'tesis-otp'],
  [46, 'HOOLI', 0], [47, 'PostToolUse', 'bighead', 'Encargar a Antigravity el glosario SSIM', 'aerogate'],
  [49, 'PostToolUse', 'angela', 'Formato UAPA y APA de la Unidad 4', 'tesis-otp'],
  [50, 'PreToolUse', 'Explore', 'Buscar dónde se exporta el PDF', 'tesis-otp'],
  [54, 'PostToolUse', 'Explore', 'Buscar dónde se exporta el PDF', 'tesis-otp'],
  [56, 'Stop', null, '', 'tesis-otp'],
];
let demoTimers = [], demoT0 = 0, hooliDemo = [];
function runDemo() {
  demoTimers.forEach(clearTimeout); demoTimers = [];
  gen++; demo = true; flights = new Flights(); demoT0 = performance.now(); hooliDemo = []; setStatus();
  document.getElementById('radio').innerHTML = ''; ui.radioItems = [];
  DEMO.forEach(([t, ev, agent, desc, cwd]) => demoTimers.push(setTimeout(() => {
    if (ev === 'HOOLI') {
      const n = agent, base = Date.now();
      if (n > 0) for (let i = 0; i < n; i++) hooliDemo.push({ id: 'D' + i, title: ['Glosario SSIM', 'Inventario de parsers'][i], workspace: 'aerogate', status: 'running', startedAt: new Date(base).toISOString() });
      else hooliDemo.forEach(t => { t.status = 'done'; t.finishedAt = new Date().toISOString(); });
      for (const a of flights.syncHooli(hooliDemo)) act(a, false);
      return;
    }
    const e = { ts: Date.now() / 1000, event: ev, agent, desc, cwd, session: 'demo', id: agent ? agent + ':' + desc : null };
    act(flights.apply(e), false);
  }, t * 1000)));
  demoTimers.push(setTimeout(endDemo, 66000));
}
function endDemo() {
  demoTimers.forEach(clearTimeout); demoTimers = [];
  if (PUBLIC) { runDemo(); return; }
  gen++; demo = false; flights = new Flights(); lastTs = 0; initial = true; agyInit = true; setStatus(); poll(); pollAgy();
}

// ---------- hora del cielo ----------
let skyMode = 'live';
const FORCED_HOUR = parseFloat(new URLSearchParams(location.search).get('hora'));
function hourNow() {
  if (!Number.isNaN(FORCED_HOUR)) return ((FORCED_HOUR % 24) + 24) % 24; // ?hora=10 fija el cielo
  if (demo) return (17.2 + (performance.now() - demoT0) / 1000 / 66 * 6.5) % 24; // atardecer → noche durante la demo
  if (skyMode === 'cycle') return (performance.now() / 1000 / 2.5) % 24; // un día en 60 s
  return pujHour();
}

// ---------- controles ----------
document.getElementById('demoBtn').onclick = () => demo ? endDemo() : runDemo();
const soundBtn = document.getElementById('soundBtn');
const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.querySelector('span').textContent = soundOn ? 'Sonido' : 'Silencio'; };
soundBtn.onclick = () => { soundOn = !soundOn; try { localStorage.setItem('dm-sound', soundOn ? '1' : '0'); } catch {} paintSound(); chime('assign'); };
paintSound();
const skyBtn = document.getElementById('skyBtn');
skyBtn.onclick = () => { skyMode = skyMode === 'live' ? 'cycle' : 'live'; skyBtn.setAttribute('aria-pressed', skyMode === 'cycle'); skyBtn.querySelector('span').textContent = skyMode === 'cycle' ? 'Día en 60 s' : 'Cielo real'; };
const namesBtn = document.getElementById('namesBtn');
namesBtn.onclick = () => { sim.showNames = !sim.showNames; namesBtn.setAttribute('aria-pressed', sim.showNames); };
const themeBtn = document.getElementById('themeBtn');
try { const t = localStorage.getItem('dm-theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
themeBtn.onclick = () => {
  const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('dm-theme', r.dataset.theme); } catch {}
};
// modo TV y atajos
const stageCard = document.querySelector('.stage');
const toggleTV = () => { if (document.fullscreenElement) document.exitFullscreen(); else stageCard.requestFullscreen?.(); };
document.getElementById('tvBtn').onclick = toggleTV;
document.addEventListener('fullscreenchange', () => setTimeout(fit, 50));
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 's') document.getElementById('demoBtn').click();
  else if (k === 'f') toggleTV();
  else if (k === 'n') namesBtn.click();
  else if (k === 'm') soundBtn.click();
  else if (k === 'c') skyBtn.click();
  else if (k === 'i') fireBtn.click();
  else if (k === 'escape') chatBox.hidden = true;
});
// interacción con el lienzo
const toWorld = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H, e.clientX - b.left, e.clientY - b.top]; };
// --- modo juego: agarrar y soltar (mouse: arrastrar · táctil: tocar para agarrar y tocar para soltar) ---
let press = null, touchHeld = false, chatFuel = 0, longT = null;
async function loadChatFuel() { const cs = await load('api/chats'); if (!cs) return; const s0 = pujDayStart(); chatFuel = Object.values(cs).reduce((a, st) => a + (st.replies || []).filter(r => r[0] >= s0).reduce((b, r) => b + r[1], 0), 0); }
// Clic en un personaje = hablar con él (tú, el CEO, hablas con Michael). En la demo pública, su ficha.
function talkTo(id) {
  if (PUBLIC) { ui.select(id); document.getElementById('profile').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  ui.select(id, true);
  openChat(id === 'ceo' ? 'michael' : id);
}
canvas.addEventListener('pointerdown', e => {
  const [x, y] = toWorld(e);
  if (touchHeld && sim.held) { sim.drop(x, y); touchHeld = false; canvas.classList.remove('grabbing'); press = null; return; }
  press = { x, y, cx: e.clientX, cy: e.clientY, id: sim.pick(x, y), type: e.pointerType, grabbed: false };
  if (press.type === 'mouse' && press.id) e.preventDefault();
  // táctil: mantener presionado = agarrar
  clearTimeout(longT);
  if (press.type !== 'mouse' && press.id) longT = setTimeout(() => {
    if (!press || press.grabbed) return;
    touchHeld = sim.grab(press.id, press.x, press.y); press.grabbed = 'touch';
    if (touchHeld) { canvas.classList.add('grabbing'); ui.bubble(press.id, 'Toca donde quieras soltarme.', 2200, 'chat'); navigator.vibrate?.(30); }
  }, 450);
});
canvas.addEventListener('pointermove', e => {
  const [x, y, px, py] = toWorld(e);
  if (press && press.type !== 'mouse' && Math.hypot(e.clientX - press.cx, e.clientY - press.cy) > 8) clearTimeout(longT); // estaba deslizando
  if (press && press.type === 'mouse' && press.id && !press.grabbed && Math.hypot(e.clientX - press.cx, e.clientY - press.cy) > 5) {
    press.grabbed = sim.grab(press.id, x, y); canvas.classList.add('grabbing'); ui.tooltip(null);
  }
  if (sim.held && press?.grabbed === true) { sim.moveHeld(x, y); return; }
  if (sim.held && touchHeld) return;
  const id = sim.pick(x, y); sim.hover = id; canvas.style.cursor = id ? 'pointer' : 'default';
  ui.tooltip(id, px, py, null, [...flights.map.values()]);
});
window.addEventListener('pointerup', e => {
  clearTimeout(longT);
  if (!press) return;
  const p = press; press = null;
  if (p.grabbed === true) { const [x, y] = toWorld(e); sim.drop(x, y); canvas.classList.remove('grabbing'); return; }
  if (p.grabbed === 'touch') return; // queda agarrado hasta el próximo toque
  if (e.target !== canvas) return;
  if (p.id) { ui.tooltip(null); talkTo(p.id); }
  else sim.poke(p.x, p.y);
});
canvas.addEventListener('mouseleave', () => { sim.hover = null; ui.tooltip(null); });
extras = createExtras({ sim, ui, sky, chime, flights: () => flights, isPublic: () => PUBLIC, openChat: (id, t) => openChat(id, t, true) });
// --- simulacro de incendio ---
const fireBtn = document.getElementById('fireBtn');
fireBtn.onclick = () => { if (sim.drill > 0) return; sim.fireDrill(); chime('fail'); extras?.onAct({ type: 'drill' }); };
// --- chat con los agentes ---
const chatBox = document.getElementById('chat'), chatInput = document.getElementById('chatInput');
async function openChat(id, text, send = true) {
  if (PUBLIC) { ui.bubble(id === 'hooli' ? 'bighead' : id, 'El chat funciona en tu Mac, con la oficina abierta desde Terminal PUJ.', 3800, 'event'); return; }
  const d = await load('api/chat?agent=' + id) || { messages: [], busy: false };
  ui.openChat(id, d.messages || [], d.busy);
  if (text) { chatInput.value = text; if (send && !d.busy) document.getElementById('chatForm').requestSubmit(); }
}
ui.onChat = id => openChat(id);
ui.onExample = (id, text) => openChat(id, text, false);
document.getElementById('chatClose').onclick = () => { chatBox.hidden = true; };
document.getElementById('chatReset').onclick = async () => {
  const id = chatBox.dataset.agent;
  await fetch('api/chat/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: id }) });
  ui.renderChat([], false);
};
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('chatForm').requestSubmit(); } });
document.getElementById('chatForm').onsubmit = async e => {
  e.preventDefault();
  const id = chatBox.dataset.agent, text = chatInput.value.trim(); if (!text) return;
  chatInput.value = '';
  const prev = (await load('api/chat?agent=' + id))?.messages || [];
  const pending = [...prev, { from: 'ceo', text }];
  ui.renderChat(pending, true);
  // en la oficina: tu memo vuela al agente y se sienta a teclear
  sim.talking.add(id);
  const c = sim.chars[id];
  if (c) sim.paperPlane({ x: sim.chars.ceo.x, y: sim.chars.ceo.y - 14 }, { x: c.x, y: c.y - 14 }, null, 'memo');
  ui.bubble('ceo', text.length > 60 ? text.slice(0, 59) + '…' : text, 3200, 'event');
  let r;
  try { r = await (await fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: id, text }) })).json(); }
  catch { r = { error: 'No hay conexión con el servidor de la oficina.' }; }
  sim.talking.delete(id);
  if (r.tokens) chatFuel += r.tokens;
  if (r.error) { pending.push({ from: id, text: '⚠️ ' + r.error }); ui.renderChat(pending, false); return; }
  if (c) { c.cheerT = 1; ui.bubble(id, r.reply.replace(/[*#`]/g, '').split(/(?<=[.!?])\s/)[0].slice(0, 110), 4500, 'event'); }
  if (!chatBox.hidden && chatBox.dataset.agent === id) ui.renderChat((await load('api/chat?agent=' + id))?.messages || pending, false);
  chime('land');
};

// ---------- reloj de cabecera ----------
function clocks() {
  const d = new Date();
  document.getElementById('clkPuj').textContent = d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santo_Domingo' });
  document.getElementById('clkUtc').textContent = d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + 'Z';
}

// ---------- bucle ----------
let last = performance.now(), slow = 0;
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  const t = nowMs / 1000, now = Date.now() / 1000, h = hourNow(), n = nightness(h);
  // trabajo visible por agente
  const counts = {};
  for (const f of flights.active(now)) if (!f.visibleAt || f.visibleAt <= now) counts[f.agent] = (counts[f.agent] || 0) + 1;
  for (const [id, c] of Object.entries(sim.chars)) c.working = counts[id] || 0;
  for (const id of sim.talking) if (id === 'michael') sim.michaelChat = true;
  sim.michaelBusy = flights.michaelBusy(now) || sim.talking.has('michael');
  sim.setHooli(counts.hooli || 0);
  sim.update(dt, t, { n });
  sky.update(dt);
  // entorno para el mobiliario
  const working = new Set([...Object.keys(counts).filter(k => counts[k] > 0), ...sim.talking]);
  const seated = new Set(Object.values(sim.chars).filter(c => c.sitting).map(c => c.id));
  const at = name => [...Object.values(sim.chars)].some(c => c.poi === name && !c.path);
  const glows = [];
  for (const c of Object.values(sim.chars)) if (c.sitting && (working.has(c.id) || (c.id === 'michael' && sim.michaelBusy))) glows.push(c.seat.dir === 'up' ? [c.desk.x + c.desk.w / 2, c.desk.y - 1, 16] : [c.x, c.y - 13, 12]);
  if (sim.chars.ceo?.sitting && sim.ceoBusy()) glows.push([sim.chars.ceo.x, sim.chars.ceo.y - 13, 12, 'rgba(255,214,120,A)']);
  for (const c of sim.contractors) if (c.sitting) glows.push([c.desk.x + c.desk.w / 2, c.desk.y - 1, 14, 'rgba(244,180,0,A)']);
  glows.push([268, 162, 18, 'rgba(255,90,90,A)', 0.12], [423, 78, 14, 'rgba(61,255,122,A)', 0.14], [240, 76, 14, 'rgba(125,255,176,A)', 0.14], [211, 122, 8, 'rgba(255,80,80,A)', 0.1]);
  const env = { t, n, h, working, seated, michael: sim.michaelBusy, hooliOn: sim.contractors.filter(c => c.sitting && !c.leaving).length,
    radar: flights.active(now).map((f, i) => ((f.start * 7.13) % 1)), pingpong: at('pingA') && at('pingB'), copying: at('copier'), antonFlash: sim.antonT > 0, glows };
  // --- render ---
  ctx.clearRect(0, 0, W, H);
  sky.draw(ctx, t, h);
  ctx.drawImage(STATIC, 0, 0);
  drawWallDynamic(ctx, t, h);
  sim.drawPaper(ctx, 'shadow');
  sim.drawPuffs(ctx);
  const list = [...PROPS.map(p => ({ y: p.y, prop: p })), ...sim.drawables()].sort((a, b) => a.y - b.y);
  for (const it of list) { if (it.prop) it.prop.draw(ctx, env); else if (it.char) sim.drawChar(ctx, it.char, t); else if (it.cat) sim.drawCat(ctx, t); }
  drawLighting(ctx, env);
  sim.drawPaper(ctx, 'plane');
  sim.overlays(ctx, t);
  ui.placeBubbles(canvas.getBoundingClientRect().width / W);
  // --- panel (1 vez por segundo) ---
  slow -= dt;
  if (slow <= 0) {
    slow = 1;
    ui.renderBoard(flights.board(now), (f, nn) => flights.status(f, nn), now);
    { const st = flights.stats(now); st.fuel += PUBLIC ? 0 : chatFuel; ui.renderStats(st); }
    const byAgent = {}; for (const f of flights.active(now)) byAgent[f.agent] = (byAgent[f.agent] || 0) + 1;
    ui.renderCrew(sim.snapshot(), byAgent, [...flights.map.values()], now, (f, nn) => flights.status(f, nn));
    for (const f of flights.active(now)) if (now - f.start > 900 && !f.delayedNoted) { f.delayedNoted = true; if (!initial) { const min = Math.round((now - f.start) / 60); say('demorado', { vuelo: f.no, destino: f.dest.name, agente: agentName(f), min, desc: trim(f.desc, 50) }); extras?.onAct({ type: 'delay', flight: f, min }); } }
    clocks();
    document.getElementById('skyLabel').textContent = h >= 5.5 && h < 7.5 ? 'Amanecer' : h >= 7.5 && h < 17 ? 'Día' : h >= 17 && h < 19.5 ? 'Atardecer' : 'Noche';
  }
  requestAnimationFrame(frame);
}

// ---------- arranque ----------
(async () => {
  fit();
  [LINES, RADIO, PROFILES] = await Promise.all([load('static/dialogos.json'), load('static/radio.json'), load('static/perfiles.json')]);
  if (PROFILES) ui.select(ui.selected, !!sim.selected);
  if (LINES?.idle) { // frases del CEO (tú)
    LINES.idle.ceo = ['¿Cómo va la OTP de hoy?', 'Quiero ese parser listo antes del vuelo de las 6.', 'Buen trabajo, equipo. Sigan así.', 'Michael, ¿quién está en vuelo?', 'Esta oficina ya parece una aerolínea.', 'Revisen todo antes del push, por favor.'];
    LINES.trabajando = LINES.trabajando || {}; LINES.trabajando.ceo = ['Firmando el memo para la Torre.'];
  }
  await poll(); await pollAgy(); loadChatFuel(); setInterval(loadChatFuel, 60000);
  if (!liveOk) { PUBLIC = true; document.getElementById('demoBtn').hidden = true; document.getElementById('agyState').textContent = 'Demo: la versión en vivo corre en tu Mac'; runDemo(); }
  setInterval(poll, 1500); setInterval(pollAgy, 5000);
  requestAnimationFrame(frame);
  if (!flights.map.size) ui.radio('Torre Punta Cana: frecuencia abierta. Sin tráfico por ahora.', 'info');
})();
