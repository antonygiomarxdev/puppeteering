import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Board, Loop, Task } from '../types'

const PANE = 'puppet-monitor'
const LEAD = 'lead'
const TICK_MS = 5_000
// A running agent with no tool call for this long is flagged. It may be thinking: the flag says quiet, not stuck.
const QUIET_MS = 120_000
// A single call running this long is flagged too.
const LONG_MS = 300_000

const EMPTY: Board = { loops: {}, tasks: [], shells: [], agents: [], isLeadBusy: false, now: 0 }

// Change the tag when a field changes: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'puppet-monitor', key: 'board' } as const, EMPTY, { shape: 'board-1' })

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m${String(seconds % 60).padStart(2, '0')}s`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

const baseName = (path: string) => path.split('/').pop() ?? path

/** What a call is doing, in a few words, from the fields its tool takes. */
export function summarize(e: Record<string, unknown>): string {
  const tool = String(e.tool)
  const text = (key: string) => (typeof e[key] === 'string' ? (e[key] as string) : undefined)
  const detail =
    text('description') ??
    (text('file_path') && baseName(text('file_path') as string)) ??
    text('pattern') ??
    text('command') ??
    text('subject') ??
    text('url')
  return detail ? `${tool}: ${detail.split('\n')[0]}` : tool
}

function loopOf(state: Board, id: string, now: number): Loop {
  return state.loops[id] ?? { running: [], lastAt: now }
}

/** A loop's flag, if it has earned one. */
export function flagOf(loop: Loop | undefined, now: number): string | undefined {
  if (!loop) return undefined
  const oldest = loop.running.reduce((at, call) => Math.min(at, call.startedAt), Infinity)
  if (now - oldest > LONG_MS) return `long ${elapsed(now - oldest)}`
  if (loop.running.length === 0 && now - loop.lastAt > QUIET_MS) return `quiet ${elapsed(now - loop.lastAt)}`
  return undefined
}

const isRunning = (status: string) => status === 'running' || status === 'pending'

/** Every flag now up, by loop. Only an agent meant to be working can be quiet. */
export function flags(state: Board): string[] {
  const out: string[] = []
  const lead = state.isLeadBusy ? flagOf(state.loops[LEAD], state.now) : undefined
  if (lead) out.push(`${LEAD} ${lead}`)
  for (const agent of state.agents) {
    if (!isRunning(agent.status)) continue
    const flag = flagOf(state.loops[agent.id], state.now)
    if (flag) out.push(`${agent.name} ${flag}`)
  }
  return out
}

function nameOf(state: Board, id: string): string {
  return id === LEAD ? LEAD : (state.agents.find(agent => agent.id === id)?.name ?? id.slice(0, 8))
}

/** The engine's notice that a background shell ended, as text in a conversation row. */
export function shellEnd(content: unknown): { id: string; status: string } | undefined {
  const blocks = Array.isArray(content) ? content : [content]
  const text = blocks
    .map(block => (typeof block === 'string' ? block : ((block as { text?: unknown })?.text ?? '')))
    .join('\n')
  const id = /<task-id>([^<]+)<\/task-id>/.exec(text)?.[1]
  const status = /<status>([^<]+)<\/status>/.exec(text)?.[1]
  return id && status ? { id, status } : undefined
}

export function moveTask(tasks: Task[], input: Record<string, unknown>, who: string): Task[] {
  if (input.status === 'deleted') return tasks.filter(task => task.id !== input.taskId)
  return tasks.map(task =>
    task.id !== input.taskId
      ? task
      : {
          ...task,
          status: (input.status as string) ?? task.status,
          subject: (input.subject as string) ?? task.subject,
          who: (input.owner as string) ?? (input.status === 'in_progress' && !task.who ? who : task.who),
          blockedBy: [...task.blockedBy, ...((input.addBlockedBy as string[]) ?? [])],
        },
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'puppets', description: 'Show who is working on what, in a pane' })
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
          status: agent.status,
        })),
      }))
      const up = flags(await read($, board))
      $.ui.status(up.length > 0 ? `puppets: ${up.join(', ')}` : undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'puppets' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Puppets' })
    return { text: 'Puppets pane opened.' }
  })

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

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? LEAD
    const doing = summarize(e as unknown as Record<string, unknown>)
    const startedAt = await $.clock.now()
    await update($, board, state => {
      const loop = loopOf(state, id, startedAt)
      return {
        ...state,
        now: startedAt,
        loops: {
          ...state.loops,
          [id]: { ...loop, lastAt: startedAt, running: [...loop.running, { id: e.tool_use_id, doing, startedAt }] },
        },
      }
    })

    try {
      const ran = await next(e)
      const result = (ran as { result?: Record<string, any> }).result
      await update($, board, state => {
        const who = nameOf(state, id)
        let { tasks, shells } = state
        if (e.tool === 'TaskCreate' && result?.task) {
          const { id: taskId, subject } = result.task
          tasks = [...tasks, { id: taskId, subject, status: 'pending', blockedBy: [] }]
        }
        if (e.tool === 'TaskUpdate') tasks = moveTask(tasks, e as unknown as Record<string, unknown>, who)
        if (e.tool === 'TaskList' && result?.tasks) {
          tasks = result.tasks.map((task: Task & { owner?: string }) => ({
            id: task.id,
            subject: task.subject,
            status: task.status,
            blockedBy: task.blockedBy ?? [],
            who: task.owner ?? tasks.find(known => known.id === task.id)?.who,
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
            [id]: { running: loop.running.filter(call => call.id !== e.tool_use_id), last: doing, lastAt: doneAt },
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
    const { Box, Text } = $.ui.resolve(e)
    const state = await read($, board)
    const { now } = state

    const row = (id: string, status: string) => {
      const loop = state.loops[id]
      const flag = flagOf(loop, now)
      const call = loop?.running.at(-1)
      // A teammate in a terminal pane of its own runs no loop here: only its status reaches this session.
      const doing = id.includes('@')
        ? 'in its own pane: status only'
        : call
          ? `${call.doing} ${elapsed(now - call.startedAt)}`
          : loop?.last
            ? `was ${loop.last}`
            : 'no tool call yet'
      return (
        <Box flexDirection="column">
          <Text bold={isRunning(status)} dimColor={!isRunning(status)}>
            {nameOf(state, id)} <Text dimColor>{status}</Text>
            {isRunning(status) && flag ? <Text color="red"> {flag}</Text> : null}
          </Text>
          <Text dimColor wrap="truncate-end">
            {'  '}
            {doing}
          </Text>
        </Box>
      )
    }

    const shells = state.shells.filter(shell => !shell.ended).concat(state.shells.filter(shell => shell.ended).slice(-3))

    return (
      <Box flexDirection="column">
        <Text bold>Agents</Text>
        {row(LEAD, state.isLeadBusy ? 'running' : 'idle')}
        {state.agents.map(agent => row(agent.id, agent.status))}

        {shells.length > 0 && <Text bold>{'\n'}Background</Text>}
        {shells.map(shell => (
          <Box flexDirection="column">
            <Text dimColor={Boolean(shell.ended)} wrap="truncate-end">
              {shell.who}: {shell.doing}
            </Text>
            <Text dimColor>
              {'  '}
              {shell.ended ?? `started ${elapsed(now - shell.startedAt)} ago`}
            </Text>
          </Box>
        ))}

        {state.tasks.length > 0 && <Text bold>{'\n'}Tasks</Text>}
        {state.tasks.map(task => (
          <Text dimColor={task.status === 'completed'} wrap="truncate-end">
            {task.status === 'completed' ? '[x]' : task.status === 'in_progress' ? '[~]' : '[ ]'} #{task.id} {task.subject}
            {task.who ? ` (${task.who})` : ''}
            {task.blockedBy.length > 0 && task.status === 'pending' ? ` blocked by ${task.blockedBy.join(', ')}` : ''}
          </Text>
        ))}
      </Box>
    )
  })
}
