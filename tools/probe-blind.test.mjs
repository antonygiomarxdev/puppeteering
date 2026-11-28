import { test, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tool = path.join(here, 'probe-blind.mjs')
const made = []
after(() => made.forEach(d => fs.rmSync(d, { recursive: true, force: true })))
// Temp names avoid the words base and change, so the stdout check is not fooled by a path.
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-probe-')); made.push(d); return d }
const load = () => import('./probe-blind.mjs')

function run(...args) {
  assert.ok(fs.existsSync(tool), 'tools/probe-blind.mjs exists')
  return spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' })
}

// Two source folders with different files, and an out path that does not exist yet.
function setup() {
  const d = tmp()
  const a = path.join(d, 'a'), b = path.join(d, 'b')
  fs.mkdirSync(path.join(a, 'sub'), { recursive: true })
  fs.writeFileSync(path.join(a, 'one.txt'), 'first run\n')
  fs.writeFileSync(path.join(a, 'sub', 'deep.bin'), Buffer.from([0, 1, 2, 255]))
  fs.mkdirSync(b)
  fs.writeFileSync(path.join(b, 'two.txt'), 'second run, other bytes\n')
  return { d, a, b, out: path.join(d, 'out') }
}

// Every file under dir, relative path -> bytes.
function snapshot(dir) {
  const files = {}
  const walk = (p, rel) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name), r = rel ? rel + '/' + e.name : e.name
      if (e.isDirectory()) walk(full, r)
      else files[r] = fs.readFileSync(full).toString('base64')
    }
  }
  walk(dir, '')
  return files
}

const message = r => (r.stderr + r.stdout).trim().length > 0

// LL-1
test('covers: method/REQ-17/LL-1 the two folders end up one in each candidate folder, byte for byte', () => {
  const s = setup()
  const r = run(s.a, s.b, s.out)
  assert.strictEqual(r.status, 0, r.stderr)
  const c1 = snapshot(path.join(s.out, 'candidate-1')), c2 = snapshot(path.join(s.out, 'candidate-2'))
  const A = snapshot(s.a), B = snapshot(s.b)
  const ok = JSON.stringify([c1, c2])
  assert.ok(ok === JSON.stringify([A, B]) || ok === JSON.stringify([B, A]), 'one source in each candidate, byte for byte')
})

test('covers: method/REQ-17/LL-1 assign flips the order between random below 0.5 and at or above it', async () => {
  const { assign } = await load()
  const low = assign(() => 0.1), high = assign(() => 0.5)
  for (const k of [low, high]) {
    assert.deepStrictEqual(Object.keys(k).sort(), ['candidate-1', 'candidate-2'])
    assert.deepStrictEqual([k['candidate-1'], k['candidate-2']].sort(), ['base', 'change'])
  }
  assert.notStrictEqual(low['candidate-1'], high['candidate-1'])
  assert.deepStrictEqual(assign(() => 0.99), high)
  assert.deepStrictEqual(assign(() => 0), low)
})

test('covers: method/REQ-17/LL-1 the key is <out>.key.json beside <out>, and <out> holds only the two candidates', () => {
  const s = setup()
  const r = run(s.a, s.b, s.out)
  assert.strictEqual(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.resolve(s.out) + '.key.json'), 'key beside out')
  assert.deepStrictEqual(fs.readdirSync(s.out).sort(), ['candidate-1', 'candidate-2'])
})

test('covers: method/REQ-17/LL-1 stdout names the two candidate paths and neither base nor change', () => {
  const s = setup()
  const r = run(s.a, s.b, s.out)
  assert.strictEqual(r.status, 0, r.stderr)
  assert.ok(r.stdout.includes('candidate-1'), 'names candidate-1')
  assert.ok(r.stdout.includes('candidate-2'), 'names candidate-2')
  assert.doesNotMatch(r.stdout, /base/i)
  assert.doesNotMatch(r.stdout, /change/i)
})

test('covers: method/REQ-17/LL-1 a missing <base> exits 1 with a message and writes no key', () => {
  const s = setup()
  const r = run(path.join(s.d, 'missing'), s.b, s.out)
  assert.strictEqual(r.status, 1)
  assert.ok(message(r), 'a message')
  assert.ok(!fs.existsSync(path.resolve(s.out) + '.key.json'), 'no key')
})

test('covers: method/REQ-17/LL-1 a <change> that is a file exits 1 with a message and writes no key', () => {
  const s = setup()
  const r = run(s.a, path.join(s.b, 'two.txt'), s.out)
  assert.strictEqual(r.status, 1)
  assert.ok(message(r), 'a message')
  assert.ok(!fs.existsSync(path.resolve(s.out) + '.key.json'), 'no key')
})

test('covers: method/REQ-17/LL-1 an <out> with a file in it exits 1 with a message and writes no key', () => {
  const s = setup()
  fs.mkdirSync(s.out)
  fs.writeFileSync(path.join(s.out, 'already.txt'), 'here')
  const r = run(s.a, s.b, s.out)
  assert.strictEqual(r.status, 1)
  assert.ok(message(r), 'a message')
  assert.ok(!fs.existsSync(path.resolve(s.out) + '.key.json'), 'no key')
})

// LL-2
test('covers: method/REQ-17/LL-2 --reveal prints both lines in the order the key holds', () => {
  const s = setup()
  assert.strictEqual(run(s.a, s.b, s.out).status, 0)
  const c1IsBase = JSON.stringify(snapshot(path.join(s.out, 'candidate-1'))) === JSON.stringify(snapshot(s.a))
  const r = run('--reveal', s.out)
  assert.strictEqual(r.status, 0, r.stderr)
  const want = c1IsBase ? ['candidate-1: base', 'candidate-2: change'] : ['candidate-1: change', 'candidate-2: base']
  for (const line of want) assert.ok(r.stdout.includes(line), 'prints ' + line)
})

test('covers: method/REQ-17/LL-2 --reveal with no key file exits 1 with a message', () => {
  const s = setup()
  const r = run('--reveal', s.out)
  assert.strictEqual(r.status, 1)
  assert.ok(message(r), 'a message')
})

test('covers: method/REQ-17/LL-2 --reveal with a key file that is not JSON exits 1 with a message', () => {
  const s = setup()
  fs.mkdirSync(s.out)
  fs.writeFileSync(path.resolve(s.out) + '.key.json', 'not json {')
  const r = run('--reveal', s.out)
  assert.strictEqual(r.status, 1)
  assert.ok(message(r), 'a message')
})
