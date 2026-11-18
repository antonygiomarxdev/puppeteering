// Where everything stands, in art pixels, from the agent count. Pure: no Phaser. Ported from layout(n) of the hand-written page.
// Sprite pivots in the atlases are the old draw anchors, so these coordinates place the sprites as they are.
import type { Point } from '../office/types'

export const IW = 320 // inner floor width
export const GR = 32 // grass margin
export const TOPH = 28 // back wall height
export const ZH = 124 // height of the bottom zones
export const SLOT_W = 44
export const ROW_H = 58
export const POD_GAP = 20
export const DESK_W = 40
export const MAX_COLS = 4

export type Rect = { x: number; y: number; w: number; h: number }
export type Desk = { x: number; y: number } // top-left of the desk's table; the monitor rises 12 above

export type Layout = {
  cols: number
  rows: number
  /** Floor inner left edge, total width and height of the scene. */
  ix: number
  W: number
  H: number
  rowY: number[]
  bx: number
  zy: number
  mz: Rect // meeting zone (h = ZH)
  lz: Rect // lounge
  corrX: number
  /** One per agent. */
  desks: Desk[]
  /** The vacant slots of the last row. */
  spare: Desk[]
  leadDesk: Desk
  /** The entrance in the bottom wall, and where a critter stands to go in or out. */
  door: Rect
  doorSpot: Point
  /** Walkable area. */
  floor: Rect
  /** Grey tiled pods, one per two rows. */
  pods: Rect[]
  /** Everything a critter must walk around. */
  blocked: Rect[]
}

/** Where desks and the door are for `n` agents. A later seat plan (src/office/seats.ts) can replace this; the scene only reads the result. */
export type Plan = (n: number) => Layout

export function layout(n: number): Layout {
  const cols = Math.max(1, Math.min(MAX_COLS, n))
  const rows = Math.max(1, Math.ceil(n / cols))
  const ix = GR
  const W = IW + 2 * GR
  const rowY = Array.from({ length: rows }, (_, r) => TOPH + 32 + Math.floor(r / 2) * (2 * ROW_H + POD_GAP) + (r % 2) * ROW_H)
  const bx = Math.round(ix + 48 + (IW - 56 - cols * SLOT_W + 4) / 2)
  const zy = rowY[rows - 1]! + 44 + 20
  const mz = { x: ix + 40, y: zy, w: 136, h: ZH }
  const lz = { x: ix + 192, y: zy, w: 120, h: ZH }
  const H = zy + ZH + 10
  const slot = (i: number): Desk => ({ x: bx + (i % cols) * SLOT_W, y: rowY[Math.floor(i / cols)]! })
  const all = Array.from({ length: rows * cols }, (_, i) => slot(i))
  const leadDesk = { x: mz.x + 48, y: zy + 22 }
  const pods: Rect[] = []
  for (let p = 0; p * 2 < rows; p++) {
    const r0 = p * 2
    const r1 = Math.min(r0 + 1, rows - 1)
    const top = rowY[r0]! - 18
    pods.push({ x: bx - 12, y: top, w: cols * SLOT_W + 20, h: rowY[r1]! + 44 - top })
  }
  const deskRect = (d: Desk): Rect => ({ x: d.x, y: d.y - 12, w: DESK_W, h: 25 })
  const blocked: Rect[] = [
    ...all.map(deskRect),
    deskRect(leadDesk),
    { x: mz.x + 8, y: zy + 6, w: 36, h: 36 }, // easel
    { x: mz.x + mz.w - 28, y: zy + 4, w: 23, h: 36 }, // bookshelf
    { x: mz.x + 20, y: zy + 58, w: 96, h: 24 }, // table and its chairs
    { x: mz.x + 4, y: zy + ZH - 27, w: 14, h: 19 }, // plant
    { x: lz.x + 6, y: zy + 4, w: 23, h: 34 }, // bamboo
    { x: lz.x + 40, y: zy + 6, w: 46, h: 32 }, // ping-pong
    { x: lz.x + 94, y: zy + 8, w: 16, h: 18 }, // armchairs
    { x: lz.x + 94, y: zy + 42, w: 16, h: 18 },
    { x: lz.x + 6, y: zy + 40, w: 30, h: 24 }, // tv
    { x: lz.x + 42, y: zy + 68, w: 26, h: 25 }, // coffee table
    { x: lz.x + 18, y: zy + 98, w: 75, h: 20 }, // sofa
    { x: lz.x + 100, y: zy + 95, w: 14, h: 22 }, // plants
    { x: lz.x + 4, y: zy + 95, w: 14, h: 22 },
  ]
  return {
    cols, rows, ix, W, H, rowY, bx, zy, mz, lz,
    corrX: ix + 4,
    desks: all.slice(0, n),
    spare: all.slice(n),
    leadDesk,
    door: { x: ix + 8, y: H - 6, w: 20, h: 6 },
    doorSpot: { x: ix + 18, y: H - 8 },
    floor: { x: ix, y: TOPH, w: IW, h: H - TOPH - 6 },
    pods,
    blocked,
  }
}

// Critters are positioned by the middle of their feet.
export const seatOf = (d: Desk): Point => ({ x: d.x + DESK_W / 2, y: d.y + 28 })
export const aisleOf = (L: Layout, i: number) => L.rowY[Math.floor(i / L.cols)]! + 38
/** Where an agent stands to talk to the peer at desk `d`: beside the seat, on the aisle. */
export const standOf = (L: Layout, i: number): Point => ({ x: L.desks[i]!.x + DESK_W, y: aisleOf(L, i) })
/** Where agent number `i` stands to report to the lead: in front of the meeting table. */
export const leadSpot = (L: Layout, i: number): Point => ({ x: L.mz.x + 22 + (i % 3) * 44, y: L.zy + 104 + (Math.floor(i / 3) % 2) * 10 })
export const leadSeat = (L: Layout): Point => seatOf(L.leadDesk)

/** A spot for theme decor: the sprite's bottom-centre goes at (x, y). `foot` is the floor it takes: walk tiles it blocks. */
export type Slot = Point & { depth: number; foot?: Rect }

/**
 * The named spots a theme may use. Wall and floor-corner slots are bare: off every furniture rect, clear of the routes
 * (the corner decor's `foot` joins the walk grid). Desk, lounge and meeting slots sit ON furniture tops, never on a seat.
 */
export function anchorsOf(L: Layout): Record<'wall' | 'floor-corner' | 'desk' | 'lounge' | 'meeting', Slot[]> {
  const { ix, mz, lz, zy } = L
  const wall = [5, 77, 155, 233, 310].map(dx => ({ x: ix + dx, y: 20, depth: -698 }))
  const corner = (x: number, y: number): Slot => ({ x, y, depth: y, foot: { x: x - 8, y: y - 5, w: 16, h: 5 } })
  const on = (x: number, y: number, depth: number): Slot => ({ x, y, depth })
  return {
    wall,
    'floor-corner': [corner(ix + 14, TOPH + 24), corner(ix + IW - 14, TOPH + 24)],
    desk: L.desks.map(d => on(d.x + DESK_W - 9, d.y + 8, d.y + 13.5)),
    lounge: [on(lz.x + 55, zy + 74, zy + 93.5), on(lz.x + 40, zy + 104, zy + 118.5), on(lz.x + 102, zy + 12, zy + 26.5), on(lz.x + 60, zy + 14, zy + 38.5)],
    meeting: [on(mz.x + 34, zy + 70, zy + 88.5), on(mz.x + 100, zy + 70, zy + 88.5), on(mz.x + mz.w - 17, zy + 8, zy + 40.5), on(mz.x + 26, zy + 10, zy + 42.5)],
  }
}
