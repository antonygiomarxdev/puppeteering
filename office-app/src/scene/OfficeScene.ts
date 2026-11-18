import Phaser from 'phaser'
import { EventBus, STATE_EVENT } from '../EventBus'
import { updateRoster } from '../office/roster'
import { fnv1a, isShiny } from '../office/shiny'
import { showsBang } from '../office/wake'
import { Walkers, type Walker } from '../office/walkers'
import type { Desk as Agent, OfficeState } from '../types'
import { ATLASES, tilesPng } from './assets'
import { pathfinder, walkGrid } from './grid'
import { Labels, type Mark, type Pill } from './labels'
import { shadeOf } from '../hud/colors'
import { GR, IW, TOPH, ZH, layout, leadSeat, leadSpot, seatOf, standOf, type Plan } from './layout'

const BG = '#eceaf4'
const TOP = 10000 // depth of marks: above every critter
const PHASES = { day: 'window-day', dawn: 'window-dawn', dusk: 'window-dusk', night: 'window-night' } as const
const phaseOf = (h = new Date().getHours()) => (h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : h >= 5 && h < 7 ? 'dawn' : 'night')

// Frames of the tileset spritesheet.
const T = { wall: 8, wallTop: 9, wallBase: 10, wallShadow: 11, grass: 12, tufts: 13 }
const HEAD = 28 // feet to the top of the head, in art pixels

type Actor = {
  sprite: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  z: Phaser.GameObjects.Image[]
  bang: Phaser.GameObjects.Image
  crown?: Phaser.GameObjects.Image
  sparks: Phaser.GameObjects.Rectangle[]
  shiny: boolean
}

let plan: Plan = layout
/** Swap the desk plan (before the game starts). */
export const usePlan = (p: Plan) => { plan = p }

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
  private L = plan(0)
  private n = -1
  private find = pathfinder(walkGrid(this.L))
  private walkers = new Walkers((from, to) => this.find(from, to), {
    seat: id => seatOf(this.L.desks[this.order.indexOf(id)] ?? this.L.leadDesk),
    lead: id => leadSpot(this.L, Math.max(0, this.order.indexOf(id))),
    stand: to => standOf(this.L, Math.max(0, this.order.indexOf(to))),
  })
  private statics: Phaser.GameObjects.GameObject[] = []
  private deskImages: Phaser.GameObjects.Image[] = []
  private leadDeskImage?: Phaser.GameObjects.Image
  private actors = new Map<string, Actor>()
  private lead?: Actor
  private labels!: Labels

  constructor() { super('office') }

  preload() {
    for (const [key, png, json] of ATLASES) this.load.atlas(key, png, json as object)
    this.load.spritesheet('tiles', tilesPng, { frameWidth: 16, frameHeight: 16 })
  }

  create() {
    this.cameras.main.setBackgroundColor(BG)
    this.labels = new Labels(this.game.canvas.parentElement!)
    const on = (s: OfficeState) => { this.state = s }
    EventBus.on(STATE_EVENT, on)
    this.scale.on('resize', () => this.fit())
    const done = () => { EventBus.off(STATE_EVENT, on); this.labels.destroy() }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, done)
    this.events.once(Phaser.Scenes.Events.DESTROY, done)
  }

  // The whole floor in the window: an integer zoom when it fits at least once, so pixels stay square.
  private fit() {
    const { W, H } = this.L
    const z = Math.min(this.scale.width / W, this.scale.height / H)
    this.cameras.main.setZoom(z >= 1 ? Math.floor(z) : z)
    this.cameras.main.centerOn(W / 2, H / 2)
  }

  private screen(x: number, y: number) {
    const cam = this.cameras.main
    return { x: (x - this.L.W / 2) * cam.zoom + this.scale.width / 2, y: (y - this.L.H / 2) * cam.zoom + this.scale.height / 2 }
  }

  // The static scene, rebuilt when the number of desks changes. Sprite pivots are the old draw anchors, so the layout coordinates apply as they are.
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
    const { W, H, ix } = L
    tiles(0, 0, W, H, 'tiles', T.grass, -1000)
    for (let k = 0; k < 14; k++) { // grass tufts, on both margins
      const left = k % 2 === 0
      const x = left ? fnv1a(`g${k}`) % (GR - 16) : ix + IW + 4 + (fnv1a(`g${k}`) % (GR - 20))
      add(this.add.image(x, 8 + (fnv1a(`h${k}`) % (H - 24)), 'tiles', T.tufts).setOrigin(0, 0), -990)
    }
    for (let y = 12, k = 0; y < H - 30; y += 46, k++) {
      furniture(k % 3 === 1 ? 'pine' : 'tree', 4, y)
      furniture(k % 3 === 0 ? 'pine' : 'tree', ix + IW + 8, y + 18)
    }
    tiles(ix, TOPH, IW, H - TOPH - 6, 'furniture', 'floor-planks', -900)
    // Walls: a lit top face on the back wall, thin sides, a base, and the shadow it throws on the floor.
    tiles(ix - 4, 0, IW + 8, TOPH, 'tiles', T.wall, -800)
    tiles(ix - 4, 0, IW + 8, 16, 'tiles', T.wallTop, -799)
    tiles(ix - 4, TOPH - 16, IW + 8, 16, 'tiles', T.wallBase, -799)
    tiles(ix, TOPH, IW, 16, 'tiles', T.wallShadow, -890).setAlpha(0.35)
    tiles(ix - 4, TOPH, 4, H - TOPH, 'tiles', T.wall, -800)
    tiles(ix + IW, TOPH, 4, H - TOPH, 'tiles', T.wall, -800)
    tiles(ix - 4, H - 6, IW + 8, 6, 'tiles', T.wall, -800)
    // The entrance: a door in the bottom wall and a mat inside it.
    const { door } = L
    add(this.add.rectangle(door.x, door.y, door.w, door.h, 0x8a5a34).setOrigin(0, 0), -790)
    add(this.add.rectangle(door.x + 2, door.y + 1, door.w - 4, door.h - 1, 0xb5834e).setOrigin(0, 0), -789)
    add(this.add.rectangle(door.x - 2, door.y - 8, door.w + 4, 6, 0x9498e0).setOrigin(0, 0), -880)
    for (let k = 0; k < 4; k++) furniture(PHASES[phaseOf()], ix + 10 + k * 78, 5, -700)
    for (const p of L.pods) tiles(p.x, p.y, p.w, p.h, 'furniture', 'floor-tile', -500)
    // Chairs and desks: every slot has its chair, a vacant slot a desk of its own.
    const chair = (d: { x: number; y: number }) => furniture('chair', d.x + 6, d.y + 28, d.y + 10)
    for (const d of [...L.desks, ...L.spare]) chair(d)
    for (const d of L.spare) furniture('desk-off', d.x, d.y)
    L.desks.forEach(d => this.deskImages.push(add(this.add.image(d.x, d.y, 'furniture', 'desk-off'), d.y + 13)))
    // The meeting zone.
    const { mz, lz, zy } = L
    tiles(mz.x, zy, mz.w, ZH, 'furniture', 'carpet-lilac', -500)
    furniture('whiteboard', mz.x + 8, zy + 6)
    chair(L.leadDesk)
    this.leadDeskImage = add(this.add.image(L.leadDesk.x, L.leadDesk.y, 'furniture', 'desk-off'), L.leadDesk.y + 13)
    furniture('bookcase', mz.x + mz.w - 28, zy + 4)
    furniture('meeting-table', mz.x + 20, zy + 66)
    for (const cx of [30, 56, 82]) furniture('chair-small', mz.x + cx, zy + 58)
    furniture('plant-leafy', mz.x + 4, zy + ZH - 24)
    // The lounge.
    tiles(lz.x, zy, lz.w, ZH, 'furniture', 'carpet-stripes', -500)
    furniture('bamboo', lz.x + 6, zy + 4)
    furniture('ping-pong', lz.x + 40, zy + 8)
    furniture('armchair', lz.x + 94, zy + 8)
    furniture('tv-stand', lz.x + 6, zy + 40)
    furniture('armchair', lz.x + 94, zy + 42)
    furniture('coffee-table', lz.x + 55, zy + 79)
    furniture('sofa', lz.x + 18, zy + 98)
    furniture('plant-flowers', lz.x + 100, zy + 100)
    furniture('plant-palm', lz.x + 4, zy + 100)
    this.fit()
  }

  private actor(key: string, lead = false): Actor {
    const sprite = this.add.sprite(0, 0, key, 'idle')
    const shadow = this.add.ellipse(0, 0, 24, 4, 0x000000, 0.2)
    const mark = (frame: string) => this.add.image(0, 0, 'marks', frame).setDepth(TOP)
    const a: Actor = {
      sprite, shadow,
      z: [mark('z'), mark('z')].map(m => m.setVisible(false)),
      bang: mark('bang-red').setVisible(false),
      crown: lead ? mark('crown') : undefined,
      sparks: [],
      shiny: key === 'critter-gold',
    }
    if (a.shiny) a.sparks = [0, 1, 2].map(() => this.add.rectangle(0, 0, 1, 1, 0xfff4a0).setDepth(TOP))
    return a
  }

  private burst(x: number, y: number) {
    for (let k = 0; k < 10; k++) {
      const r = this.add.rectangle(x, y - 14, 2, 2, k % 2 ? 0xffd84a : 0xfff4a0).setDepth(TOP)
      const angle = (k / 10) * Math.PI * 2
      this.tweens.add({ targets: r, x: x + Math.cos(angle) * 26, y: y - 14 + Math.sin(angle) * 22, alpha: 0, duration: 700, onComplete: () => r.destroy() })
    }
  }

  private drop(a: Actor) {
    for (const o of [a.sprite, a.shadow, a.bang, a.crown, ...a.z, ...a.sparks]) o?.destroy()
  }

  /** Frame and flip for a walker; `typing` when it works at its desk. */
  private pose(w: Walker, typing: boolean, id: string, time: number) {
    const tick = Math.floor(time / 250)
    if (w.mode === 'walk') {
      const dir = w.facing === 'right' ? 'left' : w.facing
      return { frame: `walk-${dir}-${tick % 2}`, flip: w.facing === 'right' }
    }
    if (w.mode === 'talk') return { frame: `talk-${tick % 4}`, flip: false }
    if (w.asleep) return { frame: 'asleep', flip: false }
    if (typing) return { frame: `type-${tick % 2}`, flip: false }
    return { frame: (time + (fnv1a(id) % 4000)) % 4000 < 250 ? 'wink' : 'idle', flip: false }
  }

  private place(a: Actor, x: number, y: number, frame: string, flip: boolean) {
    a.sprite.setPosition(x, y).setFrame(frame).setFlipX(flip).setDepth(y)
    a.shadow.setPosition(x, y - 1).setDepth(y - 0.5)
    a.crown?.setPosition(x, y - HEAD + 2)
  }

  /** Alert, wake and sleep marks over one critter. */
  private marks(a: Actor, x: number, y: number, time: number, alert: boolean, wake: boolean, asleep: boolean) {
    const tick = Math.floor(time / 250)
    const red = alert && tick % 2 === 1
    a.bang.setVisible(red || wake).setFrame(red ? 'bang-red' : 'bang-amber').setPosition(x, y - HEAD - 2)
    // Two "z" rise from the head while it sleeps, one behind the other.
    a.z.forEach((z, i) => {
      const n = (tick + i * 4) % 8
      z.setVisible(asleep).setPosition(x + 16 + n * 2, y - HEAD - n * 3)
    })
    const step = Math.floor(time / 500)
    a.sparks.forEach((s, k) => s.setPosition(x - 20 + (fnv1a(`${step}${k}`) % 40), y - 2 - (fnv1a(`${k}${step}`) % 26)).setAlpha(time % 500 < 350 ? 1 : 0))
  }

  update(time: number, delta: number) {
    const s = this.state
    if (!s) return
    const dt = Math.min(0.5, delta / 1000)
    // An agent that left the team keeps its desk until it is back at it with nothing left to say.
    const roster = updateRoster(this.known, s.agents, this.walkers.settled)
    this.order = roster.map(a => a.id)
    if (roster.length !== this.n) {
      this.n = roster.length
      this.L = plan(roster.length)
      this.find = pathfinder(walkGrid(this.L))
      this.build()
    }
    this.walkers.tick(roster.map(a => ({ id: a.id, name: a.name, sleeping: a.sleeping, report: a.report })), dt, time)

    const live = new Set(s.agents.map(a => a.id))
    for (const [id, a] of this.actors) if (!this.known.has(id)) { this.drop(a); this.actors.delete(id) }
    const marks: Mark[] = []
    const lift = (alert: boolean, wake: boolean) => (alert || wake ? 14 : 0)
    const shown: { a: Agent; w: Walker }[] = []

    roster.forEach((a, i) => {
      const w = this.walkers.all.get(a.id)
      if (!w) return
      let actor = this.actors.get(a.id)
      if (!actor) {
        const shiny = isShiny(a.id, location.search)
        actor = this.actor(shiny ? 'critter-gold' : 'critter')
        if (!shiny) actor.sprite.setTint(tintOf(a.name))
        this.actors.set(a.id, actor)
        if (actor.shiny) this.burst(w.x, w.y)
      }
      const typing = a.working && !a.alert && !w.asleep && w.mode === 'sit'
      const { frame, flip } = this.pose(w, typing, a.id, time)
      this.place(actor, w.x, w.y, frame, flip)
      const wake = showsBang(w, time)
      this.marks(actor, w.x, w.y, time, Boolean(a.alert), wake, w.asleep && w.mode === 'sit')
      // Read at draw time: a walk that wakes the agent turns its screen back on in the same frame.
      const screen = a.alert ? 'alert' : w.asleep ? 'off' : a.working ? 'on' : a.status === 'completed' ? 'done' : 'off'
      this.deskImages[i]?.setFrame(`desk-${screen}`)
      shown.push({ a, w })
      const up = lift(Boolean(a.alert), wake)
      const pos = this.screen(w.x, w.y - HEAD - 4 - up)
      const anchor = { id: a.id, x: pos.x, y: pos.y }
      marks.push({ ...anchor, pill: this.pillOf(a, w, live.has(a.id)), bubble: w.mode === 'talk' ? w.text : undefined })
    })

    // The lead sits at the meeting zone's desk.
    const seat = leadSeat(this.L)
    this.lead ??= this.actor('critter', true)
    const leadBusy = s.lead.busy
    this.place(this.lead, seat.x, seat.y, leadBusy ? `type-${Math.floor(time / 250) % 2}` : (time % 4000 < 250 ? 'wink' : 'idle'), false)
    this.marks(this.lead, seat.x, seat.y, time, Boolean(s.lead.alert), false, false)
    this.leadDeskImage?.setFrame(`desk-${s.lead.alert ? 'alert' : leadBusy ? 'on' : 'off'}`)
    const lp = this.screen(seat.x, seat.y - HEAD - 4 - lift(Boolean(s.lead.alert), false))
    const listening = shown.some(({ w }) => w.mode === 'talk' && !w.to)
    marks.push({
      id: 'lead', x: lp.x, y: lp.y,
      pill: { name: 'coordinator', dot: s.lead.alert ? '#ff5a5a' : leadBusy ? '#3ddc84' : '#9a9aaa', sub: s.lead.doing || (leadBusy ? 'working' : 'idle') },
      bubble: leadBusy && s.lead.said && !listening ? s.lead.said : undefined,
    })
    this.labels.update(marks)
  }

  private pillOf(a: Agent, w: Walker, live: boolean): Pill {
    if (a.alert) return { name: a.name, dot: '#ff5a5a', sub: `! ${a.alert.text}`, alertSub: true }
    if (w.asleep && live) return { name: a.name, dot: '#9a9aaa', sub: 'sleeping' }
    return { name: a.name, dot: a.working ? '#3ddc84' : '#7ab8ff', sub: a.working ? `▸ ${a.doing}` : live ? (a.task ?? a.status) : 'left the team' }
  }
}
