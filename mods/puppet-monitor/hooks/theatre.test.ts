import { expect, test } from 'claude-code/testing'

import type { Task } from '../types'
import { GONE_MS, alertOf, alerts, deliver, departures, dropScripts, endCall, endScripts, endThought, errorOf, folderKey, historyOf, isShared, kindOf, moveTask, normPath, office, otherSeenAt, publicState, publicStatePath, push, startCall, touch, sentences, shellEnd, signature, startThought, streamThought, summarize, taskOf } from './theatre'

const MIN = 60_000
const idle = { running: [], lastAt: 0, said: [] }

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

test('REPL is its own kind, and its summary is its first line', () => {
  expect(kindOf('REPL')).toBe('code')
  expect(summarize({ tool: 'REPL', code: '\n// find it\nawait x()' })).toBe('Code: // find it')
})

test('a script with three inner calls is one code entry with three nested calls', () => {
  const call = (id: string, tool: string, doing: string, kind: Parameters<typeof startCall>[2]['kind'], at: number) => ({ id, tool, doing, startedAt: at, kind })
  let board = startCall({ loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }, 'lead', call('r', 'REPL', 'Code: await go()', 'code', 1))
  board = startCall(board, 'lead', call('1', 'Read', 'Read: x.ts', 'read', 2))
  board = startCall(board, 'lead', call('2', 'Bash', 'Bash: ls', 'shell', 3))
  board = startCall(board, 'lead', call('3', 'Edit', 'Edit: y.ts', 'write', 4))
  board = endCall(board, 'lead', '2', 5, false)
  board = endCall(board, 'lead', 'r', 6, true)
  const line = board.timelines?.lead ?? []
  expect(line.length).toBe(1)
  const entry = line[0]
  expect(entry.type === 'call' && entry.inner?.map(c => `${c.tool}:${c.ok}`)).toEqual(['Read:undefined', 'Bash:false', 'Edit:undefined'])
  expect(board.loops.lead.running.find(c => c.id === 'r')?.inner).toBe(3)
  expect(office({ ...board, now: 7 }, '/p').lead.doing).toContain('Running code (3 calls)')
})

test('without a script running, a call is its own entry', () => {
  const base = { loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }
  const board = startCall(startCall(base, 'a', { id: '1', tool: 'Read', doing: 'Read', startedAt: 1, kind: 'read' }), 'a', { id: '2', tool: 'Read', doing: 'Read', startedAt: 2, kind: 'read' })
  expect(board.timelines?.a.length).toBe(2)
})

test('a thinking block is live from its start until it closes, closes once, and never touches said', () => {
  const board = { tasks: [], history: [], shells: [], reports: {}, agents: [], isLeadBusy: true, now: 0, loops: { lead: { ...idle, said: ['Hello there.'] } } }
  const live = startThought(board, 'lead', 1000)
  expect(live.loops.lead?.thinking).toEqual({ since: 1000, at: 1000 })
  expect(office(live).lead.thinking?.end).toBe(undefined)
  const closed = endThought(live, 'lead', '  ', 5000)
  expect(closed.loops.lead?.thinking).toEqual({ since: 1000, at: 5000, end: 5000 })
  expect(endThought(closed, 'lead', 'late', 6000)).toBe(closed)
  expect(closed.loops.lead?.said).toEqual(['Hello there.'])
  expect(closed.timelines?.lead).toEqual([{ type: 'thought', at: 1000, end: 5000 }])
})

test('a block still streaming moves its at; a closed one does not move', () => {
  const board = { tasks: [], history: [], shells: [], reports: {}, agents: [], isLeadBusy: true, now: 0, loops: { lead: idle } }
  const live = streamThought(startThought(board, 'lead', 1000), 'lead', 3000)
  expect(live.loops.lead?.thinking).toEqual({ since: 1000, at: 3000 })
  const closed = endThought(live, 'lead', '', 4000)
  expect(streamThought(closed, 'lead', 9000)).toBe(closed)
  expect(streamThought(board, 'lead', 9000)).toBe(board)
})

test('a REPL script is one entry: its calls nest under it while it runs, and its result ends it', () => {
  const base = { loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }
  let board = startCall(base, 'lead', { id: 'toolu_1', tool: 'REPL', doing: 'Code: script', startedAt: 1, kind: 'code' })
  for (const id of ['repl_a', 'repl_b', 'repl_c']) board = startCall(board, 'lead', { id, tool: 'Read', doing: `Read: ${id}`, startedAt: 2, kind: 'read' })
  expect(office({ ...board, now: 7 }, '/p').lead.doing).toContain('Running code (3 calls)')
  board = endScripts(board, [{ type: 'tool_result', tool_use_id: 'toolu_1', is_error: false }], 9)
  const line = board.timelines?.lead ?? []
  expect(line).toHaveLength(1)
  expect(line[0]).toMatchObject({ what: 'Code: 3 calls', end: 9, ok: true })
  expect(line[0].type === 'call' && line[0].inner).toHaveLength(3)
  expect(board.loops.lead.running).toEqual([])
})

test('a tool_result for a call that is not a script changes nothing, and an error result fails the script', () => {
  const base = { loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }
  const board = startCall(base, 'lead', { id: 'r1', tool: 'Read', doing: 'Read: a.md', startedAt: 1, kind: 'read' })
  expect(endScripts(board, [{ type: 'tool_result', tool_use_id: 'r1' }], 5)).toBe(board)
  const script = startCall(base, 'lead', { id: 'toolu_2', tool: 'REPL', doing: 'Code: script', startedAt: 1, kind: 'code' })
  const failed = endScripts(script, [{ type: 'tool_result', tool_use_id: 'toolu_2', is_error: true }], 4)
  expect(failed.timelines?.lead?.[0]).toMatchObject({ what: 'Code: script', ok: false })
  expect(failed.loops.lead.running).toEqual([])
})

test('a turn that ends with a script still running closes it, so it never reads Running code forever', () => {
  const base = { loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }
  const board = startCall(base, 'lead', { id: 'toolu_3', tool: 'REPL', doing: 'Code: script', startedAt: 1, kind: 'code' })
  const closed = dropScripts(board, 'lead', 6)
  expect(closed.loops.lead.running).toEqual([])
  expect(closed.timelines?.lead?.[0]).toMatchObject({ end: 6, ok: false })
})

test('a script call seen twice is nested once', () => {
  const base = { loops: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0, reports: {} }
  let board = startCall(base, 'lead', { id: 'r', tool: 'REPL', doing: 'Code: script', startedAt: 1, kind: 'code' })
  board = startCall(board, 'lead', { id: 'repl_54f5', tool: 'Read', doing: 'Read: a.md', startedAt: 2, kind: 'read' })
  board = startCall(board, 'lead', { id: 'repl_54f5', tool: 'Read', doing: 'Read: a.md', startedAt: 3, kind: 'read' })
  expect(board.loops.lead.running.find(call => call.id === 'r')?.inner).toBe(1)
  board = endCall(board, 'lead', 'repl_54f5', 4, true)
  board = endCall(board, 'lead', 'r', 5, true)
  const entry = board.timelines?.lead?.[0]
  expect(entry).toMatchObject({ what: 'Code: 1 calls' })
  expect(entry?.type === 'call' && entry.inner).toHaveLength(1)
})

// SPEC-01-1 (herdr/REQ-12): the public per-session state, its name function and the shared flag.
const pubBoard = (over: object = {}) => ({
  tasks: [
    { id: '1', subject: 'Done thing', status: 'completed', blockedBy: [] },
    { id: '2', subject: 'Open thing', status: 'in_progress', owner: 'builder', blockedBy: [] },
    { id: '3', subject: 'Waiting thing', status: 'pending', blockedBy: ['2'] },
  ],
  history: [], shells: [], reports: {}, agents: [], loops: { lead: idle }, isLeadBusy: false, now: 7777, ...over,
})

test('covers: herdr/REQ-12/D-33 publicState has schema 1, the key and cwd verbatim, and at equal to board.now', () => {
  const cwd = 'C:\\Users\\anton\\dev\\proj'
  const state = publicState(pubBoard(), 'abc-1', cwd, false)
  expect(state.schema).toBe(1)
  expect(state.key).toBe('abc-1')
  expect(state.cwd).toBe(cwd)
  expect(state.at).toBe(7777)
  expect(state.shared).toBe(false)
  expect(publicState(pubBoard(), 'k', cwd, true).shared).toBe(true)
})

test('covers: herdr/REQ-12/D-2 tasks.done and total count, and tasks.open lists only the open ones with their fields', () => {
  const state = publicState(pubBoard(), 'k', '/p', false)
  expect(state.tasks.done).toBe(1)
  expect(state.tasks.total).toBe(3)
  expect(state.tasks.open).toEqual([
    { id: '2', subject: 'Open thing', status: 'in_progress', owner: 'builder', blocked: false },
    { id: '3', subject: 'Waiting thing', status: 'pending', owner: undefined, blocked: true },
  ])
})

test('covers: herdr/REQ-12/D-2 publicState carries busy from isLeadBusy', () => {
  expect(publicState(pubBoard({ isLeadBusy: true }), 'k', '/p', false).busy).toBe(true)
  expect(publicState(pubBoard({ isLeadBusy: false }), 'k', '/p', false).busy).toBe(false)
})

test('covers: herdr/REQ-12/D-2 a looping agent gives a loop alert named by the agent', () => {
  const agents = [{ id: 'b', name: 'builder', description: '', status: 'running' }]
  const board = pubBoard({ agents, loops: { lead: idle, b: { ...idle, lastAt: 7777, repeat: { sig: 'x', count: 3 } } } })
  expect(publicState(board, 'k', '/p', false).alerts).toEqual([{ who: 'builder', kind: 'loop', text: 'LOOPING 3x' }])
})

test('covers: herdr/REQ-12/D-2 a busy lead that is quiet gives who lead and kind quiet; an idle lead and an idle agent give none', () => {
  const quiet = pubBoard({ isLeadBusy: true, now: 15 * MIN })
  expect(publicState(quiet, 'k', '/p', false).alerts).toEqual([{ who: 'lead', kind: 'quiet', text: 'QUIET 15m00s' }])
  const agents = [{ id: 'c', name: 'waiter', description: '', status: 'idle' }]
  const calm = pubBoard({ isLeadBusy: false, now: 15 * MIN, agents, loops: { lead: idle, c: idle } })
  expect(publicState(calm, 'k', '/p', false).alerts).toEqual([])
})

test('covers: herdr/REQ-12/D-2 the alert list equals what alerts(board) prints', () => {
  const agents = [
    { id: 'b', name: 'builder', description: '', status: 'running' },
    { id: 'l', name: 'looper', description: '', status: 'running' },
  ]
  const board = pubBoard({ agents, isLeadBusy: true, now: 15 * MIN, loops: { lead: idle, b: idle, l: { ...idle, lastAt: 15 * MIN, repeat: { sig: 'x', count: 4 } } } })
  const printed = alerts(board)
  expect(printed.length).toBeGreaterThan(1)
  expect(publicState(board, 'k', '/p', false).alerts.map((a: { who: string; text: string }) => a.who + ' ' + a.text)).toEqual(printed)
})

test('covers: herdr/REQ-12/D-2 an empty board gives empty lists', () => {
  const state = publicState(pubBoard({ tasks: [] }), 'k', '/p', false)
  expect(state.tasks).toEqual({ done: 0, total: 0, open: [] })
  expect(state.alerts).toEqual([])
})

test('covers: herdr/REQ-12/D-3 the state survives a JSON round trip unchanged', () => {
  const state = publicState(pubBoard(), 'k', 'C:\\p', true)
  expect(state.schema).toBe(1)
  expect(JSON.parse(JSON.stringify(state))).toEqual(state)
})

test('covers: herdr/REQ-12/D-3 the state holds no thinking text, timeline or file list', () => {
  const board = pubBoard({
    loops: { lead: { ...idle, said: ['SECRET-SAID'] } },
    timelines: { lead: [{ type: 'thought', text: 'SECRET-THOUGHT' }, { type: 'call', what: 'Edit: SECRET-FILE.ts' }] },
  })
  const state = publicState(board, 'k', '/p', false)
  expect(Object.keys(state).sort()).toEqual(['alerts', 'at', 'busy', 'cwd', 'key', 'schema', 'shared', 'tasks'])
  expect(JSON.stringify(state)).not.toContain('SECRET')
})

test('covers: herdr/REQ-12/D-33 otherSeenAt keeps the other session\'s at while this session reads its own write', () => {
  expect(otherSeenAt({ key: 'b', at: 5 }, 'a', undefined)).toBe(5)
  expect(otherSeenAt({ key: 'b', at: 5 }, 'a', 3)).toBe(5)
  expect(otherSeenAt({ key: 'b', at: 5 }, 'a', 5)).toBe(5)
  expect(otherSeenAt({ key: 'b', at: 5 }, 'a', 9)).toBe(9)
  expect(otherSeenAt({ key: 'a', at: 50 }, 'a', 5)).toBe(5)
  expect(otherSeenAt({ key: 'a', at: 50 }, 'a', undefined)).toBe(undefined)
  expect(otherSeenAt(undefined, 'a', 7)).toBe(7)
  expect(otherSeenAt(undefined, 'a')).toBe(undefined)
})

test('covers: herdr/REQ-12/D-33 isShared holds for 30 000 ms and not 30 001, and is false with no other', () => {
  expect(isShared(0, 30000)).toBe(true)
  expect(isShared(0, 30001)).toBe(false)
  expect(isShared(1000, 1000)).toBe(true)
  expect(isShared(undefined, 0)).toBe(false)
})

test('covers: herdr/REQ-12/D-33 shared does not flap: it stays true over own writes until 30 001 ms, then falls, and a new write by the other raises it', () => {
  let file: { key: string; at: number } | undefined = { key: 'b', at: 0 }
  let otherAt: number | undefined
  const tick = (t: number) => {
    otherAt = otherSeenAt(file, 'a', otherAt)
    const shared = isShared(otherAt, t)
    file = { key: 'a', at: t } // this session writes the file, so the next read is its own
    return shared
  }
  for (let t = 0; t <= 30000; t += 1000) expect(tick(t)).toBe(true)
  expect(tick(30001)).toBe(false)
  expect(tick(35000)).toBe(false)
  file = { key: 'b', at: 40000 }
  expect(tick(40000)).toBe(true)
})

test('covers: herdr/REQ-12/D-3 normPath turns \\ into /, strips a trailing /, keeps the root, and lowercases drive and UNC paths only', () => {
  expect(normPath('C:\\Users\\Anton\\Dev\\')).toBe('c:/users/anton/dev')
  expect(normPath('c:/users/anton/dev/')).toBe('c:/users/anton/dev')
  expect(normPath('/home/A/Proj/')).toBe('/home/A/Proj')
  expect(normPath('/')).toBe('/')
  expect(normPath('\\\\srv\\Share\\X')).toBe('//srv/share/x')
})

test('covers: herdr/REQ-12/D-3 folderKey gives the same 8 hex digits for the vectors the panel repeats', () => {
  expect(folderKey('C:\\Users\\anton\\dev\\puppeteering-herdr')).toBe('27494bdf')
  expect(folderKey('c:/users/anton/dev/puppeteering-herdr/')).toBe('27494bdf')
  expect(folderKey('/home/a/proj')).toBe('5c92b791')
  expect(folderKey('/home/a/proj/')).toBe('5c92b791')
  expect(folderKey('/')).toBe('2a0c975e')
  expect(folderKey('\\\\srv\\Share\\X')).toBe('d1ce8abf')
})

test('covers: herdr/REQ-12/D-3 publicStatePath joins home, .claude/puppet-monitor and the folder key, with / only', () => {
  expect(publicStatePath('C:\\Users\\a\\', 'C:\\p')).toBe('C:/Users/a/.claude/puppet-monitor/' + folderKey('C:\\p') + '.json')
  expect(publicStatePath('/home/a/', '/home/a/proj')).toBe('/home/a/.claude/puppet-monitor/5c92b791.json')
  expect(publicStatePath('/home/a', '/home/a/proj')).toBe('/home/a/.claude/puppet-monitor/5c92b791.json')
})
