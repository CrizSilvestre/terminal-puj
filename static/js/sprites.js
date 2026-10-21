// Sprites pixel art generados por código + fuente bitmap 3×5.
export const SW = 12, SH = 20; // tamaño del sprite; los pies quedan en (6, 20)

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function painter(ctx) {
  return {
    px: (x, y, c) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } },
    rect: (x, y, w, h, c) => { if (c && w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); } },
  };
}

const EYE = '#1d1b1b', GLASS = '#262626', LENS = '#cfe8f2', SHOE = '#24211f', CHAIR = '#3a3f47', CHAIR_HI = '#4d5460';

// ---------- piezas comunes ----------
function torsoColors(L) {
  return {
    base: L.hoodie || L.jacket || L.vest || L.sweater || L.shirt,
    sleeve: L.hoodie || L.jacket || L.shirt,
  };
}

function legs(g, L, view, f) {
  const P = L.pants, Pd = shade(L.pants, -0.25);
  if (view === 'side') {
    if (f === 0) { g.rect(4, 15, 4, 4, P); g.rect(3, 19, 5, 1, SHOE); return; }
    if (f === 1) { g.rect(2, 15, 3, 4, P); g.rect(1, 19, 4, 1, SHOE); g.rect(6, 15, 3, 3, Pd); g.rect(6, 18, 3, 1, SHOE); return; }
    g.rect(6, 15, 3, 4, Pd); g.rect(6, 19, 4, 1, SHOE); g.rect(3, 15, 3, 3, P); g.rect(2, 18, 4, 1, SHOE); return;
  }
  const liftL = f === 1, liftR = f === 2;
  g.rect(3, 15, 3, liftL ? 3 : 4, P); g.rect(3, liftL ? 18 : 19, 3, 1, SHOE);
  g.rect(6, 15, 3, liftR ? 3 : 4, P); g.rect(6, liftR ? 18 : 19, 3, 1, SHOE);
  g.px(6, 15, Pd);
}

function torsoFront(g, L, o, back) {
  const { base } = torsoColors(L);
  const x0 = L.big ? 1 : 2, x1 = L.big ? 10 : 9, w = x1 - x0 + 1, y0 = 10 + o, h = 15 - y0;
  g.rect(x0, y0, w, h, base);
  g.rect(x0, 14, w, 1, shade(base, -0.18)); // cintura
  if (back) {
    if (L.hoodie) g.rect(4, 9 + o, 4, 2, shade(L.hoodie, -0.15));
    if (L.vest) { g.rect(x0, 12, w, 1, '#e8e8e8'); g.rect(4, 10 + o, 4, 1, shade(L.vest, -0.1)); }
    if (L.jacket && !L.hoodie) g.rect(5, y0, 2, 1, L.shirt);
    return;
  }
  if (L.jacket) {
    g.rect(4, y0, 4, h - 1, L.shirt);
    g.px(4, y0, shade(L.jacket, 0.15)); g.px(7, y0, shade(L.jacket, 0.15));
    if (L.tie) g.rect(5, y0, 2, h - 1, L.tie);
  } else if (L.tie) {
    g.rect(5, y0, 2, h - 1, L.tie); g.px(4, y0, shade(L.shirt, 0.3)); g.px(7, y0, shade(L.shirt, 0.3));
  }
  if (L.sweater) { g.rect(5, y0, 2, 2, L.shirt); g.px(5, y0 + 2, L.shirt); }
  if (L.vest) { g.rect(5, y0, 2, h, L.shirt); g.rect(x0, 12, 3, 1, '#e8e8e8'); g.rect(7, 12, x1 - 6, 1, '#e8e8e8'); }
  if (L.hoodie) { g.px(5, y0 + 1, '#eeeeee'); g.px(6, y0 + 1, '#eeeeee'); g.rect(4, 13, 4, 1, shade(L.hoodie, -0.15)); }
  if (L.pattern) for (const [x, y] of [[3, 11], [7, 12], [5, 13], [8, 10], [4, 14], [9, 13], [2, 12]]) if (x >= x0 && x <= x1 && y >= y0) g.px(x, y, L.pattern);
  if (L.lanyard) { g.px(4, y0, L.lanyard); g.px(4, y0 + 1, L.lanyard); g.px(7, y0, L.lanyard); g.px(7, y0 + 1, L.lanyard); g.px(5, y0 + 2, L.lanyard); g.px(6, y0 + 2, L.lanyard); g.rect(5, y0 + 3, 2, 2, '#f5f5f5'); }
}

function arms(g, L, o, mode, f) {
  // mode: 'stand' | 'walk' | 'typeFront' | 'typeBack' | 'cheer'
  const { sleeve } = torsoColors(L);
  const sl = L.sweater ? L.shirt : sleeve;
  const xl = L.big ? 0 : 1, xr = L.big ? 11 : 10, S = L.skin, y0 = 10 + o;
  const short = L.shortSleeve;
  const arm = (x, top, len) => {
    for (let i = 0; i < len; i++) g.px(x, top + i, short && i >= 2 ? S : sl);
    g.px(x, top + len, S);
  };
  if (mode === 'cheer') {
    g.rect(xl, y0 - 4, 1, 4, sl); g.px(xl, y0 - 5, S);
    g.rect(xr, y0 - 4, 1, 4, sl); g.px(xr, y0 - 5, S);
    return;
  }
  if (mode === 'typeFront') {
    arm(xl, y0, 2); arm(xr, y0, 2);
    g.px(xl + 1, 13 + (f ? 0 : -1), S); g.px(xr - 1, 13 + (f ? -1 : 0), S);
    return;
  }
  if (mode === 'typeBack') {
    arm(xl, y0, 2 + (f ? 0 : -1)); arm(xr, y0, 2 + (f ? -1 : 0));
    return;
  }
  const dl = mode === 'walk' ? (f === 1 ? -1 : f === 2 ? 1 : 0) : 0;
  arm(xl, y0, 4 - o + dl - (dl > 0 ? 1 : 0));
  arm(xr, y0, 4 - o - dl - (dl < 0 ? 1 : 0));
}

function head(g, L, o, view) {
  const S = L.skin;
  g.rect(3, 3 + o, 6, 6, S); g.rect(4, 2 + o, 4, 1, S);
  g.rect(5, 9 + o, 2, 1, shade(S, -0.12)); // cuello
  if (view === 'front' || view === 'back') { g.px(2, 5 + o, shade(S, -0.08)); g.px(9, 5 + o, shade(S, -0.08)); }
  if (view === 'side') g.px(2, 6 + o, S); // nariz
}

function face(g, L, o, view) {
  const S = L.skin, mouth = shade(S, -0.32);
  if (view === 'front') {
    if (L.glasses) { // monturas finas: aro arriba, ojos visibles dentro, puente fino
      const F = '#4a4a4a', T = '#dceef5';
      g.px(3, 4 + o, F); g.px(4, 4 + o, F); g.px(7, 4 + o, F); g.px(8, 4 + o, F);
      g.px(3, 5 + o, T); g.px(4, 5 + o, EYE); g.px(5, 5 + o, F); g.px(6, 5 + o, F); g.px(7, 5 + o, EYE); g.px(8, 5 + o, T);
    } else { g.px(4, 5 + o, EYE); g.px(7, 5 + o, EYE); }
    g.px(5, 7 + o, mouth); g.px(6, 7 + o, mouth);
    if (L.beard) { g.rect(3, 7 + o, 6, 2, L.beard); g.px(3, 6 + o, L.beard); g.px(8, 6 + o, L.beard); g.rect(5, 7 + o, 2, 1, mouth); }
    g.px(3, 6 + o, L.beard || shade(S, 0.1)); // mejilla
    if (L.goatee) { g.px(5, 6 + o, L.goatee); g.px(6, 6 + o, L.goatee); g.px(4, 7 + o, L.goatee); g.px(7, 7 + o, L.goatee); g.rect(5, 8 + o, 2, 1, L.goatee); } // candado alrededor de la boca
  } else if (view === 'side') {
    if (L.glasses) { g.px(3, 4 + o, '#4a4a4a'); g.px(4, 4 + o, '#4a4a4a'); g.px(4, 5 + o, EYE); g.px(5, 5 + o, '#4a4a4a'); g.px(6, 5 + o, '#4a4a4a'); } else g.px(4, 5 + o, EYE);
    g.px(3, 7 + o, mouth);
    if (L.beard) { g.rect(3, 7 + o, 4, 2, L.beard); g.px(6, 6 + o, L.beard); g.px(3, 7 + o, mouth); }
    if (L.goatee) { g.px(3, 6 + o, L.goatee); g.px(4, 6 + o, L.goatee); g.px(4, 8 + o, L.goatee); }
  }
}

function hair(g, L, o, view) {
  const H = L.hair, Hd = shade(H, -0.22), Hl = shade(H, 0.18), st = L.style;
  const R = (x, y, w, h, c = H) => g.rect(x, y + o, w, h, c);
  const P = (x, y, c = H) => g.px(x, y + o, c);
  if (view === 'front') {
    switch (st) {
      case 'part': R(3, 1, 6, 2); R(3, 3, 2, 1); P(8, 3); P(6, 1, Hd); break;
      case 'messy': R(3, 1, 6, 2); P(4, 0); P(7, 0); P(2, 2); P(9, 2); P(3, 3); P(8, 3); P(6, 3); P(5, 1, Hd); break;
      case 'slick': R(3, 1, 6, 2); P(3, 3); P(8, 3); P(5, 1, Hl); P(6, 1, Hl); break;
      case 'long': R(3, 1, 6, 2); R(2, 2, 1, 9); R(9, 2, 1, 9); R(3, 3, 3, 1); P(8, 3); P(4, 1, Hl); break;
      case 'bob': R(3, 1, 6, 2); R(2, 2, 1, 6); R(9, 2, 1, 6); R(3, 3, 6, 1); P(5, 1, Hl); break;
      case 'bun': R(5, 0, 2, 1, Hd); R(3, 1, 6, 2); P(3, 3); P(8, 3); P(4, 1, Hl); break;
      case 'buzz': R(4, 1, 4, 1, Hd); R(3, 2, 6, 1, Hd); break;
      case 'balding': P(3, 3); P(3, 4); P(8, 3); P(8, 4); P(3, 2, Hd); P(8, 2, Hd); break;
      case 'curly': R(3, 0, 6, 1); R(2, 1, 8, 2); P(2, 3); P(9, 3); P(3, 1, Hd); P(6, 1, Hd); P(5, 2, Hd); P(8, 2, Hd); P(4, 3); P(7, 3); break;
      case 'bigcurly': R(2, 0, 8, 1); R(1, 1, 10, 2); R(1, 3, 2, 3); R(9, 3, 2, 3); R(3, 3, 6, 1);
        for (const [x, y] of [[2, 1], [5, 0], [8, 1], [4, 2], [7, 2], [1, 4], [10, 4]]) P(x, y, Hd); break;
      case 'longstraight': R(3, 1, 6, 2); R(2, 2, 1, 10); R(9, 2, 1, 10); P(5, 1, Hd); P(3, 3); P(8, 3); break;
      case 'shaggy': R(2, 1, 8, 2); R(2, 3, 1, 6); R(9, 3, 1, 6); R(3, 3, 6, 1); P(4, 3, Hd); P(7, 3, Hd); break;
      case 'flat': R(3, 1, 6, 2); P(3, 3); P(8, 3); P(4, 1, Hl); P(5, 1, Hl); break;
      default: R(3, 1, 6, 2); P(3, 3); P(8, 3); P(5, 1, Hl);
    }
  } else if (view === 'back') {
    switch (st) {
      case 'balding': R(3, 5, 6, 3); R(3, 3, 1, 2); R(8, 3, 1, 2); break;
      case 'buzz': R(3, 2, 6, 6, Hd); R(4, 1, 4, 1, Hd); break;
      case 'long': R(3, 1, 6, 2); R(2, 2, 8, 9); P(5, 4, Hd); P(6, 7, Hd); break;
      case 'longstraight': R(3, 1, 6, 2); R(2, 2, 8, 10); P(5, 2, Hd); P(5, 6, Hd); break;
      case 'bob': R(3, 1, 6, 2); R(2, 2, 8, 6); break;
      case 'bun': R(3, 1, 6, 7); R(5, 3, 2, 2, Hd); break;
      case 'shaggy': R(2, 1, 8, 8); P(4, 4, Hd); P(7, 6, Hd); break;
      case 'curly': R(3, 0, 6, 1); R(2, 1, 8, 7); P(3, 2, Hd); P(6, 3, Hd); P(8, 5, Hd); P(4, 6, Hd); break;
      case 'bigcurly': R(2, 0, 8, 1); R(1, 1, 10, 6); for (const [x, y] of [[2, 2], [5, 1], [8, 3], [4, 4], [7, 5], [3, 6]]) P(x, y, Hd); break;
      case 'messy': R(3, 1, 6, 7); P(4, 0); P(7, 0); P(2, 2); P(9, 2); break;
      default: R(3, 1, 6, 7); P(5, 2, Hl);
    }
  } else { // side (mirando a la izquierda)
    switch (st) {
      case 'balding': R(7, 4, 2, 3); break;
      case 'buzz': R(3, 2, 6, 1, Hd); R(7, 3, 2, 3, Hd); break;
      case 'long': R(3, 1, 6, 2); R(6, 3, 3, 9); P(3, 3); break;
      case 'longstraight': R(3, 1, 6, 2); R(6, 3, 3, 10); break;
      case 'bob': R(3, 1, 6, 2); R(6, 3, 3, 5); P(3, 3); break;
      case 'bun': R(3, 1, 6, 2); R(6, 3, 3, 3); R(8, 1, 2, 2, Hd); break;
      case 'shaggy': R(2, 1, 7, 2); R(6, 3, 3, 7); P(3, 3); break;
      case 'curly': R(2, 0, 7, 3); R(6, 3, 4, 4); P(4, 1, Hd); P(7, 4, Hd); break;
      case 'bigcurly': R(1, 0, 10, 3); R(5, 3, 6, 4); P(3, 1, Hd); P(8, 2, Hd); P(7, 5, Hd); break;
      case 'messy': R(3, 1, 6, 2); R(6, 3, 3, 3); P(4, 0); P(7, 0); P(2, 2); break;
      case 'part': R(3, 1, 6, 2); R(6, 3, 3, 3); P(3, 3); break;
      default: R(3, 1, 6, 2); R(6, 3, 3, 3);
    }
  }
}

function torsoSide(g, L, o) {
  const { base } = torsoColors(L);
  const x0 = L.big ? 2 : 3, x1 = L.big ? 9 : 8, y0 = 10 + o;
  g.rect(x0, y0, x1 - x0 + 1, 15 - y0, base);
  g.rect(x0, 14, x1 - x0 + 1, 1, shade(base, -0.18));
  if (L.jacket || L.sweater) g.px(x0, y0, L.shirt);
  if (L.tie) { g.px(x0, y0 + 1, L.tie); g.px(x0, y0 + 2, L.tie); }
  if (L.vest) g.rect(x0, 12, x1 - x0 + 1, 1, '#e8e8e8');
  if (L.pattern) { g.px(x0 + 1, 11, L.pattern); g.px(x0 + 3, 13, L.pattern); }
  if (L.lanyard) { g.px(x0, y0, L.lanyard); g.px(x0, y0 + 2, '#f5f5f5'); }
}

function armSide(g, L, o, f) {
  const sl = L.sweater ? L.shirt : torsoColors(L).sleeve, S = L.skin, y0 = 10 + o;
  const col = (x, top, len) => { for (let i = 0; i < len; i++) g.px(x, top + i, L.shortSleeve && i >= 2 ? S : sl); g.px(x, top + len, S); };
  if (f === 1) { col(4, y0, 2); g.px(3, y0 + 2, sl); g.px(3, y0 + 3, S); }
  else if (f === 2) { col(6, y0, 2); g.px(7, y0 + 2, sl); g.px(7, y0 + 3, S); }
  else { col(5, y0, 4 - o); col(6, y0, 4 - o); }
}

// ---------- vistas completas ----------
function drawFront(ctx, L, f, mode) {
  const g = painter(ctx), o = L.short ? 1 : 0;
  if (mode !== 'sit') legs(g, L, 'front', f);
  torsoFront(g, L, o, false);
  arms(g, L, o, mode === 'sit' ? 'typeFront' : mode === 'cheer' ? 'cheer' : (f ? 'walk' : 'stand'), f);
  head(g, L, o, 'front'); face(g, L, o, 'front'); hair(g, L, o, 'front');
}
function drawBack(ctx, L, f, mode) {
  const g = painter(ctx), o = L.short ? 1 : 0;
  if (mode !== 'sit') legs(g, L, 'back', f);
  torsoFront(g, L, o, true);
  arms(g, L, o, mode === 'sit' ? 'typeBack' : (f ? 'walk' : 'stand'), f);
  head(g, L, o, 'back'); hair(g, L, o, 'back');
  if (mode === 'sit') { g.rect(2, 14, 8, 6, CHAIR); g.rect(2, 14, 8, 1, CHAIR_HI); g.rect(3, 19, 6, 1, shade(CHAIR, -0.3)); }
}
function drawSide(ctx, L, f) {
  const g = painter(ctx), o = L.short ? 1 : 0;
  legs(g, L, 'side', f);
  torsoSide(g, L, o);
  armSide(g, L, o, f);
  head(g, L, o, 'side'); face(g, L, o, 'side'); hair(g, L, o, 'side');
}

function frame(fn) { const c = canvas(SW, SH); fn(c.getContext('2d')); return c; }
function mirror(src) { const c = canvas(SW, SH), x = c.getContext('2d'); x.translate(SW, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }

export function buildSprites(L, opts = {}) {
  const left = [0, 1, 2].map(f => frame(x => drawSide(x, L, f)));
  const sitDown = [0, 1].map(f => frame(x => {
    const g = painter(x);
    if (opts.beanbag) { // en el puf: sin silla, piernas cruzadas
      drawFront(x, L, f, 'sit');
      g.rect(2, 15, 8, 2, L.pants); g.rect(2, 15, 8, 1, shade(L.pants, 0.12)); g.rect(1, 16, 2, 1, SHOE); g.rect(9, 16, 2, 1, SHOE);
      return;
    }
    g.rect(1, 7, 10, 8, CHAIR); g.rect(1, 7, 10, 1, CHAIR_HI); // respaldo detrás
    drawFront(x, L, f, 'sit');
  }));
  return {
    down: [0, 1, 2].map(f => frame(x => drawFront(x, L, f, 'stand'))),
    up: [0, 1, 2].map(f => frame(x => drawBack(x, L, f, 'stand'))),
    left, right: left.map(mirror),
    sitUp: [0, 1].map(f => frame(x => drawBack(x, L, f, 'sit'))),
    sitDown,
    cheer: frame(x => drawFront(x, L, 0, 'cheer')),
    portrait: frame(x => drawFront(x, L, 0, 'stand')),
  };
}

// Gato de Angela (8×6), dos cuadros.
export function buildCat() {
  const make = f => { const c = canvas(9, 7), g = painter(c.getContext('2d'));
    const B = '#e9e4da', D = '#b9b1a3', E = '#2b2b2b', N = '#e79aa6';
    g.rect(1, 2, 6, 3, B); g.rect(6, 0, 3, 3, B); g.px(6, 0, D); g.px(8, 0, D); g.px(7, 1, E); g.px(8, 2, N);
    g.rect(0, 1, 1, 2, D); g.px(1, 1, D); // cola
    g.px(1 + f, 5, D); g.px(5 - f, 5, D); g.px(2, 3, D); g.px(4, 2, D);
    return c; };
  const r = [make(0), make(1)];
  const l = r.map(src => { const c = canvas(9, 7), x = c.getContext('2d'); x.translate(9, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; });
  return { right: r, left: l };
}

// ---------- fuente bitmap 3×5 ----------
const GLYPHS = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], 0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6],
  4: [5, 5, 7, 1, 1], 5: [7, 4, 6, 1, 6], 6: [3, 4, 6, 5, 2], 7: [7, 1, 2, 2, 2], 8: [2, 5, 2, 5, 2], 9: [2, 5, 3, 1, 6],
  '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], '·': [0, 0, 2, 0, 0], '/': [1, 1, 2, 4, 4], ':': [0, 2, 0, 2, 0],
  ' ': [0, 0, 0, 0, 0], '×': [0, 5, 2, 5, 0], '!': [2, 2, 2, 0, 2], '>': [4, 2, 1, 2, 4], '<': [1, 2, 4, 2, 1],
  "'": [2, 2, 0, 0, 0], '?': [6, 1, 2, 0, 2], '+': [0, 2, 7, 2, 0], '%': [5, 1, 2, 4, 5], '&': [2, 5, 2, 5, 3], '#': [5, 7, 5, 7, 5],
};
export function textWidth(s) { return s.length * 4 - 1; }
export function drawText(ctx, s, x, y, color) {
  ctx.fillStyle = color;
  const t = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  for (let i = 0; i < t.length; i++) {
    const gl = GLYPHS[t[i]] || GLYPHS['?'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r] & (4 >> c)) ctx.fillRect(x + i * 4 + c, y + r, 1, 1);
  }
}
