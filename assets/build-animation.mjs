// Writes assets/how-it-works.svg (animated) and assets/banner.svg (still).
// Original artwork: a puppet theatre drawn in terminal characters, CSS only.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOP = 24;
const W = 1200;
const H = 675;
const COLS = 110;
const CW = W / COLS;
const TOP = 28;
const CH = (H - TOP) / 32;
const HERO = 13.5; // The moment a viewer with reduced motion sees as a still.

const BG = '#0e0b08';
const AMBER = '#ffb000';
const THREAD = '#fff1d0';
const RED = '#ff4d5e';
const GREEN = '#6bf0a0';
const RAMP = ' .:-=+*#%@';

const FONT = `ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono',monospace`;
const CSS = `
text{font:700 18px ${FONT};white-space:pre}
.c{fill:#7a4522}.l{fill:${AMBER}}.ld{fill:#6e4a10}.sh{fill:#33230f}.e{fill:#ff2a1a}.g{fill:#e6d3a8}.t{fill:${THREAD}}.w{fill:#e6d3a8}.s{fill:#a58d62}
.x{fill:${RED}}.p{fill:${GREEN}}.m{fill:#c2a878}.big{fill:${AMBER}}.bar{font-size:14px;fill:#c2a878}
`;

function seg(px, py, a, b, c, d) {
  const dx = c - a;
  const dy = d - b;
  const t = Math.max(0, Math.min(1, ((px - a) * dx + (py - b) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - a - dx * t, py - b - dy * t);
}

function lineChar(a, b, c, d) {
  const slope = (d - b) / (c - a || 1e-6);
  if (Math.abs(slope) > 2.6) return '|';
  if (Math.abs(slope) < 0.28) return '-';
  return slope > 0 ? '\\' : '/';
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ /g, ' ');

// Each run sets its own width, so columns stay aligned in whatever monospace font the viewer has.
function text(col, y, str, cls = '') {
  const c = cls ? ` class="${cls}"` : '';
  return `<text x="${+(col * CW).toFixed(1)}" y="${+y.toFixed(1)}" textLength="${+(str.length * CW).toFixed(1)}"${c}>${esc(str)}</text>`;
}
const rowY = (row, top = TOP) => top + row * CH + CH - 5;
const at = (col, row, str, cls) => text(col, rowY(row), str, cls);

// Draws scene(x, y) -> [char, class] | null onto the character grid.
function raster(scene, rows = 32, top = TOP) {
  let out = '';
  for (let r = 0; r < rows; r++) {
    let run = '';
    let start = 0;
    let cls = null;
    let gap = 0;
    const flush = () => {
      if (run.trim()) out += text(start, rowY(r, top), run.trimEnd(), cls);
      run = '';
      gap = 0;
      cls = null;
    };
    for (let c = 0; c < COLS; c++) {
      const cell = scene((c + 0.5) * CW, top + (r + 0.5) * CH);
      if (cell && cell[0] !== ' ') {
        if (run && cls !== cell[1]) flush();
        if (!run) {
          start = c;
          cls = cell[1];
        }
        run += ' '.repeat(gap) + cell[0];
        gap = 0;
      } else if (run && ++gap > 2) flush();
    }
    flush();
  }
  return out;
}

const keyframes = [];
let counter = 0;

// fn(t) is sampled over the loop and held between changes. The inline value is the HERO state,
// so with animation off every element shows one coherent frame.
function track(fn, css) {
  const stops = [];
  let last;
  for (let i = 0; i <= LOOP * 20; i++) {
    const t = i / 20;
    const v = JSON.stringify(fn(t));
    if (v !== last) stops.push([t, css(fn(t))]);
    last = v;
  }
  if (stops.length === 1) return stops[0][1];
  const name = `a${counter++}`;
  const body = [...stops, [LOOP, stops.at(-1)[1]]]
    .map(([t, c]) => `${+((t / LOOP) * 100).toFixed(2)}%{${c}}`)
    .join('');
  keyframes.push(`@keyframes ${name}{${body}}`);
  return `${css(fn(HERO))};animation:${name} ${LOOP}s step-end infinite`;
}

const opacity = (on) => `opacity:${on ? 1 : 0}`;
const when = (fn) => track(fn, opacity);
const within = (t, ...windows) => windows.some(([a, b]) => t >= a && t < b);

/* ---------- Timeline ---------- */

const PUPPETS = [
  { role: 'BUILDER', x: 170 },
  { role: 'BUILDER', x: 420 },
  { role: 'REVIEWER', x: 780 },
  { role: 'RESEARCHER', x: 1030 },
];
// Each thread leaves a fingertip: the ring finger holds the outer puppet, the index the inner.
const TIPS = [[240, 262], [340, 266], [860, 266], [960, 262]];
const BAR = 322;
const ARRIVE = [3.1, 3.4, 3.7, 4.0];
const SLUMP = [20.5, 20.9, 21.3, 21.7];
const FAIL = 13.2;
const PASS_1 = 16.3;
const PASS_2 = 17.8;
const WORK = [
  [[6.8, 11.6], [14.2, 15.8]],
  [[7.0, 16.9]],
  [[11.9, 13.2], [15.9, PASS_1], [17.2, PASS_2]],
  [[7.2, 10.2]],
];

function poseAt(i, t) {
  if (t < ARRIVE[i] || t >= SLUMP[i]) return 'slump';
  if (t < ARRIVE[i] + 0.25) return Math.floor((t - ARRIVE[i]) / 0.1) % 2 ? 'jerkR' : 'jerkL';
  if (i === 0 && within(t, [FAIL, FAIL + 0.5])) return Math.floor((t - FAIL) / 0.1) % 2 ? 'jerkR' : 'jerkL';
  if (within(t, ...WORK[i])) return Math.floor(t / 0.25) % 2 ? 'workA' : 'workB';
  return 'up';
}

// Where the lead looks. It does not move; only its eyes do.
function gazeAt(t) {
  if (within(t, [9, 9.15], [19.6, 19.75])) return 'blink';
  if (within(t, [FAIL, FAIL + 1])) return 'flare';
  if (within(t, [FAIL + 1, PASS_1])) return 'left';
  if (within(t, [10.2, FAIL], [PASS_1, 17.4])) return 'right';
  return 'center';
}
const LOOKS = { center: ' @ ', left: '@  ', right: '  @', flare: '@@@', blink: '---' };

/* ---------- Figures ---------- */

function lean(deg, [x, y]) {
  const r = (deg * Math.PI) / 180;
  const py = y - 250;
  return [x * Math.cos(r) - py * Math.sin(r), x * Math.sin(r) + py * Math.cos(r) + 250];
}

function skeleton(armR, deg = 0) {
  const p = (x, y) => lean(deg, [x, y]);
  const cap = (a, b, c, d, w) => [...p(a, b), ...p(c, d), w];
  const lastR = armR.at(-1);
  return {
    head: [...p(0, 38), 31],
    parts: [
      cap(-24, 84, 24, 84, 6), cap(0, 92, 0, 134, 20),
      cap(-24, 74, -56, 114, 9), cap(-56, 114, -44, 160, 8),
      ...armR.map(([a, b, c, d]) => cap(a, b, c, d, 8.5)),
      cap(-14, 143, -20, 198, 10), cap(-20, 198, -16, 250, 8.5),
      cap(14, 143, 20, 198, 10), cap(20, 198, 16, 250, 8.5),
    ],
    strings: [
      [0, 8, ...p(0, 22)],
      [-44, 8, ...p(-44, 160)],
      [44, 8, ...p(lastR[2], lastR[3])],
    ],
    bar: true,
  };
}

const ARM_DOWN = [[24, 74, 56, 114], [56, 114, 44, 160]];
const POSES = {
  up: skeleton(ARM_DOWN),
  jerkL: skeleton(ARM_DOWN, -10),
  jerkR: skeleton(ARM_DOWN, 9),
  workA: skeleton([[24, 74, 60, 62], [60, 62, 70, 20]]),
  workB: skeleton([[24, 74, 62, 96], [62, 96, 80, 124]]),
  slump: {
    head: [28, 174, 24],
    parts: [
      [-4, 186, -8, 236, 22],
      [-24, 196, -54, 222, 8], [-54, 222, -48, 250, 8],
      [14, 200, 40, 230, 8], [40, 230, 46, 250, 8],
      [-8, 246, 46, 250, 9], [-8, 246, -60, 250, 9],
    ],
    strings: [],
    bar: false,
  },
};

function figure(pose, px, bar) {
  return (x, y) => {
    const u = x - px;
    const v = y - bar;
    const [hx, hy, hr] = pose.head;
    const eye = Math.abs(v - hy) < 9 && Math.abs(Math.abs(u - hx) - 14) < 6;
    const head = Math.hypot(u - hx, (v - hy) * 0.95) - hr;
    const body = Math.min(...pose.parts.map(([a, b, c, d, w]) => seg(u, v, a, b, c, d) - w));
    const dist = Math.min(head, body);
    if (dist < 0) {
      if (head < 0 && eye) return ['o', 't'];
      return [dist > -9 ? '#' : '+', 'w'];
    }
    if (pose.bar && Math.abs(v) < 8 && Math.abs(u) < 60) return ['=', 'w'];
    for (const [a, b, c, d] of pose.strings) if (seg(u, v, a, b, c, d) < 4.5) return [lineChar(a, b, c, d), 's'];
    return null;
  };
}

// One hand, described on the left and mirrored to the right: [x, y, x, y, half-width].
const SLEEVE = [285, -30, 285, 22, 66];
const PALM = [285, 72, 285, 108, 62];
const FINGERS = [
  [[233, 110, 207, 165, 12], [207, 165, 198, 208, 10]], // little
  [[262, 122, 247, 190, 13], [247, 190, 240, 246, 11]], // ring
  [[293, 126, 290, 200, 13.5], [290, 200, 288, 266, 11]], // middle
  [[325, 120, 335, 190, 13], [335, 190, 340, 250, 11]], // index
  [[345, 84, 390, 125, 15], [390, 125, 410, 172, 12]], // thumb
];

const ARM = [[480, 238, 440, 130, 27], [440, 130, 395, 55, 24], [395, 55, 300, 25, 22]];

// The lead is one body, drawn like the puppets but far larger: skin in bone, clothes in amber.
function giantScene(x, y) {
  const u = x < W / 2 ? x : W - x;
  const cap = ([a, b, c, d, w]) => seg(u, y, a, b, c, d) - w;
  for (const [near, far] of FINGERS) {
    const joint = Math.hypot(u - near[2], y - near[3]) < 12;
    if (Math.min(cap(near), cap(far)) < 0) return [joint ? '=' : '#', 'w'];
  }
  const palm = cap(PALM);
  if (palm < 0) return [palm > -13 ? '#' : y > 92 && y < 118 ? '~' : '+', 'w'];
  const cuff = cap(SLEEVE);
  if (cuff < 0 && y > 26) return ['=', 'l'];

  const off = Math.abs(x - W / 2);
  const skull = Math.hypot(off, (y - 118) * 0.95) - 74;
  if (skull < 0) {
    if (y > 108 && y < 150 && off > 5 && off < 53) return null; // Eye sockets.
    if (y > 168 && y < 190 && off < 46) return null; // Mouth.
    if (y >= 190 && Math.abs(off - 40) < 6) return ['|', 's']; // The jaw is hinged, like a puppet's.
    return [skull > -10 ? '#' : '+', 'w'];
  }
  const neck = seg(x, y, W / 2, 192, W / 2, 226) - 19;
  if (neck < 0) return [neck > -8 ? '#' : '+', 'w'];

  const clothes = Math.min(
    Math.min(cuff, ...ARM.map(cap)),
    Math.min(seg(u, y, 480, 238, 562, 216) - 24, y < 258 ? seg(u, y, 520, 244, 600, 244) - 18 : Infinity),
  );
  if (clothes < 0) return [clothes > -12 ? '%' : ':', clothes > -12 ? 'l' : 'ld'];
  return null;
}

const FACE = { brow: 4, eye: 5, grin: 7, left: 51, right: 56 };
const faceAt = (row, top) => (col, str, cls) => text(col, rowY(top ? row : row + 1, top), str, cls);

function eyes(look, top = TOP) {
  const eye = faceAt(FACE.eye, top);
  return eye(FACE.left, look, 'e') + eye(FACE.right, look, 'e');
}
function brows(top = TOP) {
  const brow = faceAt(FACE.brow, top);
  return brow(FACE.left, '\\\\\\', 'e') + brow(FACE.right, '///', 'e');
}
const grin = (top = TOP) => faceAt(FACE.grin, top)(FACE.left, 'vVvVvVvV', 'g');

function curtainScene(x, y) {
  const near = x < 600 ? x : W - x;
  if (y > TOP + 30 * CH) return null;
  if (near > 46 - 18 * Math.sin(y / 120)) return null;
  return [RAMP[1 + Math.floor(Math.abs(Math.sin(near / 13)) * 3.4)], 'c'];
}

// The thread from a hand to a puppet's bar, cut in chunks so it can draw and retract.
function threadChunks(hand, px, bar, chunks = 8, rows = 32, top = TOP) {
  const [a, b] = hand;
  const dx = px - a;
  const dy = bar - b;
  const len2 = dx * dx + dy * dy;
  const blocks = [];
  for (let k = 0; k < chunks; k++) {
    blocks.push(
      raster((x, y) => {
        const t = ((x - a) * dx + (y - b) * dy) / len2;
        if (t < 0 || t > 1) return null;
        const shallow = Math.abs(dy) < Math.abs(dx);
        const miss = shallow ? Math.abs(y - (b + (dy * (x - a)) / dx)) > CH / 2 : Math.abs(x - (a + (dx * (y - b)) / dy)) > CW / 2;
        if (miss) return null;
        return t >= k / chunks && (t < (k + 1) / chunks || k === chunks - 1) ? [lineChar(a, b, px, bar), ''] : null;
      }, rows, top),
    );
  }
  return blocks;
}

/* ---------- The title, in a letterform of our own ---------- */

const LETTERS = {
  P: ['####.', '#...#', '####.', '#....', '#....'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  G: ['.####', '#....', '#..##', '#...#', '.###.'],
};
const WORD = 'PUPPETEERING';
const wordWidth = [...WORD].reduce((n, l) => n + LETTERS[l][0].length + 1, -1);

function bigLetter(letter, col, row, top = TOP) {
  return LETTERS[letter]
    .map((line, i) => (line.includes('#') ? text(col, rowY(row + i, top), line.replace(/\./g, ' '), 'big') : ''))
    .join('');
}

function bigWord(row, top = TOP, wrap = (s) => s) {
  let col = Math.round((COLS - wordWidth) / 2);
  return [...WORD]
    .map((letter, i) => {
      const s = wrap(bigLetter(letter, col, row, top), i);
      col += LETTERS[letter][0].length + 1;
      return s;
    })
    .join('');
}

/* ---------- Moving pieces ---------- */

function pathAt(path, t) {
  if (t <= path[0][0]) return path[0].slice(1);
  for (let i = 1; i < path.length; i++) {
    const [t0, c0, r0] = path[i - 1];
    const [t1, c1, r1] = path[i];
    if (t < t1) {
      const k = Math.max(0, (t - t0) / (t1 - t0));
      return [Math.round(c0 + (c1 - c0) * k), Math.round(r0 + (r1 - r0) * k)];
    }
  }
  return path.at(-1).slice(1);
}

function token(label, path, visible) {
  const move = track(
    (t) => pathAt(path, t),
    ([c, r]) => `transform:translate(${+(c * CW).toFixed(1)}px,${+((r - 3) * CH).toFixed(1)}px)`,
  );
  const width = label.length * CW;
  return `<g style="${when(visible)}"><g style="${move}"><rect x="-3" y="${TOP + 3 * CH + 1}" width="${width + 6}" height="${CH - 2}" fill="${BG}"/>${at(0, 3, label, 'w')}</g></g>`;
}

function statusRows(col, row, states) {
  return states
    .map(([label, cls], i) => {
      const from = i === 0 ? 0 : states[i][2];
      const to = i + 1 < states.length ? states[i + 1][2] : LOOP + 1;
      return `<g style="${when((t) => t >= from && t < to)}">${at(col, row, label, cls)}</g>`;
    })
    .join('');
}

function caption(str, from, to) {
  const line = `$ ${str}`;
  const typed = track(
    (t) => Math.min(line.length, Math.max(0, Math.round((t - from) * 34))),
    (n) => `transform:translateX(${+(n * CW).toFixed(1)}px)`,
  );
  const cursor = track(
    (t) => Math.min(line.length, Math.max(0, Math.round((t - from) * 34))),
    (n) => `transform:translateX(${+((n + 2) * CW).toFixed(1)}px)`,
  );
  return `<g style="${when((t) => t >= from && t < to)}">${at(2, 31, line, 't')}<rect x="${2 * CW}" y="${TOP + 31 * CH}" width="${(line.length + 1) * CW}" height="${CH}" fill="${BG}" style="${typed}"/><rect y="${TOP + 31 * CH + 3}" width="${CW - 1}" height="${CH - 6}" fill="${AMBER}" style="${cursor}"/></g>`;
}

/* ---------- Build ---------- */

function buildAnimated() {
  const defs = Object.entries(POSES)
    .map(([name, pose]) => `<g id="${name}">${raster(figure(pose, W / 2, BAR), 32)}</g>`)
    .join('');

  const puppets = PUPPETS.map((p, i) =>
    Object.keys(POSES)
      .map((name) => `<g style="${when((t) => poseAt(i, t) === name)}"><use href="#${name}" x="${p.x - W / 2}"/></g>`)
      .join(''),
  ).join('');

  const threads = PUPPETS.map((p, i) => {
    const color = track(
      (t) => {
        if (i === 0 && t >= FAIL && t < PASS_1) return RED;
        if (i === 0 && t >= PASS_1) return GREEN;
        if (i === 1 && t >= PASS_2) return GREEN;
        return THREAD;
      },
      (c) => `fill:${c}`,
    );
    const chunks = threadChunks(TIPS[i], p.x, BAR).map((block, k, all) => {
      const on = ARRIVE[i] - 0.4 * (1 - k / all.length);
      const off = SLUMP[i] + 0.4 * (1 - k / all.length);
      return `<g style="${when((t) => t >= on && t < off)}">${block}</g>`;
    });
    return `<g style="${color}">${chunks.join('')}</g>`;
  }).join('');

  const tags = PUPPETS.map((p, i) => {
    const col = Math.round(p.x / CW - (p.role.length + 4) / 2);
    const busy = (t) => within(t, ...WORK[i]);
    return `<g style="${when((t) => !busy(t))}">${at(col, 28, `[ ${p.role} ]`, 'm')}</g><g style="${when(busy)}">${at(col, 28, `[ ${p.role} ]`, 'l')}</g>`;
  }).join('');

  const COL = PUPPETS.map((p) => Math.round(p.x / CW));
  const ROW = 21;
  const PILE = [48, 15];
  const REVIEW = [COL[2] - 12, ROW];
  const tokens = [
    token('[#1]', [
      [5.4, ...PILE], [6.4, COL[0] + 8, ROW], [11.6, COL[0] + 8, ROW], [12, ...REVIEW], [FAIL + 0.3, ...REVIEW],
      [FAIL + 0.8, COL[0] + 8, ROW], [15.8, COL[0] + 8, ROW], [16.1, ...REVIEW], [PASS_1 + 0.7, ...REVIEW], [17.4, 49, 30],
    ], (t) => t >= 5.4 && t < 24),
    token('[#2]', [
      [5.7, ...PILE], [6.7, COL[1] + 8, ROW], [16.9, COL[1] + 8, ROW], [17.2, ...REVIEW], [PASS_2 + 0.4, ...REVIEW], [18.8, 56, 30],
    ], (t) => t >= 5.7 && t < 24),
    token('[#3]', [
      [6, ...PILE], [7, COL[3] - 12, ROW], [10.2, COL[3] - 12, ROW], [10.8, 52, 7],
    ], (t) => t >= 6 && t < 10.9),
  ].join('');

  const verdicts =
    `<g style="${when((t) => t >= FAIL && t < FAIL + 1)}">${at(COL[2] + 8, 19, 'FAIL #1', 'x')}</g>` +
    `<g style="${when((t) => within(t, [PASS_1, PASS_1 + 0.7]))}">${at(COL[2] + 8, 19, 'PASS #1', 'p')}</g>` +
    `<g style="${when((t) => within(t, [PASS_2, PASS_2 + 0.6]))}">${at(COL[2] + 8, 19, 'PASS #2', 'p')}</g>`;

  const pile =
    at(48, 13, 'THE PILE', 'm') +
    statusRows(48, 14, [
      ['[ ] #1 free', 'm'], ['[~] #1 building', 't', 5.4], ['[?] #1 in review', 't', 11.6], ['[!] #1 failed', 'x', FAIL],
      ['[?] #1 in review', 't', 15.8], ['[+] #1 passed', 'p', PASS_1], ['[x] #1 merged', 'p', 17.4],
    ]) +
    statusRows(48, 15, [
      ['[ ] #2 free', 'm'], ['[~] #2 building', 't', 5.7], ['[?] #2 in review', 't', 16.9], ['[x] #2 merged', 'p', 18.8],
    ]) +
    statusRows(48, 16, [['[ ] #3 free', 'm'], ['[~] #3 research', 't', 6], ['[x] #3 reported', 'p', 10.2]]) +
    statusRows(48, 18, [['free: 3', 'm'], ['free: 2', 'm', 5.4], ['free: 1', 'm', 5.7], ['free: 0', 'm', 6]]);

  const leadLog = [
    ['lead: reads #3', 10.8, 12.4],
    ['lead: checks #1', PASS_1 + 0.1, 17.4],
    ['lead: merges #1', 17.4, 18.8],
    ['lead: merges #2', 18.8, 20.4],
  ].map(([s, a, b]) => `<g style="${when((t) => t >= a && t < b)}">${at(Math.round((COLS - s.length) / 2), 11, s, 'l')}</g>`).join('');

  const main = at(40, 30, 'main', 'm') + at(45, 30, '=========================', 'c');

  const captions = [
    caption('the lead stays still. every teammate is on a string.', 2.7, 5.3),
    caption('each one takes the next free task from the pile.', 5.4, 8.6),
    caption('writing runs in parallel.', 8.7, 11.6),
    caption('whoever wrote it does not review it.', 11.7, 16.9),
    caption('the lead checks, and merges one at a time.', 17, 20.4),
    caption('when the work is done, the strings come off.', 20.5, 24),
  ].join('');

  const shake = track(
    (t) => {
      if (within(t, [2.6, 2.7], [FAIL, FAIL + 0.1])) return 1;
      if (within(t, [2.7, 2.8], [FAIL + 0.1, FAIL + 0.2])) return -1;
      return 0;
    },
    (n) => `transform:translateX(${+(n * CW).toFixed(1)}px)`,
  );

  const title = `<g style="${when((t) => t < 2.6)}"><rect width="${W}" height="${H}" fill="${BG}"/>
${bigWord(12, TOP, (s, i) => `<g style="${when((t) => t >= 0.2 + i * 0.09)}">${s}</g>`)}
<g style="${when((t) => t >= 1.4)}">${at(Math.round((COLS - 22) / 2), 19, 'one lead. many agents.', 't')}${at(Math.round((COLS - 25) / 2), 21, 'every string has a check.', 'm')}</g></g>`;

  const face = `<g style="${when((t) => t >= 2.6 && t < 22.2)}">${brows()}${Object.entries(LOOKS).map(([k, look]) => `<g style="${when((t) => gazeAt(t) === k)}">${eyes(look)}</g>`).join('')}</g>
<g style="${when((t) => t >= FAIL && t < PASS_1)}">${grin()}</g>`;

  const label = 'A puppet theatre drawn in terminal characters. A giant, still figure leans over the stage and sends threads to four marionettes, who jerk upright and take tasks from a pile. The reviewer fails one task and then passes it, and the lead merges the work one piece at a time.';
  const css = `${CSS}${keyframes.join('')}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<style>${css}</style>
<defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="${BG}"/>
<g style="${shake}">
${raster(curtainScene)}
${raster(giantScene)}
${face}
${threads}${puppets}${tags}${main}${pile}${leadLog}${verdicts}${tokens}
</g>
<rect width="${W}" height="${TOP}" fill="#1c1610"/><circle cx="20" cy="14" r="5" fill="#7a4522"/><circle cx="37" cy="14" r="5" fill="#7a4522"/><circle cx="54" cy="14" r="5" fill="#7a4522"/>
<text class="bar" x="${W / 2}" y="19" text-anchor="middle">puppeteering : main</text>
${captions}
${title}
</svg>`;
}

function buildBanner() {
  const height = 535;
  const rows = Math.ceil(height / CH);
  const bar = 270;
  const scene = [
    raster(curtainScene, rows, 0),
    raster(giantScene, rows, 0),
    brows(0), eyes(LOOKS.center, 0), grin(0),
    `<g style="fill:${THREAD}">${PUPPETS.flatMap((p, i) => threadChunks(TIPS[i], p.x, bar, 1, rows, 0)).join('')}</g>`,
    ...PUPPETS.map((p) => raster(figure(POSES.up, p.x, bar), rows, 0)),
    `<rect y="${rowY(18, 0) + 8}" width="${W}" height="${height}" fill="${BG}"/>`,
    bigWord(19, 0),
    text(Math.round((COLS - 48) / 2), rowY(25, 0), 'one lead. many agents. every string has a check.', 't'),
  ].join('\n');
  const label = 'Puppeteering: a giant figure with burning eyes, drawn in terminal characters, leans over a stage and holds four marionettes on strings.';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-label="${label}">
<style>${CSS}</style>
<rect width="${W}" height="${height}" fill="${BG}"/>
${scene}
</svg>`;
}

for (const [file, svg] of [
  ['how-it-works.svg', buildAnimated()],
  ['banner.svg', buildBanner()],
]) {
  // Every animation named on an element must have its keyframes in the stylesheet.
  for (const [, name] of svg.matchAll(/animation:(a\d+) /g)) {
    if (!svg.includes(`@keyframes ${name}{`)) throw new Error(`${file}: no keyframes for ${name}`);
  }
  writeFileSync(join(HERE, file), svg);
  console.log(`wrote ${file} (${Buffer.byteLength(svg)} bytes)`);
}
