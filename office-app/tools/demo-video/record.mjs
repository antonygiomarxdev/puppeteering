// node office-app/tools/demo-video/record.mjs [--theme=<name>] [--seconds=<n>]
// Plays story.mjs in the built office page (headless Chrome/Edge) and encodes two MP4s with ffmpeg.
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CLICKS, DURATION, stateScript } from './story.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const app = resolve(here, '../..')
const built = resolve(app, '../mods/puppet-monitor/office/index.html')
const out = join(app, 'dist/video')
const site = join(out, 'site') // a copy of the build, so a rebuild during the take cannot change it
const arg = n => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const theme = arg('theme')
const seconds = Number(arg('seconds') ?? DURATION)
if (!(seconds > 0)) throw new Error('--seconds must be a positive number')
const FPS = 30
const SIZES = [{ name: 'landscape-1920x1080', w: 1920, h: 1080, vw: 1920, vh: 1080 }, // vw x vh: the page's CSS size. The square is captured at 1440x1080 (the scene fits the map to the stage width), scaled to 1080 wide and centred on the page colour.
  { name: 'square-1080x1080', w: 1080, h: 1080, vw: 1440, vh: 1080 }]
const only = arg('size')
const sleep = ms => new Promise(r => setTimeout(r, ms))

const browser = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => p && existsSync(p))
if (!browser) throw new Error('No Chrome or Edge found. Set CHROME to its path.')

if (!existsSync(built)) {
  console.log('build missing, running vite build')
  if (spawnSync('npx', ['vite', 'build'], { cwd: app, stdio: 'inherit', shell: true }).status) throw new Error('vite build failed')
}
mkdirSync(site, { recursive: true })
copyFileSync(built, join(site, 'index.html'))

async function take({ name, w, h, vw, vh }, PORT) {
  const frames = join(out, `frames-${name}`)
  rmSync(frames, { recursive: true, force: true })
  mkdirSync(frames, { recursive: true })
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${vw},${vh}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(out, 'profile-' + name)}`, 'about:blank'], { stdio: 'ignore' })
  try {
    let page
    for (let i = 0; i < 60 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page') } catch {} if (!page) await sleep(250) }
    if (!page) throw new Error('browser did not start')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise(r => (ws.onopen = r))
    let id = 0
    const wait = new Map(), on = new Map()
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) wait.get(m.id)?.(m); else on.get(m.method)?.(m.params) }
    const send = (method, params = {}) => new Promise(r => { wait.set(++id, m => r(m.result)); ws.send(JSON.stringify({ id, method, params })) })
    const js = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value
    const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }) }

    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: false })
    // Pixel art stays crisp: no smoothing on the canvas.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='canvas{image-rendering:pixelated}';document.head.append(s)})` })

    // Story time 0 is in the future: until then the page shows the story's first state.
    let t0 = Date.now() + 1e9
    const write = () => writeFileSync(join(site, 'state-demo.js'), stateScript((Date.now() - t0) / 1000, t0))
    write()
    const q = new URLSearchParams({ s: 'demo' })
    if (theme) q.set('theme', theme)
    await send('Page.navigate', { url: `${pathToFileURL(join(site, 'index.html')).href}?${q}` })
    await sleep(4000) // load, first poll, scene warm-up, everyone settles at their desk

    console.log(name, 'stage/canvas:', await js(`(()=>{const r=document.getElementById('stage').getBoundingClientRect(),c=document.querySelector('canvas');return r.width+'x'+r.height+' / '+c.width+'x'+c.height+' css '+c.getBoundingClientRect().width+'x'+c.getBoundingClientRect().height})()`))
    const shots = []
    on.set('Page.screencastFrame', p => {
      const file = join(frames, `${String(shots.length).padStart(6, '0')}.png`)
      writeFileSync(file, Buffer.from(p.data, 'base64'))
      shots.push({ ts: p.metadata.timestamp, file })
      send('Page.screencastFrameAck', { sessionId: p.sessionId })
    })
    t0 = Date.now() + 500
    await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })

    const clicks = CLICKS.filter(c => c.t < seconds)
    const rectOf = async sel => js(`(()=>{const e=${sel};if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    while ((Date.now() - t0) / 1000 < seconds) {
      write()
      const t = (Date.now() - t0) / 1000
      while (clicks.length && clicks[0].t <= t) {
        const c = clicks.shift()
        const p = await rectOf(c.close ? `document.querySelector('.drawer button')` : `[...document.querySelectorAll('.card')].find(e=>e.querySelector('b')?.textContent==='${c.select}')`)
        if (p) await click(p.x, p.y); else console.warn(`click at ${c.t}s: target not found`)
      }
      await sleep(200)
    }
    await send('Page.stopScreencast')
    await sleep(300)

    // Frames only arrive on change. Each lasts until the next one; ffmpeg resamples to a fixed 30 fps.
    const start = t0 / 1000, end = start + seconds
    let from = shots.findLastIndex(s => s.ts <= start)
    const used = shots.slice(Math.max(from, 0))
    if (!used.length) throw new Error('no frames captured')
    const list = used.map((s, i) => {
      const a = Math.max(s.ts, start), b = Math.min(used[i + 1]?.ts ?? end, end)
      return `file '${s.file.replaceAll('\\', '/')}'\nduration ${Math.max(b - a, 0.001).toFixed(4)}`
    })
    list.push(`file '${used.at(-1).file.replaceAll('\\', '/')}'`)
    const listFile = join(frames, 'list.txt')
    writeFileSync(listFile, list.join('\n') + '\n')
    const mp4 = join(out, `office-demo-${name}.mp4`)
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `fps=${FPS},${vw === w ? '' : `scale=${w}:-2:flags=lanczos,pad=${w}:${h}:0:(oh-ih)/2:color=0xeceaf4,`}format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', '-t', String(seconds), mp4], { stdio: 'inherit' })
    if (r.status) throw new Error('ffmpeg failed')
    console.log(`${mp4}: ${shots.length} frames captured, ${(shots.length / seconds).toFixed(1)} per second`)
    ws.close()
  } finally {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' })
      // Stragglers that outlive the tree: only the processes that carry this take's profile folder.
      spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | ? { $_.CommandLine -like '*profile-${name}*' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' })
    } else chrome.kill()
    await sleep(1000)
    rmSync(frames, { recursive: true, force: true })
  }
}

for (const [i, size] of SIZES.entries()) if (!only || size.name.startsWith(only)) await take(size, 9333 + i)
process.exit(0)
