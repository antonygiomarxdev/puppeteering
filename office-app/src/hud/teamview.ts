import type { Alert, Desk, Entry, FileTouch, Lead, Thought, ToolKind } from '../types'

export const SELECT_EVENT = 'select-agent'
export const LEAD_ID = 'lead'
const TEN_MIN = 10 * 60_000
const CUT_OFF_MS = 60_000

// An older mod writes neither; treat both as optional.
export type Extras = { timeline?: Entry[]; files?: FileTouch[] }

/** One card: a desk or the lead, reduced to what the panel shows. */
export type Card = {
  id: string
  name: string
  role: string
  lead: boolean
  working: boolean
  sleeping: boolean
  task?: string
  doing: string
  kind?: ToolKind
  since?: number
  said?: string
  /** Kept apart from `said`: the card and the drawer each give it its own line. */
  thinking?: Thought
  report?: Desk['report']
  alert?: Alert
  lastError?: Desk['lastError']
  blockedBy?: string[]
  extras: Extras
}

export const deskCard = (d: Desk): Card => ({
  id: d.id, name: d.name, role: d.type || d.description, lead: false,
  working: d.working, sleeping: d.sleeping, task: d.task, doing: d.doing, kind: d.kind, since: d.since,
  said: d.said, thinking: d.thinking, report: d.report, alert: d.alert, lastError: d.lastError, blockedBy: d.blockedBy,
  extras: { timeline: d.timeline, files: d.files },
})

export const leadCard = (l: Lead): Card => ({
  id: LEAD_ID, name: 'lead', role: 'team lead', lead: true,
  working: l.busy, sleeping: false, task: l.task, doing: l.doing, kind: l.kind, said: l.said, thinking: l.thinking, alert: l.alert, extras: { timeline: l.timeline, files: l.files },
})

/** Problems first (alert, recent error, blocked), then working, then idle, then sleeping. */
export function rank(c: Card, now: number): number {
  const error = c.lastError && now - c.lastError.at < TEN_MIN
  if (c.alert || error || c.blockedBy?.length) return 0
  if (c.sleeping) return 3
  return c.working ? 1 : 2
}

export const sortCards = (cards: Card[], now: number): Card[] =>
  cards.map((c, i) => ({ c, i, r: rank(c, now) })).sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.c)

/** 4s, 4m 05s, 1h 05m. */
export function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

// `doing` reads "> Edit: register.tsx 12s" or "Bash: npm test"; keep tool and detail.
function parseDoing(doing: string): { tool: string; detail: string } {
  const text = doing.replace(/^>\s*/, '').replace(/\s+\d+(?:s|m(?: \d+s)?|h(?: \d+m)?)$/, '')
  const i = text.indexOf(': ')
  return i < 0 ? { tool: text, detail: '' } : { tool: text.slice(0, i), detail: text.slice(i + 2) }
}

/** "Editing register.tsx", "Reading x", "Running `npm test`", "Searching the web". */
export function actionPhrase(kind: ToolKind | undefined, doing: string): string {
  const { tool, detail } = parseDoing(doing)
  if (!doing) return ''
  switch (kind) {
    case 'write': return detail ? `Editing ${detail}` : 'Editing'
    case 'read': return detail ? `Reading ${detail}` : 'Reading'
    case 'shell': return detail ? `Running \`${detail}\`` : 'Running a command'
    case 'web': return 'Searching the web'
    case 'message': return detail ? `Messaging: ${detail}` : 'Messaging'
    case 'board': return detail ? `Updating the board: ${detail}` : 'Updating the board'
    case 'agent': return detail ? `Delegating: ${detail}` : 'Delegating'
    default: return detail ? `${tool}: ${detail}` : tool
  }
}

/** The NOW phrase of a card; a sleeping agent has none, even if `doing` is stale. */
export const cardAction = (c: Pick<Card, 'sleeping' | 'kind' | 'doing'>): string => (c.sleeping ? '' : actionPhrase(c.kind, c.doing))

/** What a thought reads as: its text when the engine sent any, else how long the agent has thought, live while the block is open. */
export function thinkingLine(t: Thought | undefined, now: number, working = true): string | undefined {
  if (!t) return undefined
  if (t.text) return t.text
  if (t.end !== undefined) return `thought for ${elapsed(t.end - t.since)}`
  // A block that never closed (a turn cut short) is not counted on forever: `at` is the last time the mod saw it stream.
  return isCutOff(t, now, working) ? `thought for ${elapsed(t.at - t.since)}, cut off` : `thinking… ${elapsed(now - t.since)}`
}

/** An open thought whose agent stopped working, or that has not streamed for over a minute. */
export const isCutOff = (t: Thought, now: number, working: boolean): boolean => t.end === undefined && (!working || now - t.at > CUT_OFF_MS)

/** The card's Thinking line: a thought with text, or one still open on a working agent; an empty, closed one says nothing there. */
export const cardThinking = (c: Pick<Card, 'thinking' | 'working' | 'sleeping'>, now: number): string | undefined =>
  !c.thinking || c.sleeping || (!c.thinking.text && (c.thinking.end !== undefined || isCutOff(c.thinking, now, c.working))) ? undefined : thinkingLine(c.thinking, now, c.working)
