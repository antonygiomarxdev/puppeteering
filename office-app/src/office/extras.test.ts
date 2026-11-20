import { describe, expect, it } from 'vitest'
import { seeded } from './ambient'
import { BEHIND, type ExtraKind, ExtrasDirector, extrasFor, TILE, type World } from './extras'

const seatA = { x: 100, y: 200 }
const seatB = { x: 300, y: 200 }
const seatC = { x: 500, y: 200 }

const world = (over: Partial<World> = {}): World => ({
  spots: {
    coffee: { x: 600, y: 100 },
    vending: { x: 700, y: 100 },
    lead: { x: 0, y: 300 },
    corner: { x: -100, y: 0 },
    aisles: [{ x: 100, y: 500 }, { x: 200, y: 500 }, { x: 300, y: 500 }, { x: 400, y: 500 }],
  },
  agents: [
    { id: 'a', seat: seatA, working: true },
    { id: 'b', seat: seatB, working: true },
    { id: 'c', seat: seatC, working: false },
  ],
  leadCelebrating: false,
  ...over,
})

/** Runs the director from `from` to `to` in `step` ms, and calls `each` after every tick. */
function simulate(
  d: ExtrasDirector,
  w: World,
  from: number,
  to: number,
  step: number,
  rand: () => number,
  each: (views: ReturnType<ExtrasDirector['tick']>, t: number) => void,
) {
  for (let t = from; t <= to; t += step) each(d.tick(w, t, rand), t)
}

describe('how many extras, and which', () => {
  it('2 extras for 0 agents, 3 for 4, 4 for 9', () => {
    expect(extrasFor(0, '', 'key')).toHaveLength(2)
    expect(extrasFor(4, '', 'key')).toHaveLength(3)
    expect(extrasFor(9, '', 'key')).toHaveLength(4)
  })

  it('always includes hr and pet', () => {
    for (const n of [0, 4, 9]) {
      const kinds = extrasFor(n, '', 'key')
      expect(kinds).toContain('hr')
      expect(kinds).toContain('pet')
    }
  })

  it('?extras=off shows none', () => {
    expect(extrasFor(9, '?extras=off', 'key')).toEqual([])
    expect(extrasFor(9, '?extras=on', 'key')).toHaveLength(4)
  })

  it('the same session key gives the same extras, in the same order', () => {
    expect(extrasFor(9, '', 'session-1')).toEqual(extrasFor(9, '', 'session-1'))
  })
})

describe('HR', () => {
  it('never notes the same agent twice in a row', () => {
    const d = new ExtrasDirector(['hr'])
    const w = world()
    const rand = seeded(11)
    const notes: { x: number; y: number }[] = []
    let noting = false
    simulate(d, w, 0, 10 * 60_000, 500, rand, views => {
      const v = views[0]
      if (v.pose === 'note' && !noting) notes.push(v.target)
      noting = v.pose === 'note'
    })
    expect(notes.length).toBeGreaterThan(5)
    for (let i = 1; i < notes.length; i++) expect(notes[i]).not.toEqual(notes[i - 1])
  })

  it('stands behind a working agent while noting', () => {
    const d = new ExtrasDirector(['hr'])
    const w = world()
    const rand = seeded(3)
    let found = false
    simulate(d, w, 0, 60_000, 500, rand, views => {
      const v = views[0]
      if (v.pose === 'note') {
        found = true
        expect([{ x: seatA.x, y: seatA.y - BEHIND }, { x: seatB.x, y: seatB.y - BEHIND }]).toContainEqual(v.target)
      }
    })
    expect(found).toBe(true)
  })
})

describe('IT', () => {
  it('visits once per error', () => {
    const d = new ExtrasDirector(['it'])
    const w = world({ agents: [{ id: 'a', seat: seatA, working: true, lastError: { at: 1000, text: 'x' } }] })
    const rand = seeded(5)
    let shrugs = 0
    let last: string | undefined
    const count = (from: number, to: number) => simulate(d, w, from, to, 500, rand, views => {
      const pose = views[0].pose
      if (pose === 'shrug' && last !== 'shrug') shrugs++
      last = pose
    })
    count(0, 120_000)
    expect(shrugs).toBe(1)
    count(120_500, 240_000)
    expect(shrugs).toBe(1)
  })

  it('a new error gets its own visit', () => {
    const d = new ExtrasDirector(['it'])
    const w = world({ agents: [{ id: 'a', seat: seatA, working: true, lastError: { at: 1000, text: 'x' } }] })
    const rand = seeded(5)
    let shrugs = 0
    let last: string | undefined
    const step = (from: number, to: number) => simulate(d, w, from, to, 500, rand, views => {
      const pose = views[0].pose
      if (pose === 'shrug' && last !== 'shrug') shrugs++
      last = pose
    })
    step(0, 60_000)
    w.agents[1] = { id: 'b', seat: seatB, working: true, lastError: { at: 70_000, text: 'y' } }
    step(60_500, 120_000)
    expect(shrugs).toBe(2)
  })
})

describe('pet', () => {
  it('trails the lead two tiles behind', () => {
    const d = new ExtrasDirector(['pet'])
    const w = world()
    const v = d.tick(w, 0, seeded(1))[0]
    expect(v.target).toEqual({ x: w.spots.lead.x - 2 * TILE, y: w.spots.lead.y })
    w.spots.lead = { x: 320, y: 300 }
    const v2 = d.tick(w, 1000, seeded(1))[0]
    expect(v2.target).toEqual({ x: 320 - 2 * TILE, y: 300 })
  })

  it('claps when the lead is celebrating', () => {
    const d = new ExtrasDirector(['pet'])
    expect(d.tick(world({ leadCelebrating: true }), 0, seeded(1))[0].pose).toBe('clap')
    expect(d.tick(world({ leadCelebrating: false }), 1000, seeded(1))[0].pose).toBe('idle')
  })
})

describe('placement', () => {
  it('no target lands on a seat or the lead spot, with every kind on', () => {
    const kinds: ExtraKind[] = ['hr', 'pet', 'intern', 'vending', 'it']
    const d = new ExtrasDirector(kinds)
    const w = world({ agents: [
      { id: 'a', seat: seatA, working: true, lastError: { at: 1000, text: 'x' } },
      { id: 'b', seat: seatB, working: true, target: seatA },
      { id: 'c', seat: seatC, working: false },
    ] })
    const seats = [seatA, seatB, seatC, w.spots.lead]
    simulate(d, w, 0, 180_000, 500, seeded(9), views => {
      for (const v of views) for (const s of seats) expect(v.target).not.toEqual(s)
    })
  })

  it('an extra steps aside from a real agent\'s target', () => {
    const d = new ExtrasDirector(['vending'])
    const vending = world().spots.vending
    const w = world({ agents: [{ id: 'a', seat: seatA, working: true, target: vending }] })
    const v = d.tick(w, 0, seeded(2))[0]
    expect(v.target).not.toEqual(vending)
    expect(w.spots.aisles).toContainEqual(v.target)
  })

  it('every view is marked extra and carries no name', () => {
    const d = new ExtrasDirector(['hr', 'pet'])
    for (const v of d.tick(world(), 0, seeded(1))) {
      expect(v.extra).toBe(true)
      expect(v).not.toHaveProperty('name')
    }
  })
})

describe('seeds', () => {
  it('the same seed gives the same extras movement', () => {
    const run = (seed: number) => {
      const d = new ExtrasDirector(['hr', 'intern', 'vending'])
      const out: unknown[] = []
      simulate(d, world(), 0, 60_000, 1000, seeded(seed), views => out.push(views))
      return out
    }
    expect(run(4)).toEqual(run(4))
  })
})
