import { describe, expect, it } from 'vitest'
import { updateRoster } from './roster'
import { fnv1a, isShiny } from './shiny'
import type { Agent, Report } from './types'
import { showsBang, WAKE_MS } from './wake'
import { idle, Walkers } from './walkers'

// A stub pathfinder: straight to the target. Seats are 100 apart on a row, the lead is at the origin.
const seatX = (id: string) => ({ a: 100, b: 200, c: 300 }[id] ?? 400)
const world = () =>
  new Walkers((_from, to) => [to], {
    seat: id => ({ x: seatX(id), y: 0 }),
    lead: () => ({ x: 0, y: 50 }),
    stand: peer => ({ x: seatX(peer) + 20, y: 50 }),
  })

const agent = (id: string, report?: Report, sleeping = false): Agent => ({ id, name: id, sleeping, report })
const report = (at: number, text: string, to?: string): Report => ({ at, text, to })

// Runs frames of 0.1s. Returns the clock.
function run(w: Walkers, agents: () => Agent[], seconds: number, start = 0) {
  let now = start
  for (let i = 0; i < seconds * 10; i++) { now += 100; w.tick(agents(), 0.1, now) }
  return now
}

describe('visits', () => {
  it('wait for a peer who is away', () => {
    const w = world()
    w.tick([agent('b'), agent('a')], 0.1, 0) // first frame: no one has anything old to say
    // b is processed first, so it leaves for the lead before a looks at it.
    const both = [agent('b', report(1, 'to lead'), true), agent('a', report(1, 'hi b', 'b'))]
    w.tick(both, 0.1, 100)
    expect(w.all.get('b')!.mode).toBe('walk')
    expect(w.all.get('a')!.mode).toBe('sit')
    expect(w.all.get('a')!.queue).toHaveLength(1)
    run(w, () => both, 30, 100)
    expect(w.all.get('a')!.queue).toHaveLength(0) // it went once b sat again
    expect(idle(w.all.get('b')!)).toBe(true)
  })

  it('keep the peer at its desk while visited', () => {
    const w = world()
    let list = [agent('a'), agent('b')]
    w.tick(list, 0.1, 0)
    list = [agent('a', report(1, 'hi b', 'b')), agent('b')]
    w.tick(list, 0.1, 100)
    expect(w.all.get('a')!.to).toBe('b')
    list = [agent('a', report(1, 'hi b', 'b')), agent('b', report(1, 'to lead'))]
    w.tick(list, 0.1, 200)
    expect(w.all.get('b')!.mode).toBe('sit') // b has a report queued, but a is visiting
    expect(w.all.get('b')!.queue).toHaveLength(1)
    run(w, () => list, 30, 200)
    expect(w.all.get('b')!.queue).toHaveLength(0) // it left once a was home
  })

  it('talk about 6s at the target, then walk home by the reversed route', () => {
    const w = world()
    const list = () => [agent('a', report(1, 'hi'))]
    w.tick([agent('a')], 0.1, 0)
    let now = 100
    w.tick(list(), 0.1, now)
    const a = w.all.get('a')!
    while (a.mode !== 'talk') { now += 100; w.tick(list(), 0.1, now) } // arrives
    expect(a.talk).toBeGreaterThan(5.5)
    now = run(w, list, 5.5, now)
    expect(a.mode).toBe('talk') // still talking before 6s
    now = run(w, list, 1, now)
    expect(a.mode).toBe('walk') // then home, the route reversed
    now = run(w, list, 5, now)
    expect(idle(a)).toBe(true)
    expect({ x: a.x, y: a.y }).toEqual({ x: 100, y: 0 })
  })
})

describe('queue', () => {
  it('runs two reports in order', () => {
    const w = world()
    w.tick([agent('a')], 0.1, 0)
    const told: string[] = []
    let now = 100
    let r = report(1, 'first')
    w.tick([agent('a', r)], 0.1, now)
    r = report(2, 'second')
    for (let i = 0; i < 400; i++) {
      now += 100
      w.tick([agent('a', i === 5 ? r : i < 5 ? report(1, 'first') : r)], 0.1, now)
      const a = w.all.get('a')!
      if (a.mode === 'talk' && told.at(-1) !== a.text) told.push(a.text)
    }
    expect(told).toEqual(['first', 'second'])
  })
})

describe('ghosts', () => {
  it('stay until back at the desk with nothing queued', () => {
    const w = world()
    const known = new Map<string, Agent>()
    const seatedA = agent('a')
    let roster = updateRoster(known, [seatedA], w.settled)
    w.tick(roster, 0.1, 0)
    const reporting = agent('a', report(1, 'bye'))
    roster = updateRoster(known, [reporting], w.settled)
    w.tick(roster, 0.1, 100)
    // a left the team while it walks
    let now = 100
    for (let i = 0; i < 20; i++) {
      now += 100
      roster = updateRoster(known, [], w.settled)
      w.tick(roster, 0.1, now)
    }
    expect(roster.map(a => a.id)).toEqual(['a'])
    for (let i = 0; i < 200; i++) {
      now += 100
      roster = updateRoster(known, [], w.settled)
      w.tick(roster, 0.1, now)
    }
    expect(roster).toEqual([])
  })

  it('go at once when they never walked', () => {
    const w = world()
    const known = new Map<string, Agent>()
    updateRoster(known, [agent('a')], w.settled)
    expect(updateRoster(known, [], w.settled)).toEqual([])
  })
})

describe('sleep and wake', () => {
  it('wakes on a report, shows "!" for 1.5s, then sleeps again', () => {
    const w = world()
    const asleep = (r?: Report) => [agent('a', r, true)]
    w.tick(asleep(), 0.1, 0)
    expect(w.all.get('a')!.asleep).toBe(true)
    expect(showsBang(w.all.get('a')!, 0)).toBe(false) // asleep from the start: no "!"
    w.tick(asleep(report(1, 'hello')), 0.1, 1000)
    const a = w.all.get('a')!
    expect(a.asleep).toBe(false)
    expect(a.wakeAt).toBe(1000 + WAKE_MS)
    expect(showsBang(a, 2000)).toBe(true)
    expect(showsBang(a, 2600)).toBe(false)
    run(w, () => asleep(report(1, 'hello')), 30, 1000)
    expect(a.asleep).toBe(true)
  })
})

describe('shiny', () => {
  it('has the FNV-1a 32-bit test vectors', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
  })

  it('is about 1 in 4096 over 409600 ids', () => {
    let s = 12345 // mulberry32: deterministic "random" ids
    const next = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    let n = 0
    for (let i = 0; i < 409600; i++) if (isShiny(`${next().toString(36)}${next().toString(36)}`)) n++
    expect(n).toBeGreaterThan(60)
    expect(n).toBeLessThan(140)
  })

  it('is forced by ?shiny=all', () => {
    const id = 'a'
    expect(isShiny(id)).toBe(false)
    expect(isShiny(id, '?shiny=all')).toBe(true)
  })
})
