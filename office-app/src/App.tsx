import { useEffect, useState } from 'react'
import { EventBus, STATE_EVENT } from './EventBus'
import { startPolling } from './state'
import { startGame } from './game'
import type { OfficeState } from './types'
import { Header, History } from './hud/Hud'
import './hud/hud.css'

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
    <div className="office-app">
      <Header state={state} info={info} />
      <main>
        <div id="stage" />
        <History events={state?.history ?? []} />
      </main>
    </div>
  )
}
