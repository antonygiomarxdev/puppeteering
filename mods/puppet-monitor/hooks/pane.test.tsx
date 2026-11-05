import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'puppet-monitor',
  component: 'Pane',
  requestId: 'puppet-monitor',
  props: { title: 'Puppets', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const AGENTS = [
  { id: 'a1', name: 'builder', description: 'build', type: 'general-purpose', status: 'running' },
  { id: 'a2', name: 'reviewer', description: 'review', type: 'general-purpose', status: 'idle' },
]

test('with agents, the pane draws them and a button to open each', async ($, on) => {
  let ticks = 0
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  // One period of the timer runs the tick; the next is refused, which ends it.
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 50))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /builder/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', text: /builder/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /waiting: reviewer/ })).toBeTruthy()
    await ui.unmount()
  }
})
