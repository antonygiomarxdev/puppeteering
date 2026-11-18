import { describe, expect, it } from 'vitest'
import critter from '../../public/assets/sprites/critter.json'
import { seeded } from '../office/ambient'
import { ExtrasDirector, extrasFor } from '../office/extras'
import { spotsOf } from './layout'
import { bareOf, extraFrame, type ExtraPose } from './pose'
import { hits, inside, office } from './testkit'

const POSES: ExtraPose[] = ['walk', 'idle', 'note', 'clap', 'shake', 'shrug', 'carry']
const frames = new Set(Object.keys(critter.frames))

describe('spotsOf', () => {
  for (const n of [0, 1, 6, 20]) {
    it(`for ${n} agents gives open floor to stand on, and at least one aisle`, () => {
      const { L } = office(n)
      const s = spotsOf(L)
      expect(s.aisles.length).toBeGreaterThan(0)
      for (const p of [s.coffee, s.vending, s.lead, s.corner, ...s.aisles]) {
        expect(inside({ x: p.x, y: p.y, w: 1, h: 1 }, L.floor), JSON.stringify(p)).toBe(true)
        expect(L.blocked.some(b => hits(p, b)), `on furniture: ${JSON.stringify(p)}`).toBe(false)
      }
    })
  }
})

describe('extraFrame', () => {
  it('names a real critter frame, bare or not, for every pose, moving or at rest, facing any way', () => {
    for (const pose of POSES) for (const moving of [true, false]) for (const facing of ['up', 'down', 'left', 'right'] as const) for (const time of [0, 100, 300, 5000]) {
      const f = extraFrame(pose, moving, facing, time, 3)
      expect(frames.has(f.frame), `${pose}/${moving}/${facing}: ${f.frame}`).toBe(true)
      expect(frames.has(bareOf(f.frame)), `bare ${f.frame}`).toBe(true)
    }
  })
  it('walks whatever the pose when moving, and flips for right', () => {
    expect(extraFrame('note', true, 'right', 0)).toMatchObject({ frame: 'walk-left-0', flip: true })
    expect(extraFrame('note', false, 'right', 0).flip).toBe(false)
  })
  it('shakes sideways only for the vending machine pose', () => {
    expect(Math.abs(extraFrame('shake', false, 'down', 0).dx)).toBe(1)
    expect(extraFrame('idle', false, 'down', 0).dx).toBe(0)
  })
})

describe('the director on the scene’s spots', () => {
  it('keeps every extra on the floor and off every seat, for 2 minutes of ticks', () => {
    const { L } = office(6)
    const spots = spotsOf(L)
    const seats = Object.entries(L.seatOf).map(([id, seat]) => ({ id, seat, working: id !== 'a5' }))
    const kinds = extrasFor(6, '', 'session')
    expect(kinds.length).toBe(3)
    const d = new ExtrasDirector(kinds)
    const rand = seeded(1)
    for (let now = 0; now < 120_000; now += 500) {
      for (const v of d.tick({ spots, agents: seats, leadCelebrating: now > 60_000 }, now, rand)) {
        expect(v.target.x).toBeGreaterThan(L.floor.x - 40)
        expect(v.target.x).toBeLessThan(L.floor.x + L.floor.w)
        expect(v.target.y).toBeGreaterThan(0)
        expect(v.target.y).toBeLessThan(L.H)
        expect(seats.some(s => s.seat.x === v.target.x && s.seat.y === v.target.y)).toBe(false)
      }
    }
  })
  it('is empty with ?extras=off', () => expect(extrasFor(6, '?extras=off', 'session')).toEqual([]))
})
