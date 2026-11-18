// Where everything stands in the scene, in art pixels, from the seat plan (src/office/seats.ts). Pure: no Phaser.
// seats.ts works in world px with the meeting room at (0, 0); the scene shifts it by (OX, OY) to leave room for grass, walls and windows.
// Sprite pivots in the atlases are the old draw anchors, so the coordinates below place the sprites as they are.
import type { Archetype } from '../office/archetype'
import { DESK, DOOR, LOUNGE, MEETING, type Plan as SeatPlan } from '../office/seats'
import type { Point } from '../office/types'

export const GR = 28 // grass margin
export const TOPH = 28 // back wall height
export const PAD = 16 // floor between the walls and the furniture
export const OX = GR + PAD
export const OY = TOPH + 16 // room for the windows' wall
const BOTTOM = 12 // floor under the last row
export const DESK_W = 40
export const WINDOW_W = 56
export const WINDOW_STEP = 78

export type Rect = { x: number; y: number; w: number; h: number }

export const toScene = (p: Point): Point => ({ x: p.x + OX, y: p.y + OY })
export const toWorld = (p: Point): Point => ({ x: p.x - OX, y: p.y - OY })
const shift = (r: Rect): Rect => ({ x: r.x + OX, y: r.y + OY, w: r.w, h: r.h })

/** A desk cell of a neighbourhood, vacant or not. `desk` is where the table sprite anchors; `seat` the middle of the critter's feet. */
export type DeskSlot = { slot: number; kind: Archetype; rect: Rect; desk: Point; seat: Point; occupant: string | null }
export type Furniture = { frame: string; x: number; y: number }
export type Hood = { slot: number; kind: Archetype; rect: Rect; pods: Rect[] }

export type Layout = {
  W: number
  H: number
  /** Floor inner left edge. */
  ix: number
  floor: Rect
  hoods: Hood[]
  /** Every desk of every neighbourhood, vacant ones too. */
  desks: DeskSlot[]
  /** Where each seated agent sits, by id (desks and meeting room). */
  seatOf: Record<string, Point>
  meeting: Rect
  lounge: Rect
  leadDesk: Point
  leadSeat: Point
  /** The entrance in the left wall, and where a critter stands to come in or go out. */
  door: Rect
  doorSpot: Point
  furniture: Furniture[]
  /** Everything a critter must walk around. */
  blocked: Rect[]
  /** Changes when the static scene must be rebuilt (a neighbourhood or half-pod appeared or went), not when someone sits down. */
  sig: string
}

// Furniture of the two rooms, in world px relative to the room's corner. `block` is the footprint critters walk around.
type Item = { frame: string; x: number; y: number; block: Rect }
const MEETING_ITEMS: Item[] = [
  { frame: 'whiteboard', x: 8, y: 6, block: { x: 8, y: 6, w: 36, h: 36 } },
  { frame: 'bookcase', x: 168, y: 4, block: { x: 168, y: 4, w: 23, h: 36 } },
  { frame: 'meeting-table', x: 50, y: 88, block: { x: 50, y: 88, w: 98, h: 22 } },
  { frame: 'plant-leafy', x: 6, y: 100, block: { x: 6, y: 97, w: 14, h: 19 } },
]
const LOUNGE_ITEMS: Item[] = [
  { frame: 'bamboo', x: 6, y: 4, block: { x: 6, y: 4, w: 23, h: 34 } },
  { frame: 'ping-pong', x: 40, y: 8, block: { x: 40, y: 6, w: 46, h: 32 } },
  { frame: 'armchair', x: 94, y: 8, block: { x: 94, y: 8, w: 16, h: 18 } },
  { frame: 'tv-stand', x: 6, y: 40, block: { x: 6, y: 40, w: 30, h: 24 } },
  { frame: 'armchair', x: 94, y: 42, block: { x: 94, y: 42, w: 16, h: 18 } },
  { frame: 'coffee-table', x: 55, y: 79, block: { x: 42, y: 68, w: 26, h: 25 } },
  { frame: 'sofa', x: 18, y: 98, block: { x: 18, y: 98, w: 75, h: 20 } },
  { frame: 'plant-flowers', x: 100, y: 100, block: { x: 100, y: 95, w: 14, h: 22 } },
  { frame: 'plant-palm', x: 4, y: 100, block: { x: 4, y: 95, w: 14, h: 22 } },
  { frame: 'water-cooler', x: 132, y: 8, block: { x: 132, y: 8, w: 11, h: 24 } },
  { frame: 'coffee-machine', x: 148, y: 12, block: { x: 148, y: 12, w: 14, h: 18 } },
  { frame: 'vending-machine', x: 170, y: 4, block: { x: 170, y: 4, w: 17, h: 30 } },
  { frame: 'lamp', x: 196, y: 2, block: { x: 196, y: 2, w: 12, h: 34 } },
  { frame: 'armchair', x: 214, y: 44, block: { x: 214, y: 44, w: 16, h: 18 } },
  { frame: 'sofa-small', x: 150, y: 98, block: { x: 150, y: 98, w: 51, h: 20 } },
  { frame: 'plant-palm', x: 228, y: 100, block: { x: 228, y: 95, w: 14, h: 22 } },
]
// The lead's desk, in the meeting room: its table anchor in world px.
const LEAD_DESK: Point = { x: 80, y: 14 }

const deskBlock = (d: Point): Rect => ({ x: d.x, y: d.y - 12, w: DESK_W, h: 25 })

export function layoutOf(plan: SeatPlan): Layout {
  const desks: DeskSlot[] = plan.neighbourhoods.flatMap(h =>
    h.desks.map(({ rect, occupant }) => ({
      slot: h.slot, kind: h.kind, rect: shift(rect), occupant,
      // The seat sits at the middle of the cell's bottom edge, the table 28 above its feet line.
      desk: toScene({ x: rect.x + (DESK.w - DESK_W) / 2, y: rect.y + DESK.h - 28 }),
      seat: toScene({ x: rect.x + DESK.w / 2, y: rect.y + DESK.h }),
    })),
  )
  const seatOf: Record<string, Point> = {}
  for (const [id, s] of Object.entries(plan.seats)) if (s.slot === 'meeting') seatOf[id] = toScene(s.at)
  for (const d of desks) if (d.occupant) seatOf[d.occupant] = d.seat
  const leadDesk = toScene(LEAD_DESK)
  const furniture: Furniture[] = []
  const blocked: Rect[] = [...desks.map(d => deskBlock(d.desk)), deskBlock(leadDesk)]
  const place = (items: Item[], at: Rect) => items.forEach(i => {
    furniture.push({ frame: i.frame, x: i.x + at.x + OX, y: i.y + at.y + OY })
    blocked.push(shift({ x: i.block.x + at.x, y: i.block.y + at.y, w: i.block.w, h: i.block.h }))
  })
  place(MEETING_ITEMS, MEETING)
  place(LOUNGE_ITEMS, LOUNGE)

  const floorW = plan.size.w + 2 * PAD
  const W = OX + plan.size.w + PAD + GR
  const H = OY + plan.size.h + BOTTOM + 6
  const doorY = OY + DOOR.y
  return {
    W, H, ix: GR,
    floor: { x: GR, y: TOPH, w: floorW, h: H - TOPH - 6 },
    hoods: plan.neighbourhoods.map(h => ({
      slot: h.slot, kind: h.kind, rect: shift(h.rect),
      pods: h.pods.map(p => ({ x: p.x - 6 + OX, y: p.y - 2 + OY, w: p.w + 12, h: p.h + 14 })),
    })),
    desks, seatOf,
    meeting: shift(MEETING), lounge: shift(LOUNGE),
    leadDesk, leadSeat: toScene({ x: LEAD_DESK.x + 20, y: LEAD_DESK.y + 28 }),
    door: { x: GR - 4, y: doorY - 12, w: 4, h: 24 },
    doorSpot: { x: GR + 10, y: doorY },
    furniture, blocked,
    sig: `${plan.neighbourhoods.map(n => `${n.slot}:${n.kind}:${n.desks.length}`).join('|')}/${plan.meeting.length}`,
  }
}

/** Where a visitor stands to talk to the agent seated at `seat`: beside it, on the aisle. */
export const standBeside = (seat: Point): Point => ({ x: seat.x + 30, y: seat.y + 14 })

/** Where agent number `i` stands to report to the lead: in front of the lead, below its desk. */
export const leadSpot = (L: Layout, i: number): Point => ({ x: L.meeting.x + 40 + (i % 4) * 44, y: L.meeting.y + 74 + (Math.floor(i / 4) % 2) * 8 })

export const windowsOf = (L: Layout): number[] => {
  const xs: number[] = []
  for (let x = L.ix + 10; x + WINDOW_W <= L.ix + L.floor.w - 10; x += WINDOW_STEP) xs.push(x)
  return xs
}

/** A spot for theme decor: the sprite's bottom-centre goes at (x, y). `foot` is the floor it takes: walk tiles it blocks. */
export type Slot = Point & { depth: number; foot?: Rect }

/**
 * The named spots a theme may use. Wall and floor-corner slots are bare: off every furniture rect, clear of the routes
 * (the corner decor's `foot` joins the walk grid). Desk, lounge and meeting slots sit ON furniture tops, never on a seat.
 */
export function anchorsOf(L: Layout): Record<'wall' | 'floor-corner' | 'desk' | 'lounge' | 'meeting', Slot[]> {
  const { ix, floor } = L
  const wall = [ix + 5, ...windowsOf(L).map(x => x + WINDOW_W + 11)].filter(x => x < ix + floor.w - 4).map(x => ({ x, y: 20, depth: -698 }))
  const corner = (x: number, y: number): Slot => ({ x, y, depth: y, foot: { x: x - 8, y: y - 5, w: 16, h: 5 } })
  const on = (x: number, y: number, depth: number): Slot => ({ x, y, depth })
  const m = (x: number, y: number, depth: number) => on(x + OX + MEETING.x, y + OY + MEETING.y, depth + OY + MEETING.y)
  const l = (x: number, y: number, depth: number) => on(x + OX + LOUNGE.x, y + OY + LOUNGE.y, depth + OY + LOUNGE.y)
  const bottom = floor.y + floor.h - 6
  return {
    wall,
    'floor-corner': [corner(ix + 10, bottom), corner(ix + floor.w - 10, bottom)],
    desk: L.desks.map(d => on(d.desk.x + DESK_W - 9, d.desk.y + 8, d.desk.y + 13.5)),
    lounge: [l(55, 74, 93.5), l(40, 104, 118.5), l(102, 14, 26.5), l(60, 14, 38.5), l(170, 104, 118.5), l(222, 50, 62.5)],
    meeting: [m(70, 96, 110.5), m(130, 96, 110.5), m(180, 8, 40.5), m(26, 10, 42.5)],
  }
}

/** The places the office extras (src/office/extras.ts) need, in scene px. Each is open floor. */
export type Spots = { coffee: Point; vending: Point; lead: Point; corner: Point; aisles: Point[] }

export function spotsOf(L: Layout): Spots {
  const { lounge, meeting, ix, doorSpot } = L
  const aisles: Point[] = [
    ...L.hoods.map(h => ({ x: h.rect.x + 72, y: h.rect.y + 62 })), // the gap beside each neighbourhood, level with the first aisle
    { x: meeting.x + 170, y: meeting.y + 64 },
    { x: ix + 44, y: doorSpot.y - 16 },
  ]
  return {
    coffee: { x: lounge.x + 155, y: lounge.y + 40 }, // in front of the coffee machine
    vending: { x: lounge.x + 178, y: lounge.y + 44 }, // in front of the vending machine
    lead: { x: meeting.x + 150, y: meeting.y + 60 }, // beside the lead's desk
    corner: { x: ix + 22, y: TOPH + 40 },
    aisles,
  }
}
