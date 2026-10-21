import { W, H, CAST, Flights, pujHour, pick, fmtTime, nick } from './data.js';
import { buildStatic, buildProps, Sky, drawWallDynamic, drawLighting, nightness } from './world.js';
import { Sim } from './sim.js';
import { UI } from './ui.js';

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
const sim = new Sim({ bubble: (id, t, ms, k) => ui.bubble(id, t, ms, k), lines: () => LINES });
const ui = new UI(sim, () => PROFILES);
ui.requests = () => flights.requests;
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
  const now = Date.now() / 1000;
  if (a.type === 'request') {
    if (silent) return;
    say('pedido', { vuelo: a.req.no, destino: 'TORRE', desc: trim(a.req.desc, 70), agente: 'Michael' });
    ui.bubble('michael', 'Nuevo pedido: ' + trim(a.req.desc, 60), 4500, 'event');
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
});
// interacción con el lienzo
const toWorld = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H, e.clientX - b.left, e.clientY - b.top]; };
canvas.addEventListener('mousemove', e => { const [x, y, px, py] = toWorld(e); const id = sim.pick(x, y); sim.hover = id; canvas.style.cursor = id ? 'pointer' : 'default'; ui.tooltip(id, px, py, null, [...flights.map.values()]); });
canvas.addEventListener('mouseleave', () => { sim.hover = null; ui.tooltip(null); });
canvas.addEventListener('click', e => { const [x, y] = toWorld(e); const id = sim.pick(x, y); if (id) { ui.select(id); document.getElementById('profile').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });

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
  sim.michaelBusy = flights.michaelBusy(now);
  sim.setHooli(counts.hooli || 0);
  sim.update(dt, t, { n });
  sky.update(dt);
  // entorno para el mobiliario
  const working = new Set(Object.keys(counts).filter(k => counts[k] > 0));
  const seated = new Set(Object.values(sim.chars).filter(c => c.sitting).map(c => c.id));
  const at = name => [...Object.values(sim.chars)].some(c => c.poi === name && !c.path);
  const glows = [];
  for (const c of Object.values(sim.chars)) if (c.sitting && (working.has(c.id) || (c.id === 'michael' && sim.michaelBusy))) glows.push(c.seat.dir === 'up' ? [c.desk.x + c.desk.w / 2, c.desk.y - 1, 16] : [c.x, c.y - 13, 12]);
  for (const c of sim.contractors) if (c.sitting) glows.push([c.desk.x + c.desk.w / 2, c.desk.y - 1, 14, 'rgba(244,180,0,A)']);
  glows.push([268, 162, 18, 'rgba(255,90,90,A)', 0.12], [423, 78, 14, 'rgba(61,255,122,A)', 0.14], [240, 76, 14, 'rgba(125,255,176,A)', 0.14], [211, 122, 8, 'rgba(255,80,80,A)', 0.1]);
  const env = { t, n, h, working, seated, michael: sim.michaelBusy, hooliOn: sim.contractors.filter(c => c.sitting && !c.leaving).length,
    radar: flights.active(now).map((f, i) => ((f.start * 7.13) % 1)), pingpong: at('pingA') && at('pingB'), copying: at('copier'), glows };
  // --- render ---
  ctx.clearRect(0, 0, W, H);
  sky.draw(ctx, t, h);
  ctx.drawImage(STATIC, 0, 0);
  drawWallDynamic(ctx, t, h);
  sim.drawPaper(ctx, 'shadow');
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
    ui.renderStats(flights.stats(now));
    const byAgent = {}; for (const f of flights.active(now)) byAgent[f.agent] = (byAgent[f.agent] || 0) + 1;
    ui.renderCrew(sim.snapshot(), byAgent, [...flights.map.values()], now, (f, nn) => flights.status(f, nn));
    for (const f of flights.active(now)) if (now - f.start > 900 && !f.delayedNoted) { f.delayedNoted = true; if (!initial) say('demorado', { vuelo: f.no, destino: f.dest.name, agente: agentName(f), min: Math.round((now - f.start) / 60), desc: trim(f.desc, 50) }); }
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
  await poll(); await pollAgy();
  if (!liveOk) { PUBLIC = true; document.getElementById('demoBtn').hidden = true; document.getElementById('agyState').textContent = 'Demo: la versión en vivo corre en tu Mac'; runDemo(); }
  setInterval(poll, 1500); setInterval(pollAgy, 5000);
  requestAnimationFrame(frame);
  if (!flights.map.size) ui.radio('Torre Punta Cana: frecuencia abierta. Sin tráfico por ahora.', 'info');
})();
