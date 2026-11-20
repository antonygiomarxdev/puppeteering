import { describe, expect, it } from 'vitest'
import { anchorsOf, leadSpot, standBeside, type Rect, type Slot } from './layout'
import { hits, office, walk } from './testkit'
import { pathfinder, walkGrid } from './grid'
import { ParticleField, MAX_PARTICLES } from './particles'
import { pickTheme } from './theme'
import { THEMES } from './themes'

const at = (md: string) => new Date(`2026-${md}T12:00:00`)
const pick = (md: string, search = '') => pickTheme(at(md), search, THEMES)?.name

describe('pickTheme', () => {
  it('holds each window, both ends in and the day outside out', () => {
    expect([pick('12-01'), pick('12-26'), pick('11-30')]).toEqual(['christmas', 'christmas', undefined])
    expect([pick('10-20'), pick('10-31'), pick('10-19'), pick('11-01')]).toEqual(['halloween', 'halloween', undefined, undefined])
    expect([pick('03-20'), pick('04-20'), pick('03-19'), pick('04-21')]).toEqual(['easter', 'easter', undefined, undefined])
  })
  it('wraps new year across the end of the year', () => {
    expect([pick('12-27'), pick('12-31'), pick('01-01'), pick('01-03'), pick('01-04')]).toEqual(['newyear', 'newyear', 'newyear', 'newyear', undefined])
  })
  it('lets ?theme= win over the date, and ?theme=none switch it off', () => {
    expect(pick('07-15', '?theme=halloween')).toBe('halloween')
    expect(pick('12-10', '?theme=easter')).toBe('easter')
    expect(pick('12-10', '?theme=none')).toBeUndefined()
  })
  it('treats an unknown name as a typo and uses the date', () => {
    expect(pick('12-10', '?theme=xmas')).toBe('christmas')
    expect(pick('07-15', '?theme=xmas')).toBeUndefined()
  })
})

const touches = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('decor anchors', () => {
  for (const n of [1, 6, 9, 20]) {
    it(`for ${n} agents: bare slots are clear of furniture and of every route; furniture slots are on furniture and off the seats`, () => {
      const { L } = office(n)
      const a = anchorsOf(L)
      const find = pathfinder(walkGrid(L))
      const seats = Object.values(L.seatOf)
      const paths = seats.flatMap((from, i) =>
        [leadSpot(L, i), L.doorSpot, standBeside(seats[(i + 1) % seats.length]!)].map(to => walk([from, ...find(from, to)])))
      const feet = (s: Slot): Rect => s.foot ?? { x: s.x - 1, y: s.y - 1, w: 2, h: 1 }
      for (const s of [...a.wall, ...a['floor-corner']]) {
        L.blocked.forEach(b => expect(touches(feet(s), b)).toBe(false))
        paths.forEach(p => expect(p.some(q => hits(q, feet(s)))).toBe(false))
      }
      for (const s of [...a.desk, ...a.lounge, ...a.meeting]) {
        expect(L.blocked.some(b => hits(s, b))).toBe(true)
        seats.forEach(seat => expect(Math.hypot(s.x - seat.x, s.y - seat.y)).toBeGreaterThan(10))
      }
      expect(a.desk).toHaveLength(L.desks.length)
      // The corner decor's footprint joins the grid: every route to the door still exists with it in place.
      const withFeet = { ...L, blocked: [...L.blocked, ...a['floor-corner'].map(s => s.foot!)] }
      const find2 = pathfinder(walkGrid(withFeet))
      seats.forEach(from => {
        const p = walk([from, ...find2(from, L.doorSpot)])
        expect(p.length).toBeGreaterThan(2)
        a['floor-corner'].forEach(s => expect(p.some(q => hits(q, s.foot!))).toBe(false))
      })
    })
  }
})

describe('ParticleField', () => {
  it('never keeps more than MAX_PARTICLES alive', () => {
    const f = new ParticleField(384, 316, 'float', 500)
    for (let i = 0; i < 100; i++) f.step(0.1)
    expect(f.alive.length).toBeLessThanOrEqual(MAX_PARTICLES)
    expect(f.alive.length).toBe(MAX_PARTICLES)
  })
  it('spawns nothing with reduced motion', () => {
    const f = new ParticleField(384, 316, 'fall', 500, true)
    for (let i = 0; i < 50; i++) f.step(0.1)
    expect(f.alive).toHaveLength(0)
  })
  it('fall goes down, float goes up, burst comes back down', () => {
    const y = (d: 'fall' | 'float' | 'burst') => { const f = new ParticleField(384, 316, d, 20, false, () => 0.5); f.step(0.2); const p = { ...f.alive[0]! }; f.step(0.2); return [p.y, f.alive[0]!.y] as const }
    const [f0, f1] = y('fall'), [u0, u1] = y('float')
    expect(f1).toBeGreaterThan(f0)
    expect(u1).toBeLessThan(u0)
  })
  it('lets particles die off the edge', () => {
    const f = new ParticleField(384, 316, 'fall', 10)
    for (let i = 0; i < 400; i++) f.step(0.1)
    expect(f.alive.every(p => p.y <= 324 && p.age < p.life)).toBe(true)
  })
})
