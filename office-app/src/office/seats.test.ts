import { describe, expect, it } from 'vitest'
import type { Identity } from './archetype'
import { DOOR, EMPTY_MS, type Plan, type Rect, seatPlan } from './seats'

const agent = (id: string, type = '', over: Partial<Identity> = {}): Identity => ({
  id, name: id, type, status: '', working: false, sleeping: false, doing: '', ...over,
})
const B = (id: string) => agent(id, 'general-purpose')
const R = (id: string) => agent(id, 'reviewer')
const seatOf = (p: Plan, id: string) => p.seats[id]?.at
const hood = (p: Plan, kind: string) => p.neighbourhoods.find(n => n.kind === kind)
const desksOf = (p: Plan) => p.neighbourhoods.flatMap(n => n.desks)
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Runs the plan through a sequence of frames. Each step is [desks, now]. */
function run(steps: [Identity[], number][], start?: Plan): Plan {
  let p = start
  for (const [desks, now] of steps) p = seatPlan(p, desks, now)
  return p!
}

describe('neighbourhoods', () => {
  it('3 builders and 2 reviewers form two neighbourhoods, builders first', () => {
    const p = seatPlan(undefined, [B('b1'), B('b2'), B('b3'), R('r1'), R('r2')], 0)
    expect(p.neighbourhoods.map(n => n.kind)).toEqual(['Builder', 'Reviewer'])
    const [b, r] = p.neighbourhoods
    expect(hit(b.rect, r.rect)).toBe(false)
    expect(p.neighbourhoods.map(n => n.slot)).toEqual([0, 1])
  })

  it('the Conductor sits in the meeting room', () => {
    const p = seatPlan(undefined, [agent('lead', '', { name: 'Main' }), B('b1')], 0)
    expect(p.seats.lead.slot).toBe('meeting')
    expect(hit(p.meetingRect, p.neighbourhoods[0].rect)).toBe(false)
  })
})

describe('stable seats', () => {
  it('a 4th builder does not move the others', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2'), B('b3'), R('r1'), R('r2')], 0)
    const p1 = seatPlan(p0, [B('b1'), B('b2'), B('b3'), B('b4'), R('r1'), R('r2')], 1000)
    for (const id of ['b1', 'b2', 'b3', 'r1', 'r2']) expect(seatOf(p1, id)).toEqual(seatOf(p0, id))
    expect(p1.seats.b4.slot).toBe(hood(p1, 'Builder')!.slot)
  })

  it('a joiner listed first does not move anyone', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2'), R('r1')], 0)
    const p1 = seatPlan(p0, [B('b0'), B('b1'), B('b2'), R('r1')], 1000)
    for (const id of ['b1', 'b2', 'r1']) expect(seatOf(p1, id)).toEqual(seatOf(p0, id))
  })

  it('removing builder 2 leaves its desk empty and the others in place', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2'), B('b3')], 0)
    const p1 = seatPlan(p0, [B('b1'), B('b3')], 1000)
    expect(p1.seats.b2).toBeUndefined()
    expect(seatOf(p1, 'b1')).toEqual(seatOf(p0, 'b1'))
    expect(seatOf(p1, 'b3')).toEqual(seatOf(p0, 'b3'))
    const old = seatOf(p0, 'b2')!
    const desk = desksOf(p1).find(d => d.rect.x + d.rect.w / 2 === old.x && d.rect.y + d.rect.h === old.y)!
    expect(desk.occupant).toBeNull()
  })

  it('a new builder takes the empty desk', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2'), B('b3')], 0)
    const p1 = seatPlan(p0, [B('b1'), B('b3')], 1000)
    const p2 = seatPlan(p1, [B('b1'), B('b3'), B('b4')], 2000)
    expect(seatOf(p2, 'b4')).toEqual(seatOf(p0, 'b2'))
  })

  it('a seat stays the same across many frames', () => {
    const desks = [B('b1'), R('r1'), B('b2')]
    const p = run(desks.map((_, i) => [desks, i * 100] as [Identity[], number]))
    expect(seatOf(p, 'b2')).toEqual(seatOf(seatPlan(undefined, desks, 0), 'b2'))
  })
})

describe('shrinking and emptying', () => {
  const three = [B('b1'), B('b2'), B('b3')]

  it('the last half-pod shrinks only after 60 s empty', () => {
    const p0 = seatPlan(undefined, three, 0)
    const p1 = seatPlan(p0, [B('b1'), B('b2')], 1000)
    expect(desksOf(p1)).toHaveLength(4)
    const p2 = seatPlan(p1, [B('b1'), B('b2')], 1000 + EMPTY_MS - 1)
    expect(desksOf(p2)).toHaveLength(4)
    const p3 = seatPlan(p2, [B('b1'), B('b2')], 1000 + EMPTY_MS)
    expect(desksOf(p3)).toHaveLength(2)
  })

  it('an empty half-pod at the front does not shrink while the last one is occupied', () => {
    const p0 = seatPlan(undefined, three, 0)
    const p1 = run([[[B('b3')], 1000], [[B('b3')], 1000 + 2 * EMPTY_MS]], p0)
    expect(desksOf(p1)).toHaveLength(4)
    expect(p1.neighbourhoods[0].desks.slice(0, 2).every(d => d.occupant === null)).toBe(true)
  })

  it('an empty neighbourhood disappears after 60 s', () => {
    const p0 = seatPlan(undefined, [B('b1')], 0)
    const p1 = seatPlan(p0, [], 1000)
    expect(p1.neighbourhoods).toHaveLength(1)
    const p2 = seatPlan(p1, [], 1000 + EMPTY_MS)
    expect(p2.neighbourhoods).toHaveLength(0)
  })
})

describe('walks', () => {
  it('no one walks in on the first frame', () => {
    const p = seatPlan(undefined, [B('b1')], 0)
    expect(p.moves).toEqual([])
  })

  it('a new agent walks in from the door', () => {
    const p0 = seatPlan(undefined, [B('b1')], 0)
    const p1 = seatPlan(p0, [B('b1'), B('b2')], 1000)
    const walk = p1.moves.find(m => m.id === 'b2')!
    expect(walk.kind).toBe('arrive')
    expect(walk.from).toEqual(DOOR)
    expect(walk.to).toEqual(seatOf(p1, 'b2'))
  })

  it('a leaving agent walks to the door and frees its desk', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2')], 0)
    const p1 = seatPlan(p0, [B('b1')], 1000)
    const walk = p1.moves.find(m => m.id === 'b2' && m.kind === 'leave')!
    expect(walk.to).toEqual(DOOR)
    expect(p1.seats.b2).toBeUndefined()
  })

  it('an agent marked gone leaves too', () => {
    const p0 = seatPlan(undefined, [B('b1'), B('b2')], 0)
    const p1 = seatPlan(p0, [B('b1'), agent('b2', 'general-purpose', { gone: true })], 1000)
    expect(p1.moves.some(m => m.id === 'b2' && m.kind === 'leave')).toBe(true)
    expect(p1.seats.b2).toBeUndefined()
  })

  it('walks are dropped after MOVE_MS', () => {
    const p0 = seatPlan(undefined, [B('b1')], 0)
    const p1 = seatPlan(p0, [B('b1'), B('b2')], 1000)
    const p2 = seatPlan(p1, [B('b1'), B('b2')], 1000 + 60_000)
    expect(p2.moves).toEqual([])
  })
})

describe('the plan for the scene', () => {
  const mixed: Identity[] = [
    agent('lead', '', { name: 'Main' }),
    ...Array.from({ length: 8 }, (_, i) => B(`b${i}`)),
    ...Array.from({ length: 6 }, (_, i) => R(`r${i}`)),
    ...Array.from({ length: 5 }, (_, i) => agent(`d${i}`, 'designer')),
    ...Array.from({ length: 4 }, (_, i) => agent(`x${i}`, 'Explore')),
    ...Array.from({ length: 3 }, (_, i) => agent(`p${i}`, 'Plan')),
    ...Array.from({ length: 2 }, (_, i) => agent(`o${i}`, 'statusline-setup')),
    agent('h0', '', { name: 'Ana' }),
  ]

  it('30 agents of mixed kinds fit with no overlapping rectangles', () => {
    expect(mixed).toHaveLength(30)
    const p = seatPlan(undefined, mixed, 0)
    const desks = desksOf(p).map(d => d.rect)
    for (let i = 0; i < desks.length; i++) for (let j = i + 1; j < desks.length; j++) {
      expect(hit(desks[i], desks[j]), `desks ${i} and ${j}`).toBe(false)
    }
    const hoods = p.neighbourhoods.map(n => n.rect)
    for (let i = 0; i < hoods.length; i++) {
      expect(hit(hoods[i], p.meetingRect)).toBe(false)
      expect(hit(hoods[i], p.lounge)).toBe(false)
      for (let j = i + 1; j < hoods.length; j++) expect(hit(hoods[i], hoods[j])).toBe(false)
    }
    expect(hit(p.meetingRect, p.lounge)).toBe(false)
  })

  it('every seat is occupied once, and each desk fits in the world size', () => {
    const p = seatPlan(undefined, mixed, 0)
    const occupants = desksOf(p).map(d => d.occupant).filter(Boolean)
    expect(new Set(occupants).size).toBe(occupants.length)
    expect(occupants.length + p.meeting.filter(Boolean).length).toBe(30)
    for (const d of desksOf(p)) {
      expect(d.rect.x + d.rect.w).toBeLessThanOrEqual(p.size.w)
      expect(d.rect.y + d.rect.h).toBeLessThanOrEqual(p.size.h)
    }
  })
})
