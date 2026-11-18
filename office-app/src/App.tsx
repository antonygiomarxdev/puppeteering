import { useEffect, useState } from 'react'
import { EventBus, STATE_EVENT } from './EventBus'
import { startPolling } from './state'
import { startGame } from './game'
import type { OfficeState } from './types'

export function App() {
  const [state, setState] = useState<OfficeState | null>(null)
  const [info, setInfo] = useState('waiting for the session...')

  useEffect(() => {
    const game = startGame('stage')
    const on = (s: OfficeState) => setState(s)
    EventBus.on(STATE_EVENT, on)
    const stop = startPolling(setInfo)
    return () => { stop(); EventBus.off(STATE_EVENT, on); game.destroy(true) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '6px 12px', background: '#26262b', display: 'flex', gap: 12 }}>
        <b>Puppet Office{state ? ` · ${state.project.name}` : ''}</b>
        <span style={{ opacity: 0.6 }}>{state?.project.cwd}</span>
        <span id="info" style={{ marginLeft: 'auto', opacity: 0.6 }}>{info}</span>
      </header>
      <main style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div id="stage" style={{ flex: 1, minWidth: 0 }} />
        <aside id="queue" style={{ width: 280, overflowY: 'auto', padding: 8, background: '#202024' }}>
          <b>History</b>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {(state?.history ?? []).map((e, i) => (
              <li key={`${e.at}-${e.id}-${i}`} style={{ padding: '3px 0' }}>
                {e.kind} #{e.id} {e.subject}{e.who ? ` (${e.who})` : ''}
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  )
}
