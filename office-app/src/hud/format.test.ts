import { describe, expect, it } from 'vitest'
import { eventLine, hhmm, workingCount } from './format'

// Local time on purpose: hhmm() reads local hours, so the test must not depend on the machine's zone.
const at = new Date(2026, 10, 18, 10, 42).getTime()

describe('eventLine', () => {
  it('taken: who took #id subject', () => {
    expect(eventLine({ at, id: '4', subject: 'Fix login', kind: 'taken', who: 'builder' })).toBe('10:42 · builder took #4 Fix login')
  })
  it('taken without who falls back to someone', () => {
    expect(eventLine({ at, id: '4', subject: 'Fix login', kind: 'taken' })).toBe('10:42 · someone took #4 Fix login')
  })
  it('created: who created #id subject, or created #id subject without who', () => {
    expect(eventLine({ at, id: '5', subject: 'Add cache', kind: 'created', who: 'lead' })).toBe('10:42 · lead created #5 Add cache')
    expect(eventLine({ at, id: '5', subject: 'Add cache', kind: 'created' })).toBe('10:42 · created #5 Add cache')
  })
  it('done: who finished #id subject, or finished #id subject without who', () => {
    expect(eventLine({ at, id: '4', subject: 'Fix login', kind: 'done', who: 'builder' })).toBe('10:42 · builder finished #4 Fix login')
    expect(eventLine({ at, id: '4', subject: 'Fix login', kind: 'done' })).toBe('10:42 · finished #4 Fix login')
  })
  it('pads hours and minutes', () => {
    expect(hhmm(new Date(2026, 10, 18, 9, 5).getTime())).toBe('09:05')
  })
})

describe('workingCount', () => {
  it('excludes sleeping agents', () => {
    const agents = [
      { working: true, sleeping: false },
      { working: true, sleeping: true },
      { working: false, sleeping: true },
      { working: true, sleeping: false },
    ]
    expect(workingCount(agents)).toBe(2)
  })
})
