import { describe, expect, it, vi } from 'vitest'

const emitted: unknown[] = []
vi.mock('./EventBus', () => ({ EventBus: { emit: (_e: string, s: unknown) => emitted.push(s) }, STATE_EVENT: 'office-state' })) // phaser needs a real canvas
import { archetypeOf } from './office/archetype'
import { leadMoodOf, moodOf } from './office/mood'
import { seatPlan } from './office/seats'
import { deskCard, leadCard, sortCards } from './hud/teamview'
import { eventLine, workingCount } from './hud/format'
import { layoutOf } from './scene/layout'
import { isUnpicked, newestAt, normalize, STALE_MS } from './normalize'
import { startPolling } from './state'

// The shape of a real state.js from the older mod: no project, no history, no type or description, no timeline, files or kind.
const OLD = {
  lead: { busy: true, said: 'a line the lead said', doing: '' },
  agents: [
    { id: 'a1', name: 'worker', status: 'running', working: true, sleeping: false, task: '#1 a task', said: 'a line', doing: '> Bash: ls 0s', report: { at: 1795028093833, text: 'a report', to: 'team-lead' } },
    { id: 'a2', name: 'other', status: 'running', working: true, sleeping: false, task: '#2 another', doing: 'was Read: x' },
  ],
  tasks: { done: 23, total: 25 },
  board: [{ id: '1', subject: 'one', status: 'completed', owner: 'worker', blocked: false }, { id: '2', subject: 'two', status: 'in_progress', blocked: false }],
}

const everyPureFunction = (raw: unknown, now = Date.now()) => {
  const s = normalize(raw)
  const moods = s.agents.map(a => moodOf(a, now, s.history))
  leadMoodOf(s.lead, s.agents, s.tasks, s.history, now)
  s.agents.forEach(a => archetypeOf(a))
  const plan = seatPlan(undefined, s.agents, now)
  layoutOf(plan)
  sortCards([leadCard(s.lead), ...s.agents.map(deskCard)], now)
  s.history.forEach(eventLine)
  workingCount(s.agents)
  isUnpicked(s, now)
  return { s, moods }
}

describe('normalize', () => {
  it('gives an old-shape state every field the page reads', () => {
    const { s } = everyPureFunction(OLD)
    expect(s.project).toEqual({ name: '', cwd: '' })
    expect(s.history).toEqual([])
    expect(s.agents).toHaveLength(2)
    expect(s.agents[0]).toMatchObject({ id: 'a1', name: 'worker', type: '', description: '', timeline: [], files: [], working: true })
    expect(s.agents[0]!.report?.to).toBe('team-lead')
    expect(s.lead).toMatchObject({ busy: true, timeline: [], files: [] })
    expect(s.tasks).toEqual({ done: 23, total: 25 })
    expect(s.board).toHaveLength(2)
  })

  it('keeps a new-shape state as it is', () => {
    const now = Date.now()
    const fresh = { ...OLD, project: { name: 'demo', cwd: 'C:/demo' }, history: [{ at: now, id: '1', subject: 's', kind: 'done', who: 'worker' }] }
    const s = normalize({ ...fresh, agents: [{ ...OLD.agents[0], type: 'builder', description: 'Builder.', kind: 'write', since: now, timeline: [{ type: 'said', at: now, text: 'x' }] }] })
    expect(s.project.name).toBe('demo')
    expect(s.history).toHaveLength(1)
    expect(s.agents[0]).toMatchObject({ type: 'builder', kind: 'write', since: now })
    expect(s.agents[0]!.timeline).toHaveLength(1)
  })

  it('turns a minimal {agents: []}, an empty object, null and junk into an empty office', () => {
    for (const raw of [{ agents: [] }, {}, null, undefined, 'junk', 7, [], { agents: 'no' }, { agents: [null, 5, 'x', []] }]) {
      const { s } = everyPureFunction(raw)
      expect(s.agents).toEqual([])
      expect(s.tasks).toEqual({ done: 0, total: 0 })
    }
  })

  it('survives agents with missing or wrong-typed fields, and drops bad nested values', () => {
    const { s } = everyPureFunction({
      agents: [{ id: 'x' }, { name: 'y', working: 'yes', alert: { kind: 'nope', text: 'z' }, report: { text: 'no time' }, kind: 'teleport', since: 'now', timeline: 'no', blockedBy: 'a' }],
      history: [{ kind: 'done' }, { at: 1, id: 2, kind: 'taken' }, 'x'],
      board: [{}, { id: 3 }],
      lead: 'lead',
    })
    expect(s.agents.map(a => a.name)).toEqual(['x', 'y'])
    expect(s.agents[1]).toMatchObject({ working: true, alert: undefined, report: undefined, kind: undefined, since: undefined, timeline: [], blockedBy: undefined })
    expect(s.history).toHaveLength(1)
    expect(s.board).toHaveLength(1)
  })

  it('drops a second agent with the same id: a seat plan would seat it twice', () => {
    const s = normalize({ agents: [{ id: 'a', name: 'one' }, { id: 'a', name: 'two' }] })
    expect(s.agents).toHaveLength(1)
  })
})

describe('isUnpicked', () => {
  const now = 1_800_000_000_000
  it('is true for a state with no project, the older mod', () => expect(isUnpicked(normalize(OLD), now)).toBe(true))
  it('is false for a live session with recent activity', () => {
    const s = normalize({ project: { name: 'p', cwd: '/p' }, agents: [], history: [{ at: now - 1000, id: '1', kind: 'done' }] })
    expect(isUnpicked(s, now)).toBe(false)
  })
  it('is true when the newest event is older than 5 minutes', () => {
    const s = normalize({ project: { name: 'p', cwd: '/p' }, agents: [], history: [{ at: now - STALE_MS - 1, id: '1', kind: 'done' }] })
    expect(newestAt(s)).toBe(now - STALE_MS - 1)
    expect(isUnpicked(s, now)).toBe(true)
  })
  it('is false when nothing dates the state: a session with a project and no events yet', () => {
    expect(isUnpicked(normalize({ project: { name: 'p', cwd: '/p' }, agents: [] }), now)).toBe(false)
  })
})

describe('the loader', () => {
  it('hands the page a normalized state, whatever the state file calls itself', () => {
    const calls: string[] = []
    const win = {
      location: { search: '', href: 'file:///x/index.html' },
      document: {
        title: '', getElementById: () => null, body: { appendChild: (el: { src: string }) => calls.push(el.src) },
        createElement: () => ({ id: '', src: '', onerror: null }),
      },
    } as unknown as Window
    const stop = startPolling(() => {}, win)
    ;(win as unknown as { office: (s: unknown) => void }).office(OLD)
    ;(win as unknown as { office: (s: unknown) => void }).office({ agents: [] })
    stop()
    expect(calls[0]).toMatch(/^state\.js\?/)
    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toMatchObject({ project: { name: '' }, history: [], agents: expect.arrayContaining([expect.objectContaining({ name: 'worker', type: '' })]) })
    expect(emitted[1]).toMatchObject({ agents: [], board: [], history: [] })
  })
})
