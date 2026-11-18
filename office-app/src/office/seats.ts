import { type Archetype, archetypeOf, type Identity } from './archetype'

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

// Geometry in world px. The scene zooms and scrolls; this module only knows the world.
export const DESK = { w: 64, h: 48 }
export const GAP = 24
export const AISLE = 32
/** A half-pod is one column of two desks facing across the aisle. A pod is 4 columns, 2 rows of desks. */
export const COLS = 4
export const PODS_PER_ROW = 2
/** A neighbourhood that has been empty this long shrinks (last half-pod) or disappears. */
export const EMPTY_MS = 60_000
/** Walks to and from the door are drawn for this long after they start. Shortcut: scene timing may differ. */
export const MOVE_MS = 5_000

const POD_W = COLS * DESK.w
const POD_H = 2 * DESK.h + AISLE
const HOOD_W = PODS_PER_ROW * POD_W + (PODS_PER_ROW - 1) * GAP
const STRIP_X = 240 + 2 * GAP
const HOOD_STEP = HOOD_W + 2 * GAP

export const MEETING: Rect = { x: 0, y: 0, w: 240, h: 160 }
export const LOUNGE: Rect = { x: 0, y: MEETING.h + GAP, w: 240, h: 120 }
/** The one entrance, on the left wall under the lounge. Fixed, so nothing moves when the floor grows. */
export const DOOR: Point = { x: 0, y: LOUNGE.y + LOUNGE.h + GAP }

type Half = { rows: [string | null, string | null]; emptySince?: number }
type Hood = { kind: Archetype; halves: Half[]; emptySince?: number }

export type Move = { id: string; kind: 'arrive' | 'leave'; from: Point; to: Point; since: number }
export type Seat = { slot: number | 'meeting'; at: Point }
export type Neighbourhood = {
  slot: number
  kind: Archetype
  rect: Rect
  pods: Rect[]
  desks: { rect: Rect; occupant: string | null }[]
}

export type Plan = {
  /** Persisted state, index = neighbourhood slot. An undefined slot is free. Carried into the next plan. */
  slots: (Hood | undefined)[]
  /** Persisted state: the Conductor's seats in the meeting room. */
  meeting: (string | null)[]
  /** Walks to and from the door, kept for MOVE_MS. */
  moves: Move[]
  // Derived for the scene. Rebuilt on every call.
  seats: Record<string, Seat>
  neighbourhoods: Neighbourhood[]
  meetingRect: Rect
  lounge: Rect
  door: Point
  size: { w: number; h: number }
}

const hoodX = (slot: number) => STRIP_X + slot * HOOD_STEP

/** Desk rectangle. Depends only on the slot, half-pod index and row, so it never changes for a seat. */
export function deskRect(slot: number, half: number, row: number): Rect {
  const pod = Math.floor(half / COLS)
  const col = half % COLS
  const x = hoodX(slot) + (pod % PODS_PER_ROW) * (POD_W + GAP) + col * DESK.w
  const y = Math.floor(pod / PODS_PER_ROW) * (POD_H + GAP) + row * (DESK.h + AISLE)
  return { x, y, w: DESK.w, h: DESK.h }
}

/** The chair spot in front of a desk. */
const seatAt = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h })

const meetingSeat = (i: number): Point => ({ x: MEETING.x + GAP + i * DESK.w, y: MEETING.y + MEETING.h / 2 })

function hoodHeight(hood: Hood): number {
  const pods = Math.ceil(hood.halves.length / COLS)
  const rows = Math.ceil(pods / PODS_PER_ROW)
  return rows * POD_H + (rows - 1) * GAP
}

function cloneHood(h: Hood): Hood {
  return {
    kind: h.kind,
    emptySince: h.emptySince,
    halves: h.halves.map(x => ({ rows: [x.rows[0], x.rows[1]], emptySince: x.emptySince })),
  }
}

/**
 * Seats the agents. Pass the previous plan (undefined on the first frame) so seats stay put:
 * an agent keeps its desk until it leaves; joiners and leavers never move anyone else.
 */
export function seatPlan(prev: Plan | undefined, desks: Identity[], now: number): Plan {
  const slots: (Hood | undefined)[] = prev ? prev.slots.map(h => (h ? cloneHood(h) : undefined)) : []
  const meeting: (string | null)[] = prev ? [...prev.meeting] : []
  const moves: Move[] = prev ? prev.moves.filter(m => now - m.since < MOVE_MS) : []
  const live = new Set(desks.filter(d => !d.gone).map(d => d.id))

  // Leaving: an agent that is gone, or no longer in the list, frees its seat and walks to the door.
  for (let slot = 0; slot < slots.length; slot++) {
    const hood = slots[slot]
    if (!hood) continue
    hood.halves.forEach((half, hi) => half.rows.forEach((id, row) => {
      if (id && !live.has(id)) {
        moves.push({ id, kind: 'leave', from: seatAt(deskRect(slot, hi, row)), to: DOOR, since: now })
        half.rows[row] = null
      }
    }))
  }
  meeting.forEach((id, i) => {
    if (id && !live.has(id)) {
      moves.push({ id, kind: 'leave', from: meetingSeat(i), to: DOOR, since: now })
      meeting[i] = null
    }
  })

  // Seating: newcomers in list order. The first sighting of a kind claims the first free neighbourhood slot.
  const seated = new Set<string>([...meeting.filter((id): id is string => !!id), ...slots.flatMap(h => (h ? h.halves.flatMap(x => x.rows) : []).filter((id): id is string => !!id))])
  for (const d of desks) {
    if (d.gone || seated.has(d.id)) continue
    seated.add(d.id)
    const arch = archetypeOf(d)
    let at: Point
    if (arch === 'Conductor') {
      let i = meeting.indexOf(null)
      if (i < 0) i = meeting.push(null) - 1
      meeting[i] = d.id
      at = meetingSeat(i)
    } else {
      let slot = slots.findIndex(h => h?.kind === arch)
      if (slot < 0) {
        slot = slots.findIndex(h => !h)
        if (slot < 0) slot = slots.length
        slots[slot] = { kind: arch, halves: [{ rows: [null, null] }] }
      }
      const hood = slots[slot]!
      let hi = -1
      let row = -1
      find: for (let h = 0; h < hood.halves.length; h++) {
        for (let r = 0; r < 2; r++) if (hood.halves[h].rows[r] === null) { hi = h; row = r; break find }
      }
      if (hi < 0) {
        hood.halves.push({ rows: [null, null] })
        hi = hood.halves.length - 1
        row = 0
      }
      hood.halves[hi].rows[row] = d.id
      at = seatAt(deskRect(slot, hi, row))
    }
    if (prev) moves.push({ id: d.id, kind: 'arrive', from: DOOR, to: at, since: now })
  }

  // Emptiness: a half-pod or neighbourhood gets an emptySince the tick it empties, cleared when occupied.
  for (let slot = 0; slot < slots.length; slot++) {
    const hood = slots[slot]
    if (!hood) continue
    for (const half of hood.halves) half.emptySince = half.rows.some(Boolean) ? undefined : (half.emptySince ?? now)
    const occupied = hood.halves.some(h => h.rows.some(Boolean))
    hood.emptySince = occupied ? undefined : (hood.emptySince ?? now)
    // Shrink only from the end, and only a half-pod that has been empty EMPTY_MS. Keep at least one.
    while (hood.halves.length > 1) {
      const last = hood.halves[hood.halves.length - 1]
      if (last.rows.some(Boolean) || now - (last.emptySince ?? now) < EMPTY_MS) break
      hood.halves.pop()
    }
    if (!occupied && now - (hood.emptySince ?? now) >= EMPTY_MS) slots[slot] = undefined
  }

  return derive(slots, meeting, moves)
}

function derive(slots: (Hood | undefined)[], meeting: (string | null)[], moves: Move[]): Plan {
  const seats: Record<string, Seat> = {}
  meeting.forEach((id, i) => { if (id) seats[id] = { slot: 'meeting', at: meetingSeat(i) } })
  const neighbourhoods: Neighbourhood[] = []
  let bottom = Math.max(MEETING.y + MEETING.h, LOUNGE.y + LOUNGE.h)
  slots.forEach((hood, slot) => {
    if (!hood) return
    const pods: Rect[] = []
    const desks: Neighbourhood['desks'] = []
    hood.halves.forEach((half, hi) => {
      if (hi % COLS === 0) {
        const pod = hi / COLS
        pods.push({ x: hoodX(slot) + (pod % PODS_PER_ROW) * (POD_W + GAP), y: Math.floor(pod / PODS_PER_ROW) * (POD_H + GAP), w: POD_W, h: POD_H })
      }
      for (let row = 0; row < 2; row++) {
        const rect = deskRect(slot, hi, row)
        const occupant = half.rows[row]
        desks.push({ rect, occupant })
        if (occupant) seats[occupant] = { slot, at: seatAt(rect) }
      }
    })
    const rect = { x: hoodX(slot), y: 0, w: HOOD_W, h: hoodHeight(hood) }
    bottom = Math.max(bottom, rect.h)
    neighbourhoods.push({ slot, kind: hood.kind, rect, pods, desks })
  })
  const width = slots.length > 0 ? STRIP_X + slots.length * HOOD_STEP - 2 * GAP : MEETING.w
  return {
    slots,
    meeting,
    moves,
    seats,
    neighbourhoods,
    meetingRect: MEETING,
    lounge: LOUNGE,
    door: DOOR,
    size: { w: Math.max(width, LOUNGE.w), h: Math.max(bottom, DOOR.y) + GAP },
  }
}
