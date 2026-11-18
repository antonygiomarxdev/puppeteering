import { expect, test } from 'claude-code/testing'

import type { Task } from '../types'
import { GONE_MS, alertOf, alerts, deliver, departures, draw, endCall, errorOf, historyOf, kindOf, moveTask, office, push, touch, sentences, shellEnd, signature, summarize, taskOf } from './theatre'

const MIN = 60_000
const idle = { running: [], lastAt: 0, said: [] }
const text = (lines: { text: string }[][]) => lines.map(line => line.map(seg => seg.text).join('')).join('\n')

test('a loop is quiet after two minutes with no call, not before', () => {
  expect(alertOf(idle, 1.9 * MIN)).toBe(undefined)
  expect(alertOf(idle, 15 * MIN)?.text).toBe('QUIET 15m00s')
})

test('one call running too long is stuck, even if the loop was just active', () => {
  const loop = { ...idle, running: [{ id: 'a', doing: 'Bash', startedAt: 0 }], lastAt: 15 * MIN }
  expect(alertOf(loop, 4 * MIN)).toBe(undefined)
  expect(alertOf(loop, 15 * MIN)?.text).toBe('STUCK 15m00s')
})

test('the same call three times in a row is a loop, and a new call ends it', () => {
  expect(alertOf({ ...idle, repeat: { sig: 'x', count: 2 } }, 0)).toBe(undefined)
  expect(alertOf({ ...idle, repeat: { sig: 'x', count: 3 } }, 0)?.text).toBe('LOOPING 3x')
  expect(signature({ tool: 'Read', file_path: 'a', tool_use_id: '1' })).toBe(signature({ tool: 'Read', file_path: 'a', tool_use_id: '2', agentId: 'z' }))
  expect(signature({ tool: 'Read', file_path: 'a' })).not.toBe(signature({ tool: 'Read', file_path: 'b' }))
})

test('only agents meant to be working raise an alert', () => {
  const agents = [
    { id: 'b', name: 'builder', description: '', status: 'running' },
    { id: 'c', name: 'waiter', description: '', status: 'idle' },
  ]
  const board = { tasks: [], history: [], shells: [], reports: {}, now: 15 * MIN, loops: { lead: idle, b: idle, c: idle }, agents }
  expect(alerts({ ...board, isLeadBusy: false })).toEqual(['builder QUIET 15m00s'])
  expect(alerts({ ...board, isLeadBusy: true })).toEqual(['lead QUIET 15m00s', 'builder QUIET 15m00s'])
})

test('a call is summarized by what it acts on', () => {
  expect(summarize({ tool: 'Bash', command: 'ls\nmore', description: 'List files' })).toBe('Bash: List files')
  expect(summarize({ tool: 'Read', file_path: '/a/b/c.md' })).toBe('Read: c.md')
  expect(summarize({ tool: 'TaskList' })).toBe('TaskList')
})

test('what an agent wrote is split into clean sentences', () => {
  expect(sentences('Reading **README**. Then the rest.\n\nDone')).toEqual(['Reading README.', 'Then the rest.', 'Done'])
})

test('a task is found by its owner, or by who moved it', () => {
  const tasks = [{ id: '1', subject: 's', status: 'pending', blockedBy: [] }]
  const moved = moveTask(tasks, { taskId: '1', status: 'in_progress' }, 'a1')
  const board = { tasks: moved, history: [], shells: [], reports: {}, agents: [], loops: {}, isLeadBusy: false, now: 0 }
  expect(taskOf(board, 'a1', 'builder')?.id).toBe('1')
  const owned = moveTask(moved, { taskId: '1', owner: 'reviewer' }, 'a1')
  expect(taskOf({ ...board, tasks: owned }, 'a1', 'builder')).toBe(undefined)
  expect(taskOf({ ...board, tasks: owned }, 'a2', 'reviewer')?.id).toBe('1')
  expect(moveTask(tasks, { taskId: '1', status: 'deleted' }, 'a1')).toEqual([])
})

test('the end of a shell is read from the engine notice', () => {
  const notice = '<task-notification><task-id>b1</task-id><status>failed</status></task-notification>'
  expect(shellEnd([{ type: 'text', text: notice }])).toEqual({ id: 'b1', status: 'failed' })
  expect(shellEnd('nothing here')).toBe(undefined)
})

test('the stage shows every agent, and too many become one row each, alerts first', () => {
  const agents = Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, name: `agent-${i}`, description: 'd', status: 'running' }))
  const loops = { a5: { ...idle, repeat: { sig: 'x', count: 6 }, lastAt: 0 } }
  const board = { tasks: [], history: [], shells: [], reports: {}, agents, loops, isLeadBusy: true, now: 0 }
  const tall = text(draw(board, 120, 80))
  for (const agent of agents) expect(tall).toContain(agent.name)
  const short = draw(board, 120, 12)
  expect(text(short)).toContain('LOOPING 6x')
  expect(text(short).indexOf('agent-5')).toBeLessThan(text(short).indexOf('agent-0'))
})

test('no line is wider than the pane, at any width', () => {
  const agents = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, name: `a-long-agent-name-${i}`, description: 'x'.repeat(60), status: 'running' }))
  const said = ['y'.repeat(200)]
  const loops = Object.fromEntries(agents.map(a => [a.id, { ...idle, said }]))
  const board = { tasks: [], history: [], shells: [], reports: {}, agents, loops: { ...loops, lead: { ...idle, said } }, isLeadBusy: true, now: 0 }
  for (const cols of [40, 60, 90, 144]) {
    for (const rows of [10, 80]) {
      for (const line of text(draw(board, cols, rows)).split('\n')) expect(line.length).toBeLessThanOrEqual(cols)
    }
  }
})

test('who is not working waits in one line, off the stage', () => {
  const agents = [
    { id: 'a', name: 'worker', description: 'd', status: 'running' },
    { id: 'b', name: 'done-one', description: 'd', status: 'idle' },
  ]
  const lines = text(draw({ tasks: [], history: [], shells: [], reports: {}, agents, loops: {}, isLeadBusy: true, now: 0 }, 100, 40)).split('\n')
  expect(lines.find(line => line.includes('done-one'))).toBe('waiting: done-one')
  expect(lines.some(line => line.includes('( o o ) worker'))).toBe(true)
})

test('the office lists each desk with its task, words and last report', () => {
  const agents = [{ id: 'b', name: 'builder', description: 'd', status: 'running' }]
  const tasks = moveTask([{ id: '1', subject: 'Fix login', status: 'pending', blockedBy: [] }], { taskId: '1', status: 'in_progress' }, 'b')
  const loops = { b: { ...idle, said: ['Tests pass.'] } }
  const reports = { b: { at: 5, text: 'Login fixed.', to: 'team-lead' } }
  const floor = office({ tasks, history: [], shells: [], agents, loops, reports, isLeadBusy: false, now: 0 })
  expect(floor.board).toEqual([{ id: '1', subject: 'Fix login', status: 'in_progress', owner: 'builder', blocked: false }])
  const desk = floor.agents[0]
  expect(desk).toEqual({ id: 'b', name: 'builder', type: '', description: 'd', status: 'running', working: true, sleeping: false, alert: undefined, task: '#1 Fix login', said: 'Tests pass.', doing: 'no tool call yet', report: reports.b, timeline: [], files: [] })
})

test('a tool call is sorted by what it does, and anything unknown is other', () => {
  expect(kindOf('Edit')).toBe('write')
  expect(kindOf('NotebookEdit')).toBe('write')
  expect(kindOf('Grep')).toBe('read')
  expect(kindOf('Bash')).toBe('shell')
  expect(kindOf('WebSearch')).toBe('web')
  expect(kindOf('mcp__claude-in-chrome__navigate')).toBe('web')
  expect(kindOf('SendMessage')).toBe('message')
  expect(kindOf('TaskUpdate')).toBe('board')
  expect(kindOf('Agent')).toBe('agent')
  expect(kindOf('SomethingNew')).toBe('other')
})

test('a failed call sets an error, and the first line of it is kept', () => {
  expect(errorOf({ isError: true, text: 'File not found\nat line 3' })).toBe('File not found')
  expect(errorOf({ deny: 'Blocked by a hook' })).toBe('Blocked by a hook')
  expect(errorOf({ isError: false, text: 'fine' })).toBe(undefined)
})

test('an agent that left stays a minute, then is dropped', () => {
  const was = { id: 'g', name: 'reviewer', description: 'd', status: 'idle', type: 'reviewer' }
  const kept = { id: 'a', name: 'builder', description: 'd', status: 'running' }
  const gone = departures({ agents: [kept, was] }, [kept], 1000)
  expect(gone).toEqual([{ ...was, left: 1000 }])
  expect(departures({ agents: [kept], departed: gone }, [kept], 1000 + GONE_MS)).toEqual(gone)
  expect(departures({ agents: [kept], departed: gone }, [kept], 1001 + GONE_MS)).toEqual([])
  const back = departures({ agents: [kept], departed: gone }, [kept, was], 2000)
  expect(back).toEqual([])
})

test('a desk shows its call, its error, the open tasks that block it, and a leave', () => {
  const agents = [{ id: 'b', name: 'builder', type: 'general-purpose', description: 'Builder. fix', status: 'running' }]
  const tasks = [
    { id: '1', subject: 'Schema', status: 'completed', blockedBy: [] },
    { id: '2', subject: 'Login', status: 'in_progress', owner: 'builder', blockedBy: ['1', '3'] },
    { id: '3', subject: 'Review', status: 'pending', blockedBy: [] },
  ]
  const running = [{ id: 't', doing: 'Edit: a.ts', startedAt: 500, kind: 'write' as const }]
  const loops = { b: { running, lastAt: 500, said: [], lastError: { at: 400, text: 'old' } } }
  const departed = [{ id: 'g', name: 'reviewer', type: 'reviewer', description: 'Reviewer.', status: 'idle', left: 900 }]
  const floor = office({ tasks, history: [], shells: [], agents, loops, reports: {}, departed, isLeadBusy: false, now: 1000 }, '')
  expect(floor.agents[0]).toMatchObject({ type: 'general-purpose', description: 'Builder. fix', kind: 'write', since: 500, blockedBy: ['3'], lastError: { at: 400, text: 'old' } })
  expect(floor.agents[1]).toMatchObject({ id: 'g', gone: true, working: false, sleeping: true, alert: undefined })
})

test('a task taken by an agent, then done, is recorded with who, and named as the office shows it', () => {
  const agents = [{ id: 'b', name: 'builder', description: 'd', status: 'running' }]
  const pending = [{ id: '1', subject: 'Fix login', status: 'pending', blockedBy: [] }]
  const taken = moveTask(pending, { taskId: '1', status: 'in_progress' }, 'b')
  const takenAt = historyOf(pending, taken, 5, 'b')
  expect(takenAt).toEqual([{ at: 5, id: '1', subject: 'Fix login', kind: 'taken', who: 'b' }])
  const done = moveTask(taken, { taskId: '1', status: 'completed' }, 'b')
  const history = [...takenAt, ...historyOf(taken, done, 9, 'b')]
  expect(history.at(-1)).toEqual({ at: 9, id: '1', subject: 'Fix login', kind: 'done', who: 'b' })
  const floor = office({ tasks: done, shells: [], history, agents, loops: {}, reports: {}, isLeadBusy: false, now: 0 })
  expect(floor.history).toEqual([
    { at: 9, id: '1', subject: 'Fix login', kind: 'done', who: 'builder' },
    { at: 5, id: '1', subject: 'Fix login', kind: 'taken', who: 'builder' },
  ])
})

test('a TaskList that shows nothing new records nothing, and one that shows a completion records it', () => {
  const tasks: Task[] = [{ id: '1', subject: 'Fix login', status: 'in_progress', owner: 'builder', blockedBy: [] }]
  expect(historyOf(tasks, tasks.map(task => ({ ...task })), 7)).toEqual([])
  const listed: Task[] = tasks.map(task => ({ ...task, status: 'completed' }))
  expect(historyOf(tasks, listed, 7)).toEqual([{ at: 7, id: '1', subject: 'Fix login', kind: 'done', who: 'builder' }])
})

test('the state names the project from the directory its session runs in', () => {
  const board = { tasks: [], history: [], shells: [], reports: {}, agents: [], loops: {}, isLeadBusy: false, now: 0 }
  expect(office(board, 'C:\\Users\\anton\\dev\\atom').project).toEqual({ name: 'atom', cwd: 'C:\\Users\\anton\\dev\\atom' })
  expect(office(board, '/home/anton/dev/puppeteering').project.name).toBe('puppeteering')
})

test('an agent with no task in progress sleeps, even while it runs tool calls', () => {
  const agents = [{ id: 'r', name: 'reviewer', description: 'd', status: 'running' }]
  const loops = { r: { ...idle, running: [{ id: 't1', doing: 'Bash sleep 10', startedAt: 0 }], lastAt: 0 } }
  const floor = office({ tasks: [], history: [], shells: [], agents, loops, reports: {}, isLeadBusy: false, now: 0 })
  expect(floor.agents[0]).toMatchObject({ name: 'reviewer', working: true, sleeping: true, task: undefined, alert: undefined })
})

const empty = { tasks: [], history: [], shells: [], reports: {}, loops: {}, isLeadBusy: false, now: 0 }
const crew = [
  { id: 'a1', name: 'builder', description: '', status: 'running' },
  { id: 'b2', name: 'reviewer', description: '', status: 'running' },
]

test('a call adds an entry, and its end fills end and ok', () => {
  const call = { type: 'call' as const, at: 1, id: 't1', tool: 'Read', kind: 'read' as const, what: 'Read: a.md' }
  const running = endCall(push({ ...empty, agents: crew }, 'a1', call), 'a1', 't1', 5, false)
  expect(running.timelines?.a1).toEqual([{ ...call, end: 5, ok: false }])
  expect(office(running).agents[0].timeline[0]).toMatchObject({ end: 5, ok: false })
})

test('41 entries keep the last 40, newest first in the office', () => {
  let board = { ...empty, agents: crew }
  for (let i = 0; i < 41; i++) board = push(board, 'a1', { type: 'said', at: i, text: `n${i}` })
  expect(board.timelines?.a1).toHaveLength(40)
  const shown = office(board).agents[0].timeline
  expect(shown[0]).toMatchObject({ text: 'n40' })
  expect(shown.at(-1)).toMatchObject({ text: 'n1' })
})

test('a SendMessage adds sent to the sender and received to the recipient, by name or id', () => {
  const sent = deliver({ ...empty, agents: crew }, 'a1', { to: 'reviewer', message: 'look at this\nplease' }, 7)
  expect(sent.timelines?.a1).toEqual([{ type: 'sent', at: 7, to: 'reviewer', text: 'look at this' }])
  expect(sent.timelines?.b2).toEqual([{ type: 'received', at: 7, from: 'builder', text: 'look at this' }])
  expect(deliver({ ...empty, agents: crew }, 'a1', { to: 'b2', message: 'x' }, 7).timelines?.b2).toHaveLength(1)
})

test('Edit on the same file twice gives one file with count 2, and text is capped', () => {
  const board = touch(touch({ ...empty, agents: crew }, 'a1', '/x/a.ts'), 'a1', '/x/a.ts')
  expect(office(board).agents[0].files).toEqual([{ path: '/x/a.ts', count: 2 }])
  expect(push(board, 'a1', { type: 'said', at: 0, text: 'x'.repeat(500) }).timelines?.a1[0]).toMatchObject({ text: 'x'.repeat(200) })
})

test('the state with 8 agents and full timelines stays small', () => {
  const agents = Array.from({ length: 8 }, (_, i) => ({ id: `id${i}`, name: `agent${i}`, description: 'd', status: 'running' }))
  let board = { ...empty, agents }
  for (const { id } of [...agents, { id: 'lead' }]) {
    for (let i = 0; i < 40; i++) board = push(board, id, { type: i % 2 ? 'said' : 'call', at: i, id: `t${i}`, tool: 'Edit', kind: 'write', what: 'y'.repeat(300), text: 'z'.repeat(300) } as never)
    for (let i = 0; i < 20; i++) board = touch(board, id, `C:/Users/anton/dev/puppeteering/mods/puppet-monitor/hooks/file${i}.ts`)
  }
  const size = JSON.stringify(office(board)).length
  console.log(`state bytes: ${size}`)
  expect(size).toBeLessThan(200_000)
})
