// Personajes, caminos, comportamientos, aviones de papel, gato y contratistas.
import { CAST, POI, PREFS, HOOLI_DESKS, HOOLI_LOOKS, W, pick, rand, nick } from './data.js';
import { buildSprites, buildCat, drawText, textWidth } from './sprites.js';
import { buildGrid, GX, GY, GY0, CELL, seatOf } from './world.js';

const SPEED = 30;
const TOWER_PT = { x: 240, y: 84 };

// Parejas que conversan y dónde.
const PAIR_SPOTS = {
  'dwight+jim': ['copier', 'windowDM'], 'jim+pam': ['reception', 'coffee'], 'dinesh+gilfoyle': ['pingA', 'pingB'],
  'erlich+jared': ['hammock', 'whiteboard'], 'michael+toby': ['tobyDoor', 'coffee'], 'monica+richard': ['whiteboard', 'windowPP'],
  'kevin+oscar': ['vending', 'tableA'], 'angela+oscar': ['tableA', 'tableB'], 'darryl+gilfoyle': ['windowPP', 'rampCart'],
  'bighead+richard': ['beanbag2', 'whiteboard'], 'erlich+ryan': ['windowDM', 'coffee'], 'creed+jared': ['tableB', 'cooler'],
};
const SPOT_PAIRS = [['tableA', 'tableB'], ['pingA', 'pingB']];
const pairKey = (a, b) => [a, b].sort().join('+');

class Char {
  constructor(id, look, desk, opts = {}) {
    this.id = id; this.sp = buildSprites(look, { beanbag: desk.kind === 'beanbag' }); this.desk = desk; this.seat = seatOf(desk);
    this.x = this.seat.ax; this.y = this.seat.ay; this.dir = this.seat.dir; this.sitting = true;
    this.path = null; this.onArrive = null; this.frame = 0; this.ft = 0; this.anim = 'sit';
    this.working = 0; this.idleT = rand(4, 14); this.cheerT = 0; this.sadT = 0; this.poi = null; this.busy = null;
    this.hooli = !!opts.hooli; this.typeT = 0; this.jump = 0;
  }
  standUp() {
    if (!this.sitting) return;
    this.sitting = false; this.x = this.seat.x; this.y = this.seat.y;
  }
}

export class Sim {
  constructor(hooks) {
    this.hooks = hooks; this.grid = buildGrid();
    this.chars = {}; for (const [id, c] of Object.entries(CAST)) this.chars[id] = new Char(id, c.look, c.desk);
    this.contractors = []; this.paper = []; this.poiTaken = new Map(); this.selected = null; this.hover = null;
    this.catSp = buildCat(); this.cat = { x: 34, y: 120, tx: 34, ty: 120, t: 0, wait: 3, dir: 1 };
    this.chatT = 6; this.pairT = 18; this.michaelBusy = false; this.t = 0; this.ceoUntil = -1; this.showNames = true; this.night = 0;
    this.hooliSprites = HOOLI_LOOKS.map(l => buildSprites(l));
  }

  // ---------- caminos ----------
  cell(x, y) { return [Math.max(0, Math.min(GX - 1, Math.floor(x / CELL))), Math.max(0, Math.min(GY - 1, Math.floor((y - GY0) / CELL)))]; }
  free(cx, cy) { return cx >= 0 && cy >= 0 && cx < GX && cy < GY && !this.grid[cy * GX + cx]; }
  nearestFree(cx, cy) {
    if (this.free(cx, cy)) return [cx, cy];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (this.free(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    return [cx, cy];
  }
  findPath(x0, y0, x1, y1) {
    const [sx, sy] = this.nearestFree(...this.cell(x0, y0)), [tx, ty] = this.nearestFree(...this.cell(x1, y1));
    const N = GX * GY, prev = new Int32Array(N).fill(-1), q = new Int32Array(N);
    let h = 0, t = 0; const s = sy * GX + sx, goal = ty * GX + tx;
    q[t++] = s; prev[s] = s;
    while (h < t) {
      const c = q[h++]; if (c === goal) break;
      const cx = c % GX, cy = (c / GX) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (!this.free(nx, ny)) continue;
        const n = ny * GX + nx; if (prev[n] !== -1) continue; prev[n] = c; q[t++] = n;
      }
    }
    if (prev[goal] === -1) return [{ x: x1, y: y1 }];
    const pts = []; for (let c = goal; c !== s; c = prev[c]) pts.push({ x: (c % GX) * CELL + 2, y: GY0 + ((c / GX) | 0) * CELL + 2 });
    pts.reverse(); pts.push({ x: x1, y: y1 });
    // quita puntos colineales para que el paso sea fluido
    return pts.filter((p, i) => i === 0 || i === pts.length - 1 || !((pts[i - 1].x === p.x && pts[i + 1].x === p.x) || (pts[i - 1].y === p.y && pts[i + 1].y === p.y)));
  }
  walkTo(c, x, y, dir, cb) {
    c.standUp(); this.releasePoi(c);
    c.path = this.findPath(c.x, c.y, x, y); c.endDir = dir; c.onArrive = cb; c.anim = 'walk';
  }
  goSeat(c, cb) {
    if (c.sitting) { cb && cb(); return; }
    this.walkTo(c, c.seat.x, c.seat.y, c.seat.dir, () => { c.x = c.seat.ax; c.y = c.seat.ay; c.sitting = true; c.dir = c.seat.dir; c.anim = 'sit'; cb && cb(); });
  }
  goPoi(c, name, cb) {
    const p = POI[name]; if (!p || this.poiTaken.has(name)) return false;
    this.walkTo(c, p.x, p.y, p.dir, () => { c.anim = 'stand'; c.dir = p.dir; cb && cb(); });
    this.poiTaken.set(name, c.id); c.poi = name; return true;
  }
  releasePoi(c) { if (c.poi && this.poiTaken.get(c.poi) === c.id) this.poiTaken.delete(c.poi); c.poi = null; }

  // ---------- eventos ----------
  paperPlane(from, to, cb, kind = 'out') { this.paper.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: 1.6 + Math.hypot(to.x - from.x, to.y - from.y) / 160, cb, kind }); }
  // El CEO (tú) firma un pedido: teclea en su escritorio y el memo dorado vuela a la Torre.
  memo() {
    const c = this.chars.ceo; if (!c) return;
    this.ceoUntil = this.t + 5;
    const from = { x: c.x, y: c.y - 14 };
    this.paperPlane(from, TOWER_PT, null, 'memo');
  }
  ceoBusy() { return this.t < this.ceoUntil; }
  assign(agent, delay) {
    const c = this.chars[agent]; if (!c) return;
    const to = { x: c.sitting ? c.seat.ax : c.x, y: (c.sitting ? c.seat.ay : c.y) - 14 };
    this.paperPlane(TOWER_PT, to, () => { if (c.busy?.pair) this.breakPair(c); c.idleT = 0; }, 'out');
  }
  deliver(agent, ok) {
    const c = this.chars[agent]; if (!c) return;
    if (ok) { c.cheerT = 1.4; c.jump = 0; } else c.sadT = 2.6;
    const from = { x: c.x, y: c.y - 14 };
    setTimeout(() => this.paperPlane(from, TOWER_PT, null, ok ? 'in' : 'fail'), 500);
  }
  deliverHooli(ok) {
    const c = this.contractors.find(k => k.sitting) || this.contractors[0];
    if (c) this.paperPlane({ x: c.x, y: c.y - 14 }, TOWER_PT, null, ok ? 'in' : 'fail');
  }
  breakPair(c) {
    const p = c.busy; if (!p?.pair) return;
    for (const id of p.pair) { const k = this.chars[id]; if (k) { k.busy = null; k.idleT = rand(0.5, 3); } }
  }
  setHooli(n) {
    n = Math.min(4, n);
    const alive = this.contractors.filter(c => !c.leaving);
    for (let i = alive.length; i < n; i++) {
      const slot = [0, 1, 2, 3].find(s => !this.contractors.some(c => c.slot === s && !c.leaving)); if (slot === undefined) break;
      const c = new Char('hooli' + slot, HOOLI_LOOKS[slot], HOOLI_DESKS[slot], { hooli: true });
      c.sp = this.hooliSprites[slot]; c.slot = slot; c.sitting = false; c.x = POI.door.x; c.y = POI.door.y; c.working = 1;
      this.goSeat(c); this.contractors.push(c);
    }
    let extra = alive.length - n;
    for (const c of alive.slice().reverse()) {
      if (extra <= 0) break; extra--; c.leaving = true; c.working = 0;
      this.walkTo(c, POI.door.x, POI.door.y, 'down', () => { c.gone = true; });
    }
  }

  // ---------- comportamiento ----------
  idleChars() { return Object.values(this.chars).filter(c => !c.working && !c.busy && c.cheerT <= 0 && !c.path && !(c.id === 'michael' && this.michaelBusy)); }
  think(c, dt) {
    if (c.path || c.cheerT > 0 || c.sadT > 0) return;
    if (c.id === 'michael' && this.michaelBusy) { if (!c.sitting) this.goSeat(c); return; }
    if (c.id === 'ceo' && this.ceoBusy()) { if (!c.sitting) this.goSeat(c); return; }
    if (c.working > 0) {
      if (c.busy) this.breakPair(c);
      if (!c.sitting) this.goSeat(c);
      return;
    }
    if (c.busy) return; // conversación en curso
    c.idleT -= dt; if (c.idleT > 0) return;
    const r = Math.random();
    if (c.sitting) {
      if (r < 0.5) { c.idleT = rand(8, 22); return; }
      const opts = (PREFS[c.id] || []).concat(['coffee', 'cooler', 'windowDM', 'windowPP', 'vending']);
      for (let i = 0; i < 4; i++) if (this.goPoi(c, pick(opts))) { c.idleT = rand(7, 16); return; }
      c.idleT = rand(5, 10);
    } else {
      if (r < 0.65) { this.goSeat(c); c.idleT = rand(10, 25); }
      else { const opts = PREFS[c.id] || ['coffee']; if (!this.goPoi(c, pick(opts))) this.goSeat(c); c.idleT = rand(6, 12); }
    }
  }
  startPair(lines) {
    const pairs = lines?.pares || []; if (!pairs.length) return;
    const idle = new Set(this.idleChars().map(c => c.id));
    const cands = pairs.filter(p => idle.has(p.a) && idle.has(p.b));
    if (!cands.length) return;
    const p = pick(cands), key = pairKey(p.a, p.b);
    let spots = PAIR_SPOTS[key] || pick(SPOT_PAIRS);
    if (spots.some(s => this.poiTaken.has(s))) spots = SPOT_PAIRS.find(sp => !sp.some(s => this.poiTaken.has(s)));
    if (!spots) return;
    const A = this.chars[p.a], B = this.chars[p.b], pair = [p.a, p.b];
    let arrived = 0;
    const go = () => {
      if (A.busy?.pair !== pair || B.busy?.pair !== pair) return; // la charla se canceló por el camino
      if (++arrived < 2) return;
      // se miran
      if (A.x < B.x) { A.dir = 'right'; B.dir = 'left'; } else { A.dir = 'left'; B.dir = 'right'; }
      if (Math.abs(A.y - B.y) > Math.abs(A.x - B.x)) { A.dir = A.y < B.y ? 'down' : 'up'; B.dir = A.y < B.y ? 'up' : 'down'; }
      if (key === 'dinesh+gilfoyle') { A.dir = POI[spots[0]].dir; B.dir = POI[spots[1]].dir; }
      let delay = 300;
      for (const [who, text] of p.lineas) { setTimeout(() => { if (A.busy?.pair === pair) this.hooks.bubble(who, text, 2600, 'chat'); }, delay); delay += 2800; }
      setTimeout(() => { if (A.busy?.pair === pair) { A.busy = null; B.busy = null; A.idleT = rand(1, 4); B.idleT = rand(2, 5); } }, delay + 600);
    };
    A.busy = { pair }; B.busy = { pair };
    if (!this.goPoi(A, spots[0], go) || !this.goPoi(B, spots[1], go)) {
      A.busy = null; B.busy = null;
      for (const c of [A, B]) if (c.path) this.goSeat(c); // nadie se queda caminando hacia un punto ya liberado
    }
  }

  // ---------- bucle ----------
  update(dt, t, env) {
    this.night = env.n; this.t = t;
    const all = [...Object.values(this.chars), ...this.contractors];
    for (const c of all) {
      if (!c.hooli) this.think(c, dt);
      if (c.path && c.path.length) {
        const p = c.path[0], dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), step = SPEED * dt;
        if (Math.abs(dx) > Math.abs(dy)) c.dir = dx > 0 ? 'right' : 'left'; else if (d > 0.01) c.dir = dy > 0 ? 'down' : 'up';
        if (d <= step) { c.x = p.x; c.y = p.y; c.path.shift(); } else { c.x += dx / d * step; c.y += dy / d * step; }
        c.ft += dt; if (c.ft > 0.13) { c.ft = 0; c.frame = (c.frame + 1) % 4; }
        if (!c.path.length) { c.path = null; c.frame = 0; c.anim = 'stand'; if (c.endDir) c.dir = c.endDir; const cb = c.onArrive; c.onArrive = null; cb && cb(); }
      }
      if (c.cheerT > 0) { c.cheerT -= dt; if (c.cheerT <= 0) c.idleT = rand(2, 6); }
      if (c.sadT > 0) { c.sadT -= dt; if (c.sadT <= 0) c.idleT = rand(2, 6); }
      c.typeT += dt;
    }
    this.contractors = this.contractors.filter(c => !c.gone);
    // aviones de papel
    for (const p of this.paper) { p.t += dt; if (p.t >= p.dur && !p.done) { p.done = true; p.cb && p.cb(); } }
    this.paper = this.paper.filter(p => p.t < p.dur + 0.3);
    // gato de Angela
    const k = this.cat; k.t += dt;
    if (k.wait > 0) k.wait -= dt;
    else {
      const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy);
      if (d < 1) { k.wait = rand(3, 10); const [cx, cy] = this.nearestFree(...this.cell(rand(10, 190), rand(100, 190))); k.tx = cx * CELL + 2; k.ty = GY0 + cy * CELL + 2; }
      else { k.x += dx / d * 12 * dt; k.y += dy / d * 12 * dt; k.dir = dx >= 0 ? 1 : -1; }
    }
    // charla ambiental
    this.chatT -= dt;
    if (this.chatT <= 0) {
      this.chatT = rand(5, 9);
      const lines = this.hooks.lines();
      const pool = Object.values(this.chars).filter(c => c.cheerT <= 0 && !c.busy && !c.path);
      const c = pool.length && pick(pool);
      if (c) {
        const set = c.working > 0 ? lines?.trabajando : lines?.idle;
        const l = set?.[c.id]; if (l?.length && (c.working === 0 || Math.random() < 0.4)) this.hooks.bubble(c.id, pick(l), 3800, 'idle');
      }
    }
    this.pairT -= dt;
    if (this.pairT <= 0) { this.pairT = rand(16, 28); this.startPair(this.hooks.lines()); }
  }

  // ---------- dibujo ----------
  spriteOf(c, t) {
    const sp = c.sp;
    if (c.cheerT > 0) return sp.cheer;
    if (c.sitting) {
      const typing = c.working > 0 || (c.id === 'michael' && this.michaelBusy) || (c.id === 'ceo' && this.ceoBusy());
      const f = typing ? Math.floor(c.typeT * 6) % 2 : 0;
      return c.seat.dir === 'up' ? sp.sitUp[f] : sp.sitDown[f];
    }
    const seq = [0, 1, 0, 2], f = c.path ? seq[c.frame] : 0;
    return sp[c.dir][f];
  }
  drawChar(ctx, c, t) {
    const img = this.spriteOf(c, t);
    let ox = Math.round(c.x) - 6, oy = Math.round(c.y) - 20;
    if (c.sitting && c.seat.dir === 'up') oy += 2;
    if (c.cheerT > 0) oy -= Math.round(Math.abs(Math.sin(c.cheerT * 9)) * 4);
    if (!c.sitting) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(ox + 3, Math.round(c.y) - 1, 6, 2); ctx.fillRect(ox + 2, Math.round(c.y), 8, 1); }
    if (this.selected === c.id || this.hover === c.id) {
      ctx.strokeStyle = this.selected === c.id ? '#f2c230' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(c.x) + 0.5, Math.round(c.y) + 0.5, 7, 2.5, 0, 0, 7); ctx.stroke();
    }
    ctx.drawImage(img, ox, oy);
    if (c.sitting && c.desk.kind === 'beanbag' && c.working > 0) { ctx.fillStyle = '#c9ccd1'; ctx.fillRect(ox + 3, oy + 13, 6, 3); ctx.fillStyle = '#5fd0ea'; ctx.fillRect(ox + 4, oy + 12, 4, 1); }
    c._top = oy;
  }
  overlays(ctx, t) {
    const all = [...Object.values(this.chars), ...this.contractors];
    for (const c of all) {
      const hx = Math.round(c.x), top = c._top ?? (c.y - 20);
      // indicador de "tecleando"
      if (c.sitting && (c.working > 0 || (c.id === 'michael' && this.michaelBusy) || (c.id === 'ceo' && this.ceoBusy()))) {
        const bx = hx - 5, by = top - 8;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 11, 6); ctx.fillRect(bx + 1, by - 1, 9, 1); ctx.fillRect(bx + 1, by + 6, 9, 1); ctx.fillRect(bx + 3, by + 7, 2, 1);
        const k = Math.floor(t * 3) % 4;
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < k ? (c.hooli ? '#e8453c' : c.id === 'ceo' ? '#c9a227' : CAST[c.id]?.wing === 'pp' ? '#2e9e5b' : '#1d3e6e') : '#c9ccd1'; ctx.fillRect(bx + 2 + i * 3, by + 2, 2, 2); }
      }
      // dormido: Big Head en su puf o cualquiera de noche sin tarea
      const sleeping = c.sitting && !c.working && !c.hooli && c.id !== 'michael' && c.id !== 'ceo' && (c.id === 'bighead' || this.night > 0.85);
      if (sleeping) { const k = (t * 0.6 + hx * 0.01) % 1; drawText(ctx, 'Z', hx + 4 + Math.round(k * 4), Math.round(top - 2 - k * 8), `rgba(255,255,255,${1 - k})`); }
      if (c.sadT > 0) { ctx.fillStyle = '#e8453c'; ctx.fillRect(hx - 1, top - 9, 2, 4); ctx.fillRect(hx - 1, top - 4, 2, 1); }
      if (c.cheerT > 0) { for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * 3, r = 7 + (1.4 - c.cheerT) * 6; ctx.fillStyle = ['#f2c230', '#78b919', '#5fd0ea', '#e8453c', '#ffffff'][i]; ctx.fillRect(Math.round(hx + Math.cos(a) * r), Math.round(top + 6 + Math.sin(a) * r * 0.6), 1, 1); } }
      // etiqueta con el nombre
      if (!c.hooli && (this.selected === c.id || this.hover === c.id || (this.showNames && (c.working > 0 || (c.id === 'ceo' && this.ceoBusy()))))) {
        const name = nick(c.id).toUpperCase().slice(0, 9), w = textWidth(name) + 4;
        const ly = Math.max(1, top - (c.sitting && (c.working > 0 || (c.id === 'ceo' && this.ceoBusy())) ? 17 : 9));
        ctx.fillStyle = 'rgba(14,16,20,0.85)'; ctx.fillRect(hx - Math.floor(w / 2), ly, w, 7);
        drawText(ctx, name, hx - Math.floor(w / 2) + 2, ly + 1, c.id === 'ceo' ? '#f2c94c' : CAST[c.id].wing === 'pp' ? '#8ff0b5' : '#a9c8ff');
      }
    }
  }
  drawPaper(ctx, phase) {
    for (const p of this.paper) {
      const k = Math.min(1, p.t / p.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = p.x0 + (p.x1 - p.x0) * e, gy = p.y0 + (p.y1 - p.y0) * e, h = Math.sin(k * Math.PI) * 26, y = gy - h;
      if (phase === 'shadow') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(Math.round(x) - 2, Math.round(gy) + 12, 5, 1); continue; }
      const right = p.x1 >= p.x0, X = Math.round(x), Y = Math.round(y);
      const body = p.kind === 'fail' ? '#ffd2cc' : p.kind === 'memo' ? '#fff3c4' : '#ffffff';
      // estela
      for (let i = 1; i < 4; i++) { const kk = Math.max(0, k - i * 0.04), ee = kk < 0.5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2; ctx.fillStyle = `rgba(255,255,255,${0.35 - i * 0.1})`; ctx.fillRect(Math.round(p.x0 + (p.x1 - p.x0) * ee), Math.round(p.y0 + (p.y1 - p.y0) * ee - Math.sin(kk * Math.PI) * 26), 1, 1); }
      const s = right ? 1 : -1;
      ctx.fillStyle = body; ctx.fillRect(X - 3 * s - (s < 0 ? 0 : 0), Y - 1, 1, 1);
      for (let i = 0; i < 6; i++) ctx.fillRect(X - 3 * s + i * s, Y, 1, 1);
      for (let i = 0; i < 4; i++) ctx.fillRect(X - 3 * s + i * s, Y - 1, 1, 1);
      ctx.fillStyle = '#b8c0c8'; ctx.fillRect(X - 2 * s, Y + 1, 1, 1); ctx.fillRect(X - 1 * s, Y + 1, 1, 1);
      ctx.fillStyle = p.kind === 'out' ? '#1d3e6e' : p.kind === 'fail' ? '#e8453c' : p.kind === 'memo' ? '#c9a227' : '#78b919'; ctx.fillRect(X, Y, 1, 1);
    }
  }
  drawables() {
    const list = [];
    for (const c of [...Object.values(this.chars), ...this.contractors]) list.push({ y: c.y + (c.sitting ? 0.6 : 0.4), char: c });
    list.push({ y: this.cat.y, cat: true });
    return list;
  }
  drawCat(ctx, t) {
    const k = this.cat, moving = k.wait <= 0, f = moving ? Math.floor(t * 6) % 2 : 0;
    ctx.drawImage(this.catSp[k.dir > 0 ? 'right' : 'left'][f], Math.round(k.x) - 4, Math.round(k.y) - 6);
  }
  pick(x, y) {
    let best = null;
    for (const c of Object.values(this.chars)) {
      const top = c._top ?? c.y - 20;
      if (x >= c.x - 6 && x <= c.x + 6 && y >= top - 2 && y <= c.y + 1 && (!best || c.y > best.y)) best = c;
    }
    return best ? best.id : null;
  }
  headPos(id) {
    const c = this.chars[id]; if (!c) return null;
    return { x: c.x, y: (c._top ?? c.y - 20) - (c.sitting && (c.working > 0 || (id === 'michael' && this.michaelBusy) || (id === 'ceo' && this.ceoBusy())) ? 10 : 2) };
  }
  snapshot() {
    const out = {};
    for (const [id, c] of Object.entries(this.chars)) {
      out[id] = id === 'ceo' && this.ceoBusy() ? 'memo' : c.cheerT > 0 ? 'entrega' : c.working > 0 ? 'vuelo' : (id === 'michael' && this.michaelBusy) ? 'vuelo' : c.busy ? 'charla' : c.path ? 'camina' : c.sitting ? (c.id === 'bighead' || this.night > 0.85 ? 'duerme' : 'puesto') : 'pausa';
    }
    return out;
  }
}
