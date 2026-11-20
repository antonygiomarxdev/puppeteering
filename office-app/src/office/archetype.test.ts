import { describe, expect, it } from 'vitest'
import { archetypeOf, COSTUME, PERSONALITY, PROP, variantOf, WALK, type Archetype, type Identity } from './archetype'
import { fnv1a } from './shiny'

const d = (over: Partial<Identity> & { name: string }): Identity => ({
  id: 'x', status: '', working: false, sleeping: false, doing: '', ...over,
})

describe('archetypeOf: type first', () => {
  it('a type beats a keyword in the name (Builder named ui-fixer is a Builder)', () => {
    expect(archetypeOf(d({ id: 'a', name: 'ui-fixer', type: 'general-purpose' }))).toBe('Builder')
  })
  it('a type beats the description', () => {
    expect(archetypeOf(d({ id: 'a', name: 'Ana', type: 'reviewer', description: 'Builder. Fix it' }))).toBe('Reviewer')
  })
  it('maps each type in the table', () => {
    const cases: [string, Archetype][] = [
      ['builder', 'Builder'], ['designer', 'Designer'], ['reviewer', 'Reviewer'],
      ['researcher', 'Researcher'], ['Explore', 'Researcher'], ['Plan', 'Planner'], ['architect', 'Planner'],
      ['statusline-setup', 'Ops'], ['render-worker', 'Ops'],
    ]
    for (const [type, arch] of cases) expect(archetypeOf(d({ id: 'a', name: 'Ana', type }))).toBe(arch)
  })
  it('id lead is the Conductor', () => {
    expect(archetypeOf(d({ id: 'lead', name: 'Main' }))).toBe('Conductor')
  })
})

describe('archetypeOf: keywords in the name, then the description', () => {
  it('a whole-word keyword in the name matches, case-insensitively', () => {
    expect(archetypeOf(d({ id: 'a', name: 'QA-Bot' }))).toBe('Reviewer')
  })
  it('a keyword inside a longer word does not match (artist is not art)', () => {
    expect(archetypeOf(d({ id: 'a', name: 'artist' }))).toBe('Helper')
  })
  it('a keyword in the description matches when the name has none', () => {
    expect(archetypeOf(d({ id: 'a', name: 'Ana', description: 'Builder. Fix the bugs' }))).toBe('Builder')
  })
  it('the name is searched before the description', () => {
    expect(archetypeOf(d({ id: 'a', name: 'Test runner', description: 'Builder. Fix' }))).toBe('Reviewer')
  })
  it('two hits: the one nearer the start of the name wins', () => {
    expect(archetypeOf(d({ id: 'a', name: 'review then build' }))).toBe('Reviewer')
    expect(archetypeOf(d({ id: 'a', name: 'build the review' }))).toBe('Builder')
  })
  it('a longer phrase at the same place wins: build pipeline is Ops, not Builder', () => {
    expect(archetypeOf(d({ id: 'a', name: 'build pipeline' }))).toBe('Ops')
  })
  it('design doc is Planner, not Designer', () => {
    expect(archetypeOf(d({ id: 'a', name: 'design doc writer' }))).toBe('Planner')
  })
  it('role words in the description match (Reviewer. ...)', () => {
    expect(archetypeOf(d({ id: 'a', name: 'Ana', description: 'Reviewer. Check the diff' }))).toBe('Reviewer')
  })
  it('no keyword anywhere falls back to Helper', () => {
    expect(archetypeOf(d({ id: 'a', name: 'Ana', description: 'Says hello' }))).toBe('Helper')
  })
})

describe('variantOf and the data tables', () => {
  it('variant is fnv1a(id) % 3, stable across calls', () => {
    for (const id of ['a', 'b', 'worker-7', 'lead']) {
      expect(variantOf(id)).toBe(fnv1a(id) % 3)
      expect(variantOf(id)).toBe(variantOf(id))
    }
  })
  it('every archetype has a costume, prop, walk and three personalities', () => {
    const all: Archetype[] = ['Conductor', 'Builder', 'Designer', 'Reviewer', 'Researcher', 'Planner', 'Ops', 'Helper']
    for (const a of all) {
      expect(COSTUME[a]).toBeTruthy()
      expect(PROP[a]).toBeTruthy()
      expect(WALK[a]).toBeTruthy()
      expect(PERSONALITY[a]).toHaveLength(3)
      for (const p of PERSONALITY[a]) expect(p.phrases.length).toBeGreaterThan(0)
    }
  })
})
