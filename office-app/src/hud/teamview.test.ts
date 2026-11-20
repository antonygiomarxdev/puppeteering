import { describe, expect, it } from 'vitest'
import { actionPhrase, cardAction, cardThinking, deskCard, elapsed, leadCard, sortCards, thinkingLine, type Card } from './teamview'
import { normalize } from '../normalize'

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

describe('cardAction', () => {
  it('a sleeping card has no NOW even when doing is set', () => {
    expect(cardAction({ sleeping: true, kind: 'write', doing: 'Edit: a.ts' })).toBe('')
    expect(cardAction({ sleeping: false, kind: 'write', doing: 'Edit: a.ts' })).toBe('Editing a.ts')
  })
})

describe('thinking and said', () => {
  const now = 10_000
  const desk = { id: 'a', name: 'a', type: '', description: '', status: 'running', working: true, sleeping: false, doing: '', said: 'I will read it.', thinking: { since: 6000, at: 6000, end: 8000, text: 'Weighing two options.' } }
  it('a card carries each stream in its own field', () => {
    const c = deskCard(desk)
    expect(c.said).toBe('I will read it.')
    expect(c.thinking?.text).toBe('Weighing two options.')
    expect(cardThinking(c, now)).toBe('Weighing two options.')
    const lead = leadCard({ busy: true, doing: '', said: 'Spoken.', thinking: { since: 6000, at: 6000 } })
    expect(lead.said).toBe('Spoken.')
    expect(cardThinking(lead, now)).toBe('thinking… 4s')
  })
  it('an empty thinking block still reads as thinking, live, and as a duration once closed', () => {
    expect(thinkingLine({ since: 6000, at: 6000 }, now)).toBe('thinking… 4s')
    expect(thinkingLine({ since: 6000, at: 9000, end: 9000 }, now)).toBe('thought for 3s')
    expect(thinkingLine(undefined, now)).toBe(undefined)
  })
  it('the card hides an empty closed thought, and an open one on an agent that stopped', () => {
    expect(cardThinking({ working: true, sleeping: false, thinking: { since: 6000, at: 9000, end: 9000 } }, now)).toBe(undefined)
    expect(cardThinking({ working: false, sleeping: false, thinking: { since: 6000, at: 6000 } }, now)).toBe(undefined)
    expect(cardThinking({ working: true, sleeping: true, thinking: { since: 6000, at: 6000, text: 'x' } }, now)).toBe(undefined)
  })
  it('normalize keeps a well-formed thought and drops a malformed one', () => {
    const s = normalize({ project: { name: 'p' }, lead: { thinking: { since: 1, text: 7 } }, agents: [{ ...desk }, { id: 'b', thinking: 'nope' }] })
    expect(s.lead.thinking).toEqual({ since: 1, at: 1, end: undefined, text: undefined })
    expect(s.agents[0].thinking).toEqual(desk.thinking)
    expect(s.agents[1].thinking).toBe(undefined)
  })
})

describe('a thought cut short', () => {
  const now = 200_000
  const open = { since: 100_000, at: 112_000 }
  it('reads as cut off, not a live counter, once the agent stopped working', () => {
    expect(thinkingLine(open, 113_000, false)).toBe('thought for 12s, cut off')
    expect(thinkingLine(open, 113_000, true)).toBe('thinking… 13s')
  })
  it('reads as cut off once it has not streamed for over a minute, even if the agent works', () => {
    expect(thinkingLine(open, now, true)).toBe('thought for 12s, cut off')
    expect(thinkingLine(open, 172_000, true)).toBe('thinking… 1m 12s')
  })
  it('the card drops a cut-off thought with no text', () => {
    expect(cardThinking({ working: true, sleeping: false, thinking: open }, now)).toBe(undefined)
  })
})

describe('normalize keeps the code kind', () => {
  it('a REPL call keeps kind code on the page', () => {
    const s = normalize({ project: { name: 'p' }, lead: { kind: 'code' }, agents: [{ id: 'a', kind: 'code' }] })
    expect(s.agents[0].kind).toBe('code')
    expect(s.lead.kind).toBe('code')
  })
})
