// Blinds a probe's two outputs (REQ-17, docs/method/specs/SPEC-02-1-probe-blind-tool.md).
//   node tools/probe-blind.mjs <base> <change> <out>   copy each folder to <out>/candidate-1 or candidate-2 at random
//   node tools/probe-blind.mjs --reveal <out>          say which candidate is which, from <out>.key.json
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Which source goes to candidate-1: below 0.5 the base, otherwise the change.
export function assign(random = Math.random) {
  return random() < 0.5
    ? { 'candidate-1': 'base', 'candidate-2': 'change' }
    : { 'candidate-1': 'change', 'candidate-2': 'base' }
}

const keyOf = out => path.resolve(out) + '.key.json'
const isDir = p => { try { return fs.statSync(p).isDirectory() } catch { return false } }
const fail = msg => { console.error('probe-blind: ' + msg); process.exit(1) }

function blind(base, change, out) {
  if (!isDir(base)) fail(`${base} is not a folder`)
  if (!isDir(change)) fail(`${change} is not a folder`)
  if (fs.existsSync(out) && (!isDir(out) || fs.readdirSync(out).length)) fail(`${out} exists and is not empty`)
  const key = assign()
  const src = { base, change }
  fs.mkdirSync(out, { recursive: true })
  for (const c of ['candidate-1', 'candidate-2']) fs.cpSync(src[key[c]], path.join(out, c), { recursive: true })
  fs.writeFileSync(keyOf(out), JSON.stringify(key, null, 2) + '\n')
  for (const c of ['candidate-1', 'candidate-2']) console.log(path.join(out, c))
}

function reveal(out) {
  let key
  try { key = JSON.parse(fs.readFileSync(keyOf(out), 'utf8')) } catch { fail(`no readable key at ${keyOf(out)}`) }
  for (const c of ['candidate-1', 'candidate-2']) {
    if (key[c] !== 'base' && key[c] !== 'change') fail(`${keyOf(out)} does not say what ${c} is`)
    console.log(`${c}: ${key[c]}`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2)
  if (a[0] === '--reveal' && a.length === 2) reveal(a[1])
  else if (a.length === 3 && !a[0].startsWith('--')) blind(a[0], a[1], a[2])
  else fail('usage: probe-blind.mjs <base> <change> <out> | --reveal <out>')
}
