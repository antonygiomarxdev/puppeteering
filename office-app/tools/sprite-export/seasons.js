// Seasonal themes: one sheet per theme, identical frame names so the scene swaps sheets without code changes.
// Inlined after characters.js, so it shares mk, withCtx, px, disc, bits, S, cell, CELL_W/H, OX, OY, DARK and critterFrame.

const ell = (cx, cy, rx, ry, f) => { for (let dy = -ry; dy <= ry; dy++) { const s = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2)); px(cx - s, cy + dy, 2 * s + 1, 1, f) } }
const H_ = (rows, pal, x, y) => bits(rows, pal)(OX + x, OY + y) // a hat bitmap in the critter's sprite space
const fixed = (name, w, h, pivot, fn) => { const c = mk(w, h); withCtx(c, () => fn(0, 0)); return { name, canvas: c, w, h, pivot } }
const FOOT = { x: 0.5, y: 1 }
const WALL_ = (name, fn) => fixed(name, 32, 16, { x: 0.5, y: 0 }, fn)
const BIG = (name, fn) => fixed(name, 24, 32, FOOT, (x, y) => fn(12, 32))
const SMALL = (name, fn) => fixed(name, 12, 12, FOOT, fn)
const DESKI = fn => fixed('deco-desk', 8, 8, FOOT, fn)
const PART = (name, fn) => fixed(name, 4, 4, { x: 0.5, y: 0.5 }, fn)

// A cone hat in sprite space: apex at y=top, base `w` wide at y=-3, centred on x=14 (+o), the tip leaning right by `lean` px.
function cone(o, top, w, body, shade, lean = 0) {
  const h = -top - 3
  for (let r = 0; r <= h; r++) {
    const half = Math.max(1, Math.round(1 + (w / 2 - 1) * r / h)), cx = 14 + o + Math.round(lean * (1 - r / h))
    S(cx - half, top + r, 2 * half, 1, body); S(cx + half - 2, top + r, 2, 1, shade)
  }
}

const THEMES = {
  christmas: {
    hat: side => {
      const o = side ? 4 : 0
      H_(['..............www...', '.............wwwww..', '......rrrrrrrrwww...', '.....rrrrrrrrrrr....', '....rrRrrrrrrrrrr...', '...rrrRrrrrrrrrrrr..', '..wwwwwwwwwwwwwwwww.', '..wwwwwwwwwwwwwwwww.', '..wWWwwwWWwwwWWwwww.'], { r: '#d9342f', R: '#a82424', w: '#fbfbff', W: '#d8dce8' }, 4 + o, -8)
    },
    wall: () => { // garland with lights, two swags
      for (let i = 0; i < 32; i++) { const y = 2 + Math.round(5 * Math.sin(Math.PI * (i % 16) / 15)); px(i, y, 1, 3, '#2f7d3f'); px(i, y, 1, 1, '#4aa65a') }
      px(0, 0, 1, 3, '#b8941f'); px(16, 0, 1, 3, '#b8941f'); px(31, 0, 1, 3, '#b8941f')
      for (const [x, c] of [[3, '#ff5a5a'], [7, '#ffd84a'], [11, '#4a90d9'], [19, '#ffd84a'], [23, '#ff5a5a'], [27, '#6fd9b0']]) { const y = 2 + Math.round(5 * Math.sin(Math.PI * (x % 16) / 15)); px(x, y + 3, 1, 1, '#3a3550'); px(x, y + 4, 2, 2, c) }
    },
    big: (x, y) => { // the tree with a star
      px(x - 2, y - 3, 4, 3, '#8a5a34')
      for (const [top, h, w] of [[-24, 8, 4], [-17, 9, 7], [-9, 7, 11]]) for (let r = 0; r < h; r++) {
        const half = 1 + Math.round(r * (w - 1) / (h - 1)); px(x - half, y + top + r, 2 * half, 1, '#3a8f4a'); px(x + half - 2, y + top + r, 2, 1, '#2d6f3b'); px(x - half, y + top + r, 1, 1, '#4aa65a')
      }
      for (const [dx, dy, c] of [[-1, -20, '#ff5a5a'], [2, -14, '#ffd84a'], [-4, -12, '#4a90d9'], [4, -8, '#ff5a5a'], [-7, -6, '#ffd84a'], [0, -7, '#4a90d9'], [8, -5, '#ffd84a']]) px(x + dx, y + dy, 2, 2, c)
      bits(['...y...', '...y...', '.yyyyy.', 'yyyyyyy', '.yyyyy.', '.yy.yy.', '.y...y.'], { y: '#ffd84a' })(x - 4, y - 31)
    },
    small: [
      (x, y) => { px(x + 1, y + 4, 10, 8, '#d9342f'); px(x + 1, y + 11, 10, 1, '#a82424'); px(x + 5, y + 4, 2, 8, '#ffd84a'); px(x + 1, y + 7, 10, 2, '#ffd84a'); px(x + 3, y + 2, 3, 2, '#ffd84a'); px(x + 6, y + 2, 3, 2, '#ffd84a'); px(x + 5, y + 3, 2, 1, '#b8941f') },
      (x, y) => { px(x, y + 6, 12, 6, '#2f9a5a'); px(x, y + 11, 12, 1, '#23784a'); px(x + 5, y + 6, 2, 6, '#fbfbff'); px(x + 2, y + 1, 8, 5, '#4a90d9'); px(x + 2, y + 5, 8, 1, '#3a74b0'); px(x + 5, y + 1, 2, 5, '#ffd84a'); px(x + 4, y, 4, 1, '#ffd84a') },
    ],
    desk: () => bits(['..rwrw..', '.rw..rw.', '.wr..rw.', '.rw.....', '.wr.....', '.rw.....', '.wr.....', '.rw.....'], { r: '#d9342f', w: '#fbfbff' })(0, 0),
    part: [() => bits(['.w..', 'www.', '.w..', '....'], { w: '#ffffff' })(0, 0), () => { px(1, 1, 2, 2, '#ffffff'); px(0, 1, 1, 2, '#bcd8f5'); px(1, 0, 2, 1, '#bcd8f5') }],
  },
  halloween: {
    hat: side => {
      const o = side ? 4 : 0
      cone(o, -8, 16, '#4b2a73', '#33194f', 2)
      S(2 + o, -3, 24, 2, '#33194f'); S(2 + o, -3, 24, 1, '#4b2a73'); S(9 + o, -5, 10, 2, '#f08a3c'); S(13 + o, -5, 3, 2, '#ffd84a'); S(14 + o, -4, 1, 1, '#4b2a73')
    },
    wall: () => {
      px(0, 1, 32, 1, '#3a3550')
      ;[1, 9, 17, 25].forEach((x, i) => {
        for (let r = 0; r < 8; r++) px(x + Math.floor(r / 2), 2 + r, 7 - 2 * Math.floor(r / 2), 1, i % 2 ? '#6b3fa0' : '#f08a3c')
        bits(['b.b.b', 'bbbbb', '.b.b.'], { b: '#2b2838' })(x + 1, 3)
      })
    },
    big: (x, y) => { // a pile of three jack-o'-lanterns
      const pump = (cx, cy, rx, ry, face) => {
        ell(cx, cy, rx, ry, '#f08a3c'); px(cx - Math.floor(rx / 2), cy - ry + 1, 1, 2 * ry - 1, '#d96a1e'); px(cx + Math.floor(rx / 2), cy - ry + 1, 1, 2 * ry - 1, '#d96a1e')
        px(cx - 1, cy - ry - 2, 2, 2, '#4a7a3a'); px(cx - 3, cy - 2, 2, 2, '#ffd84a'); px(cx + 1, cy - 2, 2, 2, '#ffd84a'); px(cx - 3, cy + 2, 6, 1, '#ffd84a'); if (face) px(cx - 1, cy + 3, 2, 1, '#ffd84a')
      }
      pump(x - 7, y - 7, 8, 7, true); pump(x + 7, y - 6, 7, 6, false); pump(x, y - 19, 6, 5, true)
    },
    small: [
      (x, y) => { ell(x + 6, y + 8, 5, 4, '#f08a3c'); px(x + 5, y + 3, 2, 2, '#4a7a3a'); px(x + 3, y + 7, 2, 2, '#2b2838'); px(x + 7, y + 7, 2, 2, '#2b2838'); px(x + 4, y + 10, 4, 1, '#2b2838') },
      (x, y) => { ell(x + 6, y + 8, 5, 3, '#2b2838'); px(x + 1, y + 4, 10, 1, '#4a4660'); px(x + 2, y + 5, 8, 1, '#6bf0a0'); px(x + 4, y + 2, 2, 2, '#6bf0a0'); px(x + 7, y + 1, 2, 2, '#9bf5c0'); px(x + 2, y + 11, 2, 1, '#2b2838'); px(x + 8, y + 11, 2, 1, '#2b2838') },
    ],
    desk: () => { px(1, 7, 6, 1, '#8a8a98'); px(2, 6, 4, 1, '#6a6f86'); px(3, 3, 2, 3, '#f6f0d8'); px(3, 1, 2, 2, '#ffd84a'); px(3, 2, 2, 1, '#f08a3c') },
    part: [() => bits(['b..b', 'bbbb', '.bb.', '....'], { b: '#2b2838' })(0, 0), () => bits(['.o..', 'ooo.', '.oo.', '..d.'], { o: '#f08a3c', d: '#8a4a1e' })(0, 0)],
  },
  easter: {
    hat: side => {
      const o = side ? 4 : 0
      S(7 + o, -8, 5, 7, '#f6f6fb'); S(8 + o, -6, 3, 5, '#f4a6b8'); S(16 + o, -8, 5, 7, '#f6f6fb'); S(17 + o, -6, 3, 5, '#f4a6b8'); S(20 + o, -8, 2, 2, '#f6f6fb')
      S(6 + o, -2, 16, 2, '#f4a6b8'); S(6 + o, -2, 16, 1, '#f8c4d0')
    },
    wall: () => {
      px(0, 1, 32, 1, '#9a8a6a')
      ;[[3, '#f4a6b8'], [11, '#ffd84a'], [19, '#9ac8f0'], [27, '#c9a0e8']].forEach(([x, c], i) => {
        px(x, 2, 1, 3 + (i % 2), '#4aa65a'); bits(['.ppp.', 'ppypp', 'ppypp', '.ppp.'], { p: c, y: '#ffffff' })(x - 2, 5 + (i % 2))
      })
    },
    big: (x, y) => { // egg basket
      const egg = (cx, cy, c, s) => { ell(cx, cy, 2, 3, c); px(cx - 2, cy, 5, 1, s) }
      px(x - 10, y - 20, 2, 12, '#8a5a34'); px(x + 8, y - 20, 2, 12, '#8a5a34'); px(x - 10, y - 21, 20, 2, '#8a5a34'); px(x - 10, y - 21, 20, 1, '#a8703f')
      egg(x - 4, y - 14, '#f4a6b8', '#fbfbff'); egg(x + 1, y - 15, '#9ac8f0', '#ffd84a'); egg(x + 6, y - 13, '#ffd84a', '#f4a6b8'); egg(x - 8, y - 12, '#b8e0a0', '#fbfbff')
      px(x - 12, y - 11, 24, 11, '#c9a066'); for (let i = 0; i < 5; i++) px(x - 12, y - 10 + i * 2, 24, 1, '#a8803f'); for (let i = 0; i < 6; i++) px(x - 12 + i * 4 + (i % 2), y - 11, 1, 11, '#a8803f')
      px(x - 12, y - 12, 24, 2, '#8a5a34'); px(x - 12, y - 12, 24, 1, '#a8703f')
      px(x - 11, y - 11, 4, 2, '#4aa65a'); px(x + 3, y - 12, 5, 2, '#4aa65a')
    },
    small: [
      (x, y) => { px(x, y + 9, 12, 3, '#4aa65a'); px(x + 1, y + 8, 3, 1, '#4aa65a'); ell(x + 3, y + 7, 2, 3, '#f4a6b8'); px(x + 1, y + 7, 5, 1, '#fbfbff'); ell(x + 8, y + 7, 2, 3, '#9ac8f0'); px(x + 6, y + 6, 5, 1, '#ffd84a') },
      (x, y) => { px(x + 3, y + 8, 6, 4, '#c8603a'); px(x + 2, y + 7, 8, 2, '#d9703f'); px(x + 5, y + 3, 2, 4, '#4aa65a'); px(x + 3, y + 1, 2, 3, '#f06a9a'); px(x + 7, y + 1, 2, 3, '#f06a9a'); px(x + 5, y, 2, 3, '#f06a9a') },
    ],
    desk: () => { ell(3, 5, 3, 2, '#ffd84a'); ell(4, 3, 2, 2, '#ffd84a'); px(5, 2, 1, 1, '#2b2838'); px(6, 3, 2, 1, '#f08a3c'); px(2, 7, 1, 1, '#f08a3c'); px(4, 7, 1, 1, '#f08a3c') },
    part: [() => bits(['.pp.', 'pppp', '.pp.', '....'], { p: '#f4a6b8' })(0, 0), () => bits(['.yy.', 'yyyy', '.yy.', '....'], { y: '#ffe88a' })(0, 0)],
  },
  newyear: {
    hat: side => {
      const o = side ? 4 : 0
      cone(o, -8, 12, '#6a4ad0', '#4a30a0', 0)
      for (const [y, c] of [[-6, '#ffd84a'], [-4, '#f06a9a']]) { const half = Math.round(1 + 5 * (y + 8) / 5); S(14 + o - half, y, 2 * half, 1, c) }
      S(13 + o, -8, 2, 1, '#ffe88a'); S(8 + o, -3, 12, 2, '#ffd84a')
    },
    wall: () => { // "2027" banner
      px(0, 0, 32, 16, '#ffd84a'); px(1, 1, 30, 14, '#2b2f6a'); px(1, 1, 30, 1, '#3a3f8a')
      const D = { 2: ['11110', '00001', '00001', '01110', '10000', '10000', '11111'], 0: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'] }
      ;[2, 0, 2, 7].forEach((d, i) => D[d].forEach((r, j) => [...r].forEach((ch, k) => { if (ch === '1') px(4 + i * 6 + k, 4 + j, 1, 1, '#ffd84a') })))
    },
    big: (x, y) => { // fireworks crate
      for (const [dx, tip, c] of [[-6, -22, '#d9342f'], [0, -26, '#4a90d9'], [6, -20, '#ffd84a']]) { px(x + dx - 1, y + tip + 4, 2, -tip - 4 - 8, '#8a5a34'); px(x + dx - 2, y + tip, 4, 4, c); px(x + dx - 1, y + tip - 1, 2, 1, c) }
      px(x - 10, y - 11, 20, 11, '#a8703f'); px(x - 10, y - 11, 20, 2, '#c8903f'); px(x - 10, y - 1, 20, 1, '#7a4a24'); px(x - 10, y - 6, 20, 1, '#7a4a24'); px(x - 9, y - 10, 1, 9, '#7a4a24'); px(x + 8, y - 10, 1, 9, '#7a4a24')
      px(x - 3, y - 9, 6, 4, '#f6f0d8'); px(x - 2, y - 8, 4, 1, '#d9342f')
      for (const [dx, dy, c] of [[-9, -26, '#ffd84a'], [-4, -30, '#ff5a5a'], [3, -30, '#ffffff'], [8, -26, '#4a90d9'], [-1, -23, '#f06a9a'], [10, -17, '#ffd84a'], [-11, -18, '#6fd9b0']]) px(x + dx, y + dy, 1, 1, c)
    },
    small: [
      (x, y) => { for (const [cx, cy, c] of [[3, 3, '#ff5a5a'], [8, 3, '#4a90d9'], [5, 5, '#ffd84a']]) { ell(x + cx, y + cy, 2, 2, c); px(x + cx - 1, y + cy - 1, 1, 1, '#ffffffa0'); px(x + cx, y + cy + 3, 1, 12 - cy - 3, '#9aa0b4') } },
      (x, y) => { px(x + 4, y + 5, 4, 7, '#2f6b3a'); px(x + 5, y + 2, 2, 3, '#2f6b3a'); px(x + 5, y + 1, 2, 2, '#ffd84a'); px(x + 4, y + 8, 4, 2, '#f6f0d8'); px(x + 4, y + 5, 1, 7, '#3f8a4f'); px(x + 5, y, 2, 1, '#c8903f') },
    ],
    desk: () => bits(['..wwww..', '..wyyw..', '..wyyw..', '..wyyw..', '...ww...', '...ww...', '...ww...', '..wwww..'], { w: '#e8eef8', y: '#ffe08a' })(0, 0),
    part: [() => { px(0, 0, 2, 2, '#f06a9a'); px(2, 2, 2, 2, '#4a90d9') }, () => { px(1, 0, 2, 3, '#ffd84a'); px(0, 3, 1, 1, '#ff5a5a') }],
  },
}

const THEME_FRAMES = t => [
  critterFrame('hat-front', cell(() => t.hat(false))), critterFrame('hat-side', cell(() => t.hat(true))),
  WALL_('deco-wall', t.wall), BIG('deco-floor-big', t.big),
  SMALL('deco-floor-small', t.small[0]), SMALL('deco-floor-small-2', t.small[1]),
  DESKI(t.desk), PART('particle', t.part[0]), PART('particle-2', t.part[1]),
]
// Phone-sized: the four themes in columns, each a critter wearing the hat (front, three-quarter), then the decorations.
function themePreview(critterByName, framesByTheme, s = 4) {
  const names = Object.keys(framesByTheme), colW = CELL_W * s + 8, c = mk(names.length * colW + 8, 760), x = c.getContext('2d')
  x.fillStyle = '#f3e6d6'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false
  names.forEach((n, i) => {
    const f = Object.fromEntries(framesByTheme[n].map(p => [p.name, p.canvas])), ox = 8 + i * colW
    let y = 8; x.fillStyle = '#2b2838'; x.font = 'bold 16px monospace'; x.fillText(n, ox, y + 12); y += 18
    x.drawImage(critterByName['idle'], ox, y, CELL_W * s, CELL_H * s); x.drawImage(f['hat-front'], ox, y, CELL_W * s, CELL_H * s); y += CELL_H * s
    x.drawImage(critterByName['bare-type-0'], ox, y, CELL_W * s, CELL_H * s); x.drawImage(f['hat-side'], ox, y, CELL_W * s, CELL_H * s); y += CELL_H * s + 6
    x.drawImage(f['deco-wall'], ox, y, 32 * s, 16 * s); y += 16 * s + 6
    x.drawImage(f['deco-floor-big'], ox, y, 24 * s, 32 * s)
    const sx = ox + 24 * s + 6; x.drawImage(f['deco-floor-small'], sx, y, 12 * s, 12 * s); x.drawImage(f['deco-floor-small-2'], sx, y + 12 * s + 4, 12 * s, 12 * s)
    x.drawImage(f['deco-desk'], sx, y + 24 * s + 8, 8 * s, 8 * s); y += 32 * s + 6
    x.drawImage(f['particle'], ox, y, 4 * s * 2, 4 * s * 2); x.drawImage(f['particle-2'], ox + 4 * s * 2 + 6, y, 4 * s * 2, 4 * s * 2)
  })
  return c
}
