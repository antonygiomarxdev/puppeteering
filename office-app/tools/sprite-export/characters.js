// Characters (spec: docs/monitor/ux/UX-01-characters.md): costume overlays, the new critter poses, and the new marks.
// Inlined after exporter.js, so it shares mk, withCtx, trimmed, px, disc and the CELL_/OX/OY constants.

const ACC = '#ff00ff' // accent key colour: overlays mark every variant-coloured pixel with it, the game swaps it per variant
const DARK = '#2b2838', INK_ = '#1a1726', PEN = '#8a8a98'
const S = (x, y, w, h, f) => px(OX + x, OY + y, w, h, f) // paint in sprite space (the critter's own 28x20 box)
const clr = (x, y, w, h) => ctx.clearRect(OX + x, OY + y, w, h)
const cell = fn => { const c = mk(CELL_W, CELL_H); withCtx(c, fn); return c }
const critterFrame = (name, canvas) => ({ name, canvas, w: CELL_W, h: CELL_H, pivot: { x: 0.5, y: (OY + CH) / CELL_H } })

// ---- G: poses. Front view, drawn over the idle frame; the arms and eyes that move are cleared and repainted. ----
const BARE = [ // the typing and talking frames without the pen, so a costume's own prop can be drawn instead
  ['bare-type-0', 'sit', 0, 'down', true], ['bare-type-1', 'sit', 1, 'down', true],
  ['bare-talk-0', 'talk', 0, 'right', false], ['bare-talk-1', 'talk', 2, 'right', false],
  ['bare-talk-2', 'talk', 3, 'right', false], ['bare-talk-3', 'talk', 6, 'right', false],
]
function eyesAt(color, dx, dy) { // repaint both eyes somewhere else
  for (const x of [8, 16]) { S(x, 3, 4, 9, color); S(x + dx, 4 + dy, 4, 4, INK_) }
}
const POSES2 = [
  ['read', c => { eyesAt(c, 0, 2); clr(0, 6, 4, 4); clr(24, 6, 4, 4); S(9, 9, 10, 6, '#ffffff'); S(10, 10, 8, 1, '#9aa0b4'); S(10, 12, 8, 1, '#9aa0b4'); S(6, 9, 3, 3, c); S(19, 9, 3, 3, c) }],
  ['think', c => { eyesAt(c, -1, -1); clr(24, 6, 4, 4); S(21, 8, 3, 4, c); S(17, 10, 5, 4, c); S(17, 10, 5, 1, '#00000030') }],
  ['wait', c => { clr(0, 6, 4, 4); clr(24, 6, 4, 4); for (const [x, w] of [[5, 11], [12, 11]]) { S(x, 8, w, 3, c); S(x, 8, w, 1, '#ffffff22'); S(x, 10, w, 1, '#00000038') } }],
  ['arms-up', c => { clr(0, 6, 4, 4); clr(24, 6, 4, 4); S(1, -3, 3, 10, c); S(24, -3, 3, 10, c) }],
  ['hand-up', c => { clr(0, 6, 4, 4); S(1, -4, 3, 11, c) }],
  ['sweat', c => { eyesAt(c, 0, 1); S(21, 1, 2, 3, '#7ab8ff'); S(21, 1, 1, 1, '#ffffff'); S(5, 0, 2, 2, '#7ab8ff') }],
  ['wave-0', c => { clr(0, 6, 4, 4); S(0, -4, 3, 3, c); S(1, -1, 3, 4, c); S(2, 2, 3, 6, c) }],
  ['wave-1', c => { clr(0, 6, 4, 4); S(3, -4, 3, 3, c); S(2, -1, 3, 4, c); S(1, 2, 3, 6, c) }],
  ['sip', c => { eyesAt(c, 0, 0); S(8, 3, 4, 9, c); S(16, 3, 4, 9, c); S(8, 5, 4, 1, INK_); S(16, 5, 4, 1, INK_); clr(24, 6, 4, 4)
    S(19, 8, 4, 3, c); S(20, 5, 5, 6, '#f6f6fb'); S(25, 7, 1, 3, '#f6f6fb'); S(21, 6, 3, 2, '#8a5a34'); S(21, 2, 1, 2, '#ffffffa0'); S(23, 1, 1, 2, '#ffffffa0') }],
]
// Bare frames, then the poses, for one critter colour (the same list for the orange and the gold sheet).
function moreCritterFrames(color, draw, drawBare) {
  const bare = BARE.map(([name, pose, tick, facing, typing]) => critterFrame(name, cell(() => drawBare(OX, OY + CH, color, pose, tick, facing, false, false, typing, 0))))
  const poses = POSES2.map(([name, fn]) => critterFrame(name, cell(() => { draw(OX, OY + CH, color, 'sit', 1, 'down', false, false, false, 0); fn(color) })))
  const hop = critterFrame('hop', cell(() => draw(OX, OY + CH - 5, color, 'sit', 1, 'down', false, false, false, 0))) // lifted 5px; the game draws the shadow
  return [...bare, ...poses.slice(0, 8), hop, poses[8]] // hop sits before sip, as in the spec list
}

// ---- F: costumes. 44x30 cells with the critter's own origin, so a head or prop sprite put where the critter is lines up. ----
const ARCH = ['conductor', 'builder', 'designer', 'reviewer', 'researcher', 'planner', 'ops', 'helper']
// Heads: o shifts the item onto the three-quarter body (4px right); the glasses and the bow have their own spots.
const HEAD = {
  conductor: side => { const o = side ? 2 : 0; S(10 + o, 10, 3, 3, ACC); S(15 + o, 10, 3, 3, ACC); S(13 + o, 11, 2, 2, DARK) },
  builder: side => { const o = side ? 4 : 0; S(7 + o, -5, 10, 4, '#f5c542'); S(8 + o, -5, 3, 1, '#fbe08a'); S(5 + o, -1, 14, 2, '#d9a82a'); S(7 + o, -2, 10, 1, ACC) },
  designer: side => { const o = side ? 4 : 0; S(5 + o, -2, 3, 2, ACC); S(8 + o, -4, 9, 4, ACC); S(17 + o, -3, 3, 3, ACC); S(12 + o, -6, 2, 2, ACC) },
  reviewer: side => { const G = '#8a90a8'; for (const x of side ? [9, 15] : [7, 15]) { S(x, 3, 6, 1, G); S(x, 8, 6, 1, G); S(x, 3, 1, 6, G); S(x + 5, 3, 1, 6, G); S(x + 1, 4, 1, 1, '#ffffff') } if (!side) S(13, 5, 2, 1, G) },
  researcher: side => { const o = side ? 4 : 0; S(6 + o, -3, 12, 3, '#6a7a8a'); S(4 + o, -1, 16, 1, '#55616f'); S(6 + o, -2, 12, 1, ACC) },
  planner: side => { const o = side ? 4 : 0; S(4 + o, 2, 20, 2, ACC); S(22 + o, 1, 5, 6, '#f6f0d8'); S(22 + o, 1, 5, 1, '#c9a066'); S(22 + o, 6, 5, 1, '#c9a066'); S(23 + o, 3, 3, 1, '#9aa0b4') },
  ops: side => { const o = side ? 4 : 0; S(5 + o, -3, 18, 2, DARK); S(4 + o, -1, 2, 5, DARK); S(22 + o, -1, 2, 5, DARK); S(2 + o, 3, 3, 6, ACC); S(24 + o, 3, 3, 6, ACC) },
  helper: side => { const o = side ? 4 : 0; S(4 + o, 10, 20, 3, ACC); S(17 + o, 12, 3, 5, ACC) },
}
// Props, drawn in the rest pose the pen has (hanging down-left from the grip). (x, y) is the grip's offset: front (0, 0), side (2, 4).
const diag = (x, y, n, f) => { for (let i = 0; i < n; i++) S(x - i, y + i, 1, 1, f) }
const PROP = {
  conductor: (x, y) => { diag(x + 1, y + 8, 6, '#f6f6fb'); S(x - 5, y + 14, 1, 1, '#ffb000') },
  builder: (x, y) => { diag(x + 1, y + 8, 6, PEN); S(x - 5, y + 14, 3, 1, PEN) },
  designer: (x, y) => { diag(x + 1, y + 8, 5, '#a8703f'); S(x - 5, y + 12, 2, 2, ACC) },
  reviewer: (x, y) => {
    S(x - 6, y + 7, 7, 9, '#8a5a34'); S(x - 5, y + 8, 5, 7, '#fbfbff'); S(x - 4, y + 6, 3, 2, '#c8ccd8')
    for (const [dx, dy] of [[-4, 12], [-3, 13], [-2, 12], [-1, 11]]) S(x + dx, y + dy, 1, 1, '#2fa56a')
  },
  researcher: (x, y) => { diag(x + 1, y + 8, 4, '#8a5a34'); S(x - 7, y + 10, 5, 5, '#8a8a98'); S(x - 6, y + 11, 3, 3, '#bfe6ff') },
  planner: (x, y) => { S(x - 7, y + 9, 9, 3, '#4a90d9'); S(x - 7, y + 9, 1, 3, '#f6f0d8'); S(x + 1, y + 9, 1, 3, '#f6f0d8'); S(x - 5, y + 10, 5, 1, '#cfe6ff') },
  ops: (x, y) => { diag(x + 1, y + 8, 5, '#9aa0b4'); S(x - 6, y + 13, 2, 3, '#9aa0b4'); S(x - 3, y + 13, 2, 3, '#9aa0b4') },
  helper: (x, y) => { diag(x + 1, y + 8, 6, PEN); S(x - 5, y + 14, 3, 1, PEN) },
}
const GRIP = { front: { x: OX + 1, y: OY + 8 }, side: { x: OX + 3, y: OY + 12 } } // cell px, for a prop that rotates in the game
const ACCENTS = { // three per archetype, in the order of the spec's personality table
  conductor: ['#4a6ec0', '#d9534f', '#9b6bd1'], builder: ['#f5b82e', '#f08a3c', '#2fb8a8'], designer: ['#f06a9a', '#d93aa8', '#6fd9b0'],
  reviewer: ['#9a9aa6', '#f5b08a', '#b49be0'], researcher: ['#5cb85c', '#8a5a34', '#d9534f'], planner: ['#2f3f8a', '#e8b030', '#8fb08a'],
  ops: ['#7a98b8', '#36c7e0', '#6a748a'], helper: ['#f2d64e', '#f08aa0', '#7ab8ff'],
}
// The fake office extras (HR, the boss's pet, intern, vending guy, IT): fixed colours, no accent key, so they never pass for an agent's variant.
const EXTRAS = ['hr', 'pet', 'intern', 'vending', 'it']
const EHEAD = {
  hr: side => { const o = side ? 2 : 0; S(10 + o, 11, 1, 5, '#3a7bd5'); S(17 + o, 11, 1, 5, '#3a7bd5'); S(11 + o, 15, 6, 1, '#3a7bd5'); S(12 + o, 16, 4, 4, '#fbfbff'); S(13 + o, 17, 2, 1, '#9aa0b4'); S(13 + o, 18, 2, 1, '#3a7bd5') },
  pet: side => { const o = side ? 2 : 0; S(12 + o, 11, 4, 2, '#d9342f'); S(13 + o, 13, 2, 6, '#d9342f'); S(13 + o, 13, 1, 6, '#a82424') },
  intern: side => { const o = side ? 4 : 0; S(3 + o, -8, 22, 7, '#3a7bd5'); S(3 + o, -8, 22, 1, '#6aa0ee'); S(13 + o, -9, 2, 1, '#2a5aa0'); S(0 + o, -1, 28, 2, '#2a5aa0') },
  vending: side => { const o = side ? 4 : 0; S(2 + o, -3, 24, 4, '#4a5a7a'); S(2 + o, -3, 24, 1, '#6a7a9a'); S(1 + o, 1, 4, 11, '#4a5a7a'); S(23 + o, 1, 4, 11, '#4a5a7a'); S(10 + o, 12, 1, 5, '#fbfbff'); S(17 + o, 12, 1, 5, '#fbfbff') },
  it: side => { const o = side ? 4 : 0; S(5 + o, -3, 18, 2, DARK); S(3 + o, -1, 2, 5, DARK); S(23 + o, -1, 2, 5, DARK); S(1 + o, 3, 4, 7, '#3a3550'); S(23 + o, 3, 4, 7, '#3a3550'); S(3 + o, 10, 1, 3, DARK); S(4 + o, 12, 5, 1, DARK); S(8 + o, 12, 2, 2, '#d9342f') },
}
const EPROP = {
  hr: (x, y) => { S(x - 7, y + 8, 7, 9, '#8a5a34'); S(x - 6, y + 9, 5, 7, '#fbfbff'); S(x - 5, y + 7, 3, 2, '#9aa0b4'); S(x - 5, y + 11, 3, 1, '#9aa0b4'); S(x - 5, y + 13, 3, 1, '#9aa0b4') },
  pet: (x, y) => { S(x - 4, y + 3, 5, 5, '#fbfbff'); S(x - 4, y + 4, 5, 1, '#8a5a34'); S(x + 1, y + 4, 2, 3, '#fbfbff'); S(x + 2, y + 5, 1, 1, '#c8ccd8'); S(x - 3, y, 1, 2, '#ffffffa0'); S(x - 1, y - 1, 1, 2, '#ffffffa0') },
  intern: (x, y) => { S(x, y + 8, 1, 4, '#8a8a98'); S(x - 9, y + 12, 11, 1, '#c8ccd8'); S(x - 8, y + 8, 3, 4, '#fbfbff'); S(x - 8, y + 8, 3, 1, '#8a5a34'); S(x - 4, y + 8, 3, 4, '#fbfbff'); S(x - 4, y + 8, 3, 1, '#8a5a34') },
  vending: (x, y) => { S(x - 6, y + 8, 6, 9, '#e8b830'); S(x - 6, y + 7, 6, 1, '#c89a20'); S(x - 5, y + 11, 4, 3, '#d9342f'); S(x - 4, y + 12, 2, 1, '#fbfbff') },
  it: (x, y) => { S(x, y + 8, 1, 3, '#8a8a98'); S(x - 9, y + 9, 9, 6, '#9aa0b4'); S(x - 8, y + 10, 7, 4, '#2b2838'); S(x - 7, y + 11, 4, 1, '#6bf0a0'); S(x - 7, y + 13, 2, 1, '#6bf0a0'); S(x - 10, y + 15, 11, 1, '#6a6f86') },
}
function costumeFrames() {
  const out = []
  for (const a of ARCH) {
    out.push(critterFrame(`${a}-head-front`, cell(() => HEAD[a](false))), critterFrame(`${a}-head-side`, cell(() => HEAD[a](true))))
    out.push(critterFrame(`${a}-prop-front`, cell(() => PROP[a](0, 0))), critterFrame(`${a}-prop-side`, cell(() => PROP[a](2, 4))))
  }
  for (const e of EXTRAS) {
    out.push(critterFrame(`extra-${e}-head-front`, cell(() => EHEAD[e](false))), critterFrame(`extra-${e}-head-side`, cell(() => EHEAD[e](true))))
    out.push(critterFrame(`extra-${e}-prop-front`, cell(() => EPROP[e](0, 0))), critterFrame(`extra-${e}-prop-side`, cell(() => EPROP[e](2, 4))))
  }
  return out
}
const costumeMeta = { accentKey: ACC, archetypes: ARCH, accents: ACCENTS, grip: GRIP, extras: EXTRAS, extraTint: { color: '#ffffff', alpha: 0.28 },
  notes: 'Draw a head or prop frame at the critter origin. -front goes over idle/wink/talk/walk-down, -side over type and walk-left (flipX both). Swap every pixel equal to accentKey for the variant colour. Props are drawn in the pen rest pose over the bare-* frames; rotate about grip for the talk gesture.' }

// The extras read paler than the agents: the game draws their critter with this white wash (meta.extraTint), costumes on top untouched.
function pale(canvas, a = 0.28) { const c = mk(canvas.width, canvas.height), x = c.getContext('2d'); x.drawImage(canvas, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ffffff'; x.globalAlpha = a; x.fillRect(0, 0, c.width, c.height); return c }
// The five extras in the front and three-quarter view (pale critter) under one agent for comparison. Phone-sized.
function extrasPreview(critterByName, costumeByName, s = 4) {
  const per = 2 * CELL_W * s + 16, lh = 26, c = mk(per + 16, 6 * (CELL_H * s + lh) + 16), x = c.getContext('2d')
  x.fillStyle = '#f3e6d6'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false
  const draw = (img, ox, oy) => x.drawImage(img, ox, oy, CELL_W * s, CELL_H * s)
  ;['agent (conductor)', ...EXTRAS].forEach((e, i) => {
    const ox = 8, oy = 8 + i * (CELL_H * s + lh)
    x.fillStyle = '#2b2838'; x.font = 'bold 16px monospace'; x.fillText(e, ox, oy + 18)
    if (!i) { for (const [view, base, dx] of [['front', 'idle', 0], ['side', 'bare-type-0', CELL_W * s + 8]]) { draw(critterByName[base], ox + dx, oy + lh); draw(tinted(costumeByName['conductor-head-' + view], ACCENTS.conductor[0]), ox + dx, oy + lh) } return }
    for (const [view, base, dx] of [['front', 'idle', 0], ['side', 'bare-type-0', CELL_W * s + 8]]) for (const f of [pale(critterByName[base]), costumeByName['extra-' + e + '-head-' + view], costumeByName['extra-' + e + '-prop-' + view]]) draw(f, ox + dx, oy + lh)
  })
  return c
}
// Swap the key colour for a variant colour.
function tinted(canvas, hex) {
  const c = mk(canvas.width, canvas.height), x = c.getContext('2d')
  x.drawImage(canvas, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height), [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 255 && d.data[i + 3] === 255) { d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b }
  x.putImageData(d, 0, 0)
  return c
}
// All 8 archetypes side by side: the front view and the three-quarter view, variant 0, with a label. Made for a phone screen.
function costumePreview(critterByName, costumeByName, scale = 5) {
  const per = 2 * CELL_W * scale + 24, rows = 4, cols = 2, lh = 26
  const c = mk(cols * per + 16, rows * (CELL_H * scale + lh) + 16), x = c.getContext('2d')
  x.fillStyle = '#f3e6d6'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false
  ARCH.forEach((a, i) => {
    const ox = 8 + (i % cols) * per, oy = 8 + Math.floor(i / cols) * (CELL_H * scale + lh), hex = ACCENTS[a][0]
    const layer = (base, head, prop, dx) => { for (const f of [base, head, prop]) x.drawImage(f === base ? f : tinted(f, hex), ox + dx, oy + lh, CELL_W * scale, CELL_H * scale) }
    layer(critterByName['idle'], costumeByName[`${a}-head-front`], costumeByName[`${a}-prop-front`], 0)
    layer(critterByName['bare-type-0'], costumeByName[`${a}-head-side`], costumeByName[`${a}-prop-side`], CELL_W * scale + 8)
    x.fillStyle = '#2b2838'; x.font = 'bold 16px monospace'; x.fillText(a, ox, oy + 18)
  })
  return c
}

// ---- G: marks. Bitmaps are one char a pixel; '.' is clear. ----
const bits = (rows, pal) => (x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') px(x + i, y + j, 1, 1, pal[ch]) }))
const MARKS = {
  question: bits(['.#####.', '##...##', '##...##', '.....##', '....##.', '...##..', '...##..', '.......', '...##..', '...##..'], { '#': '#4a6ec0' }),
  lock: bits(['..gggg..', '.gg..gg.', '.g....g.', '.g....g.', 'aaaaaaaa', 'ayyyyyya', 'ayyykyya', 'ayyykyya', 'ayyyyyya', 'aaaaaaaa'], { g: '#6a6f86', y: '#e8c04a', a: '#b8941f', k: '#3a3550' }),
  prompt: bits(['tttttttttttt', 'dddddddddddd', 'ddgddddddddd', 'dddgdddddddd', 'ddddgddddddd', 'dddgdddddddd', 'ddgddddddddd', 'ddddddggggdd', 'dddddddddddd'], { t: '#3a3f56', d: DARK, g: '#6bf0a0' }),
  globe: (x, y) => { disc(x + 5, y + 5, 5, '#4a90d9'); px(x + 3, y + 2, 3, 2, '#5cb85c'); px(x + 5, y + 4, 3, 3, '#5cb85c'); px(x + 2, y + 6, 3, 2, '#5cb85c'); px(x + 5, y, 1, 11, '#ffffff40'); px(x, y + 5, 11, 1, '#ffffff40') },
  page: bits(['ooooooo.', 'owwwwwoo', 'owllllwo', 'owwwwwwo', 'owllllwo', 'owwwwwwo', 'owllllwo', 'owwwwwwo', 'owllllwo', 'oooooooo'], { o: '#9aa0b4', w: '#fbfbff', l: '#c8ccd8' }),
  card: bits(['yyyyyyyyyy', 'yyyyppyyyy', 'yyyyppyyyy', 'yyyyyyyyyy', 'ylllllllyy', 'yyyyyyyyyy', 'ylllllyyyy', 'yyyyyyyyyy', 'ssssssssss'], { y: '#ffd84a', s: '#e8b830', l: '#b8941f', p: '#d9534f' }),
  clock: (x, y) => { disc(x + 5, y + 5, 5, DARK); disc(x + 5, y + 5, 4, '#fbfbff'); px(x + 5, y + 2, 1, 4, DARK); px(x + 5, y + 5, 3, 1, DARK) },
  spiral: (x, y) => { const seen = new Set(); for (let t = 0; t <= 12.5; t += 0.1) { const r = t * 0.32, X = Math.round(x + 4 + r * Math.cos(t)), Y = Math.round(y + 4 + r * Math.sin(t)); if (!seen.has(X + ',' + Y)) { seen.add(X + ',' + Y); px(X, Y, 1, 1, '#9b6bd1') } } },
  note: bits(['...##...', '...#.#..', '...#..#.', '...#....', '...#....', '.###....', '####....', '####....', '.##.....'], { '#': DARK }),
  star: bits(['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.'], { y: '#ffd84a' }),
  confetti: (x, y) => { for (const [dx, dy, c] of [[1, 1, '#ff5a5a'], [6, 0, '#4a90d9'], [11, 2, '#ffd84a'], [3, 5, '#5cb85c'], [8, 6, '#f06a9a'], [12, 7, '#9b6bd1'], [0, 9, '#ffd84a'], [5, 10, '#ff5a5a'], [10, 10, '#4a90d9']]) px(x + dx, y + dy, 2, 2, c) },
  sparkle: bits(['....y....', '...yyy...', '...ywy...', '.yyywyyy.', 'yyywwwyyy', '.yyywyyy.', '...ywy...', '...yyy...', '....y....'], { y: '#ffe88a', w: '#ffffff' }),
  cup: bits(['..s..s..', '...s..s.', '..s..s..', '........', 'wwwwww..', 'wccccwww', 'wccccw.w', 'wccccwww', 'owwwwwo.'], { s: '#cfd3e2', w: '#fbfbff', c: '#8a5a34', o: '#c8ccd8' }),
}
function newMarks() {
  return Object.entries(MARKS).map(([name, fn]) => { const t = trimmed(fn, 40, 40, 10, 10); return { name, canvas: t.canvas, w: t.w, h: t.h, pivot: { x: 0.5, y: 1 } } })
}
