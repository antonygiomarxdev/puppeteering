import { describe, expect, it } from 'vitest'
import type { HistoryEvent } from '../types'
import { leadMoodOf, moodOf, type LiveDesk, type LiveLead } from './mood'

const NOW = 100_000
const desk = (over: Partial<LiveDesk> = {}): LiveDesk => ({
  id: 'a', name: 'Ana', status: 'in_progress', working: true, sleeping: false, doing: '', ...over,
})
const ev = (kind: HistoryEvent['kind'], who: string, ago = 0, id = 't1'): HistoryEvent => ({ at: NOW - ago, id, subject: 's', kind, who })
const none: HistoryEvent[] = []
const mood = (over: Partial<LiveDesk> = {}, history: HistoryEvent[] = none) => moodOf(desk(over), NOW, history)

describe('moodOf: one row of section 3 each', () => {
  it('Leaving: gone', () => expect(mood({ gone: true, working: false })).toBe('Leaving'))
  it('Error: lastError', () => expect(mood({ lastError: { at: NOW, text: 'boom' } })).toBe('Error'))
  it('Stuck: alert stuck', () => expect(mood({ alert: { kind: 'stuck', text: '' } })).toBe('Stuck'))
  it('Looping: alert loop', () => expect(mood({ alert: { kind: 'loop', text: '' } })).toBe('Looping'))
  it('Quiet: alert quiet', () => expect(mood({ alert: { kind: 'quiet', text: '' } })).toBe('Quiet'))
  it('WaitingPermission: asks', () => expect(mood({ asks: true })).toBe('WaitingPermission'))
  it('Blocked: blockedBy', () => expect(mood({ blockedBy: ['t0'] })).toBe('Blocked'))
  it('Typing: kind write', () => expect(mood({ kind: 'write' })).toBe('Typing'))
  it('Reading: kind read', () => expect(mood({ kind: 'read' })).toBe('Reading'))
  it('RunningCommand: shell under 30 s', () => expect(mood({ kind: 'shell', since: NOW - 5_000 })).toBe('RunningCommand'))
  it('LongCommand: shell over 30 s', () => expect(mood({ kind: 'shell', since: NOW - 31_000 })).toBe('LongCommand'))
  it('Browsing: kind web', () => expect(mood({ kind: 'web' })).toBe('Browsing'))
  it('Whiteboard: kind board', () => expect(mood({ kind: 'board' })).toBe('Whiteboard'))
  it('Talking: kind message', () => expect(mood({ kind: 'message' })).toBe('Talking'))
  it('Thinking: working, no tool', () => expect(mood({})).toBe('Thinking'))
  it('TakingTask: taken for this agent, recent', () => expect(mood({ working: false }, [ev('taken', 'Ana', 1_000)])).toBe('TakingTask'))
  it('FinishingTask: done for this agent, recent', () => expect(mood({ working: false }, [ev('done', 'Ana', 1_000)])).toBe('FinishingTask'))
  it('Whiteboard: created for this agent, recent', () => expect(mood({ working: false }, [ev('created', 'Ana', 1_000)])).toBe('Whiteboard'))
  it('Reporting: report to lead or unset, under 10 s', () => {
    expect(mood({ working: false, report: { at: NOW - 2_000, text: 'done' } })).toBe('Reporting')
    expect(mood({ working: false, report: { at: NOW - 2_000, text: 'done', to: 'lead' } })).toBe('Reporting')
  })
  it('Visiting: report to a peer, under 10 s', () => {
    expect(mood({ working: false, report: { at: NOW - 2_000, text: 'hi', to: 'b' } })).toBe('Visiting')
  })
  it('IdleAwake: not working, task set', () => expect(mood({ working: false, task: 'T1' })).toBe('IdleAwake'))
  it('Sleeping: not working, no task', () => expect(mood({ working: false, sleeping: true })).toBe('Sleeping'))
})

describe('moodOf: priority and freshness', () => {
  it('an alert beats a tool state (stuck beats typing)', () => {
    expect(mood({ kind: 'write', alert: { kind: 'stuck', text: '' } })).toBe('Stuck')
  })
  it('an error beats an alert', () => {
    expect(mood({ lastError: { at: NOW, text: 'x' }, alert: { kind: 'stuck', text: '' } })).toBe('Error')
  })
  it('a pending permission beats a tool state', () => {
    expect(mood({ kind: 'shell', asks: true })).toBe('WaitingPermission')
  })
  it('a gone agent is Leaving even when it is asleep', () => {
    expect(mood({ gone: true, working: false, sleeping: true })).toBe('Leaving')
  })
  it('an old taken event is not TakingTask', () => {
    expect(mood({ working: false }, [ev('taken', 'Ana', 4_000)])).toBe('Sleeping')
  })
  it('a taken event for someone else is ignored', () => {
    expect(mood({ working: false }, [ev('taken', 'Bo', 1_000)])).toBe('Sleeping')
  })
  it('who may be the agent id', () => {
    expect(mood({ working: false }, [ev('done', 'a', 1_000)])).toBe('FinishingTask')
  })
  it('an old report is not Reporting', () => {
    expect(mood({ working: false, report: { at: NOW - 11_000, text: 'x' } })).toBe('Sleeping')
  })
})

describe('leadMoodOf: section 4', () => {
  const lead = (over: Partial<LiveLead> = {}): LiveLead => ({ busy: false, doing: '', ...over })
  const idleTasks = { done: 0, total: 0 }
  const lm = (l: LiveLead, desks: LiveDesk[] = [], tasks = idleTasks, history: HistoryEvent[] = none) =>
    leadMoodOf(l, desks, tasks, history, NOW)

  it('Assigning: lead kind board', () => expect(lm(lead({ busy: true, kind: 'board' }))).toBe('Assigning'))
  it('Assigning: a created event in the last 3 s', () => expect(lm(lead(), [], idleTasks, [ev('created', 'x', 1_000)])).toBe('Assigning'))
  it('ReviewingReports: a report under 10 s on any desk', () => {
    expect(lm(lead(), [desk({ report: { at: NOW - 2_000, text: 'done' } })])).toBe('ReviewingReports')
  })
  it('Talking: lead kind message', () => expect(lm(lead({ busy: true, kind: 'message' }))).toBe('Talking'))
  it('Celebrating: all done, a done event in the last 5 s', () => {
    expect(lm(lead(), [], { done: 2, total: 2 }, [ev('done', 'a', 1_000)])).toBe('Celebrating')
  })
  it('WaitingOnTeam: lead not busy, a desk working', () => expect(lm(lead(), [desk()])).toBe('WaitingOnTeam'))
  it('Thinking: lead busy, no tool', () => expect(lm(lead({ busy: true }))).toBe('Thinking'))
  it('Sleeping: lead not busy, nobody working, no tasks', () => expect(lm(lead(), [desk({ working: false })])).toBe('Sleeping'))
  it('lead alert shows the same icons as an agent alert', () => {
    expect(lm(lead({ busy: true, alert: { kind: 'stuck', text: '' } }))).toBe('Stuck')
  })
  it('lead alert beats thinking', () => {
    expect(lm(lead({ busy: true, alert: { kind: 'quiet', text: '' } }))).toBe('Quiet')
  })
})

describe('the coordinator celebrates once per completion', () => {
  const complete = (t: number): HistoryEvent[] => [{ at: t, id: 't', subject: 's', kind: 'done', who: 'a' }]
  const lead: LiveLead = { busy: false, doing: '' }
  const at = (t: number, history: HistoryEvent[], tasks = { done: 2, total: 2 }) =>
    leadMoodOf(lead, [], tasks, history, t)

  it('celebrates right after the completion, then stops', () => {
    expect(at(NOW + 1_000, complete(NOW))).toBe('Celebrating')
    expect(at(NOW + 6_000, complete(NOW))).not.toBe('Celebrating')
  })
  it('a second completion celebrates again, and only once', () => {
    const first = complete(NOW)
    const second = [{ at: NOW + 20_000, id: 'u', subject: 's', kind: 'done' as const, who: 'b' }, ...first]
    expect(at(NOW + 21_000, second, { done: 3, total: 3 })).toBe('Celebrating')
    expect(at(NOW + 26_000, second, { done: 3, total: 3 })).not.toBe('Celebrating')
  })
  it('no celebration while tasks remain open', () => {
    expect(at(NOW + 1_000, complete(NOW), { done: 1, total: 2 })).not.toBe('Celebrating')
  })
})
