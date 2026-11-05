// Writes assets/how-it-works.svg (animated) and assets/banner.svg (still).
// Original artwork: a manga-styled puppeteer and wooden marionettes, CSS only.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOP = 24;
const W = 1200;
const H = 675;
const JERK = 'cubic-bezier(.2,1.7,.4,1)';
const SNAP = 'steps(1)';

const keyframes = [];
let counter = 0;

// stops: [seconds, css, optional easing]. The first and last stops pad to 0% and 100%.
function anim(stops) {
  const name = `a${counter++}`;
  const padded = [...stops];
  if (padded[0][0] !== 0) padded.unshift([0, padded[0][1]]);
  if (padded.at(-1)[0] !== LOOP) padded.push([LOOP, padded.at(-1)[1]]);
  const body = padded
    .map(([t, css, ease]) => {
      const pct = +((t / LOOP) * 100).toFixed(2);
      return `${pct}%{${css}${ease ? `;animation-timing-function:${ease}` : ''}}`;
    })
    .join('');
  keyframes.push(`@keyframes ${name}{${body}}`);
  return `animation:${name} ${LOOP}s linear infinite`;
}

function fadeWindow(from, to, fade = 0.25) {
  return anim([
    [0, 'opacity:0'],
    [from, 'opacity:0'],
    [from + fade, 'opacity:1'],
    [to, 'opacity:1'],
    [to + fade, 'opacity:0'],
  ]);
}

const PUPPETS = [
  { name: 'BUILDER', x: 170, hand: [462, 152], attach: 4.2 },
  { name: 'BUILDER', x: 440, hand: [462, 152], attach: 4.5 },
  { name: 'REVIEWER', x: 760, hand: [738, 152], attach: 4.8 },
  { name: 'RESEARCHER', x: 1030, hand: [738, 152], attach: 5.1 },
];
const SLUMP_END = 21.2;
const FAIL = 13.2;
const PASS = 16.2;

function thread(p, i) {
  const [hx, hy] = p.hand;
  const midY = 215 + Math.abs(p.x - hx) * 0.1;
  const d = `M${hx} ${hy}C${(hx + p.x) / 2} ${midY} ${p.x} ${midY + 20} ${p.x} 300`;
  const draw = anim([
    [0, 'stroke-dashoffset:1;opacity:0'],
    [p.attach, 'stroke-dashoffset:1;opacity:1', 'ease-out'],
    [p.attach + 0.3, 'stroke-dashoffset:0;opacity:1'],
    [SLUMP_END, 'stroke-dashoffset:0;opacity:1'],
    [SLUMP_END + 0.5, 'stroke-dashoffset:0;opacity:0'],
  ]);
  const color =
    i === 0
      ? anim([
          [0, 'stroke:#f6ddff'],
          [FAIL, 'stroke:#f6ddff', SNAP],
          [FAIL + 0.01, 'stroke:#ff3b4f'],
          [PASS, 'stroke:#ff3b4f', SNAP],
          [PASS + 0.01, 'stroke:#58f5a6'],
          [SLUMP_END, 'stroke:#58f5a6'],
        ])
      : i === 1
        ? anim([
            [0, 'stroke:#f6ddff'],
            [PASS, 'stroke:#f6ddff', SNAP],
            [PASS + 0.01, 'stroke:#58f5a6'],
            [SLUMP_END, 'stroke:#58f5a6'],
          ])
        : 'stroke:#f6ddff';
  return `<g style="${color}"><g opacity=".3"><path class="glow" pathLength="1" d="${d}" style="${draw}"/></g><path class="line" pathLength="1" d="${d}" style="${draw}"/></g>`;
}

function limb(d) {
  return `<path class="limb" d="${d}"/><path class="limbwood" d="${d}"/>`;
}

function arm(side, moves) {
  const x = side * 25;
  const style = moves ? ` style="transform-origin:${x}px 114px;${moves}"` : '';
  return `<g${style}>${limb(`M${x} 114L${x + side * 15} 148L${x + side * 6} 182`)}<circle class="joint" cx="${x}" cy="114" r="5"/><circle class="joint" cx="${x + side * 15}" cy="148" r="4"/></g>`;
}

function hammer(from, to, step = 0.42) {
  const stops = [
    [0, 'transform:rotate(0)'],
    [from - 0.01, 'transform:rotate(0)', SNAP],
  ];
  let up = true;
  for (let t = from; t < to; t += step) {
    stops.push([t, `transform:rotate(${up ? -72 : -12}deg)`, SNAP]);
    up = !up;
  }
  stops.push([to, 'transform:rotate(0)', SNAP]);
  return stops;
}

function puppet(p, i) {
  const rise = p.attach + 0.9;
  const body = anim([
    [0, 'transform:translateY(96px) rotate(19deg)'],
    [rise, 'transform:translateY(96px) rotate(19deg)', JERK],
    [rise + 0.35, 'transform:translateY(0) rotate(0)'],
    [FAIL, 'transform:translateY(0) rotate(0)', SNAP],
    ...(i === 0
      ? [
          [FAIL + 0.02, 'transform:translateY(0) rotate(-9deg)', SNAP],
          [FAIL + 0.22, 'transform:translateY(0) rotate(7deg)', SNAP],
          [FAIL + 0.42, 'transform:translateY(0) rotate(0)'],
        ]
      : []),
    [SLUMP_END, 'transform:translateY(0) rotate(0)', 'ease-in'],
    [SLUMP_END + 0.6, 'transform:translateY(96px) rotate(19deg)'],
  ]);
  const strings = anim([
    [0, 'transform:scaleY(2.4);opacity:0'],
    [p.attach + 0.3, 'transform:scaleY(2.4);opacity:0'],
    [p.attach + 0.45, 'transform:scaleY(2.4);opacity:1'],
    [rise, 'transform:scaleY(2.4);opacity:1', JERK],
    [rise + 0.35, 'transform:scaleY(1);opacity:1'],
    [SLUMP_END, 'transform:scaleY(1);opacity:1'],
    [SLUMP_END + 0.5, 'transform:scaleY(1);opacity:0'],
  ]);
  const bar = fadeWindow(p.attach + 0.25, SLUMP_END, 0.15);
  const head = anim([
    [0, 'transform:rotate(26deg)'],
    [rise, 'transform:rotate(26deg)', JERK],
    [rise + 0.5, 'transform:rotate(0)'],
    [SLUMP_END, 'transform:rotate(0)'],
    [SLUMP_END + 0.5, 'transform:rotate(26deg)'],
  ]);
  const working = { 0: [[9.4, 12.6], [14.2, 16]], 1: [[9.6, 12.8]], 2: [[12.6, 13.2], [15.6, 16.2]], 3: [[9.2, 11]] }[i];
  const stops = working.flatMap(([a, b], n) => (n === 0 ? hammer(a, b) : hammer(a, b).slice(2)));
  const right = anim(stops);
  return `<g transform="translate(${p.x} 300)">
<g style="${bar}"><path class="bar" d="M-34 0H34"/><circle class="joint" r="4"/></g>
<g style="transform-origin:0 0;${strings}"><path class="string" d="M-25 0V114M25 0V114M0 0V62"/></g>
<g style="transform-origin:0 200px;${body}">
<path class="wood" d="M-25 110C-12 102 12 102 25 110L17 172H-17Z"/>
${limb('M-11 172L-16 208L-12 246M11 172L16 208L12 246')}
<circle class="joint" cx="-16" cy="208" r="4"/><circle class="joint" cx="16" cy="208" r="4"/>
${arm(-1, '')}${arm(1, right)}
<g style="transform-origin:0 104px;${head}">
<circle class="wood" cy="82" r="22"/><path class="seam" d="M0 60V104"/>
<circle class="hollow" cx="-8" cy="80" r="4.5"/><circle class="hollow" cx="8" cy="80" r="4.5"/>
</g></g>
<text class="tag" y="282">${p.name}</text></g>`;
}

const PILE = [905, 58];

function card(label, startAt, puppetIndex, thenTo) {
  const hold = [PUPPETS[puppetIndex].x + 42, 425];
  const stops = [
    [0, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:1`],
    [startAt, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:1`, 'cubic-bezier(.5,0,.2,1)'],
    [startAt + 0.7, `transform:translate(${hold[0]}px,${hold[1]}px);opacity:1`],
    ...thenTo(hold),
  ];
  return `<g style="${anim(stops)}"><rect class="card" width="84" height="48" rx="3"/><text class="cardtext" x="42" y="31">${label}</text></g>`;
}

const merge = (at, slotX) => (hold) => [
  [at, `transform:translate(${hold[0]}px,${hold[1]}px);opacity:1`, 'ease-in'],
  [at + 0.55, `transform:translate(${slotX}px,606px);opacity:1`],
  [22.4, `transform:translate(${slotX}px,606px);opacity:1`],
  [22.8, `transform:translate(${slotX}px,606px);opacity:0`],
  [23.9, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:0`],
  [24, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:1`],
];

const toLead = (hold) => [
  [11.1, `transform:translate(${hold[0]}px,${hold[1]}px);opacity:1`, 'ease-in'],
  [11.8, 'transform:translate(558px,110px);opacity:0'],
  [23.9, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:0`],
  [24, `transform:translate(${PILE[0]}px,${PILE[1]}px);opacity:1`],
];

function stamp(text, cls, x, y, at, until) {
  const style = anim([
    [0, `opacity:0;transform:translate(${x}px,${y}px) rotate(-12deg) scale(2.4)`],
    [at, `opacity:0;transform:translate(${x}px,${y}px) rotate(-12deg) scale(2.4)`, 'cubic-bezier(.2,1.5,.5,1)'],
    [at + 0.16, `opacity:1;transform:translate(${x}px,${y}px) rotate(-12deg) scale(1)`],
    [until, `opacity:1;transform:translate(${x}px,${y}px) rotate(-12deg) scale(1)`],
    [until + 0.2, `opacity:0;transform:translate(${x}px,${y}px) rotate(-12deg) scale(1)`],
  ]);
  return `<text class="stamp ${cls}" style="${style}">${text}</text>`;
}

function caption(text, from, to) {
  const width = text.length * 11.6 + 36;
  return `<g style="${fadeWindow(from, to, 0.15)}"><rect class="capbox" x="28" y="28" width="${width}" height="44"/><text class="captext" x="46" y="57">${text}</text></g>`;
}

function speedLines(style) {
  const lines = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + (i % 3) * 0.02;
    const inner = 150 + ((i * 37) % 90);
    const outer = 1300;
    const wedge = 0.004 + ((i * 13) % 7) * 0.0012;
    const px = (r, t) => `${(600 + Math.cos(t) * r).toFixed(0)} ${(120 + Math.sin(t) * r).toFixed(0)}`;
    lines.push(`M${px(inner, a)}L${px(outer, a - wedge)}L${px(outer, a + wedge)}Z`);
  }
  return `<path class="speed" d="${lines.join('')}" style="${style}"/>`;
}

const FLICKER_A = 'transform-origin:600px 230px;animation:flick 1.3s ease-in-out infinite alternate';
const FLICKER_B = 'transform-origin:600px 230px;animation:flick 1.9s ease-in-out infinite alternate-reverse';

const AURA = `<g filter="url(#ragged)">
<path class="aura1" style="${FLICKER_A}" d="M600 -30C520 20 560 60 490 70C430 90 400 170 440 240C510 290 690 290 760 240C800 170 770 90 710 70C640 60 680 20 600 -30Z"/>
<path class="aura2" style="${FLICKER_B}" d="M600 -5C540 40 570 70 525 85C480 105 465 175 490 225C540 265 660 265 710 225C735 175 720 105 675 85C630 70 660 40 600 -5Z"/>
</g>`;

const LEAD = `<path class="robe" d="M600 34C566 34 548 66 552 104C520 112 492 128 462 146L470 160C505 150 530 146 548 150C540 185 520 215 505 232L560 222L582 240L604 224L628 242L646 222L695 232C680 215 660 185 652 150C670 146 695 150 730 160L738 146C708 128 680 112 648 104C652 66 634 34 600 34Z"/>
<ellipse class="void" cx="600" cy="84" rx="27" ry="32"/>
<path class="finger" d="M462 152L448 140M462 152L444 148M462 152L444 156M462 152L448 165M738 152L752 140M738 152L756 148M738 152L756 156M738 152L752 165"/>`;

const DEFS = `<defs>
<radialGradient id="sky" cx="50%" cy="18%" r="85%"><stop offset="0" stop-color="#3a1466"/><stop offset=".42" stop-color="#150726"/><stop offset="1" stop-color="#05020a"/></radialGradient>
<pattern id="tone" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="1.5" fill="#c9a2ff"/></pattern>
<radialGradient id="toneFade" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".36"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="toneMask"><rect width="${W}" height="${H}" fill="url(#toneFade)"/></mask>
<filter id="ragged" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".022 .05" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="46"/><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="eyeGlow" x="-100%" y="-300%" width="300%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>`;

const BASE_CSS = `
.aura1{fill:#a53dff;opacity:.5}.aura2{fill:#ff4fd8;opacity:.38}
.robe{fill:#07030d;stroke:#d9a8ff;stroke-width:2.5;stroke-linejoin:round}
.void{fill:#000}
.finger{stroke:#d9a8ff;stroke-width:3;stroke-linecap:round;fill:none}
.eye{fill:#ff8bf0}.eyeglow{fill:#ff4fd8}
.glow,.line,.string,.bar{fill:none;stroke-linecap:round}
.glow{stroke-width:8;stroke-dasharray:1}
.line{stroke-width:1.8;stroke-dasharray:1}
.glow,.line{stroke:inherit}
.string{stroke:#f6ddff;stroke-width:1.3}
.bar{stroke:#d9c6a2;stroke-width:6}
.wood{fill:#d8c39b;stroke:#120a18;stroke-width:3;stroke-linejoin:round}
.limb{fill:none;stroke:#120a18;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
.limbwood{fill:none;stroke:#d8c39b;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
.joint{fill:#6d3fb0;stroke:#120a18;stroke-width:2}
.seam{stroke:#8d7650;stroke-width:1.5;fill:none}
.hollow{fill:#120a18}
text{font-family:Impact,'Arial Black','Helvetica Neue',Arial,sans-serif}
.tag{fill:#e8d8ff;font-size:17px;letter-spacing:3px;text-anchor:middle}
.card{fill:#f4ecd9;stroke:#120a18;stroke-width:3}
.cardtext{fill:#120a18;font-size:22px;text-anchor:middle}
.slot{fill:#0c0614;stroke:#d9a8ff;stroke-width:2.5}
.slottext{fill:#d9a8ff;font-size:18px;letter-spacing:5px;text-anchor:middle}
.pilelabel{fill:#e8d8ff;font-size:15px;letter-spacing:3px;text-anchor:middle}
.tone{fill:url(#tone)}
.speed{fill:#f6e8ff}
`;

function stage(extraInStage = '', behind = '') {
  return `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#sky)"/>
<rect class="tone" width="${W}" height="${H}" mask="url(#toneMask)"/>
${behind}${AURA}${LEAD}${extraInStage}`;
}

function buildAnimated() {
  const eyes = anim([
    [0, 'opacity:0'],
    [3.3, 'opacity:0', SNAP],
    [3.35, 'opacity:1'],
    [22.3, 'opacity:1', SNAP],
    [22.4, 'opacity:0'],
  ]);
  const shake = anim([
    [0, 'transform:translate(0,0)'],
    [3.3, 'transform:translate(0,0)', SNAP],
    [3.34, 'transform:translate(9px,-7px)', SNAP],
    [3.42, 'transform:translate(-8px,6px)', SNAP],
    [3.5, 'transform:translate(0,0)'],
    [FAIL, 'transform:translate(0,0)', SNAP],
    [FAIL + 0.04, 'transform:translate(-11px,6px)', SNAP],
    [FAIL + 0.12, 'transform:translate(10px,-6px)', SNAP],
    [FAIL + 0.2, 'transform:translate(-6px,3px)', SNAP],
    [FAIL + 0.28, 'transform:translate(0,0)'],
  ]);
  const flashLines = anim([
    [0, 'opacity:0'],
    [3.3, 'opacity:0', SNAP],
    [3.32, 'opacity:.75'],
    [3.95, 'opacity:0'],
    [FAIL, 'opacity:0', SNAP],
    [FAIL + 0.02, 'opacity:.45'],
    [FAIL + 0.5, 'opacity:0'],
  ]);
  const titleCard = anim([
    [0, 'opacity:1'],
    [3.2, 'opacity:1', SNAP],
    [3.3, 'opacity:0'],
    [23.6, 'opacity:0'],
    [24, 'opacity:1'],
  ]);
  const titleWord = anim([
    [0, 'transform:scale(1.12);opacity:0'],
    [0.3, 'transform:scale(1.12);opacity:0', 'cubic-bezier(.1,.8,.3,1)'],
    [0.75, 'transform:scale(1);opacity:1'],
    [3.3, 'transform:scale(.99);opacity:1'],
  ]);
  const titleSub = fadeWindow(1, 3.1, 0.3);
  const endCard = anim([
    [0, 'opacity:0'],
    [22.3, 'opacity:0'],
    [22.7, 'opacity:1'],
    [23.6, 'opacity:1'],
    [24, 'opacity:1'],
  ]);
  const css = `${BASE_CSS}
@keyframes flick{from{transform:scale(1,.97)}to{transform:scale(1.05,1.08)}}
.stamp{font-size:64px;font-weight:900;text-anchor:middle;stroke:#120a18;stroke-width:3;paint-order:stroke}
.fail{fill:#ff3b4f}.pass{fill:#58f5a6}
.capbox{fill:#f4ecd9;stroke:#120a18;stroke-width:3}
.captext{fill:#120a18;font-size:20px;letter-spacing:.6px}
.titlecard{fill:#04010a}
.bigword{fill:#f6e8ff;font-size:112px;font-weight:900;letter-spacing:3px;text-anchor:middle;stroke:#a53dff;stroke-width:9;paint-order:stroke;stroke-linejoin:round}
.small{fill:#d9a8ff;font-size:23px;letter-spacing:3px;text-anchor:middle}
.tiny{fill:#a98fc7;font-size:18px;letter-spacing:2px;text-anchor:middle}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.overlay{display:none}}
`;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="A still puppeteer in a violet aura sends threads to four wooden marionettes. They jerk upright, take tasks from a pile and work. A review fails and then passes, and the work merges one piece at a time.">
${DEFS}<style>${css}${'__KEYFRAMES__'}</style>
<g style="${shake}">
${stage('', speedLines(flashLines))}
<ellipse class="eyeglow" cx="600" cy="84" rx="22" ry="7" filter="url(#eyeGlow)" style="${eyes}"/>
<path class="eye" style="${eyes}" d="M581 80L596 87L580 87ZM619 80L604 87L620 87Z"/>
<g transform="translate(${PILE[0]} ${PILE[1]})"><rect class="card" x="-5" y="-5" width="84" height="48" rx="3" transform="rotate(-4 42 24)"/><rect class="card" x="5" y="4" width="84" height="48" rx="3" transform="rotate(3 42 24)"/><text class="pilelabel" x="44" y="-14">THE PILE</text></g>
<rect class="slot" x="470" y="598" width="260" height="66" rx="4"/><text class="slottext" x="600" y="590">MAIN</text>
${PUPPETS.map(thread).join('')}
${PUPPETS.map(puppet).join('')}
${card('#3', 8.1, 3, toLead)}${card('#2', 7.7, 1, merge(18.6, 612))}${card('#1', 7.3, 0, merge(17.2, 500))}
${stamp('FAIL', 'fail', 292, 408, FAIL, PASS - 0.1)}
${stamp('PASS', 'pass', 292, 408, PASS, 17)}${stamp('PASS', 'pass', 562, 408, PASS + 0.25, 18.3)}
${caption('The lead stays still. Every teammate is on a string.', 4.1, 7)}
${caption('Each one takes the next free task from the pile.', 7.2, 12.3)}
${caption('Whoever wrote it does not review it.', 12.5, 16.9)}
${caption('Merges land one at a time.', 17.1, 20.8)}
${caption('When the work is done, the strings come off.', 21, 22.2)}
</g>
<g class="overlay" style="${titleCard}"><rect class="titlecard" width="${W}" height="${H}"/>
<g style="transform-origin:600px 320px;${titleWord}"><text class="bigword" x="600" y="350">PUPPETEERING</text></g>
<g style="${titleSub}"><text class="small" x="600" y="410">ONE LEAD. MANY AGENTS.</text><text class="tiny" x="600" y="448">CONDITION: EVERY STRING HAS A CHECK</text></g></g>
<g class="overlay" style="${endCard}"><rect class="titlecard" width="${W}" height="${H}"/><text class="small" x="600" y="345">EVERY STRING ACCOUNTED FOR</text></g>
</svg>`;
  return body.replace('__KEYFRAMES__', keyframes.join(''));
}

function staticPuppet(x, lean) {
  return `<g transform="translate(${x} 215) rotate(${lean} 0 200)">
<path class="string" d="M-25 0V114M25 0V114M0 0V62"/><path class="bar" d="M-34 0H34"/>
<path class="wood" d="M-25 110C-12 102 12 102 25 110L17 172H-17Z"/>
${limb('M-11 172L-16 208L-12 246M11 172L16 208L12 246')}
${arm(-1, '')}${arm(1, '')}
<circle class="wood" cy="82" r="22"/><path class="seam" d="M0 60V104"/><circle class="hollow" cx="-8" cy="80" r="4.5"/><circle class="hollow" cx="8" cy="80" r="4.5"/></g>`;
}

function buildBanner() {
  const xs = [70, 205, 995, 1130];
  const threads = xs
    .map((x) => {
      const [hx, hy] = x < 600 ? [462, 152] : [738, 152];
      return `<path d="M${hx} ${hy}C${(hx + x) / 2} 190 ${x} 195 ${x} 215" fill="none" stroke="#f6ddff" stroke-width="2"/><path d="M${hx} ${hy}C${(hx + x) / 2} 190 ${x} 195 ${x} 215" fill="none" stroke="#f6ddff" stroke-width="7" opacity=".3"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 470" width="${W}" height="470" role="img" aria-label="Puppeteering: a still figure in a violet aura holds four wooden marionettes on strings.">
${DEFS}<style>${BASE_CSS}.bigword{fill:#f6e8ff;font-size:72px;font-weight:900;letter-spacing:2px;text-anchor:middle;stroke:#a53dff;stroke-width:7;paint-order:stroke;stroke-linejoin:round}.small{fill:#d9a8ff;font-size:21px;letter-spacing:3px;text-anchor:middle}</style>
<svg viewBox="0 0 ${W} 470" width="${W}" height="470">${stage().replace(/style="[^"]*"/g, '')}
<ellipse class="eyeglow" cx="600" cy="84" rx="22" ry="7" filter="url(#eyeGlow)"/><path class="eye" d="M581 80L596 87L580 87ZM619 80L604 87L620 87Z"/>
${threads}${xs.map((x, i) => staticPuppet(x, [-3, 2, -2, 3][i])).join('')}</svg>
<text class="bigword" x="600" y="360">PUPPETEERING</text>
<text class="small" x="600" y="408">ONE LEAD. MANY AGENTS. EVERY STRING.</text>
</svg>`;
}

for (const [file, svg] of [
  ['how-it-works.svg', buildAnimated()],
  ['banner.svg', buildBanner()],
]) {
  writeFileSync(join(HERE, file), svg);
  console.log(`wrote ${file} (${Buffer.byteLength(svg)} bytes)`);
}
