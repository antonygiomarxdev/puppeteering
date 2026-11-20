import { type Archetype, archetypeOf, type Identity } from './archetype'

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

// Geometry in world px. The scene zooms and scrolls; this module only knows the world.
//
// The floor, top to bottom: the meeting room and the lounge side by side, then a grid of neighbourhoods. The rooms are on
// top so that the grid can wrap into more rows without moving anything. A neighbourhood is one column of desks, one grid
// cell wide, that holds up to two half-pods stacked downward; a kind with more agents opens a second neighbourhood in the
// next free cell. Nobody moves when someone joins or leaves, and cells never overlap.
export const DESK = { w: 64, h: 48 }
/** Between the two rows of a half-pod, where visitors stand. */
export const AISLE = 20
/** A half-pod is 2 desks facing each other across the aisle. */
export const HALF_H = 2 * DESK.h + AISLE
export const HALF_GAP = 12
/** The most half-pods a neighbourhood holds; its cell reserves their room. */
export const HALVES_MAX = 2
export const CELL_H = HALVES_MAX * HALF_H + (HALVES_MAX - 1) * HALF_GAP
export const GAP_H = 16
export const GAP_V = 16
export const STRIDE_X = DESK.w + GAP_H
export const STRIDE_Y = CELL_H + GAP_V
/** Neighbourhoods per grid row. */
export const GRID_COLS = 6
/** A neighbourhood that has been empty this long shrinks (last half-pod) or disappears. */
export const EMPTY_MS = 60_000
/** Walks to and from the door are drawn for this long after they start. Shortcut: scene timing may differ. */
export const MOVE_MS = 5_000

export const MEETING: Rect = { x: 0, y: 0, w: 200, h: 124 }
export const LOUNGE: Rect = { x: MEETING.w + 16, y: 0, w: 248, h: 124 }
const GRID_W = GRID_COLS * STRIDE_X - GAP_H
const GRID_Y0 = MEETING.h + 24
const BOTTOM = 8
/** The one entrance, on the left wall beside the first row of neighbourhoods. Fixed, so nothing moves when the floor grows. */
export const DOOR: Point = { x: 0, y: GRID_Y0 + 56 }

type Half = { rows: [string | null, string | null]; emptySince?: number }
type Hood = { kind: Archetype; halves: Half[]; emptySince?: number }

export type Move = { id: string; kind: 'arrive' | 'leave'; from: Point; to: Point; since: number }
export type Seat = { slot: number | 'meeting'; at: Point }
export type Neighbourhood = {
  slot: number
  kind: Archetype
  rect: Rect
  /** One per half-pod. */
  pods: Rect[]
  desks: { rect: Rect; occupant: string | null }[]
}

export type Plan = {
  /** Persisted state, index = neighbourhood slot (grid cell, row by row). An undefined slot is free. Carried into the next plan. */
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

const cellX = (slot: number) => (slot % GRID_COLS) * STRIDE_X
const cellY = (slot: number) => GRID_Y0 + Math.floor(slot / GRID_COLS) * STRIDE_Y

/** Desk rectangle. Depends only on the slot, half-pod index and row, so it never changes for a seat. */
export function deskRect(slot: number, half: number, row: number): Rect {
  return { x: cellX(slot), y: cellY(slot) + half * (HALF_H + HALF_GAP) + row * (DESK.h + AISLE), w: DESK.w, h: DESK.h }
}

/** The chair spot in front of a desk. */
const seatAt = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h })

const meetingSeat = (i: number): Point => ({ x: MEETING.x + 24 + i * DESK.w, y: MEETING.y + 80 })

function cloneHood(h: Hood): Hood {
  return {
    kind: h.kind,
    emptySince: h.emptySince,
    halves: h.halves.map(x => ({ rows: [x.rows[0], x.rows[1]], emptySince: x.emptySince })),
  }
}

/** A free desk of a neighbourhood of this kind, else room for one more half-pod in one, else a new neighbourhood in the first free cell. */
function place(slots: (Hood | undefined)[], kind: Archetype): { slot: number; hi: number; row: number } {
  for (let slot = 0; slot < slots.length; slot++) {
    const hood = slots[slot]
    if (hood?.kind !== kind) continue
    for (let hi = 0; hi < hood.halves.length; hi++) for (let row = 0; row < 2; row++) if (hood.halves[hi].rows[row] === null) return { slot, hi, row }
  }
  for (let slot = 0; slot < slots.length; slot++) {
    const hood = slots[slot]
    if (hood?.kind === kind && hood.halves.length < HALVES_MAX) {
      hood.halves.push({ rows: [null, null] })
      return { slot, hi: hood.halves.length - 1, row: 0 }
    }
  }
  let slot = slots.findIndex(h => !h)
  if (slot < 0) slot = slots.length
  slots[slot] = { kind, halves: [{ rows: [null, null] }] }
  return { slot, hi: 0, row: 0 }
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

  // Seating: newcomers in list order. The first sighting of a kind claims the first free neighbourhood cell.
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
      const { slot, hi, row } = place(slots, arch)
      slots[slot]!.halves[hi].rows[row] = d.id
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
  // The floor reaches only as far down as the neighbourhoods do now; it grows with them, and nothing on it moves.
  let bottom = DOOR.y + 24
  slots.forEach((hood, slot) => {
    if (!hood) return
    const pods: Rect[] = []
    const desks: Neighbourhood['desks'] = []
    hood.halves.forEach((half, hi) => {
      pods.push({ x: cellX(slot), y: cellY(slot) + hi * (HALF_H + HALF_GAP), w: DESK.w, h: HALF_H })
      for (let row = 0; row < 2; row++) {
        const rect = deskRect(slot, hi, row)
        const occupant = half.rows[row]
        desks.push({ rect, occupant })
        if (occupant) seats[occupant] = { slot, at: seatAt(rect) }
      }
    })
    const h = hood.halves.length * HALF_H + (hood.halves.length - 1) * HALF_GAP
    bottom = Math.max(bottom, cellY(slot) + h)
    neighbourhoods.push({ slot, kind: hood.kind, rect: { x: cellX(slot), y: cellY(slot), w: DESK.w, h }, pods, desks })
  })
  return {
    slots,
    meeting,
    moves,
    seats,
    neighbourhoods,
    meetingRect: MEETING,
    lounge: LOUNGE,
    door: DOOR,
    size: { w: GRID_W, h: bottom + BOTTOM },
  }
}
