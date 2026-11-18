// The state file is a trust boundary: it is written by whatever mod version the session runs, old or new, and the page reads it.
// normalize() turns anything into a complete OfficeState, so the scene and the HUD never meet a missing field.
import type { Alert, BoardTask, Desk, HistoryEvent, Lead, OfficeState, Report, ToolKind } from './types'

const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {})
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
const str = (x: unknown, fallback = ''): string => (typeof x === 'string' ? x : x === undefined || x === null ? fallback : String(x))
const num = (x: unknown, fallback = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback)
const opt = <T>(x: unknown, ok: (v: unknown) => v is T): T | undefined => (ok(x) ? x : undefined)

const isAlert = (x: unknown): x is Alert => typeof obj(x).text === 'string' && ['loop', 'stuck', 'quiet'].includes(obj(x).kind as string)
const isReport = (x: unknown): x is Report => typeof obj(x).text === 'string' && typeof obj(x).at === 'number'
const isError = (x: unknown): x is { at: number; text: string } => typeof obj(x).text === 'string' && typeof obj(x).at === 'number'
const isKind = (x: unknown): x is ToolKind => ['write', 'read', 'shell', 'web', 'message', 'board', 'agent', 'other'].includes(x as string)

function agent(raw: unknown, i: number): Desk {
  const a = obj(raw)
  const name = str(a.name, str(a.id, `agent-${i}`))
  return {
    ...(a as Partial<Desk>),
    id: str(a.id, name),
    name,
    type: str(a.type),
    description: str(a.description),
    status: str(a.status),
    working: Boolean(a.working),
    sleeping: Boolean(a.sleeping),
    doing: str(a.doing),
    alert: opt(a.alert, isAlert),
    report: opt(a.report, isReport),
    kind: opt(a.kind, isKind),
    lastError: opt(a.lastError, isError),
    since: typeof a.since === 'number' ? a.since : undefined,
    task: typeof a.task === 'string' ? a.task : undefined,
    said: typeof a.said === 'string' ? a.said : undefined,
    blockedBy: Array.isArray(a.blockedBy) ? (a.blockedBy as string[]) : undefined,
    timeline: arr(a.timeline) as Desk['timeline'],
    files: arr(a.files) as Desk['files'],
  }
}

function lead(raw: unknown): Lead {
  const l = obj(raw)
  return {
    ...(l as Partial<Lead>),
    busy: Boolean(l.busy),
    doing: str(l.doing),
    alert: opt(l.alert, isAlert),
    kind: opt(l.kind, isKind),
    said: typeof l.said === 'string' ? l.said : undefined,
    task: typeof l.task === 'string' ? l.task : undefined,
    timeline: arr(l.timeline) as Lead['timeline'],
    files: arr(l.files) as Lead['files'],
  }
}

const event = (e: unknown): e is HistoryEvent => typeof obj(e).at === 'number' && typeof obj(e).id !== 'undefined' && ['created', 'taken', 'done'].includes(obj(e).kind as string)

/** Anything in, a complete state out. A missing `project` becomes an empty one, which `isUnpicked` reads as "no session". */
export function normalize(raw: unknown): OfficeState {
  const r = obj(raw)
  const seen = new Set<string>()
  const agents = arr(r.agents).filter(a => a && typeof a === 'object' && !Array.isArray(a)).map(agent).filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)))
  const board = arr(r.board).filter(b => typeof obj(b).id !== 'undefined').map((b): BoardTask => ({ ...(obj(b) as Partial<BoardTask>), id: str(obj(b).id), subject: str(obj(b).subject), status: str(obj(b).status), blocked: Boolean(obj(b).blocked) }))
  const done = board.filter(b => b.status === 'completed').length
  const tasks = obj(r.tasks)
  return {
    project: { name: str(obj(r.project).name), cwd: str(obj(r.project).cwd) },
    lead: lead(r.lead),
    agents,
    tasks: { done: num(tasks.done, done), total: num(tasks.total, board.length) },
    board,
    history: arr(r.history).filter(event) as HistoryEvent[],
  }
}

export const STALE_MS = 5 * 60_000

/** The newest time anything in the state happened, if it says. */
export function newestAt(s: OfficeState): number | undefined {
  const times = [
    ...s.history.map(e => e.at),
    ...s.agents.flatMap(a => [a.report?.at, a.since, a.lastError?.at, a.timeline?.[0]?.at]),
    s.lead.timeline?.[0]?.at,
  ].filter((t): t is number => typeof t === 'number')
  return times.length ? Math.max(...times) : undefined
}

/** True for a state that is not a live session's: no project (the older mod), or nothing has happened in STALE_MS. */
export function isUnpicked(s: OfficeState, now = Date.now()): boolean {
  if (!s.project.name) return true
  const at = newestAt(s)
  return at !== undefined && now - at > STALE_MS
}
