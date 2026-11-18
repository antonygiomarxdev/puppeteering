/** What a tool call does, for the office: its costume and prop. */
export type ToolKind = 'write' | 'read' | 'shell' | 'web' | 'message' | 'board' | 'agent' | 'other'

/** One tool call that has started and not answered. */
export type Running = { id: string; doing: string; startedAt: number; kind: ToolKind }

/** One loop: the lead, a subagent or a teammate. */
export type Loop = {
  running: Running[]
  last?: string
  lastAt: number
  /** What it wrote, newest last, one sentence or line each. */
  said: string[]
  /** The call it just made and how many times in a row. */
  repeat?: { sig: string; count: number }
  /** The last call that failed; cleared by its next success. */
  lastError?: { at: number; text: string }
}

export type Task = {
  id: string
  subject: string
  status: string
  /** The owner the task names. */
  owner?: string
  /** The loop that last moved it. */
  by?: string
  blockedBy: string[]
}

export type Shell = {
  id: string
  doing: string
  who: string
  startedAt: number
  /** Set when the engine reports the end. */
  ended?: string
  /** The loop that started it. */
  loop?: string
}

export type Agent = { id: string; name: string; description: string; status: string; type?: string }

/** An agent that left the team, kept a minute so the office can play the leave. */
export type Departed = Agent & { left: number }

/** An agent's last word to another: its final answer, or a message it sent. */
export type Report = { at: number; text: string; to?: string }

/** A change to the queue: a task created, taken by someone, or done. */
export type Event = { at: number; id: string; subject: string; kind: 'created' | 'taken' | 'done'; who?: string }

/** One line of an agent's timeline, oldest first in the board. Texts are capped at 200 characters. */
export type Entry =
  | { type: 'call'; at: number; id: string; end?: number; tool: string; kind: ToolKind; what: string; ok?: boolean }
  | { type: 'said'; at: number; text: string }
  | { type: 'sent'; at: number; to: string; text: string }
  | { type: 'received'; at: number; from: string; text: string }
  | { type: 'task'; at: number; id: string; subject: string; kind: 'taken' | 'done' }
  | { type: 'report'; at: number; text: string }

/** A file an agent edited or wrote, and how many times. */
export type FileTouch = { path: string; count: number }

export type Board = {
  loops: Record<string, Loop>
  reports: Record<string, Report>
  /** Per loop, the last 40 entries, oldest first. */
  timelines?: Record<string, Entry[]>
  /** Per loop, the last 20 files edited, the latest last. */
  files?: Record<string, FileTouch[]>
  tasks: Task[]
  history: Event[]
  shells: Shell[]
  agents: Agent[]
  /** Who left since the last look, for a minute. */
  departed?: Departed[]
  isLeadBusy: boolean
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'puppet-monitor': { board: Shaped<Board> }
  }
}
