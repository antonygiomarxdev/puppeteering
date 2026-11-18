import { useEffect, useState } from 'react'
import { EventBus } from '../EventBus'
import type { Entry, HistoryEvent, OfficeState, ToolKind } from '../types'
import { shadeOf } from './colors'
import { eventLine, hhmm } from './format'
import { cardAction, deskCard, elapsed, leadCard, LEAD_ID, SELECT_EVENT, sortCards, type Card } from './teamview'

const TEN_MIN = 10 * 60_000
const ICON: Record<ToolKind, string> = { write: '✎', read: '👁', shell: '>_', web: '🌐', message: '✉', board: '☰', agent: '⚙', code: '{}', other: '·' }

function useNow(): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  return now
}

function CardView({ c, now, onOpen, selected }: { c: Card; now: number; onOpen: () => void; selected: boolean }) {
  const action = cardAction(c)
  const error = c.lastError && now - c.lastError.at < TEN_MIN ? c.lastError : undefined
  const report = c.report && now - c.report.at < TEN_MIN ? c.report : undefined
  const problem = c.alert || error || c.blockedBy?.length
  return (
    <li className={`card${problem ? ' problem' : ''}${selected ? ' selected' : ''}${c.sleeping ? ' asleep' : ''}`} onClick={onOpen}>
      {c.alert && <div className="bad">{c.alert.kind}: {c.alert.text}</div>}
      {error && <div className="bad">error {elapsed(now - error.at)} ago: {error.text}</div>}
      {!!c.blockedBy?.length && <div className="bad">blocked by {c.blockedBy.map(b => `#${b.replace(/^#/, '')}`).join(', ')}</div>}
      <div className="head">
        <span className="dot" style={{ background: shadeOf(c.name) }} />
        <b>{c.name}</b>
        <span className="dim role">{c.role}</span>
      </div>
      <div className="task">{c.task ?? <span className="dim">no task</span>}</div>
      <div className="now">
        {action ? (
          <><span className="tag">NOW</span> {action}{c.since ? <span className="dim"> · {elapsed(now - c.since)}</span> : null}</>
        ) : (
          <span className="dim">{c.sleeping ? 'asleep' : c.working ? 'thinking' : 'idle'}</span>
        )}
      </div>
      {c.said && <div className="said">“{c.said}”</div>}
      {report && <div className="report">report{report.to ? ` to ${report.to}` : ''}: {report.text}</div>}
    </li>
  )
}

function Line({ t }: { t: Entry }) {
  const time = <span className="dim">{hhmm(t.at)} </span>
  switch (t.type) {
    case 'call': {
      const bad = t.ok === false
      return <>{time}<span className="icon">{ICON[t.kind] ?? ICON.other}</span> {t.what}{t.inner && <span className="dim"> · {t.inner.length} calls: {t.inner.map(c => c.what).join(', ')}</span>}{t.end !== undefined && <span className="dim"> · {elapsed(t.end - t.at)}</span>}{t.ok !== undefined && <span className={bad ? 'bad' : 'ok'}> {bad ? 'error' : 'ok'}</span>}</>
    }
    case 'said': return <>{time}<span className="icon">💬</span> {t.text}</>
    case 'sent': return <>{time}<span className="icon">✉</span> to {t.to}: {t.text}</>
    case 'received': return <>{time}<span className="icon">✉</span> from {t.from}: {t.text}</>
    case 'task': return <>{time}<span className="icon">☰</span> {t.kind} #{t.id} {t.subject}</>
    case 'report': return <>{time}<span className="icon">📋</span> report: {t.text}</>
  }
}

function Drawer({ c, history, now, onClose }: { c: Card; history: HistoryEvent[]; now: number; onClose: () => void }) {
  const { timeline, files } = c.extras
  const sorted = [...(timeline ?? [])].sort((a, b) => b.at - a.at)
  const messages = sorted.filter(t => t.type === 'sent' || t.type === 'received')
  const tasks = history.filter(e => e.who === c.name)
  return (
    <aside className="drawer">
      <div className="head">
        <span className="dot" style={{ background: shadeOf(c.name) }} />
        <b>{c.name}</b> <span className="dim role">{c.role}</span>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="task">{c.task ?? <span className="dim">no task</span>}</div>
      {c.since && cardAction(c) && <div className="now"><span className="tag">NOW</span> {cardAction(c)} · {elapsed(now - c.since)}</div>}
      <h3>Timeline</h3>
      {timeline ? (
        <ul className="timeline">
          {sorted.length === 0 && <li className="dim">Nothing yet.</li>}
          {sorted.map((t, i) => <li key={`${t.at}-${i}`} className={t.type === 'call' && t.ok === false ? 'bad' : ''}><Line t={t} /></li>)}
        </ul>
      ) : <p className="dim">Timeline arrives with the next mod update</p>}
      <h3>Messages</h3>
      {messages.length ? <ul>{messages.map((m, i) => <li key={i}><Line t={m} /></li>)}</ul> : <p className="dim">None.</p>}
      <h3>Files touched</h3>
      {files?.length ? <ul>{files.map(f => <li key={f.path}>{f.path} <span className="dim">×{f.count}</span></li>)}</ul> : <p className="dim">None.</p>}
      <h3>Task events</h3>
      {tasks.length ? <ul>{tasks.map((e, i) => <li key={i}>{eventLine(e)}</li>)}</ul> : <p className="dim">None.</p>}
    </aside>
  )
}

export function Team({ state }: { state: OfficeState | null }) {
  const now = useNow()
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    const on = (id: string | null) => setSelected(id)
    EventBus.on(SELECT_EVENT, on)
    return () => { EventBus.off(SELECT_EVENT, on) }
  }, [])
  if (!state) return <section className="team"><h2>Team</h2><p className="dim">Waiting for the session...</p></section>
  const cards = sortCards([leadCard(state.lead), ...(state.agents).map(deskCard)], now)
  const open = cards.find(c => c.id === selected)
  const pick = (id: string) => { setSelected(id); EventBus.emit(SELECT_EVENT, id) }
  return (
    <section className="team">
      <h2>Team</h2>
      <ul className="cards">
        {cards.map(c => <CardView key={c.id} c={c} now={now} selected={c.id === selected} onOpen={() => pick(c.id)} />)}
      </ul>
      {open && <Drawer c={open} history={state.history} now={now} onClose={() => { setSelected(null); EventBus.emit(SELECT_EVENT, null) }} />}
    </section>
  )
}

export { LEAD_ID }
