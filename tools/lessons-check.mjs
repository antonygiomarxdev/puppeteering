// Checks LESSONS.md and the rule ledger (REQ-15, docs/method/specs/SPEC-01-1-lessons-check.md).
// Run from the repo root: node tools/lessons-check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARKER = '<!-- Entries below use the earlier format. -->'
export const VERDICTS = ['helped', 'hurt', 'no observed effect', 'confounded']

const LEDGER = 'docs/retro/rule-ledger.md'
const HEADER = ['ID', 'Date', 'Changed', 'Seen in', 'Verdict']
const FIELDS = ['Cue', 'Lesson', 'Evidence', 'Confidence', 'Status']
const CITE = /(?<![\w/.-])RC-\d+\b/g // an RC-n id, not part of a path or URL

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

// LS-3: one table, the exact header, ids RC-n used once, verdicts from the list. No text is an empty ledger.
export function parseLedger(text) {
  const rows = []
  const errors = []
  const lines = String(text ?? '').split(/\r?\n/)
  if (!lines.some(l => l.trim())) return { rows, errors } // a missing or empty file is an empty ledger
  const tables = []
  lines.forEach((l, i) => { if (l.trim().startsWith('|') && !(lines[i - 1] ?? '').trim().startsWith('|')) tables.push(i) })
  if (!tables.length) return { rows, errors: ['the file holds no ledger table'] }
  if (tables.length > 1) errors.push(`the file holds ${tables.length} tables; the ledger is one table`)
  const at = tables[0]
  if (cells(lines[at]).join('|') !== HEADER.join('|')) {
    errors.push(`header: the table header must be | ${HEADER.join(' | ')} |`)
    return { rows, errors }
  }
  const seen = new Set()
  for (const line of lines.slice(at + 1)) {
    if (!line.trim().startsWith('|')) break
    const c = cells(line)
    if (c.every(x => /^:?-+:?$/.test(x))) continue
    const [id, date, changed, seenIn, verdict] = c
    const label = id || '(no id)'
    if (c.length !== HEADER.length) errors.push(`${label}: a row needs ${HEADER.length} cells, found ${c.length}`)
    if (!/^RC-\d+$/.test(id ?? '')) errors.push(`${label}: the id must be RC- and a number`)
    else if (seen.has(id)) errors.push(`${label}: the id is used twice`)
    if (!VERDICTS.includes(verdict)) errors.push(`${label}: the verdict must be one of ${VERDICTS.join(', ')}`)
    seen.add(id)
    rows.push({ id, date, changed, seenIn, verdict })
  }
  return { rows, errors }
}

export function checkLedger(text) {
  return parseLedger(text).errors.map(e => `${LEDGER}: ${e}`)
}

function entries(text) {
  const out = []
  let cur = null
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (line.startsWith('## ')) out.push((cur = { heading: line.slice(3).trim(), lines: [] }))
    else if (cur) cur.lines.push(line)
  }
  return out
}

// LS-1, LS-2, LS-4: entries above the marker carry the five fields in order; adopted needs a cited row that is not confounded.
export function checkLessons(lessonsText, ledgerRows = []) {
  const text = String(lessonsText ?? '')
  const fails = []
  const byId = new Map(ledgerRows.map(r => [r.id, r]))
  for (const e of entries(text)) {
    const cites = new Set([...[e.heading, ...e.lines].join('\n').matchAll(CITE)].map(m => m[0]))
    for (const id of cites) if (!byId.has(id)) fails.push(`LESSONS.md: ${e.heading}: cites ${id}, which is not in ${LEDGER}`)
  }
  const lines = text.split(/\r?\n/)
  const cut = lines.findIndex(l => l.trim() === MARKER)
  for (const e of cut < 0 ? [] : entries(lines.slice(0, cut).join('\n'))) {
    const say = what => fails.push(`LESSONS.md: ${e.heading}: ${what}`)
    const found = {}
    const order = []
    for (const line of e.lines) {
      const m = /^(\w+):\s*(.*)$/.exec(line.trim())
      if (!m || !FIELDS.includes(m[1]) || m[1] in found) continue
      found[m[1]] = m[2]
      order.push(m[1])
    }
    const missing = FIELDS.filter(f => !(f in found))
    if (missing.length) { say(`missing ${missing.map(f => f + ':').join(' ')}`); continue }
    if (order.join() !== FIELDS.join()) { say(`the fields come out of order; the order is ${FIELDS.join(', ')}`); continue }
    if (!/^(high|medium|low)\b[\s,;:.-]*\S/.test(found.Confidence)) say('Confidence: must be high, medium or low, then a reason')
    if (!/^(observed|adopted)$/.test(found.Status.trim())) say('Status: must be observed or adopted')
    if (found.Status.trim() === 'adopted') {
      const ids = [...found.Evidence.matchAll(CITE)].map(m => m[0])
      if (!ids.some(id => byId.get(id) && byId.get(id).verdict !== 'confounded'))
        say('Status: adopted needs Evidence citing an RC-n row whose verdict is not confounded')
    }
  }
  return fails
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
  const ledger = read(LEDGER)
  const fails = [...checkLedger(ledger), ...checkLessons(read('LESSONS.md'), parseLedger(ledger).rows)]
  for (const f of fails) console.log(f)
  process.exit(fails.length ? 1 : 0)
}
