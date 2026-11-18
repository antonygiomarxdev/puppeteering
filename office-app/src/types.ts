// Mirrors what office() in mods/puppet-monitor/hooks/theatre.ts writes to state-<key>.js. Re-declared on purpose: no imports across the plugin boundary.
export type Alert = { kind: 'loop' | 'stuck' | 'quiet'; text: string }
export type Report = { at: number; text: string; to?: string }
export type HistoryEvent = { at: number; id: string; subject: string; kind: 'created' | 'taken' | 'done'; who?: string }

export type Desk = {
  id: string
  name: string
  status: string
  working: boolean
  /** No task in progress and no alert: drawn asleep. */
  sleeping: boolean
  alert?: Alert
  task?: string
  said?: string
  doing: string
  report?: Report
}

export type Lead = { busy: boolean; alert?: Alert; said?: string; doing: string; task?: string }
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
