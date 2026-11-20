// node office-app/tools/demo-video/record.mjs [--theme=<name>] [--seconds=<n>] [--size=landscape|square] [--zoom-map[=off]]
// Plays story.mjs in the built office page (headless Chrome/Edge) and encodes two MP4s with ffmpeg.
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CLICKS, DURATION, ZOOM, stateScript } from './story.mjs'

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
const SIZES = [{ name: 'landscape-1920x1080', w: 1920, h: 1080, square: false }, { name: 'square-1080x1080', w: 1080, h: 1080, square: true }]
// --zoom-map: in the stuck beat, zoom the page about 2x on the stuck agent, then back. On by default for the square; --zoom-map forces it on, --zoom-map=off turns it off.
const zoomArg = process.argv.find(a => a === '--zoom-map' || a.startsWith('--zoom-map='))
const zoomOn = sq => (zoomArg ? zoomArg !== '--zoom-map=off' : sq)
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

async function take({ name, w, h, square }, PORT) {
  const frames = join(out, `frames-${name}`)
  rmSync(frames, { recursive: true, force: true })
  mkdirSync(frames, { recursive: true })
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--mute-audio',
    '--force-device-scale-factor=1', '--window-size=2600,1500', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
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
    await send('Emulation.setDeviceMetricsOverride', { width: 2600, height: 1500, deviceScaleFactor: 1, mobile: false })
    // Pixel art stays crisp: no smoothing on the canvas. The square also gets its own page layout: the map on top, the team in three columns under it.
    const css = 'canvas{image-rendering:pixelated} html,body{overflow:hidden}' + (square
      ? 'main{flex-direction:column;padding:0;gap:0} #stage{flex:none;height:var(--sh,900px);border-radius:0} .side{width:auto;flex:1;flex-direction:column;gap:8px;padding:8px;overflow:hidden} .cards{display:grid;grid-template-columns:repeat(3,1fr)} .history{overflow:hidden}' : '')
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.append(s)})` })
    // The page does not expose its scene: wrap Phaser.Game so the recorder can read the office size and zoom (window.__game).
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `let P;Object.defineProperty(window,'Phaser',{configurable:true,get:()=>P,set(v){P=v;const G=v.Game;const N=function(c){const g=Reflect.construct(G,[c],new.target||N);window.__game=g;return g};N.prototype=G.prototype;v.Game=N}})` })
    const scene = `__game.scene.getScene('office')`
    // Story time 0 is in the future: until then the page shows the story's first state.
    let t0 = Date.now() + 1e9
    const write = () => writeFileSync(join(site, 'state-demo.js'), stateScript((Date.now() - t0) / 1000, t0))
    write()
    const q = new URLSearchParams({ s: 'demo' })
    if (theme) q.set('theme', theme)
    await send('Page.navigate', { url: `${pathToFileURL(join(site, 'index.html')).href}?${q}` })
    await sleep(4000) // load, first poll, scene warm-up, everyone settles at their desk

    // Frame the page: exactly w x h CSS px at device scale 1, so text is rasterized sharp and nothing is resampled. The scene zooms the office (W x H world px) by a whole number z; a stage a bit
    // narrower than the map just trims its edge (trees and grass). Take the biggest z that shows at least 90% of the map's width and all of its height.
    const { W, H, hh } = await js(`(()=>{const s=${scene};return{W:s.L.W,H:s.L.H,hh:document.querySelector('header').getBoundingClientRect().height}})()`)
    const SIDE = 340, SQUARE_TEAM = 220 // the Team panel's width; the height the team and history get under the map in the square
    const sw = square ? w : w - 36 - SIDE, sh = h - hh - (square ? SQUARE_TEAM : 12)
    const z = [6, 5, 4, 3, 2, 1].find(z => sw / (z * W) >= 0.9 && z * H <= sh) ?? 1
    // The whole-number fit is forced to z (times the zoom-map multiplier), so the page size cannot change it. Everything the scene draws goes through fit(), screen() and these fields.
    await js(`(()=>{const s=${scene};const clampC=(v,view,size)=>size<=view?size/2:Math.min(Math.max(v,view/2),size-view/2)
      s.__base=${z};s.__mult=1;s.__home={x:s.center.x,y:s.center.y}
      s.fit=function(){const{W,H}=this.L,vw=this.scale.width,vh=this.scale.height;this.zoom=this.__base*this.__mult
        this.center.x=clampC(this.center.x,vw/this.zoom,W);this.center.y=clampC(this.center.y,vh/this.zoom,H);this.cameras.main.setZoom(this.zoom);this.cameras.main.centerOn(this.center.x,this.center.y)}})()`)
    await js(`document.documentElement.style.setProperty('--sh','${z * H}px')`)
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    await sleep(1500) // the scene refits to the new stage
    console.log(name, `office ${W}x${H}, zoom ${z}, page ${w}x${h}`, await js(`(()=>{const s=${scene},m=document.querySelector('main').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return 'scene zoom '+s.zoom+', stage '+c.width+'x'+c.height+', content bottom '+Math.round(m.bottom)+'/'+innerHeight+', scroll '+document.documentElement.scrollHeight})()`))
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
    const zoom = zoomOn(square) && ZOOM.from < seconds ? { ...ZOOM, state: 'idle' } : null
    // The page measures its stage from the DOM, so a CSS transform would make it refit. Zoom through the scene instead: animate the multiplier of the forced zoom and the centre from the page
    // (requestAnimationFrame, smoothstep).
    const zoomJs = `(()=>{const s=${scene};const ease=e=>e*e*(3-2*e)
      const go=(mult,to,ms)=>{const m0=s.__mult,c0={...s.center},t0=performance.now();const step=now=>{const e=ease(Math.min((now-t0)/ms,1));s.__mult=m0+(mult-m0)*e;s.center.x=c0.x+(to.x-c0.x)*e;s.center.y=c0.y+(to.y-c0.y)*e;s.fit();if(e<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
      // The label sits just above the agent's head: the agent is a little below its bottom edge. Screen to world is the inverse of the scene's screen().
      window.__zoomIn=(who,mult,ms)=>{const l=[...document.querySelectorAll('.lbl')].find(e=>e.querySelector('.pill')?.textContent.includes(who));if(!l)return false
        const r=l.getBoundingClientRect(),c=s.game.canvas.getBoundingClientRect();go(mult,{x:s.center.x+(r.x+r.width/2-c.x-s.scale.width/2)/s.zoom,y:s.center.y+(r.bottom+30-c.y-s.scale.height/2)/s.zoom},ms);return true}
      window.__zoomOut=ms=>go(1,s.__home,ms)})()`
    if (zoom) await js(zoomJs)
    const rectOf = async sel => js(`(()=>{const e=${sel};if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    while ((Date.now() - t0) / 1000 < seconds) {
      write()
      const t = (Date.now() - t0) / 1000
      if (zoom?.state === 'idle' && t >= zoom.from) {
        if (await js(`__zoomIn('${zoom.who}',2,700)`)) zoom.state = 'in'; else { console.warn('zoom: label not found'); zoom.state = 'done' }
      }
      if (zoom?.state === 'in' && t >= zoom.to - 0.7) { await js('__zoomOut(700)'); zoom.state = 'done' }
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
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `fps=${FPS},scale=${w}:${h}:flags=neighbor,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', '-t', String(seconds), mp4], { stdio: 'inherit' })
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
