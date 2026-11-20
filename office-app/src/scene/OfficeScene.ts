import Phaser from 'phaser'
import { EventBus, STATE_EVENT } from '../EventBus'
import { archetypeOf, type Identity } from '../office/archetype'
import { leadMoodOf, moodOf, type Mood } from '../office/mood'
import { seatPlan, type Plan } from '../office/seats'
import { fnv1a, isShiny } from '../office/shiny'
import { showsBang } from '../office/wake'
import { Walkers, type Walker } from '../office/walkers'
import type { Desk as Agent, OfficeState } from '../types'
import { shadeOf } from '../hud/colors'
import { ATLASES, tilesPng } from './assets'
import { costumeName, costumeTexture } from './costumes'
import { pathfinder, walkGrid } from './grid'
import { Labels, type Mark, type Pill } from './labels'
import { GR, TOPH, layoutOf, leadSpot, standBeside, windowsOf, type Layout } from './layout'
import { startMove, stepMove, type Mover } from './movers'
import { bareOf, hopFrame, isSide, poseOf, type Pose } from './pose'
import { clampCenter, fitZoom } from './view'
import { pickTheme } from './theme'
import { ExtrasLayer } from './extrasLayer'
import { ThemeLayer } from './themed'
import { THEMES } from './themes'

const BG = '#eceaf4'
const TOP = 10000 // depth of marks: above every critter
const PHASES = { day: 'window-day', dawn: 'window-dawn', dusk: 'window-dusk', night: 'window-night' } as const
const phaseOf = (h = new Date().getHours()) => (h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : h >= 5 && h < 7 ? 'dawn' : 'night')

// Frames of the tileset spritesheet.
const T = { wall: 8, wallTop: 9, wallBase: 10, wallShadow: 11, grass: 12, tufts: 13 }
/** Clicking a critter emits this with its id (null: nobody); the HUD emits and listens to it too. */
export const SELECT_EVENT = 'select-agent'
const HEAD = 28 // feet to the top of the head, in art pixels
const CELEBRATE_MS = 5000
const CONFETTI = [0xff5a5a, 0xffd84a, 0x6bf0a0, 0x7ab8ff, 0xf09ab0]
const GREY = 0x9a9aa6

type Piece = Phaser.GameObjects.Image

type Actor = {
  sprite: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  z: Piece[]
  /** The mood's mark, and the amber "!" of a wake-up. */
  mark: Piece
  sparks: Phaser.GameObjects.Rectangle[]
  shiny: boolean
  tint?: number
  /** Costume overlays, from the archetype's sheet with the variant's accent. */
  head?: Piece
  prop?: Piece
  costume?: string
}

/** What one frame draws for one critter. */
type Draw = { id: string; desk: Agent; x: number; y: number; frame: string; flip: boolean; alpha: number; pose: Pose; asleep: boolean; wake: boolean; facing: 'up' | 'down' | 'left' | 'right'; walking: boolean }

// Tint that turns the art's orange into the agent's shade: a tint only multiplies, so lighter shades stay as drawn.
const BASE = [0xd9, 0x77, 0x57]
const tintOf = (name: string) => {
  const c = parseInt(shadeOf(name).slice(1), 16)
  return [c >> 16, (c >> 8) & 255, c & 255].reduce((t, v, i) => (t << 8) | Math.min(255, Math.round((v / BASE[i]!) * 255)), 0)
}

export class OfficeScene extends Phaser.Scene {
  private state?: OfficeState
  private known = new Map<string, Agent>()
  private order: string[] = []
  private seats?: Plan
  private L: Layout = layoutOf(seatPlan(undefined, [], 0))
  private sig = ''
  private find = pathfinder(walkGrid(this.L))
  private walkers = new Walkers((from, to) => this.find(from, to), {
    seat: id => this.L.seatOf[id] ?? this.L.leadSeat,
    lead: id => leadSpot(this.L, Math.max(0, this.order.indexOf(id))),
    stand: to => standBeside(this.L.seatOf[to] ?? this.L.leadSeat),
  })
  private movers = new Map<string, Mover>()
  /** Where each agent sat last frame: a leaver's seat is already gone from the layout when its walk starts. */
  private lastSeat = new Map<string, { x: number; y: number }>()
  private started = new Set<string>()
  private statics: Phaser.GameObjects.GameObject[] = []
  private deskImages: Phaser.GameObjects.Image[] = []
  private leadDeskImage?: Phaser.GameObjects.Image
  private actors = new Map<string, Actor>()
  private lead?: Actor
  private labels!: Labels
  private themed!: ThemeLayer
  private extras!: ExtrasLayer
  private selected: string | null = null
  private ring!: Phaser.GameObjects.Ellipse
  private celebrated = new Set<string>()
  private celebrateUntil = 0
  private center = { x: 0, y: 0 }
  private zoom = 1

  constructor() { super('office') }

  preload() {
    this.themed = new ThemeLayer(this, pickTheme(new Date(), location.search, THEMES))
    this.themed.preload()
    for (const [key, png, json] of ATLASES) this.load.atlas(key, png, json as object)
    this.load.spritesheet('tiles', tilesPng, { frameWidth: 16, frameHeight: 16 })
  }

  create() {
    this.cameras.main.setBackgroundColor(BG)
    this.labels = new Labels(this.game.canvas.parentElement!)
    this.extras = new ExtrasLayer(this, location.search)
    const on = (s: OfficeState) => { this.state = s }
    const pick = (id: string | null) => { this.selected = id }
    EventBus.on(STATE_EVENT, on)
    EventBus.on(SELECT_EVENT, pick)
    this.ring = this.add.ellipse(0, 0, 36, 10).setStrokeStyle(2, 0x4a90d9).setVisible(false)
    this.center = { x: this.L.W / 2, y: this.L.H / 2 }
    // A click on empty floor clears the selection; a drag pans the view, as the wheel does, once the office outgrows the window.
    let drag: { x: number; y: number; moved: boolean } | undefined
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { drag = { x: p.x, y: p.y, moved: false } })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!drag || !p.isDown) return
      if (Math.hypot(p.x - drag.x, p.y - drag.y) > 4) drag.moved = true
      if (!drag.moved) return
      this.center.x -= (p.x - drag.x) / this.zoom
      this.center.y -= (p.y - drag.y) / this.zoom
      drag.x = p.x; drag.y = p.y
      this.fit()
    })
    this.input.on('pointerup', (_p: unknown, over: unknown[]) => {
      if (drag && !drag.moved && !over.length) EventBus.emit(SELECT_EVENT, null)
      drag = undefined
    })
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      this.center.x += dx / this.zoom
      this.center.y += dy / this.zoom
      this.fit()
    })
    this.scale.on('resize', () => this.fit())
    const done = () => { this.themed.destroy(); this.extras.destroy(); EventBus.off(STATE_EVENT, on); EventBus.off(SELECT_EVENT, pick); this.labels.destroy() }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, done)
    this.events.once(Phaser.Scenes.Events.DESTROY, done)
  }

  // The whole office in the window: an integer zoom when it fits at least once; past the legible minimum it scrolls.
  private fit() {
    const { W, H } = this.L
    const vw = this.scale.width, vh = this.scale.height
    this.zoom = fitZoom(vw, vh, W, H)
    this.center.x = clampCenter(this.center.x, vw / this.zoom, W)
    this.center.y = clampCenter(this.center.y, vh / this.zoom, H)
    this.cameras.main.setZoom(this.zoom)
    this.cameras.main.centerOn(this.center.x, this.center.y)
  }

  private screen(x: number, y: number) {
    return { x: (x - this.center.x) * this.zoom + this.scale.width / 2, y: (y - this.center.y) * this.zoom + this.scale.height / 2 }
  }

  // The static scene, rebuilt when a neighbourhood or half-pod appears or goes. Sprite pivots are the old draw anchors, so the layout coordinates apply as they are.
  private build() {
    this.statics.forEach(o => o.destroy())
    this.statics = []
    this.deskImages = []
    const L = this.L
    const add = <O extends Phaser.GameObjects.GameObject>(o: O, depth?: number): O => {
      this.statics.push(o)
      if (depth !== undefined) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(depth)
      return o
    }
    const tiles = (x: number, y: number, w: number, h: number, key: string, frame: string | number, depth: number) =>
      add(this.add.tileSprite(x, y, w, h, key, frame).setOrigin(0, 0), depth)
    const furniture = (frame: string, x: number, y: number, depth?: number) => {
      const o = this.add.image(x, y, 'furniture', frame)
      return add(o, depth ?? o.getBottomCenter().y)
    }
    const { W, H, ix, floor } = L
    tiles(0, 0, W, H, 'tiles', T.grass, -1000)
    for (let k = 0; k < Math.round(W / 24); k++) { // grass tufts, on both margins
      const left = k % 2 === 0
      const x = left ? fnv1a(`g${k}`) % (GR - 16) : ix + floor.w + 4 + (fnv1a(`g${k}`) % (GR - 20))
      add(this.add.image(x, 8 + (fnv1a(`h${k}`) % (H - 24)), 'tiles', T.tufts).setOrigin(0, 0), -990)
    }
    for (let y = 12, k = 0; y < H - 30; y += 46, k++) {
      furniture(k % 3 === 1 ? 'pine' : 'tree', 4, y)
      furniture(k % 3 === 0 ? 'pine' : 'tree', ix + floor.w + 8, y + 18)
    }
    tiles(floor.x, floor.y, floor.w, floor.h, 'furniture', 'floor-planks', -900).setData('kind', 'floor')
    // Walls: a lit top face on the back wall, thin sides, a base, and the shadow it throws on the floor.
    tiles(ix - 4, 0, floor.w + 8, TOPH, 'tiles', T.wall, -800).setData('kind', 'wall')
    tiles(ix - 4, 0, floor.w + 8, 16, 'tiles', T.wallTop, -799)
    tiles(ix - 4, TOPH - 16, floor.w + 8, 16, 'tiles', T.wallBase, -799)
    tiles(ix, TOPH, floor.w, 16, 'tiles', T.wallShadow, -890).setAlpha(0.35)
    tiles(ix - 4, TOPH, 4, H - TOPH, 'tiles', T.wall, -800).setData('kind', 'wall')
    tiles(ix + floor.w, TOPH, 4, H - TOPH, 'tiles', T.wall, -800).setData('kind', 'wall')
    tiles(ix - 4, H - 6, floor.w + 8, 6, 'tiles', T.wall, -800).setData('kind', 'wall')
    // The one entrance: a door in the left wall and a mat inside it.
    const { door, doorSpot } = L
    add(this.add.rectangle(door.x - 2, door.y, door.w + 4, door.h, 0x8a5a34).setOrigin(0, 0), -790)
    add(this.add.rectangle(door.x - 1, door.y + 1, door.w + 2, door.h - 2, 0xb5834e).setOrigin(0, 0), -789)
    add(this.add.rectangle(ix, doorSpot.y - 10, 14, 20, 0x9498e0).setOrigin(0, 0), -880)
    for (const x of windowsOf(L)) furniture(PHASES[phaseOf()], x, 5, -700).setData('kind', 'window')
    for (const h of L.hoods) for (const p of h.pods) tiles(p.x, p.y, p.w, p.h, 'furniture', 'floor-tile', -500)
    tiles(L.meeting.x, L.meeting.y, L.meeting.w, L.meeting.h, 'furniture', 'carpet-lilac', -500).setData('kind', 'meeting')
    tiles(L.lounge.x, L.lounge.y, L.lounge.w, L.lounge.h, 'furniture', 'carpet-stripes', -500).setData('kind', 'lounge')
    for (const f of L.furniture) furniture(f.frame, f.x, f.y)
    // Chairs and desks: every slot has its chair and a desk whose screen follows its occupant.
    const chair = (d: { x: number; y: number }) => furniture('chair', d.x + 6, d.y + 28, d.y + 10)
    for (const d of L.desks) {
      chair(d.desk)
      this.deskImages.push(add(this.add.image(d.desk.x, d.desk.y, 'furniture', 'desk-off'), d.desk.y + 13))
    }
    chair(L.leadDesk)
    this.leadDeskImage = add(this.add.image(L.leadDesk.x, L.leadDesk.y, 'furniture', 'desk-off'), L.leadDesk.y + 13)
    this.themed.build(L, this.statics, add)
    this.fit()
  }

  private actor(key: string, desk: Identity): Actor {
    const sprite = this.add.sprite(0, 0, key, 'idle')
    const shadow = this.add.ellipse(0, 0, 24, 4, 0x000000, 0.2)
    const mark = (frame: string) => this.add.image(0, 0, 'marks', frame).setDepth(TOP)
    const a: Actor = {
      sprite, shadow,
      z: [mark('z'), mark('z')].map(m => m.setVisible(false)),
      mark: mark('bang-amber').setVisible(false),
      sparks: [],
      shiny: key === 'critter-gold',
    }
    if (a.shiny) a.sparks = [0, 1, 2].map(() => this.add.rectangle(0, 0, 1, 1, 0xfff4a0).setDepth(TOP))
    const sheet = costumeTexture(this, archetypeOf(desk), desk.id)
    if (sheet) {
      a.costume = costumeName(archetypeOf(desk))
      const part = (f: string) => this.add.image(0, 0, sheet, `${a.costume}-${f}-front`).setOrigin(0.5, 28 / 30)
      a.head = part('head')
      a.prop = part('prop')
    }
    return a
  }

  /** Confetti or stars from one point. */
  private burst(x: number, y: number, colors: number[], n = 10, reach = 26) {
    for (let k = 0; k < n; k++) {
      const r = this.add.rectangle(x, y - 14, 2, 2, colors[k % colors.length]!).setDepth(TOP)
      const angle = (k / n) * Math.PI * 2
      this.tweens.add({ targets: r, x: x + Math.cos(angle) * reach, y: y - 14 + Math.sin(angle) * reach * 0.85, alpha: 0, duration: 700, onComplete: () => r.destroy() })
    }
  }

  private drop(a: Actor) {
    for (const o of [a.sprite, a.shadow, a.mark, a.head, a.prop, ...a.z, ...a.sparks]) o?.destroy()
  }

  /** Puts one critter on the floor: body, costume, marks, shadow. */
  private show(a: Actor, d: Draw, time: number) {
    const { x, y } = d
    const tick = Math.floor(time / 250)
    const frame = a.head ? bareOf(d.frame) : d.frame
    a.sprite.setPosition(x, y).setFrame(frame).setFlipX(d.flip).setDepth(y).setAlpha(d.alpha)
    if (d.pose.grey) a.sprite.setTint(GREY)
    else if (a.tint !== undefined) a.sprite.setTint(a.tint)
    else a.sprite.clearTint()
    a.shadow.setPosition(x, y - 1).setDepth(y - 0.5).setAlpha(0.2 * d.alpha)
    if (a.head && a.prop && a.costume) {
      const view = isSide(frame) ? 'side' : 'front'
      a.head.setFrame(`${a.costume}-head-${view}`).setPosition(x, y).setFlipX(d.flip).setDepth(y + 0.1).setAlpha(d.alpha)
      a.prop.setFrame(`${a.costume}-prop-${view}`).setPosition(x, y).setFlipX(d.flip).setDepth(y + 0.1).setAlpha(d.alpha)
    }
    // The wake-up "!" comes first, then the mood's mark (blinking ones show every other beat).
    const wake = d.wake
    const mark = wake ? 'bang-amber' : d.pose.mark
    const show = Boolean(mark) && d.alpha > 0.5 && (wake || !d.pose.blink || tick % 2 === 1)
    a.mark.setVisible(show).setPosition(x, y - HEAD - 2)
    if (mark) a.mark.setFrame(mark)
    // Two "z" rise from the head while it sleeps, one behind the other.
    a.z.forEach((z, i) => {
      const n = (tick + i * 4) % 8
      z.setVisible(d.asleep && d.alpha > 0.5).setPosition(x + 16 + n * 2, y - HEAD - n * 3)
    })
    const step = Math.floor(time / 500)
    a.sparks.forEach((s, k) => s.setPosition(x - 20 + (fnv1a(`${step}${k}`) % 40), y - 2 - (fnv1a(`${k}${step}`) % 26)).setAlpha(time % 500 < 350 ? d.alpha : 0))
  }

  /** Which mood to show: the one the rules say, unless the walk, a sleep or the celebration decides first. */
  private poseFor(a: Agent, w: Walker, mood: Mood, time: number, celebrating: boolean): { frame: string; flip: boolean; pose: Pose } {
    const tick = Math.floor(time / 250)
    if (w.mode === 'walk') {
      const dir = w.facing === 'right' ? 'left' : w.facing
      return { frame: `walk-${dir}-${tick % 2}`, flip: w.facing === 'right', pose: { frame: '' } }
    }
    if (w.mode === 'talk') return { frame: `talk-${tick % 4}`, flip: false, pose: { frame: '' } }
    if (w.asleep) return { frame: 'asleep', flip: false, pose: { frame: 'asleep' } }
    if (celebrating && mood !== 'Error') return { frame: hopFrame(time), flip: false, pose: { frame: '', mark: 'note' } }
    const pose = poseOf(mood === 'Sleeping' ? 'IdleAwake' : mood, time, fnv1a(a.id))
    return { frame: pose.frame, flip: false, pose }
  }

  update(time: number, delta: number) {
    const s = this.state
    if (!s) return
    const dt = Math.min(0.5, delta / 1000)
    const now = Date.now()
    for (const a of s.agents) this.known.set(a.id, a)

    // Seats never move: the plan keeps every agent's desk until it leaves.
    this.seats = seatPlan(this.seats, s.agents, now)
    this.L = layoutOf(this.seats)
    if (this.L.sig !== this.sig) {
      this.sig = this.L.sig
      this.find = pathfinder(walkGrid(this.themed.blocked(this.L)))
      this.build()
    }
    const L = this.L

    // Walks to and from the door.
    for (const m of this.seats.moves) {
      const key = `${m.id}:${m.kind}:${m.since}`
      if (this.started.has(key)) continue
      this.started.add(key)
      if (m.kind === 'arrive') {
        const to = L.seatOf[m.id]
        if (to) this.movers.set(m.id, startMove('arrive', m.id, L.doorSpot, this.find(L.doorSpot, to)))
      } else {
        const w = this.walkers.all.get(m.id)
        const from = w ? { x: w.x, y: w.y } : (this.lastSeat.get(m.id) ?? L.doorSpot)
        this.movers.set(m.id, startMove('leave', m.id, from, this.find(from, L.doorSpot)))
        this.walkers.all.delete(m.id)
      }
    }
    for (const [id, m] of this.movers) {
      stepMove(m, dt)
      if (m.phase === 'done') this.movers.delete(id)
    }

    for (const [id, at] of Object.entries(L.seatOf)) this.lastSeat.set(id, at)
    const seated = s.agents.filter(a => L.seatOf[a.id] && !this.movers.has(a.id))
    this.order = seated.map(a => a.id)
    this.walkers.tick(seated.map(a => ({ id: a.id, name: a.name, sleeping: a.sleeping, report: a.report })), dt, time)

    // The lead's mood also sets the office's: a completion makes everyone awake hop for a few seconds, once.
    const leadMood = leadMoodOf(s.lead, s.agents, s.tasks, s.history, now)
    const done = s.history.find(e => e.kind === 'done')
    if (leadMood === 'Celebrating' && done && !this.celebrated.has(`all:${done.id}:${done.at}`)) {
      this.celebrated.add(`all:${done.id}:${done.at}`)
      this.celebrateUntil = time + CELEBRATE_MS
      for (let k = 0; k < 10; k++) this.time.delayedCall(k * 450, () => {
        const sprites = [...this.actors.values()].map(a => a.sprite)
        const at = sprites[(k * 7 + 3) % Math.max(1, sprites.length)]
        if (at) this.burst(at.x, at.y, CONFETTI, 12, 30)
      })
    }
    const celebrating = time < this.celebrateUntil

    const draws: Draw[] = []
    for (const a of seated) {
      const w = this.walkers.all.get(a.id)
      if (!w) continue
      const mood = moodOf(a, now, s.history)
      const p = this.poseFor(a, w, mood, time, celebrating && !w.asleep)
      draws.push({ id: a.id, desk: a, x: w.x, y: w.y, frame: p.frame, flip: p.flip, alpha: 1, pose: p.pose, asleep: w.asleep && w.mode === 'sit', wake: showsBang(w, time), facing: w.facing, walking: w.mode === 'walk' })
      // One burst per finished task.
      const fin = mood === 'FinishingTask' && s.history.find(e => e.kind === 'done' && (e.who === a.name || e.who === a.id) && now - e.at < 3000)
      if (fin && !this.celebrated.has(`${a.id}:${fin.id}:${fin.at}`)) {
        this.celebrated.add(`${a.id}:${fin.id}:${fin.at}`)
        this.burst(w.x, w.y, CONFETTI, 8, 20)
      }
    }
    for (const m of this.movers.values()) {
      const a = this.known.get(m.id)
      if (!a) continue
      const tick = Math.floor(time / 250)
      const frame = m.phase === 'walk' ? `walk-${m.facing === 'right' ? 'left' : m.facing}-${tick % 2}` : `wave-${tick % 2}`
      draws.push({ id: m.id, desk: a, x: m.x, y: m.y, frame, flip: m.phase === 'walk' && m.facing === 'right', alpha: m.alpha, pose: { frame }, asleep: false, wake: false, facing: m.facing, walking: m.phase === 'walk' })
    }

    // Critters, costumes and the desks they sit at.
    const shown = new Set(draws.map(d => d.id))
    for (const [id, actor] of this.actors) if (!shown.has(id)) { this.drop(actor); this.actors.delete(id) }
    const marks: Mark[] = []
    for (const d of draws) {
      let actor = this.actors.get(d.id)
      if (!actor) {
        const shiny = isShiny(d.id, location.search)
        actor = this.actor(shiny ? 'critter-gold' : 'critter', d.desk)
        if (!shiny) { actor.tint = tintOf(d.desk.name); actor.sprite.setTint(actor.tint) }
        this.actors.set(d.id, actor)
        const id = d.id
        actor.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => EventBus.emit(SELECT_EVENT, id))
        if (actor.shiny) this.burst(d.x, d.y, [0xffd84a, 0xfff4a0])
      }
      this.show(actor, d, time)
      this.themed.hat(d.id, d.x, d.y, d.y, d.facing, d.walking, d.flip)
      const moving = this.movers.get(d.id)
      const a = d.desk
      const up = d.pose.mark || d.wake ? 14 : 0
      const pos = this.screen(d.x, d.y - HEAD - 4 - up)
      const w = this.walkers.all.get(d.id)
      const pill: Pill = moving
        ? { name: a.name, dot: '#9a9aaa', sub: moving.kind === 'leave' ? 'left the team' : 'joining' }
        : this.pillOf(a, w!, true)
      marks.push({ id: d.id, x: pos.x, y: pos.y, pill, bubble: w && w.mode === 'talk' && !moving ? w.text : undefined, alpha: d.alpha })
      // Desks: the monitor follows the agent sitting at it, and goes dark when nobody does.
      const slot = L.desks.findIndex(k => k.occupant === d.id)
      if (slot >= 0 && !moving) {
        const screen = a.alert ? 'alert' : w?.asleep ? 'off' : a.working ? 'on' : a.status === 'completed' ? 'done' : 'off'
        this.deskImages[slot]?.setFrame(`desk-${screen}`)
      }
    }
    L.desks.forEach((k, i) => { if (!k.occupant || !shown.has(k.occupant) || this.movers.has(k.occupant)) this.deskImages[i]?.setFrame('desk-off') })
    for (const h of L.hoods) {
      const p = this.screen(h.rect.x, h.rect.y + h.rect.h + 14)
      marks.push({ id: `hood${h.slot}`, x: p.x, y: p.y, tag: h.kind })
    }

    // The selection ring rides under the selected critter, and drops if that agent is gone.
    const sel = this.selected ? this.actors.get(this.selected)?.sprite : undefined
    this.ring.setVisible(Boolean(sel))
    if (sel) this.ring.setPosition(sel.x, sel.y - 1).setDepth(sel.y - 0.6)

    // The lead sits at the meeting zone's desk.
    const seat = L.leadSeat
    const lead = this.lead ??= this.actor('critter', { id: 'lead', name: 'lead' })
    const lp = poseOf(leadMood, time, fnv1a('lead'))
    const ldraw: Draw = { id: 'lead', desk: { id: 'lead', name: 'lead' } as Agent, x: seat.x, y: seat.y, frame: lp.frame, flip: false, alpha: 1, pose: lp, asleep: leadMood === 'Sleeping', wake: false, facing: 'down', walking: false }
    this.show(lead, ldraw, time)
    this.leadDeskImage?.setFrame(`desk-${s.lead.alert ? 'alert' : s.lead.busy ? 'on' : 'off'}`)
    const lpos = this.screen(seat.x, seat.y - HEAD - 4 - (lp.mark ? 14 : 0))
    const listening = draws.some(d => this.walkers.all.get(d.id)?.mode === 'talk' && !this.walkers.all.get(d.id)?.to)
    marks.push({
      id: 'lead', x: lpos.x, y: lpos.y,
      pill: { name: 'coordinator', dot: s.lead.alert ? '#ff5a5a' : s.lead.busy ? '#3ddc84' : '#9a9aaa', sub: s.lead.doing || (s.lead.busy ? 'working' : 'idle') },
      bubble: s.lead.busy && s.lead.said && !listening ? s.lead.said : undefined,
    })
    // The office extras share the floor: they are told where every real agent sits and is heading, and keep clear of them.
    marks.push(...this.extras.update({
      time, dt, now, L, find: this.find, leadCelebrating: leadMood === 'Celebrating', screen: (x, y) => this.screen(x, y),
      agents: seated.map(a => {
        const w = this.walkers.all.get(a.id)
        return { id: a.id, seat: L.seatOf[a.id]!, working: a.working, target: w && w.mode !== 'sit' ? w.route.at(-1) : undefined, lastError: a.lastError }
      }),
    }))
    this.themed.keepHats(shown)
    this.themed.step(dt)
    this.labels.update(marks)
  }

  private pillOf(a: Agent, w: Walker, live: boolean): Pill {
    if (a.alert) return { name: a.name, dot: '#ff5a5a', sub: `! ${a.alert.text}`, alertSub: true }
    if (w.asleep && live) return { name: a.name, dot: '#9a9aaa', sub: 'sleeping' }
    return { name: a.name, dot: a.working ? '#3ddc84' : '#7ab8ff', sub: a.working ? `▸ ${a.doing}` : live ? (a.task ?? a.status) : 'left the team' }
  }
}
