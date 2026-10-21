// Elenco, planta de la terminal y lógica de vuelos (tareas → vuelos).

export const W = 480, H = 270;

// ---------- Elenco ----------
// desk: {x,y,w,dir,kind}  dir 'up' = de espaldas (vemos su pantalla), 'down' = de frente.
export const CAST = {
  // ======== DIRECCIÓN ========
  ceo: { name: 'Criz Silvestre', wing: 'ceo', gate: 'C1', role: 'CEO · Dirección general',
    blurb: 'Tú. Las órdenes salen de esta oficina: cada pedido viaja como memo dorado a la Torre, donde Michael lo reparte.',
    use: 'Escríbele a Claude en el chat: tu avatar firma el memo y lo envía a la Torre.', model: '—', access: 'todo',
    look: { skin: '#f1cfb2', hair: '#151210', style: 'short', shirt: '#f4f4f4', jacket: '#1f2430', tie: '#c9a227', pants: '#1f2430', glasses: true, goatee: '#4a3a30' },
    desk: { x: 128, y: 124, w: 34, dir: 'down', kind: 'exec', deco: 'ceo' } },
  // ======== DUNDER MIFFLIN ========
  michael: { name: 'Michael Scott', wing: 'dm', gate: 'T1', role: 'Regional Manager · Torre de control',
    blurb: 'La sesión principal de Claude. Recibe tus pedidos, autoriza los despegues y junta los resultados.',
    use: 'Es el chat donde escribes: «delega en Dwight y Jim».', model: 'tu sesión', access: 'todo',
    look: { skin: '#e9b996', hair: '#2a201b', style: 'short', shirt: '#f2f2f2', jacket: '#28324a', tie: '#b3262b', pants: '#28324a' },
    desk: { x: 220, y: 72, w: 40, dir: 'up', kind: 'atc' } },
  dwight: { name: 'Dwight Schrute', wing: 'dm', gate: 'A2', role: 'Assistant (to the) RM · QA',
    blurb: 'Revisa código y entregables sin piedad: bugs, casos borde y las reglas de la casa.',
    use: '«Pásale a Dwight el parser de TS.xls antes de cerrar».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#f0caa5', hair: '#6a4a2b', style: 'part', shirt: '#d6b54a', shortSleeve: true, tie: '#5b3b22', pants: '#4b4f58', glasses: true },
    desk: { x: 52, y: 124, w: 28, dir: 'down', kind: 'wood', deco: 'beet' } },
  jim: { name: 'Jim Halpert', wing: 'dm', gate: 'A3', role: 'Desarrollo pragmático',
    blurb: 'Implementa con la solución más simple que funcione, y la prueba antes de decir que terminó.',
    use: '«Que Jim agregue el filtro por aerolínea en AeroGate».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#eec4a1', hair: '#5b3c29', style: 'messy', shirt: '#86acd9', tie: '#2f3c55', pants: '#3a3f4a' },
    desk: { x: 52, y: 140, w: 28, dir: 'up', kind: 'wood', deco: 'jello' } },
  pam: { name: 'Pam Beesly', wing: 'dm', gate: 'A1', role: 'Recepción · diseño y comunicación',
    blurb: 'Interfaces, pulido visual, correos Outlook-safe, presentaciones y textos con voz humana.',
    use: '«Pam, revisa cómo se ve el correo del AIPC en oscuro».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#f3d0b2', hair: '#9c4a26', style: 'long', shirt: '#f4efe6', jacket: '#e3a1b0', pants: '#4a4560' },
    desk: { x: 216, y: 210, w: 48, dir: 'down', kind: 'counter', deco: 'flowers' } },
  angela: { name: 'Angela Martin', wing: 'dm', gate: 'A4', role: 'Contabilidad · formato y normas',
    blurb: 'Formato UAPA, APA 7, protocolo de tesis y ortografía, punto por punto. Lista de ✔/✘.',
    use: '«Angela, revisa la Unidad 4 contra el formato UAPA».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#f5d8c0', hair: '#e9d28c', style: 'bun', shirt: '#f4efe6', jacket: '#b9a3cf', pants: '#5b4f6e', short: true },
    desk: { x: 12, y: 70, w: 28, dir: 'up', kind: 'wood', deco: 'cat' } },
  oscar: { name: 'Oscar Martinez', wing: 'dm', gate: 'A5', role: 'Contabilidad · análisis de datos',
    blurb: 'Analiza datos y valida cifras y modelos. Cada número sale de un cálculo que corrió.',
    use: '«Oscar, confirma que el AUC 0,845 se reproduce».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#c8946c', hair: '#1e1916', style: 'short', shirt: '#9a8fd0', tie: '#3f3570', pants: '#303542', beard: '#2a221d' },
    desk: { x: 52, y: 70, w: 28, dir: 'up', kind: 'wood', deco: 'calc' } },
  kevin: { name: 'Kevin Malone', wing: 'dm', gate: 'A6', role: 'Contabilidad · tareas mecánicas',
    blurb: 'Lo barato y repetitivo: buscar, renombrar, contar, listar. Corre en Haiku.',
    use: '«Kevin, lista los .xlsx de Itinerarios Prueba».', model: 'haiku', access: 'lectura y edición',
    look: { skin: '#efc3a0', hair: '#a88d6c', style: 'buzz', shirt: '#7f9b84', pants: '#4a4f5a', big: true },
    desk: { x: 92, y: 70, w: 28, dir: 'up', kind: 'wood', deco: 'candy' } },
  creed: { name: 'Creed Bratton', wing: 'dm', gate: 'A7', role: 'Control de calidad · agentes sin nombre',
    blurb: 'Aquí aterriza cualquier agente genérico (general-purpose, Explore, Plan…). Nadie sabe qué hace.',
    use: 'Se activa solo cuando Claude usa un agente que no es del elenco.', model: '—', access: '—',
    look: { skin: '#e6bf9c', hair: '#d9d9d9', style: 'balding', shirt: '#c9b98f', jacket: '#8a7a55', pants: '#5a5446' },
    desk: { x: 140, y: 70, w: 28, dir: 'up', kind: 'wood', deco: 'sprouts' } },
  ryan: { name: 'Ryan Howard', wing: 'dm', gate: 'A8', role: 'El temporal · investigación web',
    blurb: 'Investiga tendencias, herramientas y repos de GitHub y trae un resumen con fuentes. Sonnet.',
    use: '«Ryan, ¿qué existe en GitHub para leer SSIM?».', model: 'sonnet', access: 'web',
    look: { skin: '#d8a77f', hair: '#121212', style: 'slick', shirt: '#f2f2f2', jacket: '#1c1c22', tie: '#1c1c22', pants: '#1c1c22', short: true },
    desk: { x: 130, y: 150, w: 28, dir: 'up', kind: 'wood', deco: 'phone' } },
  toby: { name: 'Toby Flenderson', wing: 'dm', gate: 'A9', role: 'RR. HH. · seguridad y privacidad',
    blurb: 'Antes de un push o despliegue: secretos, datos personales, listas BCC, repos públicos.',
    use: '«Que Toby revise aerointel antes de hacerlo público».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#efc8a7', hair: '#7a6650', style: 'balding', shirt: '#8f96a0', pants: '#4b4f58' },
    desk: { x: 14, y: 222, w: 28, dir: 'up', kind: 'wood', deco: 'folders' } },
  darryl: { name: 'Darryl Philbin', wing: 'dm', gate: 'R1', role: 'Jefe de rampa · dominio PUJ',
    blurb: 'SSIM, Type B, rotaciones y pernoctas, slots, OTP A15. Valida que la lógica tenga sentido operativo.',
    use: '«Darryl, ¿este enlace de pernocta tiene sentido?».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#6b4630', hair: '#151210', style: 'buzz', shirt: '#2f4a78', vest: '#d7f03a', pants: '#2b2f3a', beard: '#151210' },
    desk: { x: 104, y: 222, w: 28, dir: 'up', kind: 'metal', deco: 'radio' } },
  // ======== PIED PIPER ========
  richard: { name: 'Richard Hendricks', wing: 'pp', gate: 'B1', role: 'CEO · arquitectura',
    blurb: 'Diseña antes de construir: arquitectura, pasos con dependencias y riesgos. Entrega un plan.',
    use: '«Richard, diseña cómo meter AeroWeather en Aero Suite».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#f0cdb0', hair: '#5e3a24', style: 'curly', shirt: '#7b8a6a', hoodie: '#8c8f96', pants: '#3d4a63' },
    desk: { x: 300, y: 70, w: 28, dir: 'up', kind: 'white', deco: 'papers' } },
  dinesh: { name: 'Dinesh Chugtai', wing: 'pp', gate: 'B2', role: 'Pruebas',
    blurb: 'Escribe y corre tests con fixtures reales. Primero una prueba que falle, luego el arreglo.',
    use: '«Dinesh, una prueba que reproduzca el bug de pernocta».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#a8754f', hair: '#191513', style: 'short', shirt: '#7a3b5a', pants: '#3b3f4a' },
    desk: { x: 340, y: 70, w: 28, dir: 'up', kind: 'white', deco: 'chain' } },
  gilfoyle: { name: 'Bertram Gilfoyle', wing: 'pp', gate: 'B3', role: 'Infraestructura y despliegues',
    blurb: 'Servidores locales, LaunchAgents, puertos, Pages, Tailscale. Lo deja corriendo y lo verifica.',
    use: '«Gilfoyle, deja la oficina como LaunchAgent».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#ead0b8', hair: '#1f1a17', style: 'longstraight', shirt: '#1e1e22', jacket: '#2a2a30', pants: '#1e1e22', beard: '#1f1a17' },
    desk: { x: 380, y: 70, w: 28, dir: 'up', kind: 'white', deco: 'dual' } },
  jared: { name: 'Jared Dunn', wing: 'pp', gate: 'B4', role: 'Proyecto y documentación',
    blurb: 'READMEs, manuales, changelogs, pendientes. Documenta lo que existe de verdad.',
    use: '«Jared, escribe el README de AIPC Planner».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#f3dccb', hair: '#d7c39a', style: 'flat', shirt: '#f4f1ea', sweater: '#c8b48a', pants: '#6a6252' },
    desk: { x: 300, y: 124, w: 28, dir: 'down', kind: 'white', deco: 'plant' } },
  monica: { name: 'Monica Hall', wing: 'pp', gate: 'B5', role: 'Estrategia · segunda opinión',
    blurb: 'Supuestos débiles, qué existe ya, pre-mortem y un veredicto claro antes de invertir tiempo.',
    use: '«Monica, ¿vale la pena el canal de documentales?».', model: 'inherit', access: 'solo lectura',
    look: { skin: '#f2d4bd', hair: '#e2c27a', style: 'bob', shirt: '#f4efe6', jacket: '#2b3a5c', pants: '#2b3a5c' },
    desk: { x: 340, y: 124, w: 28, dir: 'down', kind: 'white', deco: 'laptop' } },
  erlich: { name: 'Erlich Bachman', wing: 'pp', gate: 'B6', role: 'Marketing y contenido',
    blurb: 'Títulos, descripciones, miniaturas y estrategia para GTA VI CLIP y Flami y Cayo. Ego incluido.',
    use: '«Erlich, 5 títulos para el Short de mañana».', model: 'inherit', access: 'lectura y edición',
    look: { skin: '#efc6a2', hair: '#4d3a2a', style: 'shaggy', shirt: '#2f8f8a', pattern: '#f2d04a', pants: '#3a4048', beard: '#4d3a2a', big: true },
    desk: { x: 380, y: 124, w: 28, dir: 'down', kind: 'tiki', deco: 'tiki' } },
  bighead: { name: 'Big Head', wing: 'pp', gate: 'B7', role: 'Enlace con Antigravity',
    blurb: 'Manda trabajo en volumen a los contratistas de Antigravity (Hooli XYZ) y trae los resultados.',
    use: '«Big Head, que los contratistas documenten los parsers».', model: 'inherit', access: 'Antigravity',
    look: { skin: '#efc8a5', hair: '#6b4a30', style: 'bigcurly', shirt: '#e6e2d6', hoodie: '#4f7a4a', pants: '#4a5466' },
    desk: { x: 304, y: 184, w: 28, dir: 'down', kind: 'beanbag' } },
};

export const CEO_IDS = ['ceo'];
export const DM_IDS = ['michael', 'pam', 'dwight', 'jim', 'angela', 'oscar', 'kevin', 'creed', 'ryan', 'toby', 'darryl'];
export const PP_IDS = ['richard', 'gilfoyle', 'dinesh', 'jared', 'monica', 'erlich', 'bighead'];

// Contratistas de Antigravity (Hooli XYZ): puestos y looks.
export const HOOLI_DESKS = [366, 392, 418, 444].map(x => ({ x, y: 212, w: 24, dir: 'up', kind: 'hooli' }));
export const HOOLI_LOOKS = [
  { skin: '#e7b892', hair: '#2b2420', style: 'short', shirt: '#4285c4', lanyard: '#e8453c', pants: '#3a3f4a' },
  { skin: '#8d5a3c', hair: '#1a1411', style: 'bob', shirt: '#e8453c', lanyard: '#f4b400', pants: '#2f3440' },
  { skin: '#f1d3bc', hair: '#c9a46a', style: 'long', shirt: '#f4b400', lanyard: '#3b9b5a', pants: '#3a3f4a' },
  { skin: '#c99872', hair: '#141210', style: 'buzz', shirt: '#3b9b5a', lanyard: '#4285c4', pants: '#2f3440' },
];

// ---------- Puntos de interés (pies del personaje) ----------
export const POI = {
  coffee: { x: 218, y: 146, dir: 'up', label: 'café' },
  cooler: { x: 268, y: 148, dir: 'up', label: 'bebedero' },
  vending: { x: 258, y: 184, dir: 'up', label: 'máquina' },
  tableA: { x: 222, y: 174, dir: 'right' },
  tableB: { x: 256, y: 174, dir: 'left' },
  windowDM: { x: 182, y: 92, dir: 'up', label: 'ventana' },
  windowPP: { x: 290, y: 92, dir: 'up', label: 'ventana' },
  towerWin: { x: 210, y: 100, dir: 'up' },
  whiteboard: { x: 456, y: 100, dir: 'up' },
  pingA: { x: 294, y: 238, dir: 'right' },
  pingB: { x: 346, y: 238, dir: 'left' },
  hammock: { x: 452, y: 156, dir: 'down' },
  reception: { x: 240, y: 236, dir: 'up' },
  rampCart: { x: 100, y: 258, dir: 'left' },
  tobyDoor: { x: 48, y: 198, dir: 'down' },
  hooliWatch: { x: 404, y: 256, dir: 'up' },
  door: { x: 240, y: 266, dir: 'down' },
  copier: { x: 36, y: 174, dir: 'left', label: 'copiadora' },
  beanbag2: { x: 340, y: 198, dir: 'down' },
};

// Preferencias de paseo por personaje (además de las genéricas).
export const PREFS = {
  ceo: ['windowDM', 'coffee', 'reception', 'tableA'],
  michael: ['towerWin', 'reception', 'tobyDoor', 'coffee', 'tableA'],
  dwight: ['copier', 'windowDM', 'coffee', 'rampCart'],
  jim: ['reception', 'coffee', 'tableA', 'windowDM'],
  pam: ['coffee', 'cooler', 'tableB'],
  angela: ['copier', 'cooler'],
  oscar: ['coffee', 'tableB', 'windowDM'],
  kevin: ['vending', 'vending', 'coffee', 'tableA'],
  creed: ['rampCart', 'hammock', 'vending', 'windowPP', 'copier'],
  ryan: ['coffee', 'reception', 'windowDM'],
  toby: ['cooler', 'coffee'],
  darryl: ['rampCart', 'rampCart', 'vending', 'coffee'],
  richard: ['whiteboard', 'whiteboard', 'windowPP', 'coffee'],
  gilfoyle: ['pingA', 'windowPP', 'coffee'],
  dinesh: ['pingB', 'coffee', 'vending'],
  jared: ['whiteboard', 'cooler', 'tableB', 'hooliWatch'],
  monica: ['coffee', 'windowPP', 'tableA'],
  erlich: ['hammock', 'hammock', 'vending', 'windowPP'],
  bighead: ['beanbag2', 'vending', 'hammock'],
};

// ---------- Proyectos → destinos ----------
const DESTINOS = [
  [/aerogate/i, 'AGT', 'AEROGATE'],
  [/tesis|otp/i, 'OTP', 'TESIS'],
  [/aeroweather/i, 'WXR', 'AERO WX'],
  [/aipc/i, 'APC', 'AIPC'],
  [/aerointel/i, 'INT', 'AEROINT'],
  [/aero-?suite/i, 'SUI', 'SUITE'],
  [/motor-horario|airside/i, 'HOR', 'HORARIOS'],
  [/gta/i, 'GTA', 'GTA VI'],
  [/flami|cayo|infantil/i, 'FLM', 'FLAMI'],
  [/cv-arajet|cv/i, 'CV', 'CV'],
  [/optimizer|optimizador/i, 'OPT', 'RECURSOS'],
  [/actual|finanzas/i, 'FIN', 'FINANZAS'],
  [/dunder/i, 'DMP', 'DUNDER'],
  [/antigravity/i, 'AGY', 'ANTIGRAV'],
  [/cloude code|^$/i, 'PUJ', 'PUJ'],
];
export function destino(cwd) {
  const s = cwd || '';
  for (const [re, code, name] of DESTINOS) if (re.test(s)) return { code, name };
  const clean = s.replace(/[^A-Za-z0-9 ]/g, ' ').trim().toUpperCase();
  return { code: (clean.replace(/\s/g, '').slice(0, 3) || 'PUJ'), name: clean.slice(0, 10).trim() || 'PUJ' };
}

export const KNOWN = new Set(Object.keys(CAST));
// Cómo se le llama en la oficina (Gilfoyle es Gilfoyle, no Bertram).
const NICK = { gilfoyle: 'Gilfoyle', bighead: 'Big Head', hooli: 'Hooli XYZ', ceo: 'Criz' };
export const nick = id => NICK[id] || CAST[id]?.name.split(' ')[0] || String(id ?? '—');
export const shortName = id => !id ? '—' : id === 'hooli' ? 'HOOLI' : nick(id).toUpperCase();
export const who = a => (a && KNOWN.has(a) && a !== 'michael' && a !== 'ceo') ? a : 'creed';

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function flightNo(agent, id) {
  const wing = agent === 'hooli' ? 'HX' : (CAST[agent]?.wing === 'pp' ? 'PP' : 'DM');
  return wing + (100 + hash(id) % 900);
}

// ---------- Vuelos ----------
// Mantiene el estado de vuelos a partir de los eventos del hook (y de Antigravity).
export class Flights {
  constructor() { this.map = new Map(); this.requests = []; this.session = new Map(); this.reqCount = 0; }
  key(e) { return e.id || (e.agent + ':' + e.desc + ':' + Math.round(e.ts)); }
  // Devuelve una "acción" para animar: {type, flight?, agent?}
  apply(e) {
    if (e.event === 'UserPromptSubmit') {
      this.reqCount++;
      const r = { ts: e.ts, desc: e.desc, cwd: e.cwd, session: e.session, no: 'MS' + String(100 + (this.reqCount % 900)) };
      this.requests.push(r); this.session.set(e.session, r);
      return { type: 'request', req: r };
    }
    if (e.event === 'Stop') { const r = this.session.get(e.session); this.session.delete(e.session); return { type: 'stop', req: r }; }
    if (!e.agent) return null;
    // Agentes en segundo plano: SubagentStart enlaza su agent_id y SubagentStop marca el aterrizaje.
    if (e.event === 'SubagentStart') {
      const f = [...this.map.values()].reverse().find(x => !x.end && x.raw === e.agent && !x.agentId);
      if (f) f.agentId = e.agent_id;
      return null;
    }
    if (e.event === 'SubagentStop') {
      const f = [...this.map.values()].find(x => x.agentId && x.agentId === e.agent_id);
      if (!f || !f.bg || f.end) return null; // los de primer plano aterrizan con PostToolUse
      f.end = e.ts; f.ok = true; if (e.result) f.result = e.result;
      return { type: 'land', flight: f };
    }
    if (e.event === 'PreToolUse') {
      const agent = who(e.agent);
      const f = { id: this.key(e), agent, raw: e.agent, desc: e.desc || 'Tarea', cwd: e.cwd, dest: destino(e.cwd),
        start: e.ts, end: null, ok: null, no: flightNo(agent, this.key(e)), gate: CAST[agent].gate, delayedNoted: false, bg: !!e.bg };
      this.map.set(f.id, f);
      return { type: 'assign', flight: f };
    }
    if (e.event === 'PostToolUse' || e.event === 'PostToolUseFailure') {
      let f = e.id ? this.map.get(e.id) : null;
      if (!f) { const open = [...this.map.values()].filter(x => !x.end && x.raw === e.agent); f = open.find(x => e.desc && x.desc === e.desc) || open[0]; }
      if (!f || f.end) return null; // fin repetido: no se aterriza dos veces
      if (f.bg && e.event === 'PostToolUse') return null; // solo es el acuse de lanzamiento; sigue en vuelo
      f.end = e.ts; f.ok = e.event === 'PostToolUse'; if (e.result) f.result = e.result;
      return { type: f.ok ? 'land' : 'cancel', flight: f };
    }
    return null;
  }
  // Tareas de Antigravity como vuelos HX.
  syncHooli(tasks) {
    const acts = [];
    for (const t of tasks) {
      const id = 'agy:' + t.id;
      let f = this.map.get(id);
      const start = t.startedAt ? Date.parse(t.startedAt) / 1000 : null;
      if (!start) continue;
      if (!f) {
        f = { id, agent: 'hooli', raw: 'antigravity', desc: t.title || 'Tarea Antigravity', cwd: t.workspace, dest: destino(t.workspace),
          start, end: null, ok: null, no: flightNo('hooli', id), gate: 'HX', model: t.modelLabel };
        this.map.set(id, f);
        if (t.status === 'running') acts.push({ type: 'assign', flight: f });
        else if (t.finishedAt) { f.end = Date.parse(t.finishedAt) / 1000; f.ok = t.status === 'done'; continue; } // ya terminada: sin aterrizaje fantasma
      }
      if (!f.end && (t.status === 'done' || t.status === 'failed' || t.status === 'cancelled') && t.finishedAt) {
        f.end = Date.parse(t.finishedAt) / 1000; f.ok = t.status === 'done';
        acts.push({ type: f.ok ? 'land' : 'cancel', flight: f });
      }
    }
    return acts;
  }
  status(f, now) {
    if (f.end) return f.ok ? 'ATERRIZÓ' : 'CANCELADO';
    const age = now - f.start;
    if (age > (f.bg ? 10800 : 1800)) return 'SIN CONTACTO';
    if (age < 5) return 'EMBARCANDO';
    if (age > 900) return 'DEMORADO';
    return 'EN VUELO';
  }
  active(now) { return [...this.map.values()].filter(f => !f.end && now - f.start <= (f.bg ? 10800 : 1800)); }
  activeFor(agent, now) { return this.active(now).filter(f => f.agent === agent); }
  michaelBusy(now) { return [...this.session.values()].some(r => now - r.ts < 1800); }
  michaelReq() { const v = [...this.session.values()]; return v[v.length - 1]; }
  board(now) {
    const all = [...this.map.values()];
    const live = all.filter(f => !f.end && now - f.start <= 1800).sort((a, b) => a.start - b.start);
    const done = all.filter(f => f.end || now - f.start > 1800).sort((a, b) => (b.end || b.start) - (a.end || a.start));
    return [...live, ...done].slice(0, 8);
  }
  stats(now) {
    const s0 = pujDayStart(now);
    const today = [...this.map.values()].filter(f => f.start >= s0);
    const landed = today.filter(f => f.end && f.ok);
    const ontime = landed.filter(f => f.end - f.start <= 900);
    const block = landed.length ? landed.reduce((a, f) => a + (f.end - f.start), 0) / landed.length : 0;
    return {
      flights: today.length,
      airborne: this.active(now).length,
      otp: landed.length ? Math.round(100 * ontime.length / landed.length) : null,
      block,
      requests: this.requests.filter(r => r.ts >= s0).length,
      cancelled: today.filter(f => f.end && !f.ok).length,
    };
  }
}

// ---------- Utilidades ----------
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santo_Domingo' });
}
// Inicio del día en Punta Cana (epoch en segundos), sin depender de la zona del navegador.
export function pujDayStart(nowSec = Date.now() / 1000) { return Math.floor(nowSec - pujHour(new Date(nowSec * 1000)) * 3600); }
export function pujHour(date = new Date()) {
  // Hora decimal en Punta Cana (UTC−4, sin horario de verano).
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return (utc - 4 + 24) % 24;
}
