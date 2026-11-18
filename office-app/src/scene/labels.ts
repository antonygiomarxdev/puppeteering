// Name pills and speech bubbles are DOM, not Phaser text: they stay crisp under the pixel-art zoom.
import { nudge, type Box } from './view'

const CSS = `
.lbl{position:absolute;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;text-align:center;font:12px/1.35 ui-monospace,Consolas,monospace}
.lbl .pill{display:inline-flex;align-items:center;gap:6px;background:#2b2838;color:#fff;padding:2px 9px;border-radius:999px;font-weight:bold;box-shadow:0 2px 0 #00000030}
.lbl .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.lbl .sub{display:block;margin:2px auto 0;width:fit-content;max-width:26ch;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:#2b2838;background:#ffffffe0;padding:0 6px;border-radius:6px}
.lbl .sub.alert{color:#d63a4a;font-weight:bold}
.lbl.bubble{background:#fff;color:#2b2838;padding:4px 10px;border-radius:12px;white-space:normal;width:max-content;max-width:30ch;box-shadow:0 2px 0 #00000030}
.lbl.bubble::after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fff}
.lbl.tag{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6a6788;background:#ffffffb0;padding:0 6px;border-radius:6px;transform:translate(0,-100%)}
`

export type Pill = { name: string; dot: string; sub?: string; alertSub?: boolean }
/** x, y in screen px: the pill's centre and bottom edge. `tag` is a small floor sign anchored by its left edge. */
export type Mark = { id: string; x: number; y: number; pill?: Pill; bubble?: string; tag?: string; alpha?: number }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export class Labels {
  private layer: HTMLDivElement
  private els = new Map<string, HTMLDivElement>()
  private sizes = new Map<string, { w: number; h: number }>()

  constructor(parent: HTMLElement) {
    const style = document.createElement('style')
    style.textContent = CSS
    parent.appendChild(style)
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
    this.layer = document.createElement('div')
    this.layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none'
    parent.appendChild(this.layer)
  }

  /** The bubble rises 48 CSS pixels above its pill. Pills that would collide are stacked upward. */
  update(marks: Mark[]) {
    const keep = new Set<string>()
    const put = (key: string, className: string, html: string, x: number, y: number, alpha = 1) => {
      keep.add(key)
      let el = this.els.get(key)
      if (!el) { el = document.createElement('div'); this.els.set(key, el); this.layer.appendChild(el) }
      el.className = className
      if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; this.sizes.delete(key) }
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.opacity = alpha === 1 ? '' : String(alpha)
      if (!this.sizes.has(key)) this.sizes.set(key, { w: el.offsetWidth, h: el.offsetHeight })
    }
    const pillHtml = (p: Pill) => `<span class="pill"><i class="dot" style="background:${p.dot}"></i>${esc(p.name)}</span>${p.sub ? `<span class="sub${p.alertSub ? ' alert' : ''}">${esc(p.sub)}</span>` : ''}`
    const boxes: Box[] = []
    for (const m of marks) {
      if (m.pill) put(`${m.id}:pill`, 'lbl', pillHtml(m.pill), m.x, m.y, m.alpha)
      if (m.tag) put(`${m.id}:tag`, 'lbl tag', esc(m.tag), m.x, m.y)
    }
    for (const m of marks) {
      const s = this.sizes.get(`${m.id}:pill`)
      if (m.pill && s) boxes.push({ id: m.id, x: m.x, y: m.y, w: s.w, h: s.h })
    }
    const dy = nudge(boxes)
    for (const m of marks) {
      const up = dy.get(m.id) ?? 0
      if (m.pill) this.els.get(`${m.id}:pill`)!.style.top = `${m.y + up}px`
      if (m.bubble) put(`${m.id}:bubble`, 'lbl bubble', esc(m.bubble.length > 140 ? `${m.bubble.slice(0, 139)}…` : m.bubble), m.x, m.y + up - 48, m.alpha)
    }
    for (const [key, el] of this.els) if (!keep.has(key)) { el.remove(); this.els.delete(key); this.sizes.delete(key) }
  }

  destroy() { this.layer.remove() }
}
