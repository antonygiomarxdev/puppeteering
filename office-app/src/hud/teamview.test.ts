import { describe, expect, it } from 'vitest'
import { actionPhrase, elapsed, sortCards, type Card } from './teamview'

const card = (id: string, o: Partial<Card> = {}): Card =>
  ({ id, name: id, role: '', lead: false, working: false, sleeping: false, doing: '', extras: {}, ...o })

describe('sortCards', () => {
  const now = 1_000_000
  it('problems first, then working, idle, sleeping; stable inside a group', () => {
    const cards = [
      card('sleep', { sleeping: true }),
      card('idle'),
      card('w1', { working: true }),
      card('blocked', { blockedBy: ['3'] }),
      card('stuck', { alert: { kind: 'stuck', text: 'stuck 3m' } }),
      card('w2', { working: true }),
      card('err', { lastError: { at: now - 1000, text: 'boom' } }),
    ]
    expect(sortCards(cards, now).map(c => c.id)).toEqual(['blocked', 'stuck', 'err', 'w1', 'w2', 'idle', 'sleep'])
  })
  it('an old error is not a problem', () => {
    const old = card('old', { working: true, lastError: { at: now - 11 * 60_000, text: 'x' } })
    expect(sortCards([card('idle'), old], now).map(c => c.id)).toEqual(['old', 'idle'])
  })
})

describe('actionPhrase', () => {
  it('maps kind and doing', () => {
    expect(actionPhrase('write', 'Edit: register.tsx')).toBe('Editing register.tsx')
    expect(actionPhrase('read', '> Read: a.ts 12s')).toBe('Reading a.ts')
    expect(actionPhrase('shell', 'Bash: npm test')).toBe('Running `npm test`')
    expect(actionPhrase('web', 'WebSearch: vite')).toBe('Searching the web')
    expect(actionPhrase('other', 'Foo: bar')).toBe('Foo: bar')
    expect(actionPhrase(undefined, '')).toBe('')
  })
})

describe('elapsed', () => {
  it('formats seconds, minutes, hours', () => {
    expect(elapsed(4000)).toBe('4s')
    expect(elapsed(-5)).toBe('0s')
    expect(elapsed(245_000)).toBe('4m 05s')
    expect(elapsed(3_900_000)).toBe('1h 05m')
  })
})
