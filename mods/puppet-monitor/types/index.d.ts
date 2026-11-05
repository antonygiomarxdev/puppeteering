/** One tool call that has started and not answered. */
export type Running = { id: string; doing: string; startedAt: number }

/** One loop: the lead, a subagent or a teammate. */
export type Loop = {
  running: Running[]
  last?: string
  lastAt: number
  /** What it wrote, newest last, one sentence or line each. */
  said: string[]
  /** The call it just made and how many times in a row. */
  repeat?: { sig: string; count: number }
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
}

export type Agent = { id: string; name: string; description: string; status: string }

export type Board = {
  loops: Record<string, Loop>
  tasks: Task[]
  shells: Shell[]
  agents: Agent[]
  isLeadBusy: boolean
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'puppet-monitor': { board: Shaped<Board> }
  }
}
