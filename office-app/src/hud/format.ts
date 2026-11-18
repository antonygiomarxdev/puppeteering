import type { Desk, HistoryEvent } from '../types'

// Local time, HH:MM.
export function hhmm(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function eventLine(e: HistoryEvent): string {
  const task = `#${e.id} ${e.subject}`
  const who = e.who
  let text: string
  if (e.kind === 'taken') text = `${who ?? 'someone'} took ${task}`
  else if (e.kind === 'created') text = who ? `${who} created ${task}` : `created ${task}`
  else text = who ? `${who} finished ${task}` : `finished ${task}`
  return `${hhmm(e.at)} · ${text}`
}

// A sleeping agent has no task in progress, so it does not count as working.
export const workingCount = (agents: Pick<Desk, 'working' | 'sleeping'>[]): number =>
  agents.filter(a => a.working && !a.sleeping).length
