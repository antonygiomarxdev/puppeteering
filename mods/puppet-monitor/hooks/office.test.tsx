import { expect, mock, test } from 'claude-code/testing'

import { launcherUrl, officeUrl } from './register'

const AGENTS = [
  { id: 'a1', name: 'builder', description: 'build', type: 'general-purpose', status: 'running' },
  { id: 'a2', name: 'reviewer', description: 'review', type: 'general-purpose', status: 'idle' },
]

test('the band above the prompt counts the team and offers the office', async ($, on) => {
  let ticks = 0
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await new Promise(resolve => setTimeout(resolve, 50))

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  expect(await ui.find({ type: 'Text', text: /2 agents, 1 working/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /Office/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /Pane/ }).catch(() => undefined)).toBeFalsy()
  await ui.unmount()
})

test('the desktop band has no file link until an open fails, then it has one; the terminal band never has it', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'abc-123' }))
  on('fs.write', () => ({ value: undefined }))
  on('clock.every', () => ({ deny: 'no timer in this test' }))
  on('clock.now', () => ({ value: 1000 }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('process.run', () => ({ deny: 'cannot start' }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'desktop', component: 'AbovePrompt', props: {} })
  expect(await ui.find({ type: 'Button', text: /Office/ })).toBeTruthy()
  expect(await ui.find({ type: 'Markdown', text: /open file/ }).catch(() => undefined)).toBeFalsy()
  await ui.press({ key: 'office' })
  expect(toasts.at(-1)).toContain('cannot start')
  await ui.unmount()
  // The failed open is kept in the board, so the band drawn after it offers the link to the launcher.
  const after = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'desktop', component: 'AbovePrompt', props: {} })
  expect(await after.find({ type: 'Markdown', text: /office\/open-abc-123\.html\)/ })).toBeTruthy()
  await after.unmount()
  const terminal = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  expect(await terminal.find({ type: 'Markdown', text: /open file/ }).catch(() => undefined)).toBeFalsy()
  await terminal.unmount()
})

test('a failed office open toasts the reason, whether the process exits non-zero or cannot run', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  on('fs.write', () => ({ value: undefined }))
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
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1000 }))
  // Denied rather than undefined: the harness cannot remove the noun, and a denied call throws the same way a missing one does.
  on('fs.write', () => ({ value: undefined }))
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

test('the launcher link is a valid URL for Windows and POSIX roots, with no query', () => {
  expect(launcherUrl('C:\\Users\\Ana Perez\\p','abc-1')).toBe('file:///C:/Users/Ana%20Perez/p/office/open-abc-1.html')
  expect(launcherUrl('/home/u/p', 'abc-1')).toBe('file:///home/u/p/office/open-abc-1.html')
  expect(launcherUrl('/tmp/a?b', 'k1')).toBe('file:///tmp/a%3Fb/office/open-k1.html')
})

test('each session writes its own state file, and the Office button opens that session', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'abc-123' }))
  on('clock.now', () => ({ value: 1000 }))
  on('agent.list', () => ({ value: AGENTS }))
  let ticks = 0
  on('clock.every', () => (ticks++ === 0 ? { value: {} } : { deny: 'one tick is enough' }))
  const writes: string[] = []
  const launched: { path: string; text: string }[] = []
  on('fs.write', (_, e) => (writes.push(e.path), launched.push({ path: e.path, text: String(e.content ?? e.text ?? e.data ?? '') }), { value: undefined }))
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
  // The browser gets the launcher, with no query: Windows would drop it.
  expect(argvs[0].at(-1)).toMatch(/office[\\/]open-abc-123\.html$/)
  expect(argvs[0].at(-1)).not.toContain('?')
  const launcher = launched.find(file => /open-abc-123\.html$/.test(file.path))
  expect(launcher?.text).toContain("location.replace('index.html?s=abc-123'+location.hash)")
  await ui.unmount()
})

test('with no session id, the key is a filename-safe hash of the directory', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
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

test('the launcher is written at session start, and /puppets is not registered', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'abc-123' }))
  on('clock.now', () => ({ value: 1000 }))
  const writes: string[] = []
  on('fs.write', (_, e) => (writes.push(e.path), { value: undefined }))
  on('clock.every', () => ({ deny: 'no timer in this test' }))
  const commands: string[] = []
  on('command.register', (_, e) => (commands.push(e.name), { value: { command: e.name } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(writes.some(path => /office[\\/]open-abc-123\.html$/.test(path))).toBe(true)
  expect(commands).toEqual(['office'])
})

test('after a reload with no session.start, the Office button still sets the key and writes the launcher', async ($, on) => {
  on('session.id', () => ({ value: 'zzz-9' }))
  on('clock.now', () => ({ value: 1000 }))
  on('session.info', () => ({ value: { platform: 'linux' } }))
  const writes: string[] = []
  on('fs.write', (_, e) => (writes.push(e.path), { value: undefined }))
  const argvs: string[][] = []
  on('process.run', (_, e) => (argvs.push(e.argv), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  const ui = await $.ui.mount({ plugin: 'puppet-monitor', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 100 } })
  await ui.press({ key: 'office' })
  expect(writes.some(path => /open-zzz-9\.html$/.test(path))).toBe(true)
  expect(argvs[0].at(-1)).toMatch(/open-zzz-9\.html$/)
  await ui.unmount()
})

// Runs model steps through the mod, each a list of chunks as the engine streams them, then one tick: returns the office state it writes.
async function officeAfter($: any, on: any, steps: object[][]) {
  const clock = mock.clock(on, { now: 1000 })
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'think-1' }))
  on('agent.list', () => ({ value: [] }))
  on('ui.status', () => ({ value: undefined }))
  const states: string[] = []
  on('fs.write', (_: unknown, e: any) => (/state-think-1\.js$/.test(e.path) && states.push(e.text), { value: undefined }))
  let chunks: object[] = []
  on('turn.step', async function* () {
    for (const chunk of chunks) yield chunk
    return { turnId: 't1', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (const one of steps) {
    chunks = one
    const stream = $.turn.step({ turnId: 't1', index: 0, model: 'test', messageCount: 1 })
    while (!(await stream.next()).done) {}
  }
  await clock.advance(1000)
  return JSON.parse(states.at(-1)!.replace(/^window\.office\(/, '').replace(/\)\s*$/, ''))
}

const types = (timeline: { type: string }[]) => timeline.map(entry => entry.type)

test('a thinking chunk sets thinking and leaves said alone; a text chunk sets said and leaves thinking alone', async ($, on) => {
  const office = await officeAfter($, on, [[{ kind: 'thinking', index: 0, text: 'Pondering the sum.' }, { kind: 'text', index: 1, text: 'The answer is 400.' }]])
  expect(office.lead.said).toBe('The answer is 400.')
  expect(office.lead.thinking).toEqual({ since: 1000, at: 1000, end: 1000, text: 'Pondering the sum.' })
  // Newest first: the said entry is saved when the step ends, after the thought closed.
  expect(types(office.lead.timeline)).toEqual(['said', 'thought'])
  expect(JSON.stringify(office.lead.timeline[0])).not.toContain('Pondering')
})

test('a text-only step sets no thinking', async ($, on) => {
  const office = await officeAfter($, on, [[{ kind: 'text', index: 0, text: 'Only words here.' }]])
  expect(office.lead.said).toBe('Only words here.')
  expect(office.lead.thinking).toBe(undefined)
  expect(types(office.lead.timeline)).toEqual(['said'])
})

test('an empty thinking block, as the engine sends it, is still recorded as thinking with no text', async ($, on) => {
  const office = await officeAfter($, on, [[{ kind: 'thinking', index: 0, text: '' }, { kind: 'thinking', index: 0, text: '' }, { kind: 'stop', stopReason: 'end_turn', usage: null }]])
  expect(office.lead.thinking).toEqual({ since: 1000, at: 1000, end: 1000 })
  expect(office.lead.said).toBe(undefined)
  expect(types(office.lead.timeline)).toEqual(['thought'])
})
