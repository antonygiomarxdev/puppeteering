import { expect, test } from 'claude-code/testing'

import { flagOf, flags, moveTask, shellEnd, summarize } from './register'

const MIN = 60_000
const quietLoop = { running: [], lastAt: 0 }

test('a loop with no call is flagged only after two minutes', () => {
  expect(flagOf(quietLoop, 1.9 * MIN)).toBe(undefined)
  expect(flagOf(quietLoop, 15 * MIN)).toBe('quiet 15m00s')
})

test('one call running too long is flagged even while the loop is active', () => {
  const loop = { running: [{ id: 'a', doing: 'Bash', startedAt: 0 }], lastAt: 15 * MIN }
  expect(flagOf(loop, 4 * MIN)).toBe(undefined)
  expect(flagOf(loop, 15 * MIN)).toBe('long 15m00s')
})

test('only agents meant to be working can be flagged', () => {
  const base = { tasks: [], shells: [], now: 15 * MIN }
  const loops = { lead: quietLoop, b: quietLoop, c: quietLoop }
  const agents = [
    { id: 'b', name: 'builder', status: 'running' },
    { id: 'c', name: 'idle-one', status: 'idle' },
  ]
  expect(flags({ ...base, loops, agents, isLeadBusy: false })).toEqual(['builder quiet 15m00s'])
  expect(flags({ ...base, loops, agents, isLeadBusy: true })).toEqual(['lead quiet 15m00s', 'builder quiet 15m00s'])
})

test('a call is summarized by what it acts on', () => {
  expect(summarize({ tool: 'Bash', command: 'ls\nmore', description: 'List files' })).toBe('Bash: List files')
  expect(summarize({ tool: 'Bash', command: 'ls\nmore' })).toBe('Bash: ls')
  expect(summarize({ tool: 'Read', file_path: '/a/b/c.md' })).toBe('Read: c.md')
  expect(summarize({ tool: 'TaskList' })).toBe('TaskList')
})

test('a task names its owner, or who moved it, and leaves when deleted', () => {
  const tasks = [{ id: '1', subject: 's', status: 'pending', blockedBy: [] }]
  expect(moveTask(tasks, { taskId: '1', status: 'in_progress' }, 'builder')[0].who).toBe('builder')
  expect(moveTask(tasks, { taskId: '1', owner: 'you', status: 'in_progress' }, 'builder')[0].who).toBe('you')
  expect(moveTask(tasks, { taskId: '1', addBlockedBy: ['2'] }, 'lead')[0].blockedBy).toEqual(['2'])
  expect(moveTask(tasks, { taskId: '1', status: 'deleted' }, 'lead')).toEqual([])
})

test('the end of a shell is read from the engine notice', () => {
  const notice = '<task-notification><task-id>b1</task-id><status>failed</status></task-notification>'
  expect(shellEnd(notice)).toEqual({ id: 'b1', status: 'failed' })
  expect(shellEnd([{ type: 'text', text: notice }])).toEqual({ id: 'b1', status: 'failed' })
  expect(shellEnd('nothing here')).toBe(undefined)
})

const PANE = {
  plugin: 'puppet-monitor',
  component: 'Pane',
  requestId: 'puppet-monitor',
  props: { title: 'Puppets', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

test('the pane shows who runs what, and the lead with nothing yet', async ($, on) => {
  on('clock.now', () => ({ value: 1000 }))
  on('tool.call', () => ({ result: { task: { id: '7', subject: 'Ship it' } } }))

  await $.tool.call({ tool: 'TaskCreate', subject: 'Ship it', description: 'x' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Ship it/ }))?.text).toContain('#7')
    expect(await ui.find({ type: 'Text', text: /lead/ })).toBeTruthy()
    await ui.unmount()
  }
})
