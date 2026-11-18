import { describe, expect, it } from 'vitest'
import { seatPlan } from '../office/seats'
import { layoutOf, OX, OY, toScene, toWorld, windowsOf } from './layout'
import { hits, inside, office, overlap, team } from './testkit'
import { fitZoom } from './view'

describe('toScene / toWorld', () => {
  it('shift by the same margins and undo each other', () => {
    const p = { x: 120, y: 48 }
    expect(toScene(p)).toEqual({ x: 120 + OX, y: 48 + OY })
    expect(toWorld(toScene(p))).toEqual(p)
  })
})

describe('layoutOf(plan)', () => {
  for (const n of [0, 1, 6, 9, 20]) {
    it(`for ${n} agents: every agent sits at a seat on the floor, apart, and no furniture stands on a seat`, () => {
      const { plan, L } = office(n)
      expect(Object.keys(L.seatOf).sort()).toEqual(team(n).map(a => a.id).sort())
      const seats = Object.values(L.seatOf)
      seats.forEach((s, i) => {
        expect(hits(s, L.floor) || (s.x >= L.floor.x && s.y >= L.floor.y)).toBe(true)
        expect(L.blocked.some(b => hits(s, b))).toBe(false)
        seats.slice(i + 1).forEach(o => expect(Math.hypot(s.x - o.x, s.y - o.y)).toBeGreaterThan(20))
      })
      // Meeting-room seats are the plan's seats, shifted; a desk's occupant sits at that desk's seat.
      for (const [id, seat] of Object.entries(plan.seats)) if (seat.slot === 'meeting') expect(L.seatOf[id]).toEqual(toScene(seat.at))
      for (const d of L.desks) if (d.occupant) expect(L.seatOf[d.occupant]).toEqual(d.seat)
    })

    it(`for ${n} agents: desks and furniture never overlap, and all of it is inside the scene`, () => {
      const { L } = office(n)
      L.blocked.forEach((b, i) => {
        expect(inside(b, { x: 0, y: 0, w: L.W, h: L.H })).toBe(true)
        expect(inside(b, L.floor)).toBe(true)
        L.blocked.slice(i + 1).forEach(o => expect(overlap(b, o)).toBe(false))
      })
    })
  }

  it('puts one door in the left wall with open floor in front of it', () => {
    const { L } = office(6)
    expect(L.door.x).toBeLessThan(L.floor.x)
    expect(L.door.y + L.door.h).toBeLessThan(L.floor.y + L.floor.h)
    expect(L.blocked.some(b => hits(L.doorSpot, b))).toBe(false)
    expect(L.doorSpot.x).toBeGreaterThan(L.floor.x)
  })

  it('fits the windows on the back wall', () => {
    const { L } = office(20)
    const xs = windowsOf(L)
    expect(xs.length).toBeGreaterThan(4)
    expect(xs.at(-1)! + 56).toBeLessThanOrEqual(L.floor.x + L.floor.w)
  })

  it('never moves a seat when someone joins or leaves, and keeps the signature', () => {
    const first = seatPlan(undefined, team(9), 0)
    const before = layoutOf(first)
    const left = seatPlan(first, team(9).filter(a => a.id !== 'a3'), 1000)
    const after = layoutOf(left)
    for (const a of team(9)) if (a.id !== 'a3') expect(after.seatOf[a.id]).toEqual(before.seatOf[a.id])
    expect(after.seatOf['a3']).toBeUndefined()
    expect(after.sig).toBe(before.sig)
    expect(after.desks.find(d => d.occupant === 'a3')).toBeUndefined()
    // A newcomer takes a free desk and nobody else moves.
    const joined = layoutOf(seatPlan(left, [...team(9).filter(a => a.id !== 'a3'), { id: 'z', name: 'builder-z', type: 'builder' }], 2000))
    for (const a of team(9)) if (a.id !== 'a3') expect(joined.seatOf[a.id]).toEqual(before.seatOf[a.id])
    expect(joined.seatOf['z']).toBeDefined()
  })

  it('shows empty desks as slots with no occupant', () => {
    const { L } = office(3)
    expect(L.desks.some(d => d.occupant === null)).toBe(true)
    expect(L.desks.filter(d => d.occupant).length).toBe(3)
  })

  // The page is 1500x1000 with a 340 px panel on the right and a 40 px header: the office has what is left.
  const STAGE = { w: 1120, h: 940 }
  it('shows 6 agents of mixed kinds whole at zoom 2 or more, so costumes read', () => {
    const { L } = office(6)
    expect(fitZoom(STAGE.w, STAGE.h, L.W, L.H)).toBeGreaterThanOrEqual(2)
    expect(L.W * 2).toBeLessThanOrEqual(STAGE.w)
    expect(L.H * 2).toBeLessThanOrEqual(STAGE.h)
  })

  it('keeps 20 agents at zoom 1 or more, and the floor roughly 3:2 at 6', () => {
    const big = office(20).L
    expect(fitZoom(STAGE.w, STAGE.h, big.W, big.H)).toBeGreaterThanOrEqual(1)
    const six = office(6).L
    expect(six.W / six.H).toBeGreaterThan(1)
    expect(six.W / six.H).toBeLessThan(1.8)
  })
})
