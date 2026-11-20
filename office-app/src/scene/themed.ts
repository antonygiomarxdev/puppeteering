import Phaser from 'phaser'
import { fnv1a } from '../office/shiny'
import { THEME_SHEETS } from './assets'
import { anchorsOf, type Layout, type Rect } from './layout'
import { ParticleField } from './particles'
import { sheetOf, type Theme } from './theme'

const TOP = 10000
// Placeholder sizes, by frame, for a theme whose sheet or frame has not landed.
const SIZE: Record<string, [number, number]> = { 'deco-wall': [32, 16], 'deco-floor-big': [24, 32], 'deco-floor-small': [12, 12], 'deco-desk': [8, 8], particle: [3, 3] }

type Facing = 'up' | 'down' | 'left' | 'right'
type Tintable = Phaser.GameObjects.GameObject & { setTint(c: number): unknown }
type Piece = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle

/** One theme in the scene: decor at anchors, tints, hats and particles. Every missing piece warns once and is drawn as a rectangle. */
export class ThemeLayer {
  private warned = new Set<string>()
  private hats = new Map<string, Piece>()
  private field?: ParticleField
  private dots: Piece[] = []
  private readonly key: string

  constructor(
    private scene: Phaser.Scene,
    readonly theme: Theme | undefined,
    private off = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {
    this.key = theme ? sheetOf(theme) : ''
  }

  private warn(what: string) {
    if (this.warned.has(what)) return
    this.warned.add(what)
    console.warn(`theme ${this.theme?.name}: ${what}`)
  }

  preload() {
    if (!this.theme) return
    const sheet = THEME_SHEETS[this.key]
    if (sheet) this.scene.load.atlas(this.key, sheet.png, sheet.json)
    else this.warn(`sheet ${this.key} not found, using placeholders`)
  }

  private has(frame: string) {
    const loaded = this.scene.textures.exists(this.key)
    const ok = loaded && this.scene.textures.get(this.key).has(frame)
    if (loaded && !ok) this.warn(`frame ${frame} missing from ${this.key}`)
    return ok
  }

  /** A sheet frame, or a coloured rectangle of the usual size when it is not there. Origin is the bottom centre. */
  private piece(frame: string, x: number, y: number, depth: number): Piece {
    const [w, h] = SIZE[frame] ?? [8, 8]
    if (this.has(frame)) return this.scene.add.image(x, y, this.key, frame).setOrigin(0.5, 1).setDepth(depth)
    const color = Phaser.Display.Color.HSLToColor((fnv1a(`${this.theme?.name}${frame}`) % 360) / 360, 0.6, 0.55).color
    return this.scene.add.rectangle(x, y, w, h, color).setOrigin(0.5, 1).setDepth(depth)
  }

  /** The layout with the corner decor's floor added to its blocked rects: build the walk grid from this. */
  blocked(L: Layout): Layout {
    if (!this.theme) return L
    const corners = anchorsOf(L)['floor-corner']
    const feet = this.theme.decor.filter(d => d.anchor === 'floor-corner').flatMap(d => corners.slice(0, d.count).map(s => s.foot as Rect))
    return feet.length ? { ...L, blocked: [...L.blocked, ...feet] } : L
  }

  /** Decor at its anchors, and the palette tints on the objects tagged with `kind`. `add` registers a static object. */
  build(L: Layout, statics: Phaser.GameObjects.GameObject[], add: <O extends Phaser.GameObjects.GameObject>(o: O) => O) {
    const t = this.theme
    if (!t) return
    const slots = anchorsOf(L)
    for (const d of t.decor) for (const s of slots[d.anchor].slice(0, d.count)) add(this.piece(d.frame, s.x, s.y, s.depth))
    for (const o of statics) {
      const color = t.palette?.[o.getData('kind') as keyof NonNullable<Theme['palette']>]
      if (color) (o as Tintable).setTint(parseInt(color.slice(1), 16))
    }
    if (t.particles) {
      if (this.field) this.field.resize(L.W, L.H)
      else this.field = new ParticleField(L.W, L.H, t.particles.drift, t.particles.rate, this.off)
    }
  }

  /** The hat rides on the critter's head: the sheet's overlay frame at the critter's own position, or a red rectangle. */
  hat(id: string, x: number, y: number, depth: number, facing: Facing, walking: boolean, flip: boolean) {
    if (!this.theme?.hat) return
    let h = this.hats.get(id)
    const frame = walking && (facing === 'left' || facing === 'right') ? 'hat-side' : 'hat-front'
    const use = this.has(frame) ? frame : this.has('hat') ? 'hat' : undefined
    if (use) {
      if (!(h instanceof Phaser.GameObjects.Image)) { h?.destroy(); h = this.scene.add.image(x, y, this.key, use); this.hats.set(id, h) }
      h.setFrame(use).setPosition(x, y).setFlipX(flip).setDepth(depth + 0.2)
    } else {
      if (!(h instanceof Phaser.GameObjects.Rectangle)) { h?.destroy(); h = this.scene.add.rectangle(x, y, 12, 5, 0xd63a4a).setOrigin(0.5, 1); this.hats.set(id, h) }
      h.setPosition(x, y - 25).setDepth(depth + 0.2)
    }
  }

  /** Drops the hats of agents no longer on the roster. */
  keepHats(ids: Set<string>) {
    for (const [id, h] of this.hats) if (!ids.has(id)) { h.destroy(); this.hats.delete(id) }
  }

  step(dt: number) {
    const drift = this.theme?.particles
    if (!this.field || !drift) return
    const live = this.field.step(dt)
    while (this.dots.length < live.length) this.dots.push(this.piece(drift.frame, 0, 0, TOP - 5))
    this.dots.forEach((o, i) => {
      const p = live[i]
      o.setVisible(Boolean(p))
      if (p) o.setPosition(p.x, p.y).setAlpha(drift.drift === 'fall' ? 1 : 1 - p.age / p.life)
    })
  }

  destroy() {
    this.hats.forEach(h => h.destroy())
    this.dots.forEach(d => d.destroy())
  }
}
