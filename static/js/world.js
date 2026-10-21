// La terminal: planta estática, mobiliario ordenable por profundidad, exterior (cielo, pista, aviones) e iluminación.
import { W, H, CAST, HOOLI_DESKS } from './data.js';
import { shade, drawText, textWidth } from './sprites.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const P = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
function noise(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// ---------- geometría ----------
export const WINDOWS = [[8, 9, 178, 45], [206, 9, 68, 47], [294, 9, 178, 45]]; // x,y,w,h
export const TOWER = { x: 202, y: 64, w: 76, h: 54, door: [234, 246] };
export const ANNEX = { x: 0, y: 196, w: 62, door: [38, 54] };

export const OBSTACLES = [
  // paredes
  [202, 64, 2, 54], [276, 64, 2, 54], [202, 116, 32, 2], [246, 116, 32, 2],
  [0, 196, 38, 10], [54, 196, 10, 10], [60, 196, 4, 74],
  // mobiliario
  [204, 126, 26, 10], [262, 124, 10, 14], [260, 156, 16, 20], [232, 166, 16, 10], [14, 166, 14, 14],
  [414, 64, 18, 30], [440, 66, 34, 26], [300, 226, 40, 22], [66, 238, 26, 12], [140, 206, 16, 10],
  [466, 118, 4, 34], [432, 144, 4, 8], [470, 144, 4, 8],
  [282, 176, 8, 8],
  [100, 104, 90, 2], [100, 104, 2, 42], [188, 104, 2, 42], [100, 144, 62, 2], [176, 144, 14, 2], [104, 122, 12, 18], [178, 110, 8, 8], [192, 246, 8, 8], [470, 186, 8, 8], [150, 236, 6, 6], [158, 252, 6, 6],
];
for (const c of Object.values(CAST)) if (c.desk.kind !== 'beanbag') OBSTACLES.push([c.desk.x, c.desk.y, c.desk.w, c.desk.kind === 'counter' ? 12 : 14]);
for (const d of HOOLI_DESKS) OBSTACLES.push([d.x, d.y, d.w, 14]);

// ---------- rejilla de caminos (celdas de 4 px) ----------
export const CELL = 4, GX = W / CELL, GY0 = 64, GY = Math.ceil((H - GY0) / CELL);
export function buildGrid() {
  const g = new Uint8Array(GX * GY);
  for (let cy = 0; cy < GY; cy++) for (let cx = 0; cx < GX; cx++) {
    const x = cx * CELL + 2, y = GY0 + cy * CELL + 2;
    let b = y < 70 || y > 267 || x < 3 || x > W - 3;
    if (!b) for (const [ox, oy, ow, oh] of OBSTACLES) if (x > ox - 4 && x < ox + ow + 4 && y > oy - 2 && y < oy + oh + 3) { b = true; break; }
    g[cy * GX + cx] = b ? 1 : 0;
  }
  return g;
}

// ---------- capa estática (pared del fondo con ventanas recortadas + suelo) ----------
export function buildStatic() {
  const c = cv(W, H), x = c.getContext('2d');
  // --- suelo: alfombra DM ---
  for (let yy = 64; yy < H; yy++) for (let xx = 0; xx < 202; xx++) {
    const n = noise(xx, yy), seam = (xx % 32 === 0 || yy % 32 === 0);
    P(x, xx, yy, seam ? '#566575' : n > 0.82 ? '#6a7a8b' : n < 0.12 ? '#596878' : '#627284');
  }
  // logo tenue en la alfombra
  drawText(x, 'DUNDER MIFFLIN', 74, 190, 'rgba(255,255,255,0.10)');
  // --- centro: baldosa ---
  for (let yy = 118; yy < H; yy++) for (let xx = 202; xx < 278; xx++) {
    const g = (xx % 10 === 0 || yy % 10 === 0);
    P(x, xx, yy, g ? '#b8ad9a' : noise(xx, yy) > 0.9 ? '#d6ccbb' : '#cdc3b1');
  }
  // --- torre: suelo oscuro ---
  for (let yy = 64; yy < 118; yy++) for (let xx = 202; xx < 278; xx++) P(x, xx, yy, noise(xx, yy) > 0.85 ? '#3b4658' : '#354052');
  drawText(x, 'TWR', 230, 106, 'rgba(160,210,255,0.22)');
  // --- Pied Piper: hormigón pulido ---
  for (let yy = 64; yy < H; yy++) for (let xx = 278; xx < W; xx++) {
    const j = (xx - 278) % 40 === 0 || (yy - 64) % 40 === 0, n = noise(xx, yy);
    P(x, xx, yy, j ? '#97948d' : n > 0.92 ? '#b7b4ad' : n < 0.06 ? '#a19e97' : '#adaaa3');
  }
  for (let yy = 64; yy < H; yy++) for (let xx = 278; xx < 282; xx++) P(x, xx, yy, ((xx + yy) >> 2) % 2 ? '#f2c230' : '#2a2a2a');
  drawText(x, 'PIED PIPER', 352, 172, 'rgba(46,158,91,0.28)');
  // Hooli XYZ: tapete de colores
  R(x, 360, 204, 116, 62, '#e9e7e1');
  ['#4285c4', '#e8453c', '#f4b400', '#3b9b5a'].forEach((col, i) => R(x, 360 + i * 29, 204, 29, 2, col));
  drawText(x, 'HOOLI XYZ · CONTRATISTAS', 366, 258, '#9a968c');
  // --- rampa (Darryl) ---
  for (let yy = 206; yy < H; yy++) for (let xx = 64; xx < 166; xx++) P(x, xx, yy, noise(xx, yy) > 0.9 ? '#575b62' : '#4c5057');
  R(x, 64, 206, 102, 1, '#f2c230');
  for (let xx = 66; xx < 166; xx += 6) R(x, xx, 264, 3, 1, '#f2c230');
  drawText(x, 'RAMPA', 70, 210, '#f2c230');
  // --- anexo RR. HH. ---
  for (let yy = 206; yy < H; yy++) for (let xx = 0; xx < 60; xx++) P(x, xx, yy, noise(xx, yy) > 0.85 ? '#8d8576' : '#837b6c');
  // pared del anexo (cara frontal + remate)
  for (const [a, b] of [[0, 38], [54, 64]]) { R(x, a, 196, b - a, 2, '#9b9384'); R(x, a, 198, b - a, 8, '#d9d2c3'); R(x, a, 205, b - a, 1, '#b5ad9d'); }
  R(x, 60, 196, 4, 74, '#9b9384'); R(x, 61, 196, 2, 74, '#bdb5a5');
  R(x, 6, 199, 22, 6, '#f4f0e6'); drawText(x, 'RR.HH', 7, 200, '#6b6253');
  // --- torre: paredes de cristal ---
  const glass = (gx, gy, gw, gh) => { R(x, gx, gy, gw, gh, '#7fa9bb'); };
  glass(202, 64, 2, 54); glass(276, 64, 2, 54); glass(202, 116, 32, 2); glass(246, 116, 32, 2);
  R(x, 203, 64, 1, 52, '#cfe7f1'); R(x, 277, 64, 1, 52, '#cfe7f1'); R(x, 202, 116, 32, 1, '#cfe7f1'); R(x, 246, 116, 32, 1, '#cfe7f1');
  // --- oficina del CEO: parquet, alfombra y cristal ---
  for (let yy = 104; yy < 146; yy++) for (let xx = 100; xx < 190; xx++) {
    const row = Math.floor(yy / 3), off = (row * 7) % 20, plank = Math.floor((xx + off) / 20), seam = (xx + off) % 20 === 0;
    const tone = ['#a8723f', '#9c6838', '#b07a45'][(plank + row) % 3];
    P(x, xx, yy, seam ? '#8a5a30' : yy % 3 === 0 ? '#976435' : noise(xx, yy) > 0.9 ? '#b98650' : tone);
  }
  R(x, 118, 116, 56, 26, '#7a1f2b'); R(x, 119, 117, 54, 24, '#8e2633'); R(x, 121, 119, 50, 20, '#7a1f2b');
  for (let i = 0; i < 54; i += 3) { P(x, 119 + i, 117, '#c9a227'); P(x, 119 + i, 140, '#c9a227'); }
  glass(100, 104, 90, 2); glass(100, 104, 2, 42); glass(188, 104, 2, 42); glass(100, 144, 62, 2); glass(176, 144, 14, 2);
  R(x, 101, 104, 88, 1, '#cfe7f1'); R(x, 101, 104, 1, 40, '#cfe7f1'); R(x, 189, 104, 1, 40, '#cfe7f1');
  R(x, 166, 98, 22, 7, '#1f2430'); R(x, 166, 104, 22, 1, '#0f1218'); drawText(x, 'C1', 168, 99, '#ffffff'); drawText(x, 'CEO', 177, 99, '#e8c24a');
  // alfombrilla de la puerta A1
  R(x, 226, 258, 28, 10, '#3a3533'); R(x, 227, 259, 26, 8, '#4a4441');
  // --- pared del fondo ---
  R(x, 0, 0, W, 8, '#23262b');
  drawText(x, 'DUNDER MIFFLIN · SUCURSAL PUJ', 12, 2, '#c9c2b3');
  drawText(x, 'TORRE', 230, 2, '#9fd3ef');
  drawText(x, 'PIED PIPER · HANGAR 2', 300, 2, '#9fe0b5');
  R(x, 0, 8, 202, 54, '#d8d0bf'); R(x, 202, 8, 76, 54, '#c3cbd3'); R(x, 278, 8, 202, 54, '#cdd4d6');
  for (let xx = 0; xx < W; xx++) { if (noise(xx, 3) > 0.7) P(x, xx, 58, 'rgba(0,0,0,0.05)'); }
  R(x, 0, 58, W, 3, '#bdb4a2'); R(x, 0, 61, W, 3, '#6d6457'); R(x, 202, 58, 76, 6, '#55657a');
  // ventanas: marco y recorte
  for (const [wx, wy, ww, wh] of WINDOWS) {
    R(x, wx - 2, wy - 2, ww + 4, wh + 4, '#3b4148');
    R(x, wx - 2, wy + wh + 1, ww + 4, 2, '#e9e4d8'); // alféizar
    x.clearRect(wx, wy, ww, wh);
    const panes = Math.round(ww / 44), pw = ww / panes;
    for (let i = 1; i < panes; i++) R(x, Math.round(wx + i * pw) - 1, wy, 2, wh, '#3b4148');
  }
  // banderolas en las columnas
  R(x, 189, 27, 14, 17, '#1d3e6e'); R(x, 189, 27, 14, 1, '#2d5a96'); drawText(x, 'DM', 192, 33, '#ffffff'); R(x, 189, 44, 14, 2, '#122a4d');
  R(x, 277, 27, 14, 17, '#2e9e5b'); R(x, 277, 27, 14, 1, '#4cc27c'); drawText(x, 'PP', 280, 33, '#ffffff'); R(x, 277, 44, 14, 2, '#1d6e3e');
  return c;
}

// ---------- elementos de pared animados (relojes y mini pantallas) ----------
function clock(ctx, cx, cy, h, label) {
  R(ctx, cx - 5, cy - 5, 11, 11, '#2b2f35');
  ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, 4.6, 0, 7); ctx.fill();
  const ang = (v, m) => (v / m) * Math.PI * 2 - Math.PI / 2;
  const hand = (a, len, c) => { for (let i = 0; i <= len; i++) P(ctx, Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i), c); };
  const hh = h % 12, mm = (h % 1) * 60;
  hand(ang(hh, 12), 2, '#1d1d1d'); hand(ang(mm, 60), 3, '#1d1d1d'); P(ctx, cx, cy, '#c0392b');
  drawText(ctx, label, cx - Math.floor(textWidth(label) / 2), cy + 7, '#55606e');
}
export function drawWallDynamic(ctx, t, hour) {
  clock(ctx, 196, 14, hour, 'PUJ');
  clock(ctx, 284, 14, (hour + 4) % 24, 'UTC');
  // mini FIDS en las columnas
  for (const mx of [189, 277]) {
    R(ctx, mx, 47, 14, 9, '#121417'); R(ctx, mx + 1, 48, 12, 7, '#050607');
    for (let i = 0; i < 3; i++) {
      const w = 3 + Math.floor(noise(i + Math.floor(t / 3), mx) * 8);
      R(ctx, mx + 2, 49 + i * 2, w, 1, i === 0 ? '#ffb000' : '#d99a1e');
    }
  }
}

// ---------- cielo ----------
const SKY = [
  [0, '#0a0f24', '#18213f'], [5, '#141a3c', '#2c2a55'], [6, '#36427e', '#e8955a'], [7.2, '#5a9fe0', '#cfe6f2'],
  [12, '#3f94e0', '#c7e7fb'], [16.5, '#5585cf', '#f3d19c'], [18.2, '#3a3b7a', '#f07f55'], [19.2, '#1f2558', '#5a3d6e'],
  [20.5, '#0a0f24', '#18213f'], [24, '#0a0f24', '#18213f'],
];
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hex2(a), B = hex2(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
export function skyAt(h) {
  for (let i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h <= SKY[i + 1][0]) {
    const k = (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
    return [mix(SKY[i][1], SKY[i + 1][1], k), mix(SKY[i][2], SKY[i + 1][2], k)];
  }
  return [SKY[0][1], SKY[0][2]];
}
export function nightness(h) {
  if (h >= 7.5 && h <= 17) return 0;
  if (h > 17 && h < 19.5) return (h - 17) / 2.5;
  if (h > 5 && h < 7.5) return 1 - (h - 5) / 2.5;
  return 1;
}

// ---------- aviones ----------
const LIVERIES = {
  arajet: { tail: '#510c76', acc: '#78b919', stripe: '#510c76', eng: '#510c76' },
  dm: { tail: '#1d3e6e', acc: '#ffffff', stripe: '#1d3e6e', eng: '#9aa0a6' },
  pp: { tail: '#2e9e5b', acc: '#a6e3b8', stripe: '#2e9e5b', eng: '#9aa0a6' },
  hooli: { tail: '#4285c4', acc: '#f4b400', stripe: '#e8453c', eng: '#3b9b5a' },
  creed: { tail: '#77746c', acc: '#c9c4b5', stripe: '#77746c', eng: '#9aa0a6' },
  sky: { tail: '#c0392b', acc: '#f4f4f2', stripe: '#c0392b', eng: '#9aa0a6' },
  ocean: { tail: '#1f7fbf', acc: '#f2c230', stripe: '#1f7fbf', eng: '#9aa0a6' },
};
const planeCache = {};
function planeSprite(liv, gear) {
  const k = liv + gear; if (planeCache[k]) return planeCache[k];
  const L = LIVERIES[liv], c = cv(31, 11), x = c.getContext('2d'), B = '#f6f6f3', Bd = '#d9dbdd';
  // deriva
  [[1, 0, 2], [1, 1, 3], [1, 2, 4], [2, 3, 4], [2, 4, 5]].forEach(([a, y, w]) => R(x, a, y, w, 1, L.tail));
  P(x, 3, 1, L.acc); P(x, 4, 2, L.acc); P(x, 5, 3, L.acc);
  // fuselaje
  R(x, 5, 4, 21, 1, B); R(x, 2, 5, 26, 1, B); R(x, 2, 6, 27, 1, B); R(x, 4, 7, 23, 1, Bd);
  P(x, 28, 6, B); P(x, 29, 6, Bd);
  R(x, 4, 7, 22, 1, L.stripe);
  for (let i = 8; i < 23; i += 2) P(x, i, 5, '#5b6b7a');
  P(x, 26, 5, '#2d3e50'); P(x, 27, 5, '#2d3e50');
  // estabilizador, ala, motor
  R(x, 0, 5, 4, 1, L.tail);
  R(x, 12, 8, 9, 1, '#c3c7cc'); R(x, 14, 9, 5, 1, L.eng); P(x, 14, 8, shade(L.eng, -0.2));
  if (gear) { P(x, 10, 9, '#333'); P(x, 10, 10, '#222'); P(x, 23, 9, '#333'); P(x, 23, 10, '#222'); }
  const m = cv(31, 11), mx = m.getContext('2d'); mx.translate(31, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
  return (planeCache[k] = { right: c, left: m });
}

export class Sky {
  constructor() {
    this.planes = []; this.clouds = []; this.birds = null; this.stars = [];
    for (let i = 0; i < 6; i++) this.clouds.push({ x: Math.random() * W, y: 11 + Math.random() * 14, s: 0.6 + Math.random() * 0.8, v: 1 + Math.random() * 2 });
    for (let i = 0; i < 70; i++) this.stars.push([Math.floor(Math.random() * W), 9 + Math.floor(Math.random() * 22), Math.random()]);
    this.ambientT = 8; this.vehicles = []; this.vehT = 3; this.weather = null; this.flash = 0;
    this.rain = Array.from({ length: 90 }, () => [Math.random() * W, 9 + Math.random() * 47, 0.6 + Math.random() * 0.8]);
  }
  // Dirección de pista según el viento real: se despega y aterriza CONTRA el viento.
  runwayDir() {
    const w = this.weather; if (!w || !(w.wspd >= 3) || w.wdir == null) return null;
    const e = Math.sin(w.wdir * Math.PI / 180); // viento del este (+) → se opera hacia el este (derecha)
    return Math.abs(e) < 0.2 ? null : (e > 0 ? 1 : -1);
  }
  spawn(kind, liv, dir) {
    if (dir == null) dir = (kind !== 'taxi' && this.runwayDir()) || (Math.random() < 0.5 ? 1 : -1);
    const p = { kind, liv, dir, t: 0, gear: true, rot: 0 };
    if (kind === 'takeoff') { p.x = dir > 0 ? -34 : W + 4; p.y = 52; p.v = 12; }
    else if (kind === 'land' || kind === 'goaround') { p.x = dir > 0 ? -34 : W + 4; p.y = 14; p.v = 78; p.gear = true; }
    else { p.x = dir > 0 ? -34 : W + 4; p.y = 44; p.v = 10; }
    this.planes.push(p);
    return p;
  }
  update(dt) {
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 14 + Math.random() * 20;
      const r = Math.random();
      this.spawn(r < 0.45 ? 'taxi' : r < 0.75 ? 'takeoff' : 'land', ['arajet', 'arajet', 'sky', 'ocean'][Math.floor(Math.random() * 4)]);
    }
    this.vehT -= dt;
    if (this.vehT <= 0) { this.vehT = 9 + Math.random() * 16; const d = Math.random() < 0.5 ? 1 : -1; this.vehicles.push({ kind: ['tug', 'tug', 'fuel', 'follow', 'bus'][Math.floor(Math.random() * 5)], d, x: d > 0 ? -40 : W + 10, v: 9 + Math.random() * 7 }); }
    for (const v of this.vehicles) v.x += v.d * v.v * dt;
    this.vehicles = this.vehicles.filter(v => v.x > -60 && v.x < W + 60);
    if (!this.birds && Math.random() < dt / 40) this.birds = { x: -10, y: 16 + Math.random() * 10, t: 0 };
    if (this.birds) { this.birds.x += dt * 14; this.birds.t += dt; if (this.birds.x > W + 10) this.birds = null; }
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W + 40) { c.x = -40; c.y = 11 + Math.random() * 14; } }
    const wx = this.weather || {};
    if (wx.rain) for (const r of this.rain) { r[1] += dt * 90 * r[2]; r[0] -= dt * 18 * r[2]; if (r[1] > 56) { r[1] = 9; r[0] = Math.random() * (W + 20); } }
    if (wx.storm && Math.random() < dt / 7) this.flash = 0.35;
    if (this.flash > 0) this.flash -= dt;
    for (const p of this.planes) {
      p.t += dt; const d = p.dir;
      const rel = d > 0 ? p.x : W - p.x; // distancia recorrida desde el borde de entrada
      if (p.kind === 'takeoff') {
        p.v = Math.min(110, p.v + dt * 40); p.x += d * p.v * dt;
        if (rel > 170) { p.y -= dt * p.v * 0.32; p.rot = -0.16; if (rel > 220) p.gear = false; }
      } else if (p.kind === 'land') {
        if (p.y < 52) { p.x += d * p.v * dt; p.y = Math.min(52, p.y + dt * 15); p.rot = 0.05; }
        else { p.rot = 0; p.v = Math.max(16, p.v - dt * 34); p.x += d * p.v * dt; }
      } else if (p.kind === 'goaround') {
        p.x += d * p.v * dt;
        if (rel < 200) { p.y = Math.min(46, p.y + dt * 15); p.rot = 0.05; }
        else { p.y -= dt * 22; p.rot = -0.18; p.gear = false; }
      } else { p.x += d * p.v * dt; }
    }
    this.planes = this.planes.filter(p => p.x > -60 && p.x < W + 60 && p.y > -20);
  }
  draw(ctx, t, h) {
    const n = nightness(h);
    ctx.save();
    ctx.beginPath(); for (const [x, y, w, hh] of WINDOWS) ctx.rect(x, y, w, hh); ctx.clip();
    const [top, bot] = skyAt(h);
    const gr = ctx.createLinearGradient(0, 9, 0, 36); gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 9, W, 28);
    // estrellas
    if (n > 0.3) for (const [sx, sy, k] of this.stars) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + k * 20); ctx.fillStyle = `rgba(255,255,240,${(n - 0.3) * tw * 0.9})`; ctx.fillRect(sx, sy, 1, 1); }
    // sol / luna
    if (h > 5.6 && h < 19) {
      const k = (h - 5.6) / 13.4, sx = 20 + k * 440, sy = 34 - Math.sin(k * Math.PI) * 22;
      ctx.fillStyle = h < 7 || h > 17.5 ? '#ffb36b' : '#fff3c4'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,190,0.25)'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 7); ctx.fill();
    } else {
      const hh = h < 12 ? h + 24 : h, k = (hh - 19) / 10.6, mx = 20 + k * 440, my = 30 - Math.sin(k * Math.PI) * 18;
      ctx.fillStyle = '#eef0f6'; ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(mx + 1.6, my - 0.8, 2.6, 0, 7); ctx.fill();
    }
    // nubes
    const cl = n > 0.5 ? 'rgba(120,130,170,0.35)' : h > 17 && h < 19.5 ? 'rgba(255,200,180,0.85)' : 'rgba(255,255,255,0.9)';
    const wx = this.weather || {}, nCloud = wx.cover === 'OVC' || wx.cover === 'VV' ? 6 : wx.cover === 'BKN' ? 6 : wx.cover === 'SCT' ? 4 : wx.cover === 'FEW' ? 2 : wx.cover === 'CLR' || wx.cover === 'SKC' ? 0 : 3;
    if (wx.cover === 'OVC' || wx.cover === 'BKN' || wx.rain) { ctx.fillStyle = `rgba(${n > 0.5 ? '40,45,60' : wx.rain ? '112,120,134' : '150,158,170'},${wx.rain ? 0.78 : wx.cover === 'OVC' ? 0.55 : 0.3})`; ctx.fillRect(0, 9, W, 28); }
    for (const c of this.clouds.slice(0, nCloud)) {
      ctx.fillStyle = wx.rain ? 'rgba(120,128,140,0.9)' : cl; const s = c.s;
      ctx.fillRect(c.x, c.y, 18 * s, 3); ctx.fillRect(c.x + 3 * s, c.y - 2, 9 * s, 2); ctx.fillRect(c.x + 8 * s, c.y - 3, 6 * s, 1);
    }
    // pájaros
    if (this.birds && n < 0.5) { ctx.fillStyle = '#2b2b2b'; for (let i = 0; i < 4; i++) { const bx = this.birds.x - i * 5, by = this.birds.y + (i % 2) * 2 + Math.sin(this.birds.t * 8 + i) ; ctx.fillRect(bx, by, 1, 1); ctx.fillRect(bx - 1, by - 1, 1, 1); ctx.fillRect(bx + 1, by - 1, 1, 1); } }
    // mar Caribe
    R(ctx, 0, 33, W, 3, n > 0.5 ? '#123a4f' : '#25b0be');
    R(ctx, 0, 36, W, 4, n > 0.5 ? '#3b3a35' : '#e9dcb4'); R(ctx, 0, 36, W, 1, n > 0.5 ? '#2a3a44' : '#f6f0dc'); // playa
    if (n < 0.5) for (let i = 0; i < 12; i++) P(ctx, (i * 41 + Math.floor(t * 6)) % W, 34, '#bff3f5');
    // palapas de la terminal de PUJ y palmeras
    const thatch = n > 0.5 ? '#3a2e22' : '#a07646', thatchD = n > 0.5 ? '#2c231a' : '#7d5a33', wall = n > 0.5 ? '#3d4250' : '#f1ebdc';
    for (const [px, pw] of [[312, 30], [350, 22], [380, 34], [424, 26], [40, 26], [120, 30], [220, 40]]) {
      const base = 40, ph = Math.round(pw / 2.6);
      R(ctx, px + 3, base - 3, pw - 6, 3, wall);
      for (let i = 0; i < ph; i++) { const ww = Math.round(pw * (i + 1) / ph); R(ctx, px + Math.round((pw - ww) / 2), base - 3 - ph + i, ww, 1, i % 2 ? thatch : thatchD); }
      if (n > 0.5) for (let i = 0; i < 3; i++) P(ctx, px + 6 + i * 6, base - 2, '#ffd27a');
    }
    const palm = n > 0.5 ? '#1c2a22' : '#3f7d3a', trunk = n > 0.5 ? '#2a241d' : '#7a5a3a';
    for (const px of [24, 70, 160, 196, 262, 300, 342, 410, 458]) {
      for (let i = 0; i < 10; i++) P(ctx, px + Math.round(Math.sin(i / 4) * 1.5), 39 - i, trunk);
      const tx = px + 1, ty = 29;
      R(ctx, tx - 5, ty, 11, 1, palm); R(ctx, tx - 3, ty - 1, 7, 1, palm); P(ctx, tx - 6, ty + 1, palm); P(ctx, tx + 6, ty + 1, palm); P(ctx, tx - 5, ty + 2, palm); P(ctx, tx + 5, ty + 2, palm);
    }
    // plataforma, césped y pista
    R(ctx, 0, 40, W, 5, n > 0.5 ? '#3d4045' : '#a9aca8');
    for (let i = 0; i < W; i += 9) R(ctx, i, 42, 5, 1, '#e5b82c');
    R(ctx, 0, 45, W, 2, n > 0.5 ? '#26341f' : '#76a35a');
    R(ctx, 0, 47, W, 8, n > 0.5 ? '#202227' : '#3c3f46');
    R(ctx, 0, 47, W, 1, '#d9d9d9'); R(ctx, 0, 54, W, 1, '#d9d9d9');
    for (let i = 0; i < W; i += 12) R(ctx, i, 50, 6, 1, '#f2f2f2');
    if (n > 0.2) for (let i = 2; i < W; i += 10) { P(ctx, i, 47, `rgba(255,236,170,${n})`); P(ctx, i + 5, 45, `rgba(90,150,255,${n})`); }
    // vehículos de plataforma
    for (const v of this.vehicles) {
      const x = Math.round(v.x), y = 44, f = v.d, X = (dx, w) => f > 0 ? x + dx : x - dx - w + 1;
      const box = (dx, dy, w, h, c) => R(ctx, X(dx, w), y + dy, w, h, c);
      if (v.kind === 'tug') {
        box(0, -4, 6, 3, '#f2c230'); box(4, -6, 2, 2, '#2d3e50'); box(1, -1, 1, 1, '#222'); box(4, -1, 1, 1, '#222');
        for (let i = 0; i < 3; i++) { box(-8 - i * 8, -4, 6, 3, '#6d737b'); box(-8 - i * 8, -6, 6, 2, ['#c0392b', '#2c7be5', '#3b9b5a'][i]); box(-7 - i * 8, -1, 1, 1, '#222'); box(-4 - i * 8, -1, 1, 1, '#222'); box(-2 - i * 8, -3, 2, 1, '#555'); }
      } else if (v.kind === 'fuel') {
        box(0, -6, 4, 5, '#e9e9e6'); box(2, -6, 2, 2, '#2d3e50'); box(-12, -5, 12, 4, '#e9e9e6'); box(-12, -3, 12, 1, '#c0392b'); box(-10, -1, 1, 1, '#222'); box(-3, -1, 1, 1, '#222'); box(1, -1, 1, 1, '#222');
      } else if (v.kind === 'follow') {
        box(0, -3, 8, 2, '#f2c230'); box(2, -5, 4, 2, '#f2c230'); box(3, -5, 2, 1, '#2d3e50'); for (let i = 0; i < 8; i += 2) box(i, -3, 1, 1, '#111'); box(1, -1, 1, 1, '#222'); box(6, -1, 1, 1, '#222');
        if (n > 0.2 && Math.floor(t * 4) % 2) box(3, -6, 1, 1, '#ffb000');
      } else {
        box(-14, -7, 18, 6, '#f2f2ee'); box(-13, -6, 16, 2, '#7fb2d8'); box(-14, -3, 18, 1, '#510c76'); box(-11, -1, 2, 1, '#222'); box(0, -1, 2, 1, '#222');
      }
      if (n > 0.3) box(f > 0 ? 7 : 7, -3, 1, 1, '#fff6c8');
    }
    // faro giratorio del aeropuerto
    R(ctx, 258, 22, 1, 18, n > 0.5 ? '#3a3f47' : '#9aa0a6'); R(ctx, 257, 21, 3, 2, '#5b6168');
    if (n > 0.25) { const ph = (t * 0.8) % 1, col = ph < 0.5 ? '120,255,160' : '255,255,240', a = Math.max(0, Math.cos(ph * Math.PI * 4)) * n;
      ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(256, 20, 5, 2); ctx.fillStyle = `rgba(${col},${a * 0.25})`; ctx.fillRect(250, 19, 17, 4); }
    // avión estacionado con pasarela (librea Arajet)
    const ps = planeSprite('arajet', true);
    ctx.drawImage(ps.right, 26, 33);
    R(ctx, 52, 34, 14, 3, n > 0.5 ? '#4a4f57' : '#c9ccd1'); R(ctx, 64, 33, 4, 7, n > 0.5 ? '#3a3f47' : '#9aa0a6');
    // aviones en movimiento
    for (const p of this.planes) {
      const s = planeSprite(p.liv, p.gear)[p.dir > 0 ? 'right' : 'left'];
      ctx.save(); ctx.translate(Math.round(p.x) + 15, Math.round(p.y) - 6); ctx.rotate(p.rot * p.dir); ctx.drawImage(s, -15, -5);
      if (n > 0.2) {
        if (Math.floor(t * 2.5 + p.x) % 3 === 0) P(ctx, 0, -5, '#ff4040'); // baliza
        if (p.kind !== 'taxi') { ctx.fillStyle = 'rgba(255,250,220,0.5)'; ctx.fillRect(p.dir > 0 ? 16 : -22, 0, 6, 1); } // faro de aterrizaje
      }
      ctx.restore();
    }
    // manga de viento: apunta hacia donde sopla el viento real
    { const wsx = 136, base = 44; R(ctx, wsx, base - 14, 1, 14, n > 0.5 ? '#5b6168' : '#d8d8d8');
      const w = this.weather, kt = w?.wspd ?? 6, from = w?.wdir ?? 90, to = -Math.sin(from * Math.PI / 180) || 1;
      const len = Math.max(2, Math.min(7, Math.round(kt / 2))), droop = kt < 3 ? 1 : 0, flap = Math.sin(t * 7) > 0.6 ? 1 : 0;
      for (let i = 0; i < len; i++) P(ctx, wsx + (to > 0 ? 1 + i : -1 - i), base - 14 + (droop ? i : Math.floor(i / 4) + (i === len - 1 ? flap : 0)), i % 2 ? '#f4f4f4' : '#f26a1b'); }
    if (wx.rain) {
      ctx.fillStyle = n > 0.5 ? 'rgba(20,25,35,0.35)' : 'rgba(70,80,95,0.28)'; ctx.fillRect(0, 9, W, 47); // todo más apagado
      ctx.fillStyle = n > 0.5 ? 'rgba(170,190,220,0.6)' : 'rgba(205,220,240,0.85)';
      for (const [rx, ry] of this.rain) { const x = Math.round(rx), y = Math.round(ry); ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 1, y + 3, 1, 1); }
      // gotas que resbalan por el cristal
      for (let i = 0; i < 26; i++) { const gx = (i * 53 + 17) % W, gy = 12 + ((i * 29 + Math.floor(t * (6 + (i % 4) * 3))) % 42); ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.fillRect(gx, gy, 1, 2); ctx.fillStyle = 'rgba(230,240,255,0.25)'; ctx.fillRect(gx, gy - 4, 1, 4); }
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(235,240,255,${this.flash * 2})`; ctx.fillRect(0, 9, W, 47); }
    // reflejo del cristal
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (const [x0, y0, w0] of WINDOWS) for (let i = 0; i < w0; i += 44) { ctx.beginPath(); ctx.moveTo(x0 + i + 6, y0); ctx.lineTo(x0 + i + 14, y0); ctx.lineTo(x0 + i + 2, y0 + 47); ctx.lineTo(x0 + i - 6, y0 + 47); ctx.fill(); }
    ctx.restore();
  }
}

// ---------- mobiliario ordenable ----------
// Cada pieza: {y: línea base, draw(ctx, env)}. env = {t, n (nocturnidad), working:Set, flights, seated:Set, ...}
function deskTop(ctx, d, kind) {
  const { x, y, w } = d;
  const pal = {
    wood: ['#b48653', '#c99a65', '#8a6338'], white: ['#e3e0d9', '#f3f1ec', '#b6b2a8'], metal: ['#8d949b', '#a6adb4', '#61686f'],
    hooli: ['#f0efeb', '#ffffff', '#c9c6be'], tiki: ['#c8a35a', '#d9b56c', '#916f33'], counter: ['#d8cbb3', '#e8dcc5', '#7a5c3c'],
    atc: ['#2e3540', '#3b4452', '#1d222a'], exec: ['#5a3a24', '#7a5236', '#3b2516'],
  }[kind] || ['#b48653', '#c99a65', '#8a6338'];
  const hgt = kind === 'counter' ? 12 : 14, face = kind === 'counter' ? 6 : 4;
  R(ctx, x + 1, y + hgt, w - 2, 2, 'rgba(0,0,0,0.18)');
  R(ctx, x, y, w, hgt - face, pal[0]); R(ctx, x, y, w, 1, pal[1]); R(ctx, x, y + hgt - face, w, face, pal[2]);
  if (kind === 'exec') { R(ctx, x, y + hgt - face, w, 1, '#c9a227'); P(ctx, x + 1, y + hgt, '#2a1a10'); P(ctx, x + w - 2, y + hgt, '#2a1a10'); }
  if (kind === 'tiki') for (let i = x + 2; i < x + w; i += 4) R(ctx, i, y + 1, 1, hgt - face - 1, '#b38d45');
  if (kind === 'white' || kind === 'hooli') { P(ctx, x + 1, y + hgt, '#7d838c'); P(ctx, x + w - 2, y + hgt, '#7d838c'); }
  if (kind === 'counter') { R(ctx, x + 2, y + hgt - face + 1, w - 4, 1, shade(pal[2], 0.2)); drawText(ctx, 'INFO', x + w / 2 - 7, y + hgt - 5, '#f2c230'); }
}
function codeScreen(ctx, sx, sy, sw, sh, t, seed, on) {
  if (!on) { R(ctx, sx, sy, sw, sh, '#18242e'); const k = Math.floor(t / 2 + seed) % 6; P(ctx, sx + 1 + k % (sw - 2), sy + 1 + (k % (sh - 1)), '#2f4f63'); return; }
  R(ctx, sx, sy, sw, sh, '#0c1620');
  const cols = ['#5fd0ea', '#7ee081', '#f5c26b', '#c6a0f6'], step = Math.floor(t * 4);
  for (let r = 0; r < Math.floor(sh / 2); r++) {
    const k = noise(seed * 7 + r + step, r); const len = 2 + Math.floor(k * (sw - 3));
    R(ctx, sx + 1 + (r % 2), sy + 1 + r * 2, Math.min(len, sw - 2), 1, cols[(r + step) % 4]);
  }
}
function monitorUp(ctx, cx, y, t, seed, on, big) {
  const w = big ? 14 : 12;
  R(ctx, cx - w / 2, y - 6, w, 9, '#1f2328'); R(ctx, cx - 1, y + 3, 2, 2, '#2b2f35');
  codeScreen(ctx, cx - w / 2 + 1, y - 5, w - 2, 7, t, seed, on);
}
function deco(ctx, d, type, t) {
  const { x, y, w } = d, r = x + w;
  switch (type) {
    case 'beet': R(ctx, r - 6, y + 4, 3, 3, '#8e1b3f'); P(ctx, r - 5, y + 3, '#4f9d3a'); P(ctx, r - 4, y + 2, '#4f9d3a');
      R(ctx, x + 2, y + 4, 4, 3, 'rgba(242,211,74,0.85)'); P(ctx, x + 3, y + 5, '#6b6f75'); break; // gelatina con grapadora
    case 'jello': R(ctx, x + 2, y + 3, 3, 4, '#f4f4f4'); P(ctx, x + 3, y + 4, '#d0021b'); break; // taza
    case 'cat': R(ctx, r - 6, y + 3, 3, 3, '#f1ede6'); P(ctx, r - 6, y + 2, '#f1ede6'); P(ctx, r - 4, y + 2, '#f1ede6'); P(ctx, r - 5, y + 4, '#2b2b2b'); break;
    case 'calc': R(ctx, x + 2, y + 3, 4, 5, '#5a6068'); R(ctx, x + 3, y + 4, 2, 1, '#bfe6c4'); break;
    case 'candy': R(ctx, r - 6, y + 2, 4, 5, 'rgba(220,235,245,0.8)'); P(ctx, r - 5, y + 4, '#e8453c'); P(ctx, r - 4, y + 5, '#f4b400'); P(ctx, r - 5, y + 5, '#4285c4'); P(ctx, r - 4, y + 3, '#3b9b5a'); break;
    case 'sprouts': R(ctx, r - 5, y + 3, 3, 4, 'rgba(220,235,245,0.8)'); P(ctx, r - 4, y + 3, '#7ac142'); P(ctx, r - 4, y + 2, '#7ac142'); break;
    case 'phone': R(ctx, r - 5, y + 4, 2, 3, '#111'); break;
    case 'folders': R(ctx, x + 2, y + 2, 6, 2, '#e8d9a8'); R(ctx, x + 2, y + 4, 6, 2, '#d8c690'); R(ctx, x + 2, y + 6, 6, 1, '#c8b67e'); break;
    case 'radio': R(ctx, r - 5, y + 3, 2, 4, '#1b1b1b'); P(ctx, r - 5, y + 2, '#1b1b1b'); R(ctx, x + 2, y + 3, 5, 3, '#f2c230'); R(ctx, x + 2, y + 6, 6, 1, '#d9a91c'); break;
    case 'papers': R(ctx, x + 2, y + 3, 5, 4, '#fafafa'); R(ctx, x + 3, y + 2, 5, 4, '#f0f0f0'); R(ctx, r - 5, y + 3, 2, 4, '#3b82f6'); break;
    case 'chain': P(ctx, r - 5, y + 4, '#e2b93b'); P(ctx, r - 4, y + 5, '#e2b93b'); P(ctx, r - 6, y + 5, '#e2b93b'); break;
    case 'plant': R(ctx, r - 6, y + 4, 3, 3, '#b5562c'); P(ctx, r - 6, y + 3, '#4f9d3a'); P(ctx, r - 4, y + 2, '#4f9d3a'); P(ctx, r - 5, y + 2, '#6bbf4f'); break;
    case 'tiki': R(ctx, r - 6, y + 2, 3, 5, '#8a5a2b'); P(ctx, r - 5, y + 3, '#2b1b0e'); P(ctx, r - 5, y + 1, '#f26b8a'); break;
    case 'flowers': R(ctx, x + 3, y + 3, 3, 4, '#7fb3d5'); P(ctx, x + 3, y + 2, '#f28fb1'); P(ctx, x + 5, y + 1, '#f2c94c'); P(ctx, x + 4, y + 2, '#f28fb1'); break;
    case 'laptop': break;
    case 'ceo': R(ctx, x + 2, y + 5, 9, 3, '#c9a227'); R(ctx, x + 3, y + 6, 7, 1, '#3b2516'); R(ctx, r - 6, y + 3, 3, 4, '#f4f4f4'); P(ctx, r - 5, y + 4, '#510c76'); R(ctx, r - 11, y + 2, 4, 5, '#2b2f35'); break;
  }
}

function chairBack(ctx, ax, ay) { R(ctx, ax - 4, ay - 9, 8, 7, '#3a3f47'); R(ctx, ax - 4, ay - 9, 8, 1, '#4d5460'); R(ctx, ax - 1, ay - 2, 2, 2, '#2a2e34'); R(ctx, ax - 3, ay, 6, 1, 'rgba(0,0,0,0.25)'); }

export function seatOf(desk) {
  if (desk.kind === 'beanbag') return { x: desk.x + 14, y: desk.y + 12, dir: 'down', ax: desk.x + 14, ay: desk.y + 12 };
  if (desk.dir === 'up') { const ax = desk.x + desk.w / 2, ay = desk.y + 26; return { x: ax, y: ay, dir: 'up', ax, ay }; }
  const ax = desk.x + desk.w / 2, ay = desk.y + 6; return { x: ax, y: desk.y - 3, dir: 'down', ax, ay };
}

export function buildProps() {
  const props = [];
  // escritorios del elenco
  for (const [id, c] of Object.entries(CAST)) {
    const d = c.desk, s = seatOf(d), seed = id.length * 13 + d.x;
    if (d.kind === 'beanbag') {
      props.push({ y: d.y + 10, draw(ctx) { // puf de Big Head
        R(ctx, d.x + 4, d.y + 2, 20, 10, '#b8443a'); R(ctx, d.x + 2, d.y + 4, 24, 7, '#b8443a'); R(ctx, d.x + 5, d.y + 2, 18, 2, '#d0574c'); R(ctx, d.x + 3, d.y + 11, 22, 1, 'rgba(0,0,0,0.2)'); } });
      continue;
    }
    if (d.dir === 'up') {
      props.push({ y: d.y + 14, id, draw(ctx, env) {
        deskTop(ctx, d, d.kind);
        if (d.kind === 'atc') { // consola de la torre con radar
          const rx = d.x + 20, ry = d.y + 4;
          ctx.fillStyle = '#0d2a1a'; ctx.beginPath(); ctx.arc(rx, ry, 5, 0, 7); ctx.fill();
          ctx.strokeStyle = '#2f8f55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 4.5, 0, 7); ctx.stroke();
          const a = env.t * 2.2; ctx.strokeStyle = '#7dffb0'; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * 4.5, ry + Math.sin(a) * 4.5); ctx.stroke();
          (env.radar || []).forEach((k, i) => { const aa = k * 6.28; P(ctx, Math.round(rx + Math.cos(aa) * (2 + i % 3)), Math.round(ry + Math.sin(aa) * (2 + i % 3)), '#c8ffd9'); });
          for (let i = 0; i < 5; i++) P(ctx, d.x + 4 + i * 2, d.y + 3, Math.floor(env.t * 3 + i) % 4 ? '#3b4452' : ['#e8453c', '#f4b400', '#3b9b5a', '#4285c4', '#e8453c'][i]);
          for (let i = 0; i < 5; i++) P(ctx, d.x + 30 + i * 2, d.y + 3, Math.floor(env.t * 2 + i * 3) % 5 ? '#3b4452' : '#7dffb0');
          R(ctx, d.x + 31, d.y + 5, 3, 3, '#f4f4f4'); P(ctx, d.x + 32, d.y + 6, '#c0392b'); // taza BEST BOSS
          monitorUp(ctx, d.x + 9, d.y + 1, env.t, seed, env.michael, false);
          R(ctx, d.x + 14, d.y + 7, 12, 2, '#565f6b');
        } else {
          const on = env.working.has(id);
          if (d.deco === 'dual') { monitorUp(ctx, d.x + w2(d) - 7, d.y + 1, env.t, seed, on, false); monitorUp(ctx, d.x + w2(d) + 7, d.y + 1, env.t, seed + 3, on, false); }
          else monitorUp(ctx, d.x + w2(d), d.y + 1, env.t, seed, on, false);
          R(ctx, d.x + w2(d) - 4, d.y + 7, 8, 2, d.kind === 'hooli' ? '#cfd3d8' : '#d5d7da'); P(ctx, d.x + w2(d) + 6, d.y + 8, '#d5d7da');
          deco(ctx, d, d.deco, env.t);
        }
      } });
      props.push({ y: s.ay - 0.5, id, chair: true, draw(ctx, env) { if (!env.seated.has(id)) chairBack(ctx, s.ax, s.ay); } });
    } else {
      // de frente: silla detrás (antes del personaje), escritorio delante
      props.push({ y: s.ay - 1, id, draw(ctx, env) { if (!env.seated.has(id)) { R(ctx, s.ax - 4, d.y - 8, 8, 9, '#3a3f47'); R(ctx, s.ax - 4, d.y - 8, 8, 1, '#4d5460'); } } });
      props.push({ y: d.y + 14, id, draw(ctx, env) {
        deskTop(ctx, d, d.kind);
        const cx = d.x + w2(d), on = env.working.has(id);
        if (d.deco === 'laptop' || d.kind === 'counter' || d.kind === 'exec') { R(ctx, cx - 5, d.y + 1, 10, 5, '#b9bec6'); R(ctx, cx - 5, d.y + 1, 10, 1, '#d7dbe0'); if (on) R(ctx, cx - 4, d.y, 8, 1, '#5fd0ea'); }
        else { R(ctx, cx - 6, d.y - 1, 12, 7, '#2b2f35'); R(ctx, cx - 5, d.y, 10, 1, '#3a3f47'); R(ctx, cx - 1, d.y + 6, 2, 2, '#2b2f35'); if (on) R(ctx, cx - 6, d.y - 2, 12, 1, 'rgba(95,208,234,0.8)'); }
        deco(ctx, d, d.deco, env.t);
      } });
    }
  }
  // escritorios Hooli
  HOOLI_DESKS.forEach((d, i) => {
    const s = seatOf(d);
    props.push({ y: d.y + 14, draw(ctx, env) { deskTop(ctx, d, 'hooli'); R(ctx, d.x, d.y + 10, d.w, 1, ['#4285c4', '#e8453c', '#f4b400', '#3b9b5a'][i]); monitorUp(ctx, d.x + 12, d.y + 1, env.t, 50 + i, env.hooliOn > i, false); R(ctx, d.x + 8, d.y + 7, 8, 2, '#cfd3d8'); } });
    props.push({ y: s.ay - 0.5, draw(ctx, env) { if (env.hooliOn <= i) chairBack(ctx, s.ax, s.ay); } });
  });
  // --- zona de descanso ---
  props.push({ y: 136, draw(ctx, env) { // barra de café
    R(ctx, 204, 126, 26, 7, '#cfc6b6'); R(ctx, 204, 126, 26, 1, '#e2dacb'); R(ctx, 204, 133, 26, 3, '#8a7b66'); R(ctx, 205, 136, 24, 1, 'rgba(0,0,0,0.2)');
    R(ctx, 207, 118, 8, 10, '#202326'); R(ctx, 208, 119, 6, 3, '#3a3f45'); P(ctx, 213, 124, Math.floor(env.t * 2) % 2 ? '#e8453c' : '#5a1c1c'); R(ctx, 209, 125, 3, 1, '#f4f4f4');
    for (let i = 0; i < 3; i++) { const k = (env.t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; ctx.fillRect(210 + Math.round(Math.sin(k * 6 + i)), 117 - Math.round(k * 8), 1, 1); }
    R(ctx, 219, 127, 2, 3, '#f4f4f4'); R(ctx, 222, 127, 2, 3, '#f4f4f4'); R(ctx, 225, 126, 3, 4, '#8a5a2b');
  } });
  props.push({ y: 138, draw(ctx, env) { // bebedero
    R(ctx, 262, 128, 10, 10, '#eceae4'); R(ctx, 262, 137, 10, 1, '#c9c6be'); R(ctx, 263, 120, 8, 8, '#8fc9ea'); R(ctx, 264, 121, 2, 6, '#c6e6f6');
    const k = Math.floor(env.t * 3) % 6; P(ctx, 267, 126 - k, '#e6f6ff'); R(ctx, 264, 131, 2, 2, '#4285c4'); R(ctx, 268, 131, 2, 2, '#e8453c');
  } });
  props.push({ y: 176, draw(ctx, env) { // máquina expendedora
    R(ctx, 260, 152, 16, 24, '#a83232'); R(ctx, 260, 152, 16, 1, '#c84a4a'); R(ctx, 262, 154, 10, 16, '#1d2a33');
    const snack = ['#f4b400', '#e8453c', '#3b9b5a', '#4285c4', '#f28fb1'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) R(ctx, 263 + c * 3, 155 + r * 4, 2, 2, snack[(r + c) % 5]);
    R(ctx, 273, 157, 2, 6, '#d9d9d9'); R(ctx, 262, 171, 10, 3, '#111'); R(ctx, 261, 176, 14, 1, 'rgba(0,0,0,0.25)');
  } });
  props.push({ y: 176, draw(ctx, env) { // mesa redonda con el chili de Kevin
    R(ctx, 233, 166, 14, 8, '#9a6b3e'); R(ctx, 232, 167, 16, 6, '#9a6b3e'); R(ctx, 234, 166, 12, 1, '#b5824f'); R(ctx, 239, 174, 2, 2, '#5a3d22');
    R(ctx, 236, 166, 6, 4, '#3a3a3a'); R(ctx, 236, 166, 6, 1, '#8c2b1b');
    for (let i = 0; i < 2; i++) { const k = (env.t * 0.7 + i / 2) % 1; ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - k)})`; ctx.fillRect(238 + i * 2, 164 - Math.round(k * 7), 1, 1); }
  } });
  props.push({ y: 180, draw(ctx, env) { // copiadora
    R(ctx, 14, 168, 14, 12, '#c9ccd1'); R(ctx, 14, 168, 14, 2, '#e3e5e8'); R(ctx, 15, 172, 12, 1, '#8d939b'); P(ctx, 25, 170, Math.floor(env.t) % 2 ? '#3b9b5a' : '#1f4f30');
    if (env.copying) { const k = Math.floor(env.t * 4) % 4; R(ctx, 16 + k, 166, 5, 2, '#ffffff'); }
  } });
  props.push({ y: 141, draw(ctx) { // sofá de cuero del CEO
    R(ctx, 104, 122, 12, 18, '#4a2a1a'); R(ctx, 106, 124, 8, 14, '#6b3b22'); R(ctx, 104, 122, 12, 2, '#5c3420'); R(ctx, 104, 138, 12, 2, '#5c3420');
    P(ctx, 109, 128, '#8a4e2c'); P(ctx, 109, 133, '#8a4e2c'); R(ctx, 105, 141, 10, 1, 'rgba(0,0,0,0.25)');
  } });
  // --- Pied Piper ---
  props.push({ y: 94, draw(ctx, env) { // Anton
    R(ctx, 414, 62, 18, 32, '#15171b'); R(ctx, 414, 62, 18, 1, '#2a2e35');
    for (let r = 0; r < 7; r++) { R(ctx, 416, 65 + r * 4, 14, 3, '#22252b'); for (let i = 0; i < 4; i++) { const on = env.antonFlash ? Math.floor(env.t * 12 + r + i) % 2 === 0 : noise(r * 9 + i, Math.floor(env.t * (2 + (r % 3)))) > 0.45; P(ctx, 418 + i * 3, 66 + r * 4, on ? (i === 3 ? '#f5a623' : '#3dff7a') : '#1f4d2c'); } }
    drawText(ctx, 'ANTON', 413, 95, '#7d838c');
  } });
  props.push({ y: 92, draw(ctx, env) { // pizarra middle-out
    R(ctx, 440, 64, 34, 24, '#9aa0a6'); R(ctx, 441, 65, 32, 22, '#f6f6f2');
    drawText(ctx, 'MIDDLE', 443, 67, '#2c5aa0'); drawText(ctx, 'OUT', 443, 73, '#2c5aa0');
    R(ctx, 462, 68, 8, 5, '#c0392b'); R(ctx, 463, 69, 6, 3, '#f6f6f2'); R(ctx, 459, 79, 12, 1, '#2e9e5b'); P(ctx, 470, 78, '#2e9e5b'); P(ctx, 470, 80, '#2e9e5b');
    drawText(ctx, '5.2', 444, 80, '#c0392b'); R(ctx, 442, 88, 1, 4, '#6f757c'); R(ctx, 471, 88, 1, 4, '#6f757c');
  } });
  props.push({ y: 248, draw(ctx, env) { // ping-pong
    R(ctx, 300, 226, 40, 20, '#2f7a4f'); R(ctx, 300, 226, 40, 1, '#4a9a6c'); R(ctx, 300, 236, 40, 1, '#f4f4f4'); R(ctx, 319, 226, 2, 20, '#e9e9e9');
    R(ctx, 302, 246, 2, 2, '#333'); R(ctx, 336, 246, 2, 2, '#333');
    if (env.pingpong) { const k = (env.t * 1.6) % 2, u = k < 1 ? k : 2 - k; const bx = 304 + u * 32, by = 232 - Math.sin(u * Math.PI) * 6; P(ctx, Math.round(bx), Math.round(by), '#ffffff'); P(ctx, Math.round(bx), 236, 'rgba(0,0,0,0.3)'); }
  } });
  props.push({ y: 203, draw(ctx) { // segundo puf
    R(ctx, 332, 194, 18, 8, '#3e6fc0'); R(ctx, 330, 196, 22, 6, '#3e6fc0'); R(ctx, 333, 194, 16, 2, '#5a89d6'); R(ctx, 331, 202, 20, 1, 'rgba(0,0,0,0.2)');
  } });
  props.push({ y: 152, draw(ctx, env) { // hamaca y palapa
    R(ctx, 432, 136, 2, 16, '#7a5a3a'); R(ctx, 470, 136, 2, 16, '#7a5a3a');
    const cols = ['#e35d5d', '#f2c94c', '#3fa7d6', '#7ac142'];
    for (let i = 0; i < 36; i++) { const xx = 434 + i, yy = 140 + Math.round(Math.sin((i / 35) * Math.PI) * 6 + Math.sin(env.t * 1.5) * 0.6); R(ctx, xx, yy, 1, 3, cols[Math.floor(i / 9)]); }
  } });
  props.push({ y: 153, draw(ctx) { // palapa
    R(ctx, 467, 112, 2, 40, '#7a5a3a');
    for (let i = 0; i < 9; i++) { const w = 6 + i * 3; R(ctx, 468 - w / 2, 104 + i, w, 1, i % 2 ? '#c9a25a' : '#a98242'); }
    for (let i = 0; i < 8; i++) P(ctx, 456 + i * 3, 113 + (i % 2), '#8d6a33');
  } });
  // --- rampa ---
  props.push({ y: 250, draw(ctx) { // carro de equipaje
    R(ctx, 66, 242, 26, 6, '#5b6168'); R(ctx, 66, 242, 26, 1, '#7a8088'); R(ctx, 68, 248, 3, 2, '#1b1b1b'); R(ctx, 87, 248, 3, 2, '#1b1b1b'); R(ctx, 62, 244, 4, 1, '#5b6168');
    [['#c0392b', 68, 236, 7, 6], ['#2c7be5', 76, 237, 6, 5], ['#f2c230', 83, 235, 7, 7], ['#3b9b5a', 71, 232, 6, 4]].forEach(([c, x, y, w, h]) => { R(ctx, x, y, w, h, c); R(ctx, x, y, w, 1, shade(c, 0.25)); R(ctx, x + 2, y - 1, w - 4, 1, '#222'); });
  } });
  props.push({ y: 216, draw(ctx) { // maletas
    [['#7a3b8a', 140, 206, 6, 9], ['#2c7be5', 147, 208, 7, 8], ['#e8453c', 143, 210, 6, 6]].forEach(([c, x, y, w, h]) => { R(ctx, x, y, w, h, c); R(ctx, x, y, w, 1, shade(c, 0.3)); });
  } });
  for (const [cx, cy] of [[152, 240], [160, 256]]) props.push({ y: cy + 2, draw(ctx) { R(ctx, cx, cy - 4, 2, 5, '#f26a1b'); R(ctx, cx - 1, cy - 1, 4, 1, '#f4f4f4'); R(ctx, cx - 1, cy + 1, 4, 1, '#c9541a'); } });
  // plantas
  for (const [px, py] of [[282, 176], [192, 246], [470, 186], [178, 110]]) props.push({ y: py + 8, draw(ctx) {
    R(ctx, px + 1, py + 4, 6, 4, '#b5562c'); R(ctx, px + 1, py + 4, 6, 1, '#cf6d3f');
    for (const [a, b, c] of [[3, 0, '#4f9d3a'], [1, 1, '#3f7d3a'], [5, 1, '#3f7d3a'], [0, 2, '#4f9d3a'], [6, 2, '#4f9d3a'], [2, 2, '#6bbf4f'], [4, 3, '#6bbf4f'], [3, 1, '#6bbf4f']]) P(ctx, px + a, py + b, c);
  } });
  // letrero colgante de la puerta A1 (siempre delante)
  props.push({ y: 999, draw(ctx) { R(ctx, 229, 246, 22, 9, '#f2c230'); R(ctx, 229, 254, 22, 1, '#b8901c'); drawText(ctx, 'A1', 232, 248, '#111111'); for (let i = 0; i < 3; i++) R(ctx, 243 + i, 248 + i, 1, 5 - i * 2, '#111'); R(ctx, 239, 250, 4, 1, '#111'); } });
  return props;
}
const w2 = d => d.w / 2;

// ---------- iluminación ----------
const LAMPS = [[36, 110], [110, 110], [170, 120], [36, 170], [110, 176], [240, 92], [240, 150], [240, 220], [320, 110], [400, 110], [330, 190], [420, 186], [420, 236], [30, 236], [110, 236]];
let lightCv = null;
// Sello radial precalculado por color (opaco en el centro → transparente); se escala con drawImage.
const STAMPS = new Map();
function stamp(col) {
  let c = STAMPS.get(col); if (c) return c;
  c = cv(64, 64); const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, col.replace('A', 1)); g.addColorStop(1, col.replace('A', 0)); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  STAMPS.set(col, c); return c;
}
export function drawLighting(ctx, env) {
  const n = env.n;
  if (!lightCv) lightCv = cv(W, H);
  const l = lightCv.getContext('2d');
  l.clearRect(0, 0, W, H);
  if (n > 0.02) {
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = `rgba(8,12,34,${0.6 * n})`; l.fillRect(0, 0, W, H);
    l.globalCompositeOperation = 'destination-out';
    for (const [x, y, w, h] of WINDOWS) l.fillRect(x, y, w, h);
    const hole = (x, y, r, a) => { l.globalAlpha = a; l.drawImage(stamp('rgba(0,0,0,A)'), x - r, y - r, r * 2, r * 2); l.globalAlpha = 1; };
    for (const [x, y] of LAMPS) hole(x, y, 44, 0.75);
    for (const p of env.glows) hole(p[0], p[1], p[2] || 16, 0.9);
    l.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCv, 0, 0);
  }
  // brillos aditivos
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, col, a) => { ctx.globalAlpha = Math.min(1, a); ctx.drawImage(stamp(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };
  for (const p of env.glows) glow(p[0], p[1], p[2] || 14, p[3] || 'rgba(95,208,234,A)', (p[4] || 0.18) * (0.35 + n));
  if (n > 0.05) for (const [x, y] of LAMPS) glow(x, y, 30, 'rgba(255,214,150,A)', 0.07 * n);
  ctx.restore();
  // haces de sol por las ventanas durante el día
  if (env.h > 7 && env.h < 17.5) {
    const a = 0.07 * Math.sin(((env.h - 7) / 10.5) * Math.PI), dx = (env.h - 12) * -9;
    ctx.fillStyle = `rgba(255,244,214,${a})`;
    for (const [x, , w] of WINDOWS) for (let i = 0; i < w; i += 44) { ctx.beginPath(); ctx.moveTo(x + i + 4, 64); ctx.lineTo(x + i + 36, 64); ctx.lineTo(x + i + 36 + dx, 128); ctx.lineTo(x + i + 4 + dx, 128); ctx.fill(); }
  }
}
