// Runs in headless Chrome, inlined into the page export.mjs serves: calls the real painters, packs the frames, posts PNG + atlas JSON back.
const CW = 28, CH = 20
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const withCtx = (c, fn) => { const old = ctx; ctx = c.getContext('2d'); try { return fn() } finally { ctx = old } }

// Render one piece on a scratch canvas with its call anchor at (ax, ay), then trim to what was drawn.
function trimmed(fn, W = 220, H = 180, ax = 60, ay = 90) {
  const c = mk(W, H)
  withCtx(c, () => fn(ax, ay))
  const d = c.getContext('2d').getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  if (x1 < 0) throw new Error('empty piece')
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = mk(w, h)
  out.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h)
  // pivot: where the painter's own (x, y) lands in the frame, so a sprite put at that point sits as the old page drew it
  return { canvas: out, w, h, pivot: { x: (ax - x0) / w, y: (ay - y0) / h } }
}

// Shelf-pack frames into one canvas; returns the sheet canvas and a Phaser hash atlas.
function pack(frames, maxW, image) {
  let x = 1, y = 1, rowH = 0, W = 0
  const placed = frames.map(f => {
    if (x + f.w + 1 > maxW) { x = 1; y += rowH + 1; rowH = 0 }
    const p = { ...f, x, y }
    x += f.w + 1; rowH = Math.max(rowH, f.h); W = Math.max(W, x)
    return p
  })
  const H = y + rowH + 1
  const sheet = mk(W, H), sctx = sheet.getContext('2d')
  const atlas = { frames: {}, meta: { app: 'puppet-office exporter', image, format: 'RGBA8888', size: { w: W, h: H }, scale: '1' } }
  for (const p of placed) {
    sctx.drawImage(p.canvas, p.x, p.y)
    atlas.frames[p.name] = { frame: { x: p.x, y: p.y, w: p.w, h: p.h }, rotated: false, trimmed: false, sourceSize: { w: p.w, h: p.h }, spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h }, pivot: p.pivot }
  }
  return { sheet, atlas }
}

const post = (dest, name, body) => fetch(`/save?dest=${dest}&name=${name}`, { method: 'POST', body })
const png = c => c.toDataURL('image/png')
function preview(sheet, scale, pad = 8) { // the sheet at nearest-neighbour scale, on a cream floor with a faint grid
  const c = mk(sheet.width * scale + pad * 2, sheet.height * scale + pad * 2), x = c.getContext('2d')
  x.fillStyle = '#f3e6d6'; x.fillRect(0, 0, c.width, c.height)
  x.imageSmoothingEnabled = false
  x.drawImage(sheet, pad, pad, sheet.width * scale, sheet.height * scale)
  return c
}

// ---- critter: fixed cells so flipX in Phaser mirrors around the body (the stick reaches 7px left, the crown 4px up) ----
const CELL_W = 44, CELL_H = 30, OX = 8, OY = 8
const POSES = [ // name, pose, tick, facing, asleep, typing
  ['type-0', 'sit', 0, 'down', false, true], ['type-1', 'sit', 1, 'down', false, true],
  ['walk-left-0', 'walk', 0, 'left', false, false], ['walk-left-1', 'walk', 1, 'left', false, false],
  ['walk-down-0', 'walk', 0, 'down', false, false], ['walk-down-1', 'walk', 1, 'down', false, false],
  ['walk-up-0', 'walk', 0, 'up', false, false], ['walk-up-1', 'walk', 1, 'up', false, false],
  ['idle', 'sit', 1, 'down', false, false], ['wink', 'sit', 14, 'down', false, false], ['asleep', 'sit', 1, 'down', true, false],
  ['talk-0', 'talk', 0, 'right', false, false], ['talk-1', 'talk', 2, 'right', false, false], // stick down-left, level
  ['talk-2', 'talk', 3, 'right', false, false], ['talk-3', 'talk', 6, 'right', false, false], // stick up, level
]
function critterFrames(draw, color) {
  return POSES.map(([name, pose, tick, facing, asleep, typing]) => {
    const c = mk(CELL_W, CELL_H)
    withCtx(c, () => draw(OX, OY + CH, color, pose, tick, facing, false, asleep, typing, 0))
    return { name, canvas: c, w: CELL_W, h: CELL_H, pivot: { x: 0.5, y: (OY + CH) / CELL_H } } // origin at the feet
  })
}

// ---- marks: crown, z, ! ----
function marks() {
  const piece = (name, w, h, fn) => { const c = mk(w, h); withCtx(c, () => fn(0, 0)); return { name, canvas: c, w, h, pivot: { x: 0.5, y: 1 } } }
  const z = (x, y) => { for (const [row, cols] of [[0, [0, 1, 2]], [1, [2]], [2, [1]], [3, [0, 1, 2]]]) for (const col of cols) px(x + col * 2, y + row * 2, 2, 2, '#6a6fd0') }
  const bang = color => (x, y) => { px(x, y, 3, 7, color); px(x, y + 9, 3, 3, color) }
  return [
    piece('crown', 12, 4, (x, y) => { px(x, y + 2, 12, 2, '#ffb000'); for (const k of [0, 6, 10]) px(x + k, y, 2, 2, '#ffb000') }),
    piece('z', 6, 8, z),
    piece('bang-red', 3, 12, bang('#ff5a5a')),
    piece('bang-amber', 3, 12, bang('#ffb000')),
  ]
}

// Lamp, water cooler, coffee machine and vending machine: they came from the old dark scene, so they live here, in the light palette.
function lamp(x, y) {
  shadow(x - 2, y + 31, 12, 3)
  px(x + 3, y + 8, 2, 24, '#6a6f86'); px(x, y, 8, 9, '#ffcf5a'); px(x + 1, y + 1, 6, 2, '#fff0b0'); px(x - 2, y + 9, 12, 5, '#ffb00022')
}
function vending(x, y) {
  shadow(x + 1, y + 27, 16, 3)
  px(x, y, 16, 28, '#e8715a'); px(x + 2, y + 2, 9, 16, '#3a4a6a')
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) px(x + 3 + c * 3, y + 3 + r * 5, 2, 3, BOOKS[(r * 3 + c) % 6])
  px(x + 12, y + 3, 3, 10, '#b8503e'); px(x + 3, y + 21, 10, 4, '#5a5f70')
}
function cooler(x, y) {
  shadow(x + 1, y + 21, 10, 3)
  px(x, y + 8, 10, 14, '#f6f6fb'); px(x + 1, y + 9, 8, 6, '#d3d6e6'); px(x + 2, y, 6, 9, '#8fd3ff'); px(x + 3, y + 1, 2, 5, '#cfeeff'); px(x + 3, y + 12, 2, 2, '#4a90d9')
}
function coffee(x, y) {
  shadow(x, y + 15, 14, 3)
  px(x, y, 14, 16, '#f6f6fb'); px(x, y + 14, 14, 2, '#d3d6e6'); px(x + 2, y + 2, 10, 5, '#3a4a6a'); px(x + 5, y + 9, 4, 5, '#e8715a'); px(x + 10, y + 3, 2, 2, '#6bf0a0')
}

// ---- furniture, from the task 17 painters ----
function cactus(x, y) {
  shadow(x + 1, y + 13, 11, 3)
  px(x + 3, y + 8, 7, 6, '#f6f6fb'); px(x + 3, y + 8, 7, 1, '#d6d8e6'); px(x + 8, y + 9, 2, 5, '#d6d8e6')
  px(x + 5, y - 3, 4, 12, '#4a9a4a'); px(x + 2, y + 1, 3, 2, '#4a9a4a'); px(x + 2, y + 1, 2, 5, '#4a9a4a'); px(x + 9, y + 2, 3, 2, '#4a9a4a'); px(x + 10, y + 2, 2, 4, '#4a9a4a')
  px(x + 6, y - 3, 1, 10, '#6cc47c')
}
function roundTable(x, y) { shadow(x - 13, y + 4, 26, 5); disc(x, y, 12, '#c9a066'); disc(x, y - 1, 11, '#e8c28a'); disc(x, y - 2, 3, '#6a6f86') }
const DK = (screen, seed = 'worker') => (x, y) => desk({ x, y, w: DESK_W }, screen, 0, seed)
const FURNITURE = [
  ['desk-on', DK('on')], ['desk-off', DK('off')], ['desk-alert', DK('alert')], ['desk-done', DK('done')],
  ['chair', (x, y) => chairDesk(x, y)], ['chair-small', (x, y) => chairSmall(x, y)],
  ['bookcase', (x, y) => bookshelf(x, y, 'lead')],
  ['plant-leafy', (x, y) => plantPot(x, y, 0)], ['plant-palm', (x, y) => plantPot(x, y, 1)], ['plant-flowers', (x, y) => plantPot(x, y, 2)], ['plant-cactus', cactus],
  ['lamp', lamp],
  ['sofa', (x, y) => sofaPeach(x, y, 74)], ['sofa-small', (x, y) => sofaPeach(x, y, 50)], ['armchair', armchair],
  ['coffee-table', roundTable], ['meeting-table', (x, y) => meetingTable(x, y, 96)], ['whiteboard', easel],
  ['water-cooler', cooler], ['coffee-machine', coffee], ['vending-machine', vending],
  ['tv-stand', tvStand], ['ping-pong', pingPong], ['bamboo', bamboo], ['tree', (x, y) => tree(x, y, false)], ['pine', (x, y) => tree(x, y, true)],
  ['window-day', (x, y) => windowAt(x, y, 56, 16, 'day')], ['window-dawn', (x, y) => windowAt(x, y, 56, 16, 'dawn')],
  ['window-dusk', (x, y) => windowAt(x, y, 56, 16, 'dusk')], ['window-night', (x, y) => windowAt(x, y, 56, 16, 'night')],
]
// Repeating floors: drawn large, then a seamless inner block is cropped out.
function tileOf(name, fn, big, crop) {
  const c = mk(big, big); withCtx(c, () => fn(0, 0, big, big))
  const out = mk(crop[2], crop[3]); out.getContext('2d').drawImage(c, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3])
  return { name, canvas: out, w: crop[2], h: crop[3], pivot: { x: 0, y: 0 } }
}
const TILES = [
  tileOf('floor-planks', floorPlanks, 160, [0, 0, 96, 48]),
  tileOf('floor-tile', tileFloor, 96, [16, 16, 32, 32]),
  tileOf('carpet-stripes', carpetStripes, 64, [8, 8, 16, 16]),
  tileOf('carpet-lilac', carpetLilac, 96, [16, 16, 32, 32]),
]


// ---- tileset: 16x16 floor and wall tiles in a grid, for Tiled / a Phaser tilemap ----
function tileset() {
  const N = 16, cols = 8
  const crop = (draw, big, x, y) => { const c = mk(big, big); withCtx(c, () => draw(c)); const o = mk(N, N); o.getContext('2d').drawImage(c, x, y, N, N, 0, 0, N, N); return o }
  const list = [
    ['plank-0', crop(() => floorPlanks(0, 0, 160, 64), 160, 0, 0)], ['plank-1', crop(() => floorPlanks(0, 0, 160, 64), 160, 16, 16)],
    ['plank-2', crop(() => floorPlanks(0, 0, 160, 64), 160, 32, 0)], ['plank-3', crop(() => floorPlanks(0, 0, 160, 64), 160, 48, 16)],
    ['tile-grey-a', crop(() => tileFloor(0, 0, 96, 96), 96, 16, 16)], ['tile-grey-b', crop(() => tileFloor(0, 0, 96, 96), 96, 32, 16)],
    ['carpet-stripes', crop(() => carpetStripes(0, 0, 64, 64), 64, 8, 8)], ['carpet-lilac', crop(() => carpetLilac(0, 0, 96, 96), 96, 16, 16)],
    ['wall', crop(() => px(0, 0, 16, 16, WALL), 16, 0, 0)],
    ['wall-top', crop(() => { px(0, 0, 16, 16, WALL); px(0, 0, 16, 3, WALL_TOP) }, 16, 0, 0)],
    ['wall-base', crop(() => { px(0, 0, 16, 16, WALL); px(0, 13, 16, 3, WALL_LOW) }, 16, 0, 0)],
    ['wall-shadow', crop(() => { px(0, 0, 16, 16, '#f3e6d6'); px(0, 0, 16, 4, '#00000018') }, 16, 0, 0)],
    ['grass', crop(() => px(0, 0, 16, 16, '#d5ecd8'), 16, 0, 0)],
    ['grass-tufts', crop(() => { px(0, 0, 16, 16, '#d5ecd8'); px(3, 4, 2, 1, '#c3e2c8'); px(11, 10, 2, 1, '#c3e2c8'); px(7, 14, 2, 1, '#c3e2c8') }, 16, 0, 0)],
  ]
  const sheet = mk(cols * N, Math.ceil(list.length / cols) * N), sx = sheet.getContext('2d')
  const tiles = {}
  list.forEach(([name, c], i) => { sx.drawImage(c, (i % cols) * N, Math.floor(i / cols) * N); tiles[name] = i })
  return { sheet, meta: { image: 'tileset.png', tileWidth: N, tileHeight: N, columns: cols, tileCount: list.length, tiles } }
}

async function main() {
  const out = []
  const save = async (dest, base, { sheet, atlas }, scale) => {
    await post(dest, `${base}.png`, png(sheet)); await post(dest, `${base}.json`, JSON.stringify(atlas, null, 2))
    await post('scratch', `preview-${base}.png`, png(preview(sheet, scale)))
    out.push(`${base}: ${sheet.width}x${sheet.height}, ${Object.keys(atlas.frames).length} frames`)
  }
  await save('sprites', 'critter', pack(critterFrames(critterOrange, '#d97757'), 230, 'critter.png'), 8)
  await save('sprites', 'critter-gold', pack(critterFrames(critterGold, '#f5c542'), 230, 'critter-gold.png'), 8)
  await save('sprites', 'marks', pack(marks(), 40, 'marks.png'), 8)
  const furn = [...FURNITURE.map(([name, fn]) => ({ name, ...trimmed(fn) })), ...TILES]
  await save('sprites', 'furniture', pack(furn, 300, 'furniture.png'), 6)
  const ts = tileset()
  await post('sprites', 'tileset.png', png(ts.sheet)); await post('sprites', 'tileset.json', JSON.stringify(ts.meta, null, 2))
  await post('scratch', 'preview-tileset.png', png(preview(ts.sheet, 8)))
  out.push('tileset: ' + ts.sheet.width + 'x' + ts.sheet.height + ', ' + ts.meta.tileCount + ' tiles')
  document.title = 'done: ' + out.join(' | ')
}
main().catch(e => { document.title = 'error: ' + e.message; console.error(e) })
