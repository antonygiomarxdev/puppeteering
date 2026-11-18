// Mirrors what office() in mods/puppet-monitor/hooks/theatre.ts writes to state-<key>.js. Re-declared on purpose: no imports across the plugin boundary.
export type Alert = { kind: 'loop' | 'stuck' | 'quiet'; text: string }
export type Report = { at: number; text: string; to?: string }
export type HistoryEvent = { at: number; id: string; subject: string; kind: 'created' | 'taken' | 'done'; who?: string }

export type ToolKind = 'write' | 'read' | 'shell' | 'web' | 'message' | 'board' | 'agent' | 'other'

export type Entry =
  | { type: 'call'; at: number; id: string; end?: number; tool: string; kind: ToolKind; what: string; ok?: boolean }
  | { type: 'said'; at: number; text: string }
  | { type: 'sent'; at: number; to: string; text: string }
  | { type: 'received'; at: number; from: string; text: string }
  | { type: 'task'; at: number; id: string; subject: string; kind: 'taken' | 'done' }
  | { type: 'report'; at: number; text: string }
export type FileTouch = { path: string; count: number }

export type Desk = {
  id: string
  name: string
  /** The agent type it was spawned as, and its description. */
  type: string
  description: string
  status: string
  working: boolean
  /** No task in progress and no alert: drawn asleep. */
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
  /** Newest first, at most 40. */
  timeline?: Entry[]
  /** Files edited, latest first, at most 20. */
  files?: FileTouch[]
}

export type Lead = { busy: boolean; alert?: Alert; said?: string; doing: string; kind?: ToolKind; task?: string; timeline?: Entry[]; files?: FileTouch[] }
export type BoardTask = { id: string; subject: string; status: string; owner?: string; blocked: boolean }

export type OfficeState = {
  project: { name: string; cwd: string }
  lead: Lead
  agents: Desk[]
  tasks: { done: number; total: number }
  board: BoardTask[]
  /** Newest first. */
  history: HistoryEvent[]
}
