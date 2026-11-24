// Pure: which Claude Code agent herdr sees belongs to which puppet-monitor state file, and the words for its row. No herdr import.
export const STALE_MS = 30_000

// Written twice (here and in puppet-monitor's theatre.ts): a Claude plugin and a herdr mod share no code. The vectors in both tests catch a drift.
export function normPath(p) {
  const slashed = p.replace(/\\/g, '/')
  const bare = slashed.replace(/\/+$/, '') || (slashed ? '/' : '')
  return /^([A-Za-z]:|\/\/)/.test(bare) ? bare.toLowerCase() : bare
}

export function folderKey(cwd) {
  let h = 0x811c9dc5
  const path = normPath(cwd)
  for (let i = 0; i < path.length; i++) h = Math.imul(h ^ path.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}

export const stateFile = (home, cwd) => `${home.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/.claude/puppet-monitor/${folderKey(cwd)}.json`

// One entry per claude-code agent: its session when the folder's file is fresh, schema 1 and names the pane's folder.
export function matchAgents(agents, panes, states, now) {
  return agents.filter(agent => agent.app === 'claude-code').map(agent => {
    const pane = panes.find(known => known.pane === agent.pane)
    const suffix = pane?.cwd ? `/${folderKey(pane.cwd)}.json` : undefined
    const found = suffix && Object.keys(states).find(path => path.endsWith(suffix))
    const state = found ? states[found] : null
    const ok = state && state.schema === 1 && typeof state.at === 'number' && now - state.at <= STALE_MS && typeof state.cwd === 'string' && normPath(state.cwd) === normPath(pane.cwd)
    return { agent, session: ok ? state : null, shared: ok ? state.shared === true : false }
  })
}

export function lineOf({ agent, session, shared }) {
  const name = agent.title ?? agent.address
  if (!session) return { name, status: agent.status, count: '', open: [], alerts: [], note: 'no session' }
  return {
    name,
    status: agent.status,
    count: `${session.tasks.done}/${session.tasks.total}`,
    open: session.tasks.open.map(task => `#${task.id} ${task.subject}${task.owner ? ` (${task.owner})` : ''}${task.blocked ? ' [blocked]' : ''}`),
    alerts: session.alerts.map(alert => `${alert.who} ${alert.kind}: ${alert.text}`),
    note: shared ? '2 sessions here, showing the latest' : undefined,
  }
}
