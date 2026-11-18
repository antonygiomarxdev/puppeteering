// What the board means, and how it is drawn: plain functions, no engine.
import type { Agent, Board, Departed, Entry, Event, FileTouch, Loop, Report, Running, Task, ToolKind } from '../types'

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
const MIN_CARD = 24
const MAX_CARD = 40

export type Alert = { kind: 'loop' | 'stuck' | 'quiet'; text: string }
export type Tone = 'alert' | 'ok' | 'lead' | 'dim' | 'bold' | 'plain'
export type Seg = { text: string; tone: Tone }
export type Line = Seg[]

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

const fit = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(0, width - 1))}~` : text.padEnd(width)

function wrap(text: string, width: number, max: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  if (out.length <= max) return out
  const kept = out.slice(0, max)
  kept[max - 1] = `${kept[max - 1].slice(0, width - 1)}~`
  return kept
}

const FACES: Record<string, string> = { loop: '( x x )', stuck: '( - - )', quiet: '( - - )', idle: '( . . )', done: '( ^ ^ )', on: '( o o )' }

type View = { agent: Agent; loop?: Loop; alert?: Alert; task?: Task; working: boolean }

export function viewOf(board: Board, agent: Agent): View {
  const loop = board.loops[agent.id]
  const working = isWorking(agent.status)
  return { agent, loop, working, alert: working ? alertOf(loop, board.now) : undefined, task: taskOf(board, agent.id, agent.name) }
}

const faceOf = ({ alert, working, agent }: View) =>
  FACES[alert?.kind ?? (working ? 'on' : agent.status === 'completed' ? 'done' : 'idle')]

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

const toneOf = ({ alert, working }: View): Tone => (alert ? 'alert' : working ? 'plain' : 'dim')

function card(view: View, now: number, width: number): Line[] {
  const tone = toneOf(view)
  const said = view.loop?.said.at(-1)
  const quoted = said ? wrap(`"${said}"`, width, 3) : []
  const lines: Line[] = [
    [{ text: fit(`${faceOf(view)} ${view.agent.name}`, width), tone: view.alert ? 'alert' : 'bold' }],
    [{ text: fit(view.alert ? `! ${view.alert.text}` : view.agent.status, width), tone: view.alert ? 'alert' : 'dim' }],
    [{ text: fit(view.task ? `#${view.task.id} ${view.task.subject}` : view.agent.description, width), tone: 'plain' }],
    ...[0, 1, 2].map((i): Line => [{ text: fit(quoted[i] ?? '', width), tone: 'dim' }]),
    ...wrap(doingOf(view, now), width, 2)
      .concat([''])
      .slice(0, 2)
      .map((text): Line => [{ text: fit(text, width), tone }]),
  ]
  return lines
}

const CARD_HEIGHT = 8

function leadLines(board: Board, cols: number, anyAlert: boolean): { lines: Line[]; center: number } {
  const lead = board.loops[LEAD]
  const alert = board.isLeadBusy ? alertOf(lead, board.now) : undefined
  const eyes = anyAlert || alert ? '(@) (@)' : board.isLeadBusy ? '(o) (o)' : '(-) (-)'
  const mouth = anyAlert || alert ? 'vVvVvVv' : '-------'
  const head = ['  .-"""""""-.  ', ` /  \\\\\\ ///  \\ `, `|   ${eyes}   |`, ` \\  ${mouth}  / `, "  '-._____.-'  "]
  const HEAD = head[0].length
  const room = Math.floor(cols / 2) - Math.ceil(HEAD / 2) - 1
  const left = cols >= 70 && room > 0 ? room : 0
  const textWidth = Math.max(10, cols - left - HEAD - 2)
  const said = lead?.said.at(-1)
  const call = currentOf(lead)
  const task = taskOf(board, LEAD, LEAD)
  const right: Line[] = [
    [
      { text: 'LEAD ', tone: 'bold' },
      { text: alert ? `! ${alert.text}` : board.isLeadBusy ? 'working' : 'idle', tone: alert ? 'alert' : 'dim' },
    ],
    [{ text: fit(task ? `#${task.id} ${task.subject}` : '', textWidth), tone: 'plain' }],
    ...wrap(said ? `"${said}"` : '', textWidth, 2)
      .concat(['', ''])
      .slice(0, 2)
      .map((text): Line => [{ text: fit(text, textWidth), tone: 'dim' }]),
    [{ text: fit(call ? `> ${callText(call)} ${elapsed(board.now - call.startedAt)}` : '', textWidth), tone: alert ? 'alert' : 'plain' }],
  ]
  const lines = head.map((part, i): Line => [
    { text: ' '.repeat(left), tone: 'plain' },
    { text: part, tone: anyAlert && i >= 2 && i <= 3 ? 'alert' : 'lead' },
    { text: '  ', tone: 'plain' },
    ...right[i],
  ])
  return { lines, center: left + Math.floor(HEAD / 2) }
}

function threads(center: number, centers: number[], views: View[], width: number): Line[] {
  const low = Math.min(center, ...centers)
  const high = Math.max(center, ...centers)
  const bar = Array.from({ length: high + 1 }, (_, i) =>
    i < low ? ' ' : i === center || centers.includes(i) ? '+' : '-',
  ).join('')
  const drops: Line = []
  let at = 0
  centers.forEach((c, i) => {
    drops.push({ text: `${' '.repeat(c - at)}|`, tone: threadTone(views[i]) })
    at = c + 1
  })
  return [
    [{ text: `${' '.repeat(center)}|`, tone: 'lead' }],
    [{ text: bar.slice(0, width), tone: 'lead' }],
    drops,
  ]
}

const threadTone = (view: View): Tone => (view.alert ? 'alert' : view.agent.status === 'completed' ? 'ok' : view.working ? 'lead' : 'dim')

/** The whole pane, as lines of coloured text, for this many columns and rows. */
export function draw(board: Board, cols: number, rows: number): Line[] {
  const everyone = board.agents.map(agent => viewOf(board, agent))
  // Only who is working takes the stage: the rest wait in one line.
  const views = everyone.filter(view => view.working || view.alert)
  const waiting = everyone.filter(view => !view.working && !view.alert)
  const anyAlert = views.some(view => view.alert)
  const { lines, center } = leadLines(board, cols, anyAlert)
  const out: Line[] = [...lines]

  const perRow = Math.max(1, Math.min(views.length || 1, Math.floor(cols / MIN_CARD)))
  const width = Math.min(MAX_CARD, Math.floor(cols / perRow))
  const rowsOfCards = Math.ceil(views.length / perRow)
  const footer = footerLines(board, cols)
  if (waiting.length > 0) footer.unshift([{ text: `waiting: ${waiting.map(view => view.agent.name).join(', ')}`, tone: 'dim' }])
  const fullHeight = lines.length + rowsOfCards * (CARD_HEIGHT + 1) + 2 + footer.length

  if (views.length > 0 && fullHeight <= rows) {
    for (let start = 0; start < views.length; start += perRow) {
      const row = views.slice(start, start + perRow)
      const offset = Math.floor((cols - row.length * width) / 2)
      // The thread lands on the face, the middle of its seven characters.
      const centers = row.map((_, i) => offset + i * width + 3)
      if (start === 0) out.push(...threads(center, centers, row, cols))
      else out.push(threads(center, centers, row, cols)[2])
      const cards = row.map(view => card(view, board.now, width - 1))
      for (let i = 0; i < CARD_HEIGHT; i++) {
        const line: Line = [{ text: ' '.repeat(Math.max(0, offset)), tone: 'plain' }]
        cards.forEach(one => line.push(...one[i], { text: ' ', tone: 'plain' }))
        out.push(line)
      }
    }
  } else if (views.length > 0) {
    // Too many to stage: one row each, whoever needs a look first.
    out.push([{ text: `${' '.repeat(center)}|`, tone: 'lead' }])
    const sorted = [...views].sort((a, b) => Number(Boolean(b.alert)) - Number(Boolean(a.alert)) || Number(b.working) - Number(a.working))
    const room = Math.max(1, rows - out.length - footer.length - 1)
    for (const view of sorted.slice(0, room)) out.push(compactRow(view, board.now, cols))
    if (sorted.length > room) out.push([{ text: `+${sorted.length - room} more`, tone: 'dim' }])
  }
  return [...out, ...footer].map(line => clip(line, cols))
}

/** Cuts a line to the pane's width, across its coloured pieces. */
function clip(line: Line, cols: number): Line {
  let room = cols
  return line.map(seg => {
    const text = seg.text.slice(0, Math.max(0, room))
    room -= text.length
    return { ...seg, text }
  })
}

function compactRow(view: View, now: number, cols: number): Line {
  const label = `${faceOf(view)} ${view.agent.name}`
  const state = view.alert ? `! ${view.alert.text}` : view.agent.status
  const task = view.task ? `#${view.task.id}` : ''
  return [
    { text: fit(label, 22), tone: view.alert ? 'alert' : 'bold' },
    { text: fit(state, 14), tone: view.alert ? 'alert' : 'dim' },
    { text: fit(task, 5), tone: 'plain' },
    { text: fit(doingOf(view, now), Math.max(10, cols - 42)), tone: toneOf(view) },
  ]
}

function footerLines(board: Board, cols: number): Line[] {
  const out: Line[] = []
  const shells = board.shells.filter(shell => !shell.ended).slice(-3)
  for (const shell of shells) {
    const age = board.now - shell.startedAt
    const late = age > STUCK_MS
    out.push([{ text: fit(`[bg] ${shell.who}: ${shell.doing} ${late ? '! ' : ''}${elapsed(age)}`, cols), tone: late ? 'alert' : 'dim' }])
  }
  const waiting = board.tasks.filter(task => task.status === 'pending')
  const done = board.tasks.filter(task => task.status === 'completed').length
  if (board.tasks.length > 0) {
    const next = waiting
      .slice(0, 3)
      .map(task => `#${task.id}${task.blockedBy.length > 0 ? ` blocked by ${task.blockedBy.join(',')}` : ''}`)
      .join(' ')
    out.push([{ text: fit(`tasks: ${done}/${board.tasks.length} done${next ? ` | waiting ${next}` : ''}`, cols), tone: 'dim' }])
  }
  return out
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
