// Re-exports the office pixel art to PNG spritesheets (see README.md).
// Usage: node office-app/tools/sprite-export/export.mjs [legacy-page.html]
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', '..', 'public', 'assets', 'sprites')
const LEGACY_REF = '88dec64:mods/puppet-monitor/office/index.html'

// The hand-written page whose painters we run: a path argument, or the committed version.
const page = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : execFileSync('git', ['show', LEGACY_REF], { cwd: here, encoding: 'utf8', maxBuffer: 1 << 26 })

const cut = (text, a, b) => { const i = text.indexOf(a), j = text.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`page has no "${a}" .. "${b}"`); return text.slice(i, j) }
const crit = cut(page, '// The critter:', '// A white desk')
// Gold variant: explicit palette (face #f5c542, side #c99a1e, far legs #b0861a), no light/dark overlays on the body.
const swaps = [
  ["if (ch === 'l') c(i, j, 1, 1, '#ffffff22', bob)", ''],
  ["if (ch === 'd') c(i, j, 1, 1, '#00000038', bob)", "if (ch === 'd') c(i, j, 1, 1, '#c99a1e', bob)"],
  ["if (side) r(lx, 14, 3, 6 - lift[k % 2], k % 2 ? '#00000038' : '#ffffff22')", "if (side) r(lx, 14, 3, 6 - lift[k % 2], k % 2 ? '#b0861a' : '#f5c542')"],
  ["c(2, 0, 10, 1, '#ffffff22', bob)", ''],
]
let gold = crit
for (const [a, b] of swaps) { if (!gold.includes(a)) throw new Error(`critter() changed, cannot make the gold variant: ${a}`); gold = gold.replace(a, b) }

const html = `<!doctype html><meta charset="utf-8"><script>
let ctx = null
${cut(page, 'const SHADES', '// The critter:')}
${cut(page, '// A white desk', '// The place:')}
${cut(page, '// The place:', '// Layout in art pixels')}
const mkCritter = src => new Function('px', src + '; return critter')(px)
const critterOrange = mkCritter(${JSON.stringify(crit)})
const critterGold = mkCritter(${JSON.stringify(gold)})
${readFileSync(join(here, 'exporter.js'), 'utf8')}
</script>`

const DEST = { sprites: out, scratch: join(tmpdir(), 'sprite-export-previews') }
for (const d of Object.values(DEST)) mkdirSync(d, { recursive: true })
const saved = []
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(url.pathname === '/' ? html : '') }
  const chunks = []
  req.on('data', c => chunks.push(c)).on('end', () => {
    const dir = DEST[url.searchParams.get('dest')], name = url.searchParams.get('name')
    if (!dir || !/^[\w.-]+$/.test(name)) { res.writeHead(400); return res.end() } // only the two folders, only a bare file name
    const body = Buffer.concat(chunks)
    writeFileSync(join(dir, name), name.endsWith('.png') ? Buffer.from(body.toString().split(',')[1], 'base64') : body)
    saved.push(`${url.searchParams.get('dest')}/${name}`)
    res.writeHead(200); res.end('ok')
  })
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p))
if (!chrome) { console.error('No Chrome found: set CHROME to a chrome or msedge executable.'); process.exit(1) }
// Async on purpose: the page posts its sheets back to this process, so the event loop must stay free while Chrome runs.
const run = await new Promise(resolve => {
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=20000', '--dump-dom', `http://127.0.0.1:${port}/`])
  let stdout = '', stderr = ''
  child.stdout.on('data', d => { stdout += d }); child.stderr.on('data', d => { stderr += d })
  child.on('close', () => resolve({ stdout, stderr }))
})
server.close()
const title = /<title>([^<]*)<\/title>/.exec(run.stdout ?? '')?.[1] ?? ''
if (!title.startsWith('done:')) { console.error(`export failed: ${title || run.stderr?.slice(0, 400) || 'no result'}`); process.exit(1) }
console.log(title.replace(/ \| /g, '\n'))
console.log(`wrote ${saved.filter(s => s.startsWith('sprites/')).length} files to ${out}`)
