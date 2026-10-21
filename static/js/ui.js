// Interfaz: pantalla de salidas (split-flap), estadísticas, radio, tripulación, ficha y burbujas.
import { CAST, CEO_IDS, DM_IDS, PP_IDS, W, H, fmtTime, shortName, pujDayStart, nick } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// ---------- split-flap ----------
const FLAP_MS = 340;
function flapTo(el, text) {
  if (el.dataset.v === text) {
    // si el navegador frenó los temporizadores (pestaña en segundo plano), se fuerza el final
    if (el.textContent !== text && performance.now() - (+el.dataset.t0 || 0) > FLAP_MS) el.textContent = text;
    return;
  }
  el.dataset.v = text; el.dataset.t0 = performance.now();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !el.isConnected || document.hidden) { el.textContent = text; return; }
  el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
  const t0 = performance.now();
  clearTimeout(el._flap);
  const tick = () => {
    if (el.dataset.v !== text) return;
    const k = (performance.now() - t0) / FLAP_MS;
    if (k >= 1) { el.textContent = text; return; }
    const shown = Math.floor(k * 1.4 * text.length) - 2;
    el.textContent = text.split('').map((ch, i) => ch === ' ' || i < shown ? ch : FLAP[Math.floor(Math.random() * FLAP.length)]).join('');
    el._flap = setTimeout(tick, 45);
  };
  tick();
}

const STATUS_CLASS = { 'EMBARCANDO': 'boarding', 'EN VUELO': 'air', 'DEMORADO': 'delay', 'ATERRIZÓ': 'landed', 'CANCELADO': 'cancel', 'SIN CONTACTO': 'lost' };

export class UI {
  constructor(sim, getProfiles) {
    this.sim = sim; this.getProfiles = getProfiles; this.bubbles = new Map(); this.radioItems = [];
    this.rows = []; this.filter = 'all'; this.selected = 'michael';
    this.buildBoard(); this.buildCrew();
  }
  // ---------- pantalla de salidas ----------
  buildBoard() {
    const body = $('#fidsBody'); body.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const r = document.createElement('div'); r.className = 'frow';
      r.innerHTML = '<span class="c t"></span><span class="c f"></span><span class="c d"></span><span class="c a"></span><span class="c g"></span><span class="c s"></span><span class="desc"></span>';
      r.tabIndex = 0; r.setAttribute('role', 'button');
      r.onclick = () => { const a = r.dataset.agent; if (a) this.select(a === 'hooli' ? 'bighead' : a); document.getElementById('profile').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } };
      body.appendChild(r); this.rows.push(r);
    }
  }
  renderBoard(flights, status, now) {
    $('#fidsEmpty').hidden = flights.length > 0;
    this.rows.forEach((r, i) => {
      const f = flights[i];
      r.hidden = !f;
      if (!f) return;
      const st = status(f, now), cells = r.querySelectorAll('.c');
      flapTo(cells[0], fmtTime(f.start));
      flapTo(cells[1], f.no);
      flapTo(cells[2], f.dest.name.slice(0, 8));
      flapTo(cells[3], shortName(f.agent).slice(0, 8));
      flapTo(cells[4], f.gate);
      flapTo(cells[5], st);
      cells[5].className = 'c s ' + (STATUS_CLASS[st] || '');
      const mins = Math.max(0, Math.round(((f.end || now) - f.start) / 60));
      r.querySelector('.desc').textContent = (f.end && f.result ? '✓ ' + f.result : (f.desc || '')) + (f.end ? ` · bloque ${mins} min` : st === 'EN VUELO' || st === 'DEMORADO' ? ` · ${mins} min en vuelo` : '');
      r.title = f.desc + (f.result ? '\n\nResultado: ' + f.result : '');
      r.setAttribute('aria-label', `Vuelo ${f.no}, ${shortName(f.agent)}, ${st}: ${f.desc}`);
      r.dataset.agent = f.agent;
    });
  }
  renderStats(s) {
    const set = (id, v) => { const el = $(id); if (el.textContent !== String(v)) el.textContent = v; };
    set('#stOtp', s.otp == null ? '—' : s.otp + '%');
    set('#stFlights', s.flights);
    set('#stAir', s.airborne);
    set('#stBlock', s.block ? (s.block < 60 ? Math.round(s.block) + 's' : Math.round(s.block / 60) + 'm') : '—');
    set('#stFuel', s.fuel >= 1e6 ? (s.fuel / 1e6).toFixed(1).replace('.', ',') + 'M' : s.fuel >= 1e3 ? Math.round(s.fuel / 1e3) + 'k' : String(s.fuel || 0));
    $('#otpBar').style.width = (s.otp ?? 0) + '%';
    $('#otpBar').className = 'otpbar ' + (s.otp == null ? '' : s.otp >= 85 ? 'good' : s.otp >= 70 ? 'mid' : 'bad');
  }
  // ---------- radio de la torre ----------
  radio(text, kind = 'twr') {
    const now = Date.now() / 1000;
    const i = text.indexOf(':'), who = i > 0 && i < 12 ? text.slice(0, i) : 'Torre', msg = i > 0 && i < 12 ? text.slice(i + 1).trim() : text;
    this.radioItems.unshift({ ts: now, who, msg, kind });
    this.radioItems = this.radioItems.slice(0, 40);
    const ul = $('#radio');
    const li = document.createElement('li'); li.className = 'r ' + kind;
    li.innerHTML = `<time>${fmtTime(now)}</time><b>${esc(who.toUpperCase())}</b><span>${esc(msg)}</span>`;
    ul.prepend(li); while (ul.children.length > 40) ul.lastChild.remove();
    $('#radioEmpty').hidden = true;
    const led = $('#radioLed'); led.classList.remove('tx'); void led.offsetWidth; led.classList.add('tx');
  }
  // ---------- tripulación ----------
  buildCrew() {
    const grid = $('#crewGrid'); grid.innerHTML = '';
    const mk = (id) => {
      const c = CAST[id], el = document.createElement('button');
      el.className = 'crew ' + c.wing; el.dataset.id = id; el.type = 'button';
      el.innerHTML = `<canvas width="12" height="20"></canvas><span class="nm">${esc(nick(id))}</span><span class="rl">${esc(c.role.split('·').pop().trim())}</span><span class="chip" data-st="puesto">en tierra</span>`;
      el.querySelector('canvas').getContext('2d').drawImage(this.sim.chars[id].sp.portrait, 0, 0);
      el.onclick = () => this.select(id);
      grid.appendChild(el);
    };
    const head = (t, cls) => { const h = document.createElement('div'); h.className = 'crewHead ' + cls; h.textContent = t; grid.appendChild(h); };
    head('Dirección', 'ceo'); CEO_IDS.forEach(mk);
    head('Dunder Mifflin · Operaciones', 'dm'); DM_IDS.forEach(mk);
    head('Pied Piper · Ingeniería', 'pp'); PP_IDS.forEach(mk);
    document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
      this.filter = b.dataset.filter; document.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
      grid.dataset.filter = this.filter;
    });
    this.select('michael', false);
  }
  renderCrew(snap, flightsByAgent, all = [], now = Date.now() / 1000, status = null) {
    const label = { volando: '¡volando!', chat: 'chateando', memo: 'enviando memo', vuelo: 'en vuelo', entrega: '¡aterrizó!', charla: 'en charla', camina: 'caminando', puesto: 'en tierra', duerme: 'zZz', pausa: 'en pausa' };
    document.querySelectorAll('.crew').forEach(el => {
      const st = snap[el.dataset.id] || 'puesto', chip = el.querySelector('.chip');
      if (chip.dataset.st !== st) { chip.dataset.st = st; chip.textContent = label[st]; }
      const n = flightsByAgent[el.dataset.id] || 0; el.dataset.count = n;
    });
    if (this.selected) { this.renderProfileStatus(snap[this.selected], flightsByAgent[this.selected] || 0); this.renderProfileStats(all, now, status); }
  }
  renderProfileStats(all, now, status) {
    const box = document.getElementById('pStats'), log = document.getElementById('pLog'); if (!box || !log) return;
    const id = this.selected;
    if (id === 'ceo') {
      const reqs = this.requests ? this.requests() : [], s0 = pujDayStart(now), today = all.filter(f => f.start >= s0);
      const landed = today.filter(f => f.end && f.ok), ontime = landed.filter(f => f.end - f.start <= 900);
      const html = `<div><b>${reqs.filter(r => r.ts >= s0).length}</b><small>pedidos hoy</small></div><div><b>${today.length}</b><small>vuelos hoy</small></div><div><b>${landed.length ? Math.round(100 * ontime.length / landed.length) + '%' : '—'}</b><small>OTP A15</small></div>`;
      if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
      const lh = reqs.slice(-4).reverse().map(r => `<li><code>${esc(r.no)}</code><span>${esc(r.desc)}</span><em>${esc(fmtTime(r.ts))}</em></li>`).join('') || '<li><span style="color:var(--muted)">Aún no has firmado memos hoy.</span></li>';
      if (log.dataset.h !== lh) { log.dataset.h = lh; log.innerHTML = lh; }
      return;
    }
    if (id === 'michael') {
      const reqs = this.requests ? this.requests() : [], s0 = pujDayStart(now);
      const live = all.filter(f => !f.end && now - f.start <= 1800).length, today = all.filter(f => f.start >= s0).length;
      const html = `<div><b>${reqs.filter(r => r.ts >= s0).length}</b><small>pedidos hoy</small></div><div><b>${today}</b><small>delegados</small></div><div><b>${live}</b><small>en vuelo</small></div>`;
      if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
      const lh = reqs.slice(-4).reverse().map(r => `<li><code>${esc(r.no)}</code><span>${esc(r.desc)}</span><em>${esc(fmtTime(r.ts))}</em></li>`).join('') || '<li><span style="color:var(--muted)">Sin pedidos todavía.</span></li>';
      if (log.dataset.h !== lh) { log.dataset.h = lh; log.innerHTML = lh; }
      return;
    }
    const mine = all.filter(f => f.agent === id || (id === 'bighead' && f.agent === 'hooli'));
    const today = mine.filter(f => f.start >= pujDayStart(now));
    const landed = today.filter(f => f.end && f.ok), ontime = landed.filter(f => f.end - f.start <= 900);
    const blk = landed.length ? landed.reduce((a, f) => a + f.end - f.start, 0) / landed.length : 0;
    const html = `<div><b>${today.length}</b><small>vuelos hoy</small></div><div><b>${landed.length ? Math.round(100 * ontime.length / landed.length) + '%' : '—'}</b><small>OTP A15</small></div><div><b>${blk ? (blk < 60 ? Math.round(blk) + 's' : Math.round(blk / 60) + 'm') : '—'}</b><small>bloque</small></div>`;
    if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
    const items = mine.sort((a, b) => b.start - a.start).slice(0, 4).map(f => `<li title="${esc(f.result || f.desc)}"><code>${esc(f.no)}</code><span>${esc(f.desc)}</span><em>${esc(status ? status(f, now) : '')}</em></li>`).join('');
    const lh = items || '<li><span style="color:var(--muted)">Sin vuelos todavía.</span></li>';
    if (log.dataset.h !== lh) { log.dataset.h = lh; log.innerHTML = lh; }
  }
  select(id, fromUser = true) {
    this.selected = id; if (fromUser) this.sim.selected = id;
    document.querySelectorAll('.crew').forEach(el => el.setAttribute('aria-pressed', el.dataset.id === id));
    const c = CAST[id], prof = this.getProfiles()?.[id];
    const ex = prof?.ejemplos?.length ? prof.ejemplos : [c.use];
    $('#profile').innerHTML = `
      <div class="pHead ${c.wing}">
        <canvas width="12" height="20" class="pPic"></canvas>
        <div><div class="pName">${esc(c.name)}</div><div class="pRole">${esc(c.role)}</div>
        <div class="pTags"><span class="tag">Puerta ${esc(c.gate)}</span><span class="tag">${esc(prof?.herramientas || c.access)}</span><span class="tag">modelo ${esc(prof?.modelo || c.model)}</span></div></div>
      </div>
      <p class="pBlurb">${esc(prof?.especialidad ? prof.especialidad + '.' : c.blurb)}</p>
      <div class="pLabel">Cómo pedírselo</div>
      <ul class="pEx">${ex.map(e => `<li${id !== 'ceo' ? ' class="ask" tabindex="0" title="Escribírselo en el chat"' : ''}>${esc(e.replace(/^«|»$/g, ''))}</li>`).join('')}</ul>
      ${prof?.no_usar_para ? `<div class="pLabel">Mejor no para</div><p class="pNo">${esc(prof.no_usar_para)}</p>` : ''}
      ${id !== 'ceo' ? `<button class="btn chatBtn" type="button" data-chat="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Hablar con ${esc(nick(id))}</button>` : ''}
      <div class="pStatus" id="pStatus"></div>
      <div class="pStats" id="pStats"></div>
      <div class="pLabel">Bitácora</div>
      <ul class="pLog" id="pLog"></ul>`;
    $('#profile .pPic').getContext('2d').drawImage(this.sim.chars[id].sp.portrait, 0, 0);
    const cb = $('#profile .chatBtn'); if (cb) cb.onclick = () => this.onChat && this.onChat(id);
    document.querySelectorAll('#profile .pEx li.ask').forEach(li => { const go = () => this.onExample && this.onExample(id, li.textContent); li.onclick = go; li.onkeydown = e => { if (e.key === 'Enter') go(); }; });
    this.renderProfileStatus();
  }
  renderProfileStatus(st, n) {
    const el = $('#pStatus'); if (!el) return;
    const txt = st === 'memo' ? 'Firmando un memo para la Torre' : this.selected === 'ceo' && (st === 'puesto' || !st) ? 'En su oficina' : st === 'vuelo' ? `En vuelo · ${n || 1} tarea${n > 1 ? 's' : ''}` : st === 'entrega' ? 'Acaba de aterrizar' : st === 'duerme' ? 'Durmiendo en su puesto' : st === 'charla' ? 'Conversando' : st === 'camina' ? 'Caminando por la terminal' : 'En tierra, disponible';
    if (el.textContent !== txt) { el.textContent = txt; el.dataset.st = st || 'puesto'; }
  }
  // ---------- burbujas ----------
  bubble(id, text, ms = 3500, kind = 'idle') {
    if (id === 'hooli') id = 'bighead'; // los contratistas hablan por boca de Big Head
    if (!this.sim.chars[id]) return;
    const layer = $('#bubbles');
    const old = this.bubbles.get(id); if (old) { old.el.remove(); this.bubbles.delete(id); }
    if (this.bubbles.size >= 4 && kind === 'idle') return;
    const el = document.createElement('div'); el.className = 'bub ' + kind + ' ' + (CAST[id]?.wing || '');
    el.innerHTML = `<b>${esc(nick(id))}</b>${esc(text)}`;
    layer.appendChild(el);
    const b = { el, until: performance.now() + ms };
    this.bubbles.set(id, b);
  }
  placeBubbles(scale) {
    const now = performance.now();
    for (const [id, b] of this.bubbles) {
      if (now > b.until) { b.el.classList.add('out'); setTimeout(() => b.el.remove(), 250); this.bubbles.delete(id); continue; }
      const p = this.sim.headPos(id); if (!p) continue;
      const x = Math.max(70, Math.min(W * scale - 70, p.x * scale)), y = p.y * scale;
      b.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      b.el.classList.toggle('below', y < 60);
      if (y < 60) b.el.style.transform = `translate(${Math.round(x)}px, ${Math.round((p.y + 26) * scale)}px) translate(-50%, 0)`;
    }
  }
  tooltip(id, x, y, snap, flights) {
    const tip = $('#tip');
    if (!id) { tip.hidden = true; return; }
    const c = CAST[id], f = flights.find(fl => fl.agent === id && !fl.end);
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(c.name)}</b><span>${esc(c.role)}</span>${f ? `<em>${esc(f.no)} · ${esc(f.desc)}</em>` : ''}`;
    tip.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y + 10)}px)`;
  }

  // ---------- chat con los agentes ----------
  md(t) {
    let h = esc(t);
    h = h.replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/^#+ (.*)$/gm, '<b>$1</b>').replace(/^[-*] (.*)$/gm, '• $1');
    return h.replace(/\n/g, '<br>');
  }
  openChat(id, msgs, busy) {
    const box = $('#chat'), c = CAST[id];
    box.hidden = false; box.dataset.agent = id; box.className = 'chat ' + c.wing;
    $('#chatName').textContent = id === 'michael' ? 'Michael · la Torre' : c.name;
    $('#chatRole').textContent = id === 'michael' ? 'Puede delegar en el equipo' : c.role;
    const pc = $('#chatPic').getContext('2d'); pc.clearRect(0, 0, 12, 20); pc.drawImage(this.sim.chars[id].sp.portrait, 0, 0);
    this.renderChat(msgs, busy);
    setTimeout(() => $('#chatInput').focus(), 50);
  }
  renderChat(msgs, busy) {
    const id = $('#chat').dataset.agent, list = $('#chatLog');
    list.innerHTML = (msgs.length ? '' : `<div class="cEmpty">Escríbele a ${esc(nick(id))}. Lee archivos, busca y consulta, pero desde aquí no edita nada.</div>`) +
      msgs.map(m => `<div class="cMsg ${m.from === 'ceo' ? 'me' : 'them'}">${m.from === 'ceo' ? '' : `<b>${esc(nick(m.from))}</b>`}${this.md(m.text)}${m.secs ? `<small>${m.secs} s${m.tokens ? ' · ' + (m.tokens >= 1000 ? Math.round(m.tokens / 1000) + ' k' : m.tokens) + ' tokens' : ''}</small>` : ''}</div>`).join('') +
      (busy ? `<div class="cMsg them typing"><b>${esc(nick(id))}</b><span class="dots"><i></i><i></i><i></i></span></div>` : '');
    list.scrollTop = list.scrollHeight;
    $('#chatSend').disabled = !!busy; $('#chatInput').disabled = !!busy;
  }
}
