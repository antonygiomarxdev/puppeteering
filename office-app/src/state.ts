import { EventBus, STATE_EVENT } from './EventBus'
import { normalize } from './normalize'
import type { OfficeState } from './types'

// ?s=<key> names the session's file; without a key it reads the plain state.js.
export function stateFile(search: string): string {
  const key = new URLSearchParams(search).get('s')
  return key ? `state-${key.replace(/[^A-Za-z0-9-]/g, '')}.js` : 'state.js'
}

export const titleOf = (s: OfficeState) => `${s.project.name} · Puppet Office`

/**
 * The mod rewrites the state file every second as window.office({...}). file:// cannot fetch,
 * so each poll re-adds a <script> tag. `info` gets the header diagnostics.
 */
export function startPolling(info: (text: string) => void, win: Window = window): () => void {
  const file = stateFile(win.location.search)
  const doc = win.document
  let failures = 0
  // Whatever the session's mod wrote, the page gets a complete state: old files lack fields (project, history, type...).
  ;(win as unknown as { office: (raw: unknown) => void }).office = raw => {
    const s = normalize(raw)
    EventBus.emit(STATE_EVENT, s)
    if (s.project.name) doc.title = titleOf(s)
  }
  // If this line never shows, no script ran in the browser; if it stays, the state file did not load.
  info(`script running, loading ${file}...`)
  const poll = () => {
    doc.getElementById('state')?.remove()
    const tag = doc.createElement('script')
    tag.id = 'state'
    tag.src = `${file}?${Date.now()}`
    tag.onerror = () => { failures++; info(`cannot load ${file} from ${win.location.href} (failed ${failures} times)`) }
    doc.body.appendChild(tag)
  }
  const timer = setInterval(poll, 1000)
  poll()
  return () => clearInterval(timer)
}
