import { describe, expect, it } from 'vitest'
import { AmbientDirector, eligible, type Guarded, IDLE_GUARD_MS, mayJoinAmbient, rollScene, seeded } from './ambient'

const desk = (id: string, over: Partial<Guarded> = {}): Guarded => ({ id, working: false, ...over })
const LONG = IDLE_GUARD_MS + 1_000

describe('the idle guard', () => {
  it('admits an idle agent with nothing going on', () => {
    expect(mayJoinAmbient(desk('a'), LONG)).toBe(true)
  })
  it('refuses a working agent', () => {
    expect(mayJoinAmbient(desk('a', { working: true }), LONG)).toBe(false)
  })
  it('refuses an agent with a task', () => {
    expect(mayJoinAmbient(desk('a', { task: 'T1' }), LONG)).toBe(false)
  })
  it('refuses an agent with an alert', () => {
    expect(mayJoinAmbient(desk('a', { alert: { kind: 'quiet', text: '' } }), LONG)).toBe(false)
  })
  it('refuses an agent idle for only 90 s or less', () => {
    expect(mayJoinAmbient(desk('a'), IDLE_GUARD_MS)).toBe(false)
  })
  it('a scene needs its own idle threshold too (coffee: 3 min)', () => {
    expect(eligible('coffee', 179_000)).toBe(false)
    expect(eligible('coffee', 180_000)).toBe(true)
  })
})

describe('AmbientDirector', () => {
  const idle = () => LONG

  it('starts a scene for idle members', () => {
    const dir = new AmbientDirector()
    expect(dir.start('lounge', [desk('a'), desk('b')], idle)).toBe(true)
    expect(dir.active).toBe('lounge')
  })
  it('refuses to start when any member is working', () => {
    const dir = new AmbientDirector()
    expect(dir.start('lounge', [desk('a'), desk('b', { working: true })], idle)).toBe(false)
    expect(dir.active).toBeUndefined()
  })
  it('allows at most one scene at a time', () => {
    const dir = new AmbientDirector()
    expect(dir.start('stretch', [desk('a')], idle)).toBe(true)
    expect(dir.start('plant', [desk('b')], idle)).toBe(false)
    expect(dir.active).toBe('stretch')
  })
  it('a member getting a task cancels the scene', () => {
    const dir = new AmbientDirector()
    dir.start('pingpong', [desk('a'), desk('b')], idle)
    dir.review([desk('a', { task: 'T9' }), desk('b')], idle)
    expect(dir.active).toBeUndefined()
  })
  it('a member getting an alert cancels the scene', () => {
    const dir = new AmbientDirector()
    dir.start('pingpong', [desk('a'), desk('b')], idle)
    dir.review([desk('a'), desk('b', { alert: { kind: 'loop', text: '' } })], idle)
    expect(dir.active).toBeUndefined()
  })
  it('a member that left cancels the scene', () => {
    const dir = new AmbientDirector()
    dir.start('pingpong', [desk('a'), desk('b')], idle)
    dir.review([desk('a')], idle)
    expect(dir.active).toBeUndefined()
  })
  it('a scene that stays valid keeps running', () => {
    const dir = new AmbientDirector()
    dir.start('pingpong', [desk('a'), desk('b')], idle)
    dir.review([desk('a'), desk('b')], idle)
    expect(dir.active).toBe('pingpong')
  })
})

describe('ambient dice', () => {
  it('the same seed gives the same rolls', () => {
    const a = seeded(42)
    const b = seeded(42)
    const ra = Array.from({ length: 50 }, () => rollScene('coffee', a))
    const rb = Array.from({ length: 50 }, () => rollScene('coffee', b))
    expect(ra).toEqual(rb)
  })
  it('a different seed gives different rolls', () => {
    const a = Array.from({ length: 20 }, seeded(1))
    const b = Array.from({ length: 20 }, seeded(2))
    expect(a).not.toEqual(b)
  })
  it('the rolls stay in [0, 1)', () => {
    const r = seeded(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('deterministic scenes always fire once eligible', () => {
    expect(rollScene('plant', () => 0.999999)).toBe(true)
    expect(rollScene('stretch', () => 0.999999)).toBe(true)
  })
  it('a 1-in-10 scene fires about one time in ten with the seed', () => {
    const r = seeded(123)
    const hits = Array.from({ length: 10_000 }, () => rollScene('coffee', r)).filter(Boolean).length
    expect(hits).toBeGreaterThan(800)
    expect(hits).toBeLessThan(1200)
  })
})
