import { test } from 'node:test'
import assert from 'node:assert'

import { STALE_MS, folderKey, lineOf, matchAgents, normPath, stateFile } from './match.js'

const NOW = 100_000
const HOME = '/home/a'
const CWD = '/home/a/proj'

const agent = (over = {}) => ({ address: 't1', pane: 'p1', space: 's', tab: 'tb', status: 'working', app: 'claude-code', program: 'claude', title: 'builder', seq: 1, ...over })
const pane = (over = {}) => ({ pane: 'p1', terminal: 't1', tab: 'tb', title: 'x', cwd: CWD, ...over })
const state = (over = {}) => ({
  schema: 1, key: 'k1', cwd: CWD, at: NOW - 1000, busy: true, shared: false,
  tasks: { done: 1, total: 3, open: [
    { id: '2', subject: 'Open thing', status: 'in_progress', owner: 'builder', blocked: false },
    { id: '3', subject: 'Waiting thing', status: 'pending', blocked: true },
  ] },
  alerts: [{ who: 'builder', kind: 'loop', text: 'LOOPING 3x' }], ...over,
})
const first = out => (assert.strictEqual(out.length, 1, 'one match per claude-code agent'), out[0])
// states: an object from each stateFile path to the parsed JSON or null.
const statesOf = (s, cwd = CWD) => ({ [stateFile(HOME, cwd)]: s })

test('covers: herdr/REQ-12/D-3 folderKey gives the vectors SPEC-01-1 gives, so the two copies cannot drift', () => {
  assert.strictEqual(folderKey('C:\\Users\\anton\\dev\\puppeteering-herdr'), '27494bdf')
  assert.strictEqual(folderKey('c:/users/anton/dev/puppeteering-herdr/'), '27494bdf')
  assert.strictEqual(folderKey('/home/a/proj'), '5c92b791')
  assert.strictEqual(folderKey('/home/a/proj/'), '5c92b791')
  assert.strictEqual(folderKey('/'), '2a0c975e')
  assert.strictEqual(folderKey('\\\\srv\\Share\\X'), 'd1ce8abf')
})

test('covers: herdr/REQ-12/D-3 normPath lowercases only a drive-letter or // path', () => {
  assert.strictEqual(normPath('C:\\Users\\Anton\\Dev\\'), 'c:/users/anton/dev')
  assert.strictEqual(normPath('/home/A/Proj/'), '/home/A/Proj')
  assert.strictEqual(normPath('/'), '/')
  assert.strictEqual(normPath('\\\\srv\\Share\\X'), '//srv/share/x')
})

test('covers: herdr/REQ-12/D-3 stateFile joins home, .claude/puppet-monitor and the folder key with / only', () => {
  assert.strictEqual(stateFile('C:/Users/a', 'C:\\p'), 'C:/Users/a/.claude/puppet-monitor/' + folderKey('C:\\p') + '.json')
  assert.strictEqual(stateFile('C:\\Users\\a\\', 'C:\\p'), 'C:/Users/a/.claude/puppet-monitor/' + folderKey('C:\\p') + '.json')
  assert.strictEqual(stateFile('/home/a/', CWD), '/home/a/.claude/puppet-monitor/5c92b791.json')
})

test('covers: herdr/REQ-12/D-33 STALE_MS is 30 000', () => {
  assert.strictEqual(STALE_MS, 30_000)
})

test('covers: herdr/REQ-12/D-33 an agent whose state has its pane\'s folder, schema 1 and a fresh at matches', () => {
  const s = state()
  const m = first(matchAgents([agent()], [pane()], statesOf(s), NOW))
  assert.strictEqual(m.agent.address, 't1')
  assert.deepStrictEqual(m.session, s)
  assert.strictEqual(m.shared, false)
})

test('covers: herdr/REQ-12/D-33 the folder is compared by normPath, so a Windows pane matches a forward-slash state', () => {
  const cwd = 'C:\\Users\\Anton\\Dev\\proj\\'
  const s = state({ cwd: 'c:/users/anton/dev/proj' })
  const m = first(matchAgents([agent()], [pane({ cwd })], statesOf(s, cwd), NOW))
  assert.deepStrictEqual(m.session, s)
})

test('covers: herdr/REQ-12/D-33 at exactly STALE_MS old matches, one ms older does not', () => {
  assert.notStrictEqual(first(matchAgents([agent()], [pane()], statesOf(state({ at: NOW - 30_000 })), NOW)).session, null)
  assert.strictEqual(first(matchAgents([agent()], [pane()], statesOf(state({ at: NOW - 30_001 })), NOW)).session, null)
})

test('covers: herdr/REQ-12/D-33 a null state, another cwd, another schema do not match', () => {
  assert.strictEqual(first(matchAgents([agent()], [pane()], statesOf(null), NOW)).session, null)
  assert.strictEqual(first(matchAgents([agent()], [pane()], statesOf(state({ cwd: '/home/a/other' })), NOW)).session, null)
  assert.strictEqual(first(matchAgents([agent()], [pane()], statesOf(state({ schema: 2 })), NOW)).session, null)
})

test('covers: herdr/REQ-12/D-33 an agent whose pane is missing does not match, and is still returned', () => {
  const out = matchAgents([agent()], [pane({ pane: 'other', terminal: 't9' })], statesOf(state()), NOW)
  assert.strictEqual(out.length, 1)
  assert.strictEqual(out[0].session, null)
})

test('covers: herdr/REQ-12/D-33 an agent whose app is not claude-code is not returned', () => {
  const out = matchAgents([agent({ address: 't2', pane: 'p2', app: 'codex' }), agent({ app: null, address: 't3', pane: 'p3' }), agent()], [pane(), pane({ pane: 'p2', terminal: 't2' }), pane({ pane: 'p3', terminal: 't3' })], statesOf(state()), NOW)
  assert.deepStrictEqual(out.map(m => m.agent.address), ['t1'])
})

test('covers: herdr/REQ-12/D-33 shared true in the state reaches the match', () => {
  const m = first(matchAgents([agent()], [pane()], statesOf(state({ shared: true })), NOW))
  assert.strictEqual(m.shared, true)
})

test('covers: herdr/REQ-12/D-33 lineOf gives status, done/total, open tasks, alerts and no note', () => {
  const line = lineOf({ agent: agent(), session: state(), shared: false })
  assert.strictEqual(line.status, 'working')
  assert.strictEqual(line.count, '1/3')
  assert.strictEqual(line.open.length, 2)
  assert.strictEqual(line.open[0], '#2 Open thing (builder)')
  assert.match(line.open[1], /^#3 Waiting thing/)
  assert.match(line.open[1], /blocked/i)
  assert.deepStrictEqual(line.alerts, ['builder loop: LOOPING 3x'])
  assert.strictEqual(line.note, undefined)
})

test('covers: herdr/REQ-12/D-33 lineOf for a lead alert reads "lead quiet: ..."', () => {
  const line = lineOf({ agent: agent(), session: state({ alerts: [{ who: 'lead', kind: 'quiet', text: 'QUIET 15m00s' }] }), shared: false })
  assert.deepStrictEqual(line.alerts, ['lead quiet: QUIET 15m00s'])
})

test('covers: herdr/REQ-12/D-33 lineOf says "2 sessions here, showing the latest" when shared', () => {
  const line = lineOf({ agent: agent(), session: state({ shared: true }), shared: true })
  assert.strictEqual(line.note, '2 sessions here, showing the latest')
})

test('covers: herdr/REQ-12/D-33 lineOf for no match gives the status and the note "no session" only', () => {
  const line = lineOf({ agent: agent({ status: 'idle' }), session: null, shared: false })
  assert.strictEqual(line.status, 'idle')
  assert.strictEqual(line.note, 'no session')
  assert.deepStrictEqual(line.open, [])
  assert.deepStrictEqual(line.alerts, [])
})
