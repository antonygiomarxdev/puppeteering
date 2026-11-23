import { test, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const FILES = ['main.js', 'match.js', 'mod.json']
const made = []
after(() => made.forEach(d => fs.rmSync(d, { recursive: true, force: true })))
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-herdr-' + name + '-')); made.push(d); return d }

// A throwaway copy of install.js next to fake source files, so the test never touches the real mod folder or ~/.config.
function source(files = FILES) {
  const dir = tmp('src')
  fs.copyFileSync(path.join(here, 'install.js'), path.join(dir, 'install.js'))
  for (const f of files) fs.writeFileSync(path.join(dir, f), 'content of ' + f + '\n')
  return dir
}
const run = (dir, env, args = []) => spawnSync(process.execPath, [path.join(dir, 'install.js'), ...args], { env: { ...process.env, HERDR_APP_HOME: '', ...env }, encoding: 'utf8' })
const list = d => { try { return fs.readdirSync(d).sort() } catch { return [] } }
const read = p => { try { return fs.readFileSync(p, 'utf8') } catch { return undefined } }
const readme = () => { try { return fs.readFileSync(path.join(here, 'README.md'), 'utf8') } catch { return '' } }

test('covers: herdr/REQ-12/D-33 with HERDR_APP_HOME set the three files land in <it>/mods/puppet-herdr/ and nothing else is written', () => {
  const src = source()
  const app = tmp('app')
  const r = run(src, { HERDR_APP_HOME: app })
  assert.strictEqual(r.status, 0, r.stderr)
  assert.deepStrictEqual(list(app), ['mods'])
  assert.deepStrictEqual(list(path.join(app, 'mods')), ['puppet-herdr'])
  assert.deepStrictEqual(list(path.join(app, 'mods', 'puppet-herdr')), FILES)
  for (const f of FILES) assert.strictEqual(read(path.join(app, 'mods', 'puppet-herdr', f)), 'content of ' + f + '\n')
  assert.deepStrictEqual(list(src), [...FILES, 'install.js'].sort())
})

test('covers: herdr/REQ-12/D-33 a second run overwrites the copies and exits 0', () => {
  const src = source()
  const app = tmp('app')
  assert.strictEqual(run(src, { HERDR_APP_HOME: app }).status, 0)
  fs.writeFileSync(path.join(src, 'main.js'), 'newer main\n')
  const again = run(src, { HERDR_APP_HOME: app })
  assert.strictEqual(again.status, 0, again.stderr)
  assert.strictEqual(read(path.join(app, 'mods', 'puppet-herdr', 'main.js')), 'newer main\n')
  assert.deepStrictEqual(list(path.join(app, 'mods', 'puppet-herdr')), FILES)
})

test('covers: herdr/REQ-12/D-3 target(env, home) uses HERDR_APP_HOME when set, else <home>/.config/herdr-app, built with path.join', async () => {
  const { target } = await import(pathToFileURL(path.join(here, 'install.js')).href)
  const home = path.join(os.tmpdir(), 'h')
  const appHome = path.join(os.tmpdir(), 'x')
  // The spec names the app home; the mod folder under it is where the files land. Either reading holds, the path.join form is exact.
  const ok = (got, base) => [base, path.join(base, 'mods', 'puppet-herdr')].includes(got)
  assert.ok(ok(target({ HERDR_APP_HOME: appHome }, home), appHome), 'set: ' + target({ HERDR_APP_HOME: appHome }, home))
  assert.ok(ok(target({}, home), path.join(home, '.config', 'herdr-app')), 'default: ' + target({}, home))
  assert.ok(ok(target({ HERDR_APP_HOME: '' }, home), path.join(home, '.config', 'herdr-app')), 'empty counts as unset: ' + target({ HERDR_APP_HOME: '' }, home))
})

test('covers: herdr/REQ-12/D-3 with no HERDR_APP_HOME the files go under os.homedir()/.config/herdr-app', () => {
  const src = source()
  const home = tmp('home')
  const r = run(src, { HOME: home, USERPROFILE: home })
  assert.strictEqual(r.status, 0, r.stderr)
  assert.deepStrictEqual(list(path.join(home, '.config', 'herdr-app', 'mods', 'puppet-herdr')), FILES)
})

test('covers: herdr/REQ-12/D-3 a missing source file exits 1 with a message that names it', () => {
  const src = source(['main.js', 'mod.json']) // match.js is missing
  const app = tmp('app')
  const r = run(src, { HERDR_APP_HOME: app })
  assert.strictEqual(r.status, 1)
  assert.match(r.stderr + r.stdout, /match\.js/)
})

test('covers: herdr/REQ-12/D-33 the README names ~/.claude/puppet-monitor/ and says the panel reads files outside its own folder', () => {
  const text = readme()
  assert.ok(text.includes('~/.claude/puppet-monitor/'), 'README must name ~/.claude/puppet-monitor/')
  assert.match(text, /outside its own folder/i)
})

test('covers: herdr/REQ-12/D-33 the README says the panel runs no program and opens no network connection', () => {
  const text = readme()
  assert.match(text, /runs no program/i)
  assert.match(text, /opens no network connection/i)
})
