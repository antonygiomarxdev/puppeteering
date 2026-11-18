import { expect, test } from 'claude-code/testing'

import { officeUrl } from './register'

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

test('the band above the prompt counts the team and offers the office', async ($, on) => {
  let ticks = 0
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 50))

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  expect(await ui.find({ type: 'Text', text: /2 agents, 1 working/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /Office/ })).toBeTruthy()
  await ui.unmount()
})

test('the Pane button opens and closes the pane on every press', async ($, on) => {
  let ticks = 0
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))
  // The engine's record of this plugin's panes, answered beneath the plugin's own hooks.
  const panes = new Set<string>()
  on('ui.open', (_, e) => (panes.add(e.id), { value: { isPlaced: true } }))
  on('ui.close', (_, e) => (panes.delete(e.id), { value: undefined }))
  on('ui.panes', () => ({ value: [...panes].map(id => ({ id, title: 'Puppets', isShown: true, isFocused: false, isPlaced: true })) }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 50))

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  const open: boolean[] = []
  for (let press = 0; press < 4; press++) {
    await ui.press({ key: 'pane' })
    open.push(panes.has('puppet-monitor'))
  }
  expect(open).toEqual([true, false, true, false])
  await ui.unmount()
})

test('the desktop band offers the Office button and a file link to the office', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'desktop', component: 'AbovePrompt', props: {} })
  expect(await ui.find({ type: 'Button', text: /Office/ })).toBeTruthy()
  expect(await ui.find({ type: 'Markdown', text: /office\/index\.html/ })).toBeTruthy()
  await ui.unmount()
})

test('the Pane button opens the pane again after the person closes it by hand', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  // The engine's record of this plugin's panes, answered beneath the plugin's own hooks.
  const panes = new Set<string>()
  on('ui.open', (_, e) => (panes.add(e.id), { value: { isPlaced: true } }))
  on('ui.close', (_, e) => (panes.delete(e.id), { value: undefined }))
  on('ui.panes', () => ({ value: [...panes].map(id => ({ id, title: 'Puppets', isShown: true, isFocused: false, isPlaced: true })) }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  await ui.press({ key: 'pane' })
  expect(panes.has('puppet-monitor')).toBe(true)
  panes.delete('puppet-monitor') // the person closes the pane with its own mark
  await ui.press({ key: 'pane' })
  expect(panes.has('puppet-monitor')).toBe(true)
  await ui.unmount()
})

test('the Pane button closes the pane that /puppets opened', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  const panes = new Set<string>()
  on('ui.open', (_, e) => (panes.add(e.id), { value: { isPlaced: true } }))
  on('ui.close', (_, e) => (panes.delete(e.id), { value: undefined }))
  on('ui.panes', () => ({ value: [...panes].map(id => ({ id, title: 'Puppets', isShown: true, isFocused: false, isPlaced: true })) }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  await $.command.run({ command: 'puppets' })
  expect(panes.has('puppet-monitor')).toBe(true)
  await ui.press({ key: 'pane' })
  expect(panes.has('puppet-monitor')).toBe(false)
  await ui.unmount()
})

test('a failed office open toasts the reason, whether the process exits non-zero or cannot run', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('session.info', () => ({ value: { platform: 'windows' } }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  // The first run exits 1; the second cannot start; the third finds no process.run at all.
  let runs = 0
  on('process.run', () =>
    runs++ === 0
      ? { value: { exitCode: 1, stdout: '', stderr: 'boom', isStdoutTruncated: false, isStderrTruncated: false } }
      : { deny: 'cannot start' },
  )

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  await ui.press({ key: 'office' })
  expect(toasts.at(-1)).toContain('exit 1: boom')
  await ui.press({ key: 'office' })
  expect(toasts.at(-1)).toContain('cannot start')
  await ui.unmount()
})

test('desktop, with no session.info, a Windows root opens the office with cmd and toasts nothing', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  // Denied rather than undefined: the harness cannot remove the noun, and a denied call throws the same way a missing one does.
  on('session.info', () => ({ deny: 'session.info is not a function' }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  const argvs: string[][] = []
  on('process.run', (_, e) => (argvs.push(e.argv), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'desktop', component: 'AbovePrompt', props: {} })
  await ui.press({ key: 'office' })
  expect(toasts).toEqual([])
  expect(argvs.length).toBe(1)
  expect(argvs[0][0]).toBe('cmd')
  await ui.unmount()
})

test('the office file link is a valid URL for Windows and POSIX roots', () => {
  expect(officeUrl('C:\\Users\\Ana Perez\\p')).toBe('file:///C:/Users/Ana%20Perez/p/office/index.html')
  expect(officeUrl('/home/u/p')).toBe('file:///home/u/p/office/index.html')
  expect(officeUrl('/tmp/a (b)/100%')).toBe('file:///tmp/a%20%28b%29/100%25/office/index.html')
  expect(officeUrl('/tmp/a#b?c')).toBe('file:///tmp/a%23b%3Fc/office/index.html')
  expect(officeUrl('/home/u/p', 'abc')).toBe('file:///home/u/p/office/index.html?s=abc')
  expect(officeUrl('/tmp/a?b', 'k1')).toBe('file:///tmp/a%3Fb/office/index.html?s=k1')
})

test('each session writes its own state file, and the Office button opens that session', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'abc-123' }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  let ticks = 0
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))
  const writes: string[] = []
  on('fs.write', (_, e) => (writes.push(e.path), { value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('session.info', () => ({ value: { platform: 'windows' } }))
  const argvs: string[][] = []
  on('process.run', (_, e) => (argvs.push(e.argv), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 1200))
  expect(writes.some(path => /[\\/]office[\\/]state-abc-123\.js$/.test(path))).toBe(true)
  expect(writes.some(path => /[\\/]office[\\/]state\.js$/.test(path))).toBe(false)

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  await ui.press({ key: 'office' })
  expect(argvs[0].at(-1)).toMatch(/\/office\/index\.html\?s=abc-123$/)
  await ui.unmount()
})

test('with no session id, the key is a filename-safe hash of the directory', async ($, on) => {
  on('command.register', () => ({ value: { command: 'puppets' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ deny: 'no session id here' }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  let ticks = 0
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))
  const writes: string[] = []
  on('fs.write', (_, e) => (writes.push(e.path), { value: undefined }))
  on('ui.status', () => ({ value: undefined }))

  await $.session.start({ cwd: 'C:\\Users\\anton\\dev\\repo-a', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 1200))
  expect(writes.some(path => /[\\/]office[\\/]state-[0-9a-z]+\.js$/.test(path))).toBe(true)
})
