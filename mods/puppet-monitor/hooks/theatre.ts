// What the board means: plain functions, no engine.
import type { Agent, Board, Departed, Entry, Event, FileTouch, Loop, Report, Running, Task, Thought, ToolKind } from '../types'

export const LEAD = 'lead'
export const HISTORY_KEPT = 200
// How long an agent that left stays on the floor, so the office can play the leave.
export const GONE_MS = 60_000
const HISTORY_SHOWN = 50
// A working agent with no activity for this long is flagged. It may be thinking: the flag says quiet.
const QUIET_MS = 120_000
// One call running this long is flagged, as it may be stuck.
const STUCK_MS = 300_000
// The same call this many times in a row is flagged, as it may be looping.
const LOOP_COUNT = 3
const SAID_KEPT = 8
export const TIMELINE_KEPT = 40
export const FILES_KEPT = 20
const TEXT_MAX = 200
// The card's thinking text is clamped on the page; this only bounds the state file.
const THOUGHT_MAX = 2_000

export type Alert = { kind: 'loop' | 'stuck' | 'quiet'; text: string }

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m${String(seconds % 60).padStart(2, '0')}s`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path

/** What a call is doing, in a few words, from the fields its tool takes. */
export function summarize(e: Record<string, unknown>): string {
  const tool = String(e.tool)
  const text = (key: string) => (typeof e[key] === 'string' ? (e[key] as string) : undefined)
  // A REPL script is shown by its first line: its calls are nested under it.
  if (tool === 'REPL') return `Code: ${(text('code') ?? '').split('\n').find(line => line.trim())?.trim() ?? 'script'}`
  const detail =
    text('description') ??
    (text('file_path') && baseName(text('file_path') as string)) ??
    text('pattern') ??
    text('command') ??
    text('subject') ??
    text('url')
  return detail ? `${tool}: ${detail.split('\n')[0]}` : tool
}

/** The identity of a call, to tell a repeat from new work. */
export function signature(e: Record<string, unknown>): string {
  const { tool_use_id: _id, agentId: _agent, ...rest } = e
  return JSON.stringify(rest)
}

const cap = (text: string) => (text.length > TEXT_MAX ? text.slice(0, TEXT_MAX) : text)

/** Adds an entry to a loop's timeline: texts capped, the oldest dropped past 40. */
export function push(board: Board, id: string, entry: Entry): Board {
  const capped = Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, typeof value === 'string' ? cap(value) : value])) as Entry
  const timelines = board.timelines ?? {}
  return { ...board, timelines: { ...timelines, [id]: [...(timelines[id] ?? []), capped].slice(-TIMELINE_KEPT) } }
}

/** Fills the end and result of the call entry with this id, or of the inner call of a script. */
export function endCall(board: Board, id: string, callId: string, end: number, ok: boolean): Board {
  const timelines = board.timelines ?? {}
  const line = timelines[id]
  if (!line) return board
  const done = (entry: Entry): Entry => {
    if (entry.type !== 'call') return entry
    if (entry.id === callId) return { ...entry, end, ok, what: entry.what === 'Code: script' && entry.inner ? `Code: ${entry.inner.length} calls` : entry.what }
    return entry.inner?.some(call => call.id === callId) ? { ...entry, inner: entry.inner.map(call => (call.id === callId ? { ...call, ok } : call)) } : entry
  }
  return { ...board, timelines: { ...timelines, [id]: line.map(done) } }
}

/**
 * Starts a call: a loop's running list and timeline. While a script (a REPL call) runs in the loop,
 * a call that starts is taken as one of its own and nested under it, not listed beside it.
 * shortcut: nothing in a call says it came from a script, so a call made beside one is nested too; Code Mode makes every call a script's.
 */
export function startCall(board: Board, id: string, call: Running & { tool: string }): Board {
  const loop = board.loops[id] ?? { running: [], lastAt: call.startedAt, said: [] }
  const script = call.kind === 'code' ? undefined : loop.running.find(known => known.kind === 'code')
  const running = loop.running.map(known => (known === script ? { ...known, inner: (known.inner ?? 0) + 1 } : known))
  const moved = { ...board, loops: { ...board.loops, [id]: { ...loop, running: [...running, call] } } }
  if (!script) return push(moved, id, { type: 'call', at: call.startedAt, id: call.id, tool: call.tool, kind: call.kind, what: call.doing })
  const inner = { id: call.id, tool: call.tool, what: cap(call.doing) }
  const timelines = moved.timelines ?? {}
  const line = (timelines[id] ?? []).map(entry => (entry.type === 'call' && entry.id === script.id ? { ...entry, inner: [...(entry.inner ?? []), inner] } : entry))
  return { ...moved, timelines: { ...timelines, [id]: line } }
}

/** Counts a file touched by a loop; the latest touched goes last. */
export function touch(board: Board, id: string, path: string): Board {
  const files = board.files ?? {}
  const mine = files[id] ?? []
  const count = (mine.find(file => file.path === path)?.count ?? 0) + 1
  return { ...board, files: { ...files, [id]: [...mine.filter(file => file.path !== path), { path, count }].slice(-FILES_KEPT) } }
}

/** The loop id a name or id stands for: an agent by either, else the name as given (the lead). */
export const loopKey = (board: Board, who: string): string => board.agents.find(agent => agent.id === who || agent.name === who)?.id ?? who

/** A SendMessage: `sent` for the sender, `received` for whoever it names. */
export function deliver(board: Board, from: string, fields: Record<string, unknown>, at: number): Board {
  const to = typeof fields.to === 'string' ? fields.to : ''
  const text = String(fields.message ?? fields.text ?? fields.summary ?? '').split('\n')[0] ?? ''
  const name = from === LEAD ? LEAD : (board.agents.find(agent => agent.id === from)?.name ?? from)
  const sent = push(board, from, { type: 'sent', at, to, text })
  return to ? push(sent, loopKey(board, to), { type: 'received', at, from: name, text }) : sent
}

/** Sentences or lines of what an agent wrote, cleaned for one row each. */
export function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?:])\s+(?=[A-Z¿¡"`])/)
    .map(part => part.replace(/[*`#>]+/g, '').trim())
    .filter(part => part.length > 2)
}

export function remember(said: string[], text: string): string[] {
  return [...said, ...sentences(text)].slice(-SAID_KEPT)
}

/** A thinking block begins: the loop is thinking from now, apart from what it says. */
export function startThought(board: Board, id: string, now: number): Board {
  const loop = board.loops[id] ?? { running: [], lastAt: now, said: [] }
  return { ...board, loops: { ...board.loops, [id]: { ...loop, lastAt: now, thinking: { since: now, at: now } } } }
}

/** The open block is still streaming at `now`: the page reads a block cut short as lasting until its last `at`. */
export function streamThought(board: Board, id: string, now: number): Board {
  const loop = board.loops[id]
  if (!loop?.thinking || loop.thinking.end !== undefined) return board
  return { ...board, loops: { ...board.loops, [id]: { ...loop, lastAt: now, thinking: { ...loop.thinking, at: now } } } }
}

/** The block closes: its text (often empty, as the engine sends it) is kept, and a `thought` goes on the timeline. */
export function endThought(board: Board, id: string, text: string, now: number): Board {
  const loop = board.loops[id]
  if (!loop?.thinking || loop.thinking.end !== undefined) return board
  const clean = text.trim() ? text.trim().slice(0, THOUGHT_MAX) : undefined
  const thinking = { ...loop.thinking, at: now, end: now, text: clean }
  const moved = { ...board, loops: { ...board.loops, [id]: { ...loop, lastAt: now, thinking } } }
  return push(moved, id, { type: 'thought', at: thinking.since, end: now, ...(clean ? { text: clean } : {}) })
}

export function shellEnd(content: unknown): { id: string; status: string } | undefined {
  const blocks = Array.isArray(content) ? content : [content]
  const text = blocks
    .map(block => (typeof block === 'string' ? block : ((block as { text?: unknown })?.text ?? '')))
    .join('\n')
  const id = /<task-id>([^<]+)<\/task-id>/.exec(text)?.[1]
  const status = /<status>([^<]+)<\/status>/.exec(text)?.[1]
  return id && status ? { id, status } : undefined
}

export function moveTask(tasks: Task[], input: Record<string, unknown>, by: string): Task[] {
  if (input.status === 'deleted') return tasks.filter(task => task.id !== input.taskId)
  return tasks.map(task =>
    task.id !== input.taskId
      ? task
      : {
          ...task,
          status: (input.status as string) ?? task.status,
          subject: (input.subject as string) ?? task.subject,
          owner: (input.owner as string) ?? task.owner,
          by: input.status === 'in_progress' ? by : task.by,
          blockedBy: [...task.blockedBy, ...((input.addBlockedBy as string[]) ?? [])],
        },
  )
}

/** The worst thing true of a loop that is meant to be working. */
export function alertOf(loop: Loop | undefined, now: number): Alert | undefined {
  if (!loop) return undefined
  if (loop.repeat && loop.repeat.count >= LOOP_COUNT) return { kind: 'loop', text: `LOOPING ${loop.repeat.count}x` }
  const oldest = loop.running.reduce((at, call) => Math.min(at, call.startedAt), Infinity)
  if (now - oldest > STUCK_MS) return { kind: 'stuck', text: `STUCK ${elapsed(now - oldest)}` }
  if (loop.running.length === 0 && now - loop.lastAt > QUIET_MS) return { kind: 'quiet', text: `QUIET ${elapsed(now - loop.lastAt)}` }
  return undefined
}

export const isWorking = (status: string) => status === 'running' || status === 'pending'

const KIND_OF: Record<string, ToolKind> = {
  Edit: 'write', Write: 'write', NotebookEdit: 'write',
  Read: 'read', Grep: 'read', Glob: 'read', LSP: 'read',
  Bash: 'shell', Monitor: 'shell', PowerShell: 'shell',
  WebFetch: 'web', WebSearch: 'web',
  SendMessage: 'message',
  TaskCreate: 'board', TaskUpdate: 'board', TaskList: 'board', TaskGet: 'board',
  Agent: 'agent',
  REPL: 'code',
}

/** What a tool call does, by its name: the office draws the costume and prop from it. */
export function kindOf(tool: string): ToolKind {
  if (tool.startsWith('mcp__claude-in-chrome__')) return 'web'
  return KIND_OF[tool] ?? 'other'
}

/** The first line of why a call failed, or undefined when it worked. */
export function errorOf(ran: { isError?: boolean; text?: string; deny?: string }): string | undefined {
  if (ran.deny !== undefined) return ran.deny.split('\n')[0]
  return ran.isError ? (ran.text ?? 'failed').split('\n')[0] : undefined
}

/** Who left since the last look, kept GONE_MS from the moment they left. */
export function departures(state: Pick<Board, 'agents' | 'departed'>, listed: Agent[], now: number): Departed[] {
  const here = new Set(listed.map(agent => agent.id))
  const kept = (state.departed ?? []).filter(agent => !here.has(agent.id) && now - agent.left <= GONE_MS)
  return [...kept, ...state.agents.filter(agent => !here.has(agent.id)).map(agent => ({ ...agent, left: now }))]
}

/** Every alert now up, as words for the status line. */
export function alerts(board: Board): string[] {
  const out: string[] = []
  const lead = board.isLeadBusy ? alertOf(board.loops[LEAD], board.now) : undefined
  if (lead) out.push(`${LEAD} ${lead.text}`)
  for (const agent of board.agents) {
    if (!isWorking(agent.status)) continue
    const alert = alertOf(board.loops[agent.id], board.now)
    if (alert) out.push(`${agent.name} ${alert.text}`)
  }
  return out
}

/** What changed between two snapshots of the queue: taken, or done. `by` is who moved it, if known. */
export function historyOf(before: Task[], after: Task[], at: number, by?: string): Event[] {
  const out: Event[] = []
  for (const task of after) {
    const prev = before.find(known => known.id === task.id)
    if (!prev || prev.status === task.status && prev.owner === task.owner) continue
    const event = { at, id: task.id, subject: task.subject }
    if (task.status === 'completed' && prev.status !== 'completed') out.push({ ...event, kind: 'done', who: by ?? task.owner })
    else if (prev.status === 'pending' && (task.status === 'in_progress' || task.owner !== prev.owner)) out.push({ ...event, kind: 'taken', who: task.owner ?? by })
  }
  return out
}

/** The task an agent is on: one it owns, or one it moved to in progress. */
export function taskOf(board: Board, id: string, name: string): Task | undefined {
  const open = board.tasks.filter(task => task.status === 'in_progress')
  return open.find(task => task.owner === name) ?? open.find(task => task.by === id && !task.owner)
}

type View = { agent: Agent; loop?: Loop; alert?: Alert; task?: Task; working: boolean }

export function viewOf(board: Board, agent: Agent): View {
  const loop = board.loops[agent.id]
  const working = isWorking(agent.status)
  return { agent, loop, working, alert: working ? alertOf(loop, board.now) : undefined, task: taskOf(board, agent.id, agent.name) }
}

/** The call a loop is on: its script while one runs (its inner calls are part of it), else the latest. */
export const currentOf = (loop?: Loop): Running | undefined => loop?.running.find(call => call.kind === 'code') ?? loop?.running.at(-1)

/** What a running call says it is doing; a script says how many calls it made. */
const callText = (call: Running): string => (call.kind === 'code' ? `Running code (${call.inner ?? 0} calls)` : call.doing)

export function doingOf({ agent, loop }: View, now: number): string {
  // A teammate in a terminal pane of its own runs no loop here: only its status reaches this session.
  if (agent.id.includes('@')) return 'own pane: status only'
  const call = currentOf(loop)
  if (call) return `> ${callText(call)} ${elapsed(now - call.startedAt)}`
  return loop?.last ? `was ${loop.last}` : 'no tool call yet'
}

/** What the office page draws: plain data, written to state.js. */
export type Desk = {
  id: string
  name: string
  /** The agent type it was spawned as, and its description. */
  type: string
  description: string
  status: string
  working: boolean
  /** No task in progress and no alert: the office draws it asleep. */
  sleeping: boolean
  alert?: Alert
  task?: string
  said?: string
  /** The last thinking block, kept apart from `said`. */
  thinking?: Thought
  doing: string
  report?: Report
  /** The current call's kind, and when it started. Undefined between calls. */
  kind?: ToolKind
  since?: number
  lastError?: { at: number; text: string }
  /** Open tasks that block this agent's task. */
  blockedBy?: string[]
  /** Left the team within the last minute. */
  gone?: boolean
  /** Newest first, at most 40 entries. */
  timeline: Entry[]
  /** Files edited, latest first, at most 20. */
  files: FileTouch[]
}

const timelineOf = (board: Board, id: string) => ({
  timeline: [...(board.timelines?.[id] ?? [])].reverse(),
  files: [...(board.files?.[id] ?? [])].reverse(),
})

function deskOf(board: Board, agent: Agent, gone: boolean): Desk {
  const view = viewOf(board, agent)
  const call = currentOf(view.loop)
  const blockedBy = view.task?.blockedBy.filter(id => board.tasks.some(known => known.id === id && known.status !== 'completed')) ?? []
  return {
    id: agent.id,
    name: agent.name,
    type: agent.type ?? '',
    description: agent.description,
    status: agent.status,
    working: gone ? false : view.working,
    sleeping: gone || (!view.task && !view.alert),
    alert: gone ? undefined : view.alert,
    task: view.task && `#${view.task.id} ${view.task.subject}`,
    said: view.loop?.said.at(-1),
    thinking: gone ? undefined : view.loop?.thinking,
    doing: doingOf(view, board.now),
    report: board.reports[agent.id],
    kind: call?.kind,
    since: call?.startedAt,
    lastError: view.loop?.lastError,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
    gone: gone || undefined,
    ...timelineOf(board, agent.id),
  }
}

// The project is the directory the session runs in: the office names it, so a page is not mistaken for another project's.
export function office(board: Board, cwd = '') {
  const lead = board.loops[LEAD]
  const leadTask = taskOf(board, LEAD, LEAD)
  const nameOf = (taker?: string) => (taker === LEAD ? LEAD : board.agents.find(agent => agent.id === taker || agent.name === taker)?.name ?? taker)
  const call = currentOf(lead)
  return {
    project: { name: baseName(cwd), cwd },
    lead: {
      busy: board.isLeadBusy,
      alert: board.isLeadBusy ? alertOf(lead, board.now) : undefined,
      said: lead?.said.at(-1),
      thinking: lead?.thinking,
      doing: call ? `${callText(call)} ${elapsed(board.now - call.startedAt)}` : '',
      kind: call?.kind,
      task: leadTask && `#${leadTask.id} ${leadTask.subject}`,
      ...timelineOf(board, LEAD),
    },
    agents: [
      ...board.agents.map(agent => deskOf(board, agent, false)),
      ...(board.departed ?? []).map(agent => deskOf(board, agent, true)),
    ],
    tasks: { done: board.tasks.filter(task => task.status === 'completed').length, total: board.tasks.length },
    // The queue on the wall: every task, and who took it, by the name the office shows.
    board: board.tasks.map(task => {
      const taker = task.owner ?? task.by
      return { id: task.id, subject: task.subject, status: task.status, owner: nameOf(taker), blocked: task.blockedBy.length > 0 }
    }),
    // The newest first, the last few: who took or finished each task, by the name the office shows.
    history: board.history.slice(-HISTORY_SHOWN).reverse().map(event => ({ ...event, who: nameOf(event.who) })),
  }
}
