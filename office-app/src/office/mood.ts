import type { Desk, HistoryEvent, Lead } from '../types'

/** Desk as the rules read it. type and description are optional here so this works before and after task B. `asks` is task A. */
export type LiveDesk = Pick<Desk, 'id' | 'name' | 'working'> & Partial<Desk> & { asks?: boolean }
export type LiveLead = Pick<Lead, 'busy'> & Partial<Lead>

export type Mood =
  | 'Leaving' | 'Error' | 'Stuck' | 'Looping' | 'Quiet' | 'WaitingPermission' | 'Blocked'
  | 'Typing' | 'Reading' | 'RunningCommand' | 'LongCommand' | 'Browsing' | 'Whiteboard' | 'Talking'
  | 'Thinking' | 'TakingTask' | 'FinishingTask' | 'Reporting' | 'Visiting' | 'IdleAwake' | 'Sleeping'

export const LONG_COMMAND_MS = 30_000
/** Taken and done events, and new board cards, show for this long. */
export const EVENT_MS = 3_000
/** A report counts as "just arrived" for this long. */
export const REPORT_MS = 10_000

const recent = (at: number, now: number, windowMs: number) => now - at < windowMs
const mine = (e: HistoryEvent, desk: { id: string; name: string }) => e.who === desk.name || e.who === desk.id

/**
 * Section 3, one state per agent. Order: a gone agent leaves; alerts and errors come before tool states;
 * tool kinds come before the flashes (taken, done, reports, whiteboard); thinking; then idle and sleep.
 */
export function moodOf(desk: LiveDesk, now: number, history: HistoryEvent[]): Mood {
  if (desk.gone) return 'Leaving'
  if (desk.lastError) return 'Error'
  if (desk.alert?.kind === 'stuck') return 'Stuck'
  if (desk.alert?.kind === 'loop') return 'Looping'
  if (desk.alert?.kind === 'quiet') return 'Quiet'
  if (desk.asks) return 'WaitingPermission'
  if (desk.blockedBy) return 'Blocked'
  switch (desk.kind) {
    case 'write': return 'Typing'
    case 'read': return 'Reading'
    case 'shell': return desk.since !== undefined && now - desk.since > LONG_COMMAND_MS ? 'LongCommand' : 'RunningCommand'
    case 'web': return 'Browsing'
    case 'board': return 'Whiteboard'
    case 'message': return 'Talking'
  }
  if (history.some(e => e.kind === 'taken' && mine(e, desk) && recent(e.at, now, EVENT_MS))) return 'TakingTask'
  if (history.some(e => e.kind === 'done' && mine(e, desk) && recent(e.at, now, EVENT_MS))) return 'FinishingTask'
  if (history.some(e => e.kind === 'created' && mine(e, desk) && recent(e.at, now, EVENT_MS))) return 'Whiteboard'
  if (desk.report && recent(desk.report.at, now, REPORT_MS)) {
    return !desk.report.to || desk.report.to === 'lead' ? 'Reporting' : 'Visiting'
  }
  if (desk.working) return 'Thinking'
  if (desk.task) return 'IdleAwake'
  return 'Sleeping'
}

export type LeadMood = Mood | 'Assigning' | 'ReviewingReports' | 'WaitingOnTeam' | 'Celebrating'

/** Section 4, the Conductor. An alert is shown first, as for agents. */
export function leadMoodOf(
  lead: LiveLead,
  desks: LiveDesk[],
  tasks: { done: number; total: number },
  history: HistoryEvent[],
  now: number,
): LeadMood {
  if (lead.alert?.kind === 'stuck') return 'Stuck'
  if (lead.alert?.kind === 'loop') return 'Looping'
  if (lead.alert?.kind === 'quiet') return 'Quiet'
  if (lead.kind === 'board' || lead.kind === 'agent' || history.some(e => e.kind === 'created' && recent(e.at, now, EVENT_MS))) return 'Assigning'
  if (desks.some(d => d.report && recent(d.report.at, now, REPORT_MS))) return 'ReviewingReports'
  if (lead.kind === 'message') return 'Talking'
  // Celebrates for EVENT_MS after the last completion, so one completion gives one celebration.
  if (tasks.total > 0 && tasks.done === tasks.total && history.some(e => e.kind === 'done' && recent(e.at, now, 5_000))) return 'Celebrating'
  if (!lead.busy && desks.some(d => d.working)) return 'WaitingOnTeam'
  if (lead.busy) return 'Thinking'
  if (tasks.total === 0 && !desks.some(d => d.working)) return 'Sleeping'
  // Shortcut: idle lead with open tasks and nobody working has no row in section 4. Shown as waiting.
  return 'WaitingOnTeam'
}
