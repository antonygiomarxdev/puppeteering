import Phaser from 'phaser'
import { seeded } from '../office/ambient'
import { ExtrasDirector, extrasFor, type ExtraKind, type ExtraView, type World } from '../office/extras'
import { fnv1a } from '../office/shiny'
import type { Point } from '../office/types'
import costumesJson from '../../public/assets/sprites/costumes.json'
import type { Mark } from './labels'
import { spotsOf, type Layout } from './layout'
import { bareOf, extraFrame, isSide } from './pose'

const SPEED = 70 // art pixels per second: a little slower than the agents
const RETARGET_MS = 1500 // the director may name a new spot every tick; an extra changes course at most this often
const TINT = (costumesJson as unknown as { meta: { extraTint: { color: string; alpha: number } } }).meta.extraTint
const HEAD = 28

type Extra = {
  kind: ExtraKind
  body: Phaser.GameObjects.Sprite
  wash: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  head?: Phaser.GameObjects.Image
  prop?: Phaser.GameObjects.Image
  x: number
  y: number
  path: Point[]
  target: Point
  retargetAt: number
  facing: 'up' | 'down' | 'left' | 'right'
}

/**
 * The office extras: pale critters with their own costume, no name pill, only bubbles. They walk the same grid as the agents
 * (`find`) but are not on the roster, never take a seat, and ?extras=off removes them.
 */
export class ExtrasLayer {
  private director?: ExtrasDirector
  private key = ''
  private extras = new Map<ExtraKind, Extra>()
  private readonly rand: () => number
  private readonly sessionKey: string

  constructor(private scene: Phaser.Scene, private search: string) {
    this.sessionKey = new URLSearchParams(search).get('s') ?? 'default'
    this.rand = seeded(fnv1a(this.sessionKey))
  }

  private make(kind: ExtraKind, at: Point): Extra {
    const s = this.scene
    const tint = Phaser.Display.Color.HexStringToColor(TINT.color).color
    const frame = (part: string) => `extra-${kind}-${part}-front`
    const has = s.textures.exists('costumes') && s.textures.get('costumes').has(frame('head'))
    const part = (f: string) => s.add.image(at.x, at.y, 'costumes', frame(f)).setOrigin(0.5, 28 / 30)
    return {
      kind, x: at.x, y: at.y, path: [], target: at, retargetAt: 0, facing: 'down',
      body: s.add.sprite(at.x, at.y, 'critter', 'idle'),
      wash: s.add.sprite(at.x, at.y, 'critter', 'idle').setTintFill(tint).setAlpha(TINT.alpha),
      shadow: s.add.ellipse(at.x, at.y, 24, 4, 0x000000, 0.2),
      head: has ? part('head') : undefined,
      prop: has ? part('prop') : undefined,
    }
  }

  private drop(e: Extra) {
    for (const o of [e.body, e.wash, e.shadow, e.head, e.prop]) o?.destroy()
  }

  /** Moves and draws every extra, and returns their bubbles as label marks. */
  update(a: {
    time: number; dt: number; now: number; L: Layout; find: (from: Point, to: Point) => Point[]
    agents: World['agents']; leadCelebrating: boolean; screen: (x: number, y: number) => Point
  }): Mark[] {
    const kinds = extrasFor(a.agents.length, this.search, this.sessionKey)
    const key = kinds.join()
    if (key !== this.key) {
      this.key = key
      this.director = new ExtrasDirector(kinds)
      for (const [k, e] of this.extras) if (!kinds.includes(k)) { this.drop(e); this.extras.delete(k) }
    }
    if (!this.director) return []
    const views = this.director.tick({ spots: spotsOf(a.L), agents: a.agents, leadCelebrating: a.leadCelebrating }, a.now, this.rand)
    const marks: Mark[] = []
    for (const v of views) marks.push(...this.show(v, a))
    return marks
  }

  private show(v: ExtraView, a: Parameters<ExtrasLayer['update']>[0]): Mark[] {
    let e = this.extras.get(v.kind)
    if (!e) { e = this.make(v.kind, v.target); this.extras.set(v.kind, e) }
    // Change course when the director names another spot, at most every RETARGET_MS.
    if (Math.hypot(v.target.x - e.target.x, v.target.y - e.target.y) > 2 && a.now - e.retargetAt > RETARGET_MS) {
      e.target = v.target
      e.retargetAt = a.now
      e.path = a.find({ x: e.x, y: e.y }, v.target)
    }
    let left = SPEED * a.dt
    while (left > 0 && e.path.length) {
      const p = e.path[0]!
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy)
      if (d > 0) e.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      if (d <= left) { e.x = p.x; e.y = p.y; e.path.shift(); left -= d } else { e.x += (dx / d) * left; e.y += (dy / d) * left; left = 0 }
    }
    const f = extraFrame(v.pose, e.path.length > 0, e.facing, a.time, fnv1a(v.kind))
    const frame = e.head ? bareOf(f.frame) : f.frame
    const x = e.x + f.dx
    e.body.setPosition(x, e.y).setFrame(frame).setFlipX(f.flip).setDepth(e.y)
    e.wash.setPosition(x, e.y).setFrame(frame).setFlipX(f.flip).setDepth(e.y + 0.05)
    e.shadow.setPosition(x, e.y - 1).setDepth(e.y - 0.5)
    const view = isSide(frame) ? 'side' : 'front'
    e.head?.setFrame(`extra-${v.kind}-head-${view}`).setPosition(x, e.y).setFlipX(f.flip).setDepth(e.y + 0.1)
    e.prop?.setFrame(`extra-${v.kind}-prop-${view}`).setPosition(x, e.y).setFlipX(f.flip).setDepth(e.y + 0.1)
    if (!v.bubble) return []
    const p = a.screen(x, e.y - HEAD - 4)
    return [{ id: `extra-${v.kind}`, x: p.x, y: p.y, bubble: v.bubble }]
  }

  destroy() {
    for (const e of this.extras.values()) this.drop(e)
    this.extras.clear()
  }
}
