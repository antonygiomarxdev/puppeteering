import { test, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { MARKER, VERDICTS, parseLedger, checkLedger, checkLessons } from './lessons-check.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const made = []
after(() => made.forEach(d => fs.rmSync(d, { recursive: true, force: true })))
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-lessons-' + name + '-')); made.push(d); return d }

const HEADER = '| ID | Date | Changed | Seen in | Verdict |'
const SEP = '|---|---|---|---|---|'
const ledger = (...rows) => [HEADER, SEP, ...rows.map(([id, verdict]) => `| ${id} | 2026-11-27 | a rule | run 1 | ${verdict} |`)].join('\n') + '\n'
const rowsOf = text => parseLedger(text).rows

// One entry; fields override or drop (null) any of the five lines, order lists them.
const FIELDS = { Cue: 'a teammate is idle', Lesson: 'set the owner first', Evidence: 'two runs', Confidence: 'high, two runs', Status: 'observed' }
function entry(heading, over = {}, order = Object.keys(FIELDS)) {
  const f = { ...FIELDS, ...over }
  return [`## ${heading}`, '', ...order.filter(k => f[k] !== null).map(k => `${k}: ${f[k]}`), ''].join('\n')
}
const lessons = (above, below = []) => ['# Lessons', '', ...above, MARKER, '', ...below].join('\n')

// LS-1
test('covers: method/REQ-15/LS-1 an entry above the marker with all five lines passes', () => {
  assert.deepStrictEqual(checkLessons(lessons([entry('Five lines')]), []), [])
})

test('covers: method/REQ-15/LS-1 an entry above the marker missing Evidence: fails', () => {
  assert.ok(checkLessons(lessons([entry('No evidence', { Evidence: null })]), []).length > 0)
})

test('covers: method/REQ-15/LS-1 an entry with the five lines in another order fails', () => {
  const text = lessons([entry('Out of order', {}, ['Lesson', 'Cue', 'Evidence', 'Confidence', 'Status'])])
  assert.ok(checkLessons(text, []).length > 0)
})

test('covers: method/REQ-15/LS-1 an entry below the marker with none of the five lines passes', () => {
  const text = lessons([entry('Five lines')], ['## Old entry', '', 'Some old paragraph. Rule: do it.', ''])
  assert.deepStrictEqual(checkLessons(text, []), [])
})

test('covers: method/REQ-15/LS-1 a file with no marker passes', () => {
  const text = ['# Lessons', '', '## Old entry', '', 'Some old paragraph. Rule: do it.', ''].join('\n')
  assert.deepStrictEqual(checkLessons(text, []), [])
})

test('covers: method/REQ-15/LS-1 MARKER is the earlier-format line', () => {
  assert.strictEqual(MARKER, '<!-- Entries below use the earlier format. -->')
})

// LS-2
test('covers: method/REQ-15/LS-2 Confidence: high, two runs passes', () => {
  assert.deepStrictEqual(checkLessons(lessons([entry('Confident', { Confidence: 'high, two runs' })]), []), [])
})

test('covers: method/REQ-15/LS-2 Confidence: sure fails', () => {
  assert.ok(checkLessons(lessons([entry('Sure', { Confidence: 'sure' })]), []).length > 0)
})

test('covers: method/REQ-15/LS-2 Status: adopted and Status: observed pass', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped']))
  assert.deepStrictEqual(checkLessons(lessons([entry('Observed', { Status: 'observed' })]), rows), [])
  assert.deepStrictEqual(checkLessons(lessons([entry('Adopted', { Status: 'adopted', Evidence: 'RC-1' })]), rows), [])
})

test('covers: method/REQ-15/LS-2 Status: adopted later fails', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped']))
  assert.ok(checkLessons(lessons([entry('Later', { Status: 'adopted later', Evidence: 'RC-1' })]), rows).length > 0)
})

// LS-3
test('covers: method/REQ-15/LS-3 a ledger with a wrong header fails', () => {
  const text = ['| ID | Date | Verdict |', '|---|---|---|', '| RC-1 | 2026-11-27 | helped |', ''].join('\n')
  assert.ok(checkLedger(text).length > 0)
})

test('covers: method/REQ-15/LS-3 one id used twice fails', () => {
  assert.ok(checkLedger(ledger(['RC-1', 'helped'], ['RC-1', 'hurt'])).length > 0)
})

test('covers: method/REQ-15/LS-3 an id that is not RC- and a number fails', () => {
  assert.ok(checkLedger(ledger(['RC-x', 'helped'])).length > 0)
  assert.ok(checkLedger(ledger(['R-1', 'helped'])).length > 0)
})

test('covers: method/REQ-15/LS-3 Verdict maybe fails', () => {
  assert.ok(checkLedger(ledger(['RC-1', 'maybe'])).length > 0)
})

test('covers: method/REQ-15/LS-3 each of the four verdicts passes', () => {
  assert.deepStrictEqual([...VERDICTS].sort(), ['confounded', 'helped', 'hurt', 'no observed effect'])
  for (const v of ['helped', 'hurt', 'no observed effect', 'confounded']) {
    assert.deepStrictEqual(checkLedger(ledger(['RC-1', v])), [], v)
  }
  const all = ledger(['RC-1', 'helped'], ['RC-2', 'hurt'], ['RC-3', 'no observed effect'], ['RC-4', 'confounded'])
  assert.deepStrictEqual(checkLedger(all), [])
  const parsed = parseLedger(all)
  assert.deepStrictEqual(parsed.errors, [])
  assert.deepStrictEqual(parsed.rows.map(r => [r.id, r.verdict]), [['RC-1', 'helped'], ['RC-2', 'hurt'], ['RC-3', 'no observed effect'], ['RC-4', 'confounded']])
})

test('covers: method/REQ-15/LS-3 no file (an empty ledger) passes', () => {
  assert.deepStrictEqual(checkLedger(''), [])
  assert.deepStrictEqual(parseLedger('').rows, [])
})

// LS-4
test('covers: method/REQ-15/LS-4 adopted citing a row whose verdict is helped passes', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped'], ['RC-2', 'confounded']))
  assert.deepStrictEqual(checkLessons(lessons([entry('Helped', { Status: 'adopted', Evidence: 'RC-1 and RC-2' })]), rows), [])
})

test('covers: method/REQ-15/LS-4 adopted citing only a confounded row fails', () => {
  const rows = rowsOf(ledger(['RC-1', 'confounded']))
  assert.ok(checkLessons(lessons([entry('Confounded', { Status: 'adopted', Evidence: 'RC-1' })]), rows).length > 0)
})

test('covers: method/REQ-15/LS-4 adopted citing no row fails', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped']))
  assert.ok(checkLessons(lessons([entry('No row', { Status: 'adopted', Evidence: 'two runs' })]), rows).length > 0)
})

test('covers: method/REQ-15/LS-4 observed citing an id absent from the ledger fails', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped']))
  assert.ok(checkLessons(lessons([entry('Absent', { Status: 'observed', Evidence: 'RC-9' })]), rows).length > 0)
})

// LS-5
const SCRIPT = path.join(here, 'lessons-check.mjs')
function folder(lessonsText, ledgerText) {
  const dir = tmp('run')
  fs.writeFileSync(path.join(dir, 'LESSONS.md'), lessonsText)
  if (ledgerText !== undefined) {
    fs.mkdirSync(path.join(dir, 'docs', 'retro'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'docs', 'retro', 'rule-ledger.md'), ledgerText)
  }
  return dir
}
const run = dir => spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' })

test('covers: method/REQ-15/LS-5 the command exits 0 on good files', () => {
  const dir = folder(lessons([entry('Good adopted', { Status: 'adopted', Evidence: 'RC-1' }), entry('Good observed')]), ledger(['RC-1', 'helped']))
  const r = run(dir)
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
})

test('covers: method/REQ-15/LS-5 the command exits 1 on a bad entry and prints LESSONS.md: <heading>: <what>', () => {
  const dir = folder(lessons([entry('Missing evidence here', { Evidence: null })]), ledger(['RC-1', 'helped']))
  const r = run(dir)
  assert.strictEqual(r.status, 1, r.stdout + r.stderr)
  assert.ok(r.stdout.includes('LESSONS.md: '), r.stdout)
  assert.ok(r.stdout.includes('Missing evidence here'), r.stdout)
})

// Review round 1 (findings 1 to 4 and two surviving mutants): each case below failed or survived before the fix.
test('covers: method/REQ-15/LS-1 the marker quoted inside a sentence does not end the checked part', () => {
  const text = ['# Lessons', `Old ones sit under \`${MARKER}\` in this file.`, '', entry('No fields', { Cue: null, Lesson: null, Evidence: null, Confidence: null, Status: null }), MARKER, ''].join('\n')
  assert.ok(checkLessons(text, []).length > 0)
})

test('covers: method/REQ-15/LS-2 Confidence: high with no reason fails', () => {
  assert.ok(checkLessons(lessons([entry('Bare', { Confidence: 'high' })]), []).length > 0)
})

test('covers: method/REQ-15/LS-3 a second table with bad rows fails', () => {
  const text = ledger(['RC-1', 'helped']) + '\nText.\n\n' + ledger(['RC-1', 'maybe'])
  assert.ok(checkLedger(text).length > 0)
  assert.deepStrictEqual(rowsOf(text).map(r => r.id), ['RC-1'])
})

test('covers: method/REQ-15/LS-3 a ledger file with text and no table fails, an empty one passes', () => {
  assert.ok(checkLedger('# Rule ledger\n\nNothing yet.\n').length > 0)
  assert.deepStrictEqual(checkLedger(''), [])
})

test('covers: method/REQ-15/LS-3 rows after the separator are all read', () => {
  const rows = rowsOf(ledger(['RC-1', 'helped'], ['RC-2', 'hurt'], ['RC-3', 'confounded']))
  assert.deepStrictEqual(rows.map(r => r.id), ['RC-1', 'RC-2', 'RC-3'])
})

test('covers: method/REQ-15/LS-4 an RC-n missing from the ledger fails when it is in the heading', () => {
  const text = lessons([], ['## RC-9 thing', '', 'old', ''])
  assert.ok(checkLessons(text, rowsOf(ledger(['RC-1', 'helped']))).length > 0)
})

test('covers: method/REQ-15/LS-4 an RC-n inside a URL is not a citation', () => {
  const text = lessons([entry('Url only', { Status: 'adopted', Evidence: 'log at https://example.com/RC-1/log' })])
  assert.ok(checkLessons(text, rowsOf(ledger(['RC-1', 'helped']))).length > 0)
})
