import type { HistoryEvent, OfficeState } from '../types'
import { shadeOf } from './colors'
import { eventLine, workingCount } from './format'

export function Header({ state, info, note }: { state: OfficeState | null; info: string; note?: string }) {
  return (
    <header className="hud-header">
      <b>Puppet Office{state?.project?.name ? ` · ${state.project.name}` : ''}</b>
      {state?.project?.cwd && <span className="dim">{state.project.cwd}</span>}
      <span className="dim stat">
        {note ? note : state
          ? `${state.agents.length} agents, ${workingCount(state.agents)} working · tasks ${state.tasks.done}/${state.tasks.total} done`
          : info}
      </span>
    </header>
  )
}

export function History({ events }: { events: HistoryEvent[] }) {
  return (
    <details className="history" open>
      <summary>History</summary>
      {events.length === 0 ? (
        <p className="empty">No task events yet.</p>
      ) : (
        <ul>
          {events.map((e, i) => (
            <li key={`${e.at}-${e.id}-${i}`}>
              <span className="dot" style={{ background: e.who ? shadeOf(e.who) : '#b5b0c8' }} />
              {eventLine(e)}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
