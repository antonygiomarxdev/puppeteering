#!/usr/bin/env node
// Writes assets/how-it-works.svg: a 30-second loop built from CSS keyframes only.
// GitHub shows SVG through an img tag, so there is no script and no external font.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOOP = 30;
const C = {
  bg: '#14101f', panel: '#1d1730', row: '#241c3b', line: '#3a2f5c', track: '#2e2548',
  text: '#ece6ff', muted: '#9d93b8', head: '#cfc6ff',
  pink: '#f4a6d7', violet: '#8c7bff', green: '#7ee2a8', amber: '#ffb86b',
};
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const BASE = { op: 1, tx: 0, ty: 0, s: 1, fill: C.violet };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (t) => Number(((t / LOOP) * 100).toFixed(2));

// Each animated element gets its own keyframes. Its inline style is the final state,
// which is what shows when the user prefers reduced motion (animations are removed).
const rules = [];
let seq = 0;

// stops: [t, partial props, ease for the segment that starts here]. Values hold until the next stop.
function track(given, stops) {
  const keys = new Set(Object.keys(given));
  let cur = { ...BASE, ...given };
  const frames = [{ t: 0, p: cur, e: 'step-end' }];
  for (const [t, partial, ease = 'step-end'] of [...stops].sort((a, b) => a[0] - b[0])) {
    for (const k of Object.keys(partial)) keys.add(k);
    cur = { ...cur, ...partial };
    const frame = { t, p: cur, e: ease };
    if (frames[frames.length - 1].t === t) frames[frames.length - 1] = frame;
    else frames.push(frame);
  }
  return { keys: [...keys], frames, final: cur };
}

function css(p, keys) {
  const out = [];
  if (keys.includes('op')) out.push(`opacity:${p.op}`);
  const tr = [];
  if (keys.includes('tx') || keys.includes('ty')) tr.push(`translate(${p.tx}px,${p.ty}px)`);
  if (keys.includes('s')) tr.push(`scale(${p.s},1)`);
  if (tr.length) out.push(`transform:${tr.join(' ')}`);
  if (keys.includes('fill')) out.push(`fill:${p.fill}`);
  return out.join(';');
}

function anim(given, stops, extra = '') {
  const name = `k${(seq++).toString(36)}`;
  const { keys, frames, final } = track(given, stops);
  const frameCss = (p, e) => `${css(p, keys)}${e === 'linear' ? ';animation-timing-function:linear' : ''}`;
  const body = frames.map((f) => `${pct(f.t)}%{${frameCss(f.p, f.e)}}`).join('') + `100%{${css(final, keys)}}`;
  rules.push(`.${name}{animation:${name} ${LOOP}s step-end infinite}@keyframes ${name}{${body}}`);
  return ` class="${extra ? `${extra} ` : ''}${name}" style="${css(final, keys)}"`;
}

// windows: [[on, off], ...]; off null means visible to the end of the loop.
function vis(windows) {
  const init = { op: windows[0][0] === 0 ? 1 : 0 };
  const stops = [];
  for (const [on, off] of windows) {
    if (on > 0) stops.push([on, { op: 1 }]);
    if (off !== null) stops.push([off, { op: 0 }]);
  }
  return { init, stops };
}

function text(x, y, s, o) {
  const { size = 14, fill = C.text, weight = 400, anchor = 'start', box, a = '' } = o;
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" data-box="${box.join(' ')}"${a}>${esc(s)}</text>`;
}

// items: [label, fill, windows]; stacked texts share one spot and show one at a time.
function stacked(x, y, items, o) {
  return items
    .map(([s, fill, windows]) => {
      const v = vis(windows);
      return text(x, y, s, { ...o, fill, a: anim(v.init, v.stops) });
    })
    .join('');
}

const LEAD_ACTIONS = [
  ['writing #1', C.text, [[0, 1.0]]],
  ['writing #2', C.text, [[1.0, 1.7]]],
  ['writing #3', C.text, [[1.7, 2.4]]],
  ['writing #4', C.text, [[2.4, 3.0]]],
  ['writing #5', C.text, [[3.0, 3.6]]],
  ['writing #6', C.text, [[3.6, 4.2]]],
  ['assigning work', C.text, [[4.2, 11.5]]],
  ['re-running check #1', C.text, [[11.5, 12.5]]],
  ['waiting on review #3', C.text, [[12.5, 17.5]]],
  ['#1 and #3 pass', C.text, [[17.5, 22.0]]],
  ['queueing #5 and #6', C.text, [[22.0, 24.5]]],
  ['merging #5', C.text, [[24.5, 26.5]]],
  ['merging #6', C.text, [[26.5, 27.5]]],
  ['all six done', C.text, [[27.5, null]]],
];

const LEGEND = [
  [C.pink, 'lead, main session'],
  [C.violet, 'teammates'],
  [C.green, 'done, PASS'],
  [C.amber, 'blocked, FAIL'],
];

const COUNTER = [
  ['done 0/6', C.green, [[0, 17.5]]],
  ['done 2/6', C.green, [[17.5, 21.0]]],
  ['done 4/6', C.green, [[21.0, 24.5]]],
  ['done 5/6', C.green, [[24.5, 27.5]]],
  ['done 6/6', C.green, [[27.5, null]]],
];

const ROWS = [
  {
    id: '#1', title: 'build the API', entry: 0.3, lock: null,
    status: [
      ['open', C.muted, [[0.3, 5.9]]],
      ['claimed by builder-a', C.violet, [[5.9, 12.5]]],
      ['built, checked', C.violet, [[12.5, 15.5]]],
      ['reopened: fix', C.amber, [[15.5, 17.5]]],
      ['done', C.green, [[17.5, null]]],
    ],
  },
  {
    id: '#2', title: 'build the screen', entry: 1.0, lock: null,
    status: [
      ['open', C.muted, [[1.0, 6.2]]],
      ['claimed by builder-b', C.violet, [[6.2, 13.0]]],
      ['built, awaiting review', C.violet, [[13.0, 21.0]]],
      ['done', C.green, [[21.0, null]]],
    ],
  },
  {
    id: '#3', title: 'review the API', entry: 1.7, lock: [[1.7, 12.5]],
    status: [
      ['blocked', C.amber, [[1.7, 12.5]]],
      ['open', C.muted, [[12.5, 13.2]]],
      ['claimed by reviewer-a', C.violet, [[13.2, 15.5]]],
      ['FAIL', C.amber, [[15.5, 17.5]]],
      ['done', C.green, [[17.5, null]]],
    ],
  },
  {
    id: '#4', title: 'review the screen', entry: 2.4, lock: [[2.4, 13.0]],
    status: [
      ['blocked', C.amber, [[2.4, 13.0]]],
      ['open', C.muted, [[13.0, 18.0]]],
      ['claimed by reviewer-a', C.violet, [[18.0, 21.0]]],
      ['done', C.green, [[21.0, null]]],
    ],
  },
  {
    id: '#5', title: 'merge the API', entry: 3.0, lock: [[3.0, 22.0]],
    status: [
      ['blocked', C.amber, [[3.0, 22.0]]],
      ['queued for merge', C.violet, [[22.0, 24.5]]],
      ['merged', C.green, [[24.5, null]]],
    ],
  },
  {
    id: '#6', title: 'merge the screen', entry: 3.6, lock: [[3.6, 22.0]],
    status: [
      ['blocked', C.amber, [[3.6, 22.0]]],
      ['queued for merge', C.violet, [[22.0, 27.5]]],
      ['merged', C.green, [[27.5, null]]],
    ],
  },
];

const SLOT1 = [
  ['empty', C.muted, [[0, 22.0]]],
  ['#5 queued', C.text, [[22.0, 22.5]]],
  ['#5 merging the API', C.text, [[22.5, 24.5]]],
  ['#5 merged', C.green, [[24.5, null]]],
];

const SLOT2 = [
  ['empty', C.muted, [[0, 22.0]]],
  ['#6 waiting', C.text, [[22.0, 24.5]]],
  ['#6 re-integrating main', C.text, [[24.5, 26.5]]],
  ['#6 merging the screen', C.text, [[26.5, 27.5]]],
  ['#6 merged', C.green, [[27.5, null]]],
];

// Session log: each message enters at the bottom line and moves up one line per new message; four lines show.
const MSGS = [
  [5.9, 'builder-a claimed #1'],
  [7.0, 'builder-b claimed #2'],
  [11.5, 'builder-a → lead: done, tests pass'],
  [12.5, 'lead: check passed, #3 unlocked'],
  [14.0, 'reviewer-a claimed #3'],
  [15.5, 'reviewer-a: FAIL, a mutant survives'],
  [16.2, '#1 back to builder-a to fix'],
  [17.5, 'reviewer-a: PASS on #1 and #3'],
  [18.8, 'reviewer-a claimed #4'],
  [21.0, '#2 and #4 done'],
  [22.0, '#5 and #6 unlocked, queued to merge'],
  [24.5, 'merged #5'],
  [26.5, '#6: re-integrating main'],
  [27.5, 'merged #6: 6/6 done'],
];

function row(i, r) {
  const y = 116 + 52 * i;
  let s = `<g${anim({ op: 0 }, [[r.entry, { op: 1 }]])}>`;
  s += `<rect x="346" y="${y}" width="468" height="44" rx="8" fill="${C.row}" stroke="${C.line}"/>`;
  s += text(362, y + 28, r.id, { size: 15, weight: 700, box: [358, y + 12, 400, y + 34] });
  s += text(408, y + 28, r.title, { size: 15, box: [404, y + 12, 590, y + 34] });
  s += stacked(600, y + 28, r.status, { size: 14, box: [596, y + 12, 806, y + 34] });
  if (r.lock) {
    const v = vis(r.lock);
    s += `<g${anim(v.init, v.stops)}><rect x="790" y="${y + 20}" width="14" height="11" rx="2" fill="${C.amber}"/>`;
    s += `<path d="M793 ${y + 20}V${y + 16}a4 4 0 0 1 8 0V${y + 20}" fill="none" stroke="${C.amber}" stroke-width="2"/></g>`;
  }
  return s + '</g>';
}

function card(y0, name, status, task, bar) {
  let s = `<rect x="860" y="${y0}" width="300" height="104" rx="10" fill="${C.panel}" stroke="${C.line}"/>`;
  s += text(876, y0 + 26, name, { size: 16, weight: 700, fill: C.violet, box: [872, y0 + 12, 1000, y0 + 34] });
  s += stacked(1144, y0 + 26, status, { size: 14, anchor: 'end', box: [1000, y0 + 12, 1148, y0 + 34] });
  s += stacked(876, y0 + 52, task, { size: 14, box: [872, y0 + 38, 1148, y0 + 60] });
  s += `<rect x="876" y="${y0 + 76}" width="268" height="8" rx="4" fill="${C.track}"/>`;
  s += `<rect x="876" y="${y0 + 76}" width="268" height="8" rx="4"${anim({ s: 0, fill: C.violet }, bar, 'bar')}/>`;
  return s;
}

// A dot leaves a teammate card, travels to the task row's owner slot, and vanishes on arrival.
function dot(cx, cy, claim, arrive, dx, dy) {
  const a = anim({ op: 0, tx: 0, ty: 0 }, [
    [claim, { op: 1, tx: 0, ty: 0 }, 'linear'],
    [arrive - 0.05, { tx: dx, ty: dy }],
    [arrive, { op: 0 }],
  ]);
  return `<circle cx="${cx}" cy="${cy}" r="5" fill="${C.violet}"${a}/>`;
}

function messageLine(k) {
  const stops = [];
  for (let j = k; j < MSGS.length; j++) {
    const d = j - k;
    if (d > 3) {
      stops.push([MSGS[j][0], { op: 0, ty: -96 }]);
      break;
    }
    stops.push([MSGS[j][0], { op: 1, ty: -24 * d }]);
  }
  return text(56, 686, MSGS[k][1], { box: [52, 672, 1150, 692], a: anim({ op: 0, ty: 0 }, stops) });
}

function leadPanel() {
  let s = `<rect x="40" y="76" width="260" height="476" rx="10" fill="${C.panel}" stroke="${C.line}"/>`;
  s += text(56, 104, 'LEAD', { size: 16, weight: 700, fill: C.pink, box: [52, 90, 140, 110] });
  s += text(56, 128, 'main session', { size: 14, fill: C.muted, box: [52, 116, 290, 134] });
  s += stacked(56, 176, LEAD_ACTIONS, { size: 15, box: [52, 160, 290, 182] });
  s += text(56, 400, 'legend', { size: 14, fill: C.muted, box: [52, 388, 290, 406] });
  LEGEND.forEach(([c, label], i) => {
    const y = 428 + 24 * i;
    s += `<rect x="56" y="${y - 11}" width="12" height="12" rx="3" fill="${c}"/>`;
    s += text(76, y, label, { size: 14, box: [72, y - 14, 290, y + 6] });
  });
  return s;
}

function taskPanel() {
  let s = `<rect x="330" y="76" width="500" height="364" rx="10" fill="${C.panel}" stroke="${C.line}"/>`;
  s += text(346, 102, 'TASK LIST', { size: 16, weight: 700, fill: C.head, box: [342, 88, 520, 108] });
  s += stacked(814, 102, COUNTER, { size: 15, anchor: 'end', box: [660, 88, 814, 108] });
  ROWS.forEach((r, i) => {
    s += row(i, r);
  });
  return s;
}

function mergePanel() {
  let s = `<rect x="860" y="428" width="300" height="124" rx="10" fill="${C.panel}" stroke="${C.line}"/>`;
  s += text(876, 452, 'MERGE QUEUE', { size: 16, weight: 700, fill: C.head, box: [872, 438, 1040, 458] });
  s += `<rect x="874" y="464" width="272" height="34" rx="6" fill="${C.row}" stroke="${C.line}"/>`;
  s += stacked(888, 486, SLOT1, { size: 14, box: [880, 470, 1140, 492] });
  s += `<rect x="874" y="506" width="272" height="34" rx="6" fill="${C.row}" stroke="${C.line}"/>`;
  s += stacked(888, 528, SLOT2, { size: 14, box: [880, 512, 1140, 534] });
  return s;
}

function logPanel() {
  let s = `<rect x="40" y="568" width="1120" height="132" rx="10" fill="${C.panel}" stroke="${C.line}"/>`;
  s += text(56, 590, 'SESSION LOG', { size: 14, fill: C.muted, box: [52, 578, 220, 596] });
  s += MSGS.map((_, k) => messageLine(k)).join('');
  return s;
}

function statusLine() {
  let s = `<rect x="20" y="712" width="1160" height="1" fill="${C.line}"/>`;
  s += stacked(56, 730, [
    ['status: working', C.muted, [[0, 28]]],
    ['every string accounted for', C.green, [[28, null]]],
  ], { size: 15, box: [52, 716, 1150, 736] });
  return s;
}

function build() {
  const parts = [
    `<rect x="20" y="20" width="1160" height="720" rx="14" fill="${C.bg}" stroke="${C.line}" stroke-width="2"/>`,
    `<circle cx="44" cy="38" r="6" fill="${C.pink}"/><circle cx="62" cy="38" r="6" fill="${C.violet}"/><circle cx="80" cy="38" r="6" fill="${C.amber}"/>`,
    text(100, 44, 'puppeteering: an agent team at work', { size: 18, weight: 700, box: [96, 26, 700, 50] }),
    `<rect x="20" y="56" width="1160" height="1" fill="${C.line}"/>`,
    leadPanel(),
    taskPanel(),
    card(76, 'builder-a',
      [['idle', C.muted, [[0, 5.0]]], ['building', C.violet, [[5.0, 11.5]]], ['reported done', C.violet, [[11.5, 15.5]]], ['fixing', C.amber, [[15.5, 17.5]]], ['done', C.green, [[17.5, null]]]],
      [['idle', C.muted, [[0, 5.0]]], ['#1 build the API', C.text, [[5.0, 15.5]]], ['#1 fix the mutant', C.text, [[15.5, 17.5]]], ['#1 build the API, done', C.text, [[17.5, null]]]],
      [[5.0, { s: 0 }, 'linear'], [11.5, { s: 1 }], [15.5, { s: 0, fill: C.violet }, 'linear'], [16.8, { s: 1 }], [17.5, { fill: C.green }]],
    ),
    card(192, 'builder-b',
      [['idle', C.muted, [[0, 6.2]]], ['building', C.violet, [[6.2, 13.0]]], ['waiting review', C.violet, [[13.0, 21.0]]], ['done', C.green, [[21.0, null]]]],
      [['idle', C.muted, [[0, 6.2]]], ['#2 build the screen', C.text, [[6.2, 13.0]]], ['#2 built, awaiting review', C.text, [[13.0, 21.0]]], ['#2 done', C.text, [[21.0, null]]]],
      [[6.2, { s: 0 }, 'linear'], [13.0, { s: 1 }], [21.0, { fill: C.green }]],
    ),
    card(308, 'reviewer-a',
      [['idle', C.muted, [[0, 13.2]]], ['reviewing', C.violet, [[13.2, 15.5]]], ['FAIL', C.amber, [[15.5, 17.5]]], ['PASS', C.green, [[17.5, 18.0]]], ['reviewing', C.violet, [[18.0, 21.0]]], ['PASS', C.green, [[21.0, null]]]],
      [['idle', C.muted, [[0, 13.2]]], ['#3 review the API', C.text, [[13.2, 18.0]]], ['#4 review the screen', C.text, [[18.0, null]]]],
      [[14.0, { s: 0, fill: C.violet }, 'linear'], [15.5, { s: 1, fill: C.amber }], [17.5, { fill: C.green }], [18.0, { s: 0, fill: C.violet }, 'linear'], [20.5, { s: 1 }], [21.0, { fill: C.green }]],
    ),
    mergePanel(),
    logPanel(),
    statusLine(),
    dot(858, 128, 5.0, 5.9, -262, 10),
    dot(858, 244, 6.2, 7.0, -262, -54),
    dot(858, 360, 13.2, 14.0, -262, -118),
    dot(858, 360, 18.0, 18.8, -262, -66),
  ];
  return parts.join('\n');
}

const body = build();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="t d">
<title id="t">Puppeteering: an agent team at work</title>
<desc id="d">A 30-second loop: a lead writes six tasks, two builders claim them, a reviewer fails one and passes it after a fix, and two merges land one at a time.</desc>
<style>
text{font-family:${FONT}}
.bar{transform-box:fill-box;transform-origin:0 50%}
${rules.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${body}
</svg>
`;

const out = join(dirname(fileURLToPath(import.meta.url)), 'how-it-works.svg');
writeFileSync(out, svg);
console.log(`wrote ${out} (${Buffer.byteLength(svg)} bytes)`);
