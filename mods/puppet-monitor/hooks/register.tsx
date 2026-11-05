import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Board, Loop, Task } from '../types'
import { LEAD, alerts, draw, moveTask, remember, shellEnd, signature, summarize } from './theatre'
import type { Tone } from './theatre'

const PANE = 'puppet-monitor'
const TICK_MS = 5_000
// Agents rarely write between steps unless asked, and this is what the pane shows of them.
const NARRATE = '\n\nBefore each tool call, write one short sentence saying what you are about to do and why. A monitor shows it to the person running this team.'

const EMPTY: Board = { loops: {}, tasks: [], shells: [], agents: [], isLeadBusy: false, now: 0 }

// Change the tag when a field changes: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'puppet-monitor', key: 'board' } as const, EMPTY, { shape: 'board-2' })

const loopOf = (state: Board, id: string, now: number): Loop => state.loops[id] ?? { running: [], lastAt: now, said: [] }

const COLORS: Partial<Record<Tone, string>> = { alert: '#ff5a5a', ok: '#6bf0a0', lead: '#ffb000' }


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'puppets', description: 'Show the lead and its agents at work, in a pane' })
    void $.ui.open({ id: PANE, title: 'Puppets' })

    $.clock.every(TICK_MS, async () => {
      const now = await $.clock.now()
      const agents = await $.agent.list()
      await update($, board, state => ({
        ...state,
        now,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name ?? agent.description ?? agent.type,
          description: agent.description ?? agent.type,
          status: agent.status,
        })),
      }))
      const up = alerts(await read($, board))
      $.ui.status(up.length > 0 ? `puppets: ${up.join(', ')}` : undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'puppets' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Puppets' })
    return { text: 'Puppets pane opened.' }
  })

  on('agent.spawn', ($, e, next) => next({ ...e, prompt: e.prompt + NARRATE })).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, board, state => ({
      ...state,
      isLeadBusy: true,
      loops: { ...state.loops, [LEAD]: { ...loopOf(state, LEAD, now), lastAt: now } },
    }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) await update($, board, state => ({ ...state, isLeadBusy: false }))
    return next(e)
  })

  // What each agent writes, kept by block so a stream does not redraw per word.
  on('turn.step', async function* ($, e, next) {
    const id = e.agentId ?? LEAD
    const save = async (text: string) => {
      if (!text.trim()) return
      const now = await $.clock.now()
      await update($, board, state => {
        const loop = loopOf(state, id, now)
        return { ...state, now, loops: { ...state.loops, [id]: { ...loop, lastAt: now, said: remember(loop.said, text) } } }
      })
    }
    const stream = next(e)
    let text = ''
    while (true) {
      const { value, done } = await stream.next()
      if (done) {
        await save(text)
        return value
      }
      if (value.kind === 'text' || value.kind === 'thinking') text += value.text
      if (value.kind === 'tool') {
        await save(text)
        text = ''
      }
      yield value
    }
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? LEAD
    const fields = e as unknown as Record<string, unknown>
    const doing = summarize(fields)
    const sig = signature(fields)
    const startedAt = await $.clock.now()
    await update($, board, state => {
      const loop = loopOf(state, id, startedAt)
      return {
        ...state,
        now: startedAt,
        loops: {
          ...state.loops,
          [id]: {
            ...loop,
            lastAt: startedAt,
            running: [...loop.running, { id: e.tool_use_id, doing, startedAt }],
            repeat: { sig, count: loop.repeat?.sig === sig ? loop.repeat.count + 1 : 1 },
          },
        },
      }
    })

    try {
      const ran = await next(e)
      const result = (ran as { result?: Record<string, any> }).result
      await update($, board, state => {
        const who = id === LEAD ? LEAD : (state.agents.find(agent => agent.id === id)?.name ?? id.slice(0, 8))
        let { tasks, shells } = state
        if (e.tool === 'TaskCreate' && result?.task) {
          const { id: taskId, subject } = result.task
          tasks = [...tasks, { id: taskId, subject, status: 'pending', blockedBy: [] }]
        }
        if (e.tool === 'TaskUpdate') tasks = moveTask(tasks, fields, id)
        if (e.tool === 'TaskList' && result?.tasks) {
          tasks = result.tasks.map((task: Task) => ({
            id: task.id,
            subject: task.subject,
            status: task.status,
            blockedBy: task.blockedBy ?? [],
            owner: task.owner,
            by: tasks.find(known => known.id === task.id)?.by,
          }))
        }
        if (e.tool === 'Bash' && result?.backgroundTaskId) {
          shells = [...shells, { id: result.backgroundTaskId, doing, who, startedAt }].slice(-20)
        }
        if (e.tool === 'TaskStop' && result?.task_id) {
          shells = shells.map(shell => (shell.id === result.task_id ? { ...shell, ended: 'stopped' } : shell))
        }
        return { ...state, tasks, shells }
      })
      return ran
    } finally {
      const doneAt = await $.clock.now()
      await update($, board, state => {
        const loop = loopOf(state, id, doneAt)
        return {
          ...state,
          now: doneAt,
          loops: {
            ...state.loops,
            [id]: { ...loop, running: loop.running.filter(call => call.id !== e.tool_use_id), last: doing, lastAt: doneAt },
          },
        }
      })
    }
    // A monitor must never cost anyone a tool call.
  }).catch(($, e, next) => next(e))

  on('session.append', async ($, e, next) => {
    const ended = shellEnd(e.message?.content)
    if (ended) {
      await update($, board, state => ({
        ...state,
        shells: state.shells.map(shell => (shell.id === ended.id ? { ...shell, ended: ended.status } : shell)),
      }))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const state = await read($, board)
    const cols = e.props.bodyColumns ?? 60
    const rows = e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 30
    const openable = state.agents.filter(agent => !agent.id.includes('@')).slice(0, 9)

    return (
      <Box flexDirection="column">
        {draw(state, cols, rows - (openable.length > 0 ? 2 : 0)).map(line => (
          <Text wrap="truncate-end">
            {line.map(seg => (
              <Text color={COLORS[seg.tone]} dimColor={seg.tone === 'dim'} bold={seg.tone === 'bold'}>
                {seg.text}
              </Text>
            ))}
          </Text>
        ))}
        {openable.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            <Text dimColor>open:</Text>
            {openable.map((agent, i) => (
              <Button key={agent.id} hotkey={String(i + 1)} onPress={() => void $.ui.view({ agentId: agent.id })}>
                {i + 1} {agent.name.slice(0, 14)}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}

