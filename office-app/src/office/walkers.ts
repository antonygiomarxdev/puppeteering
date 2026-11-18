import type { Agent, Pathfinder, Point, Report } from './types'
import { wake, type Sleep } from './wake'

export const SPEED = 90 // art pixels per second
export const TALK_S = 6

export type Mode = 'sit' | 'walk' | 'talk'
export type Facing = 'up' | 'down' | 'left' | 'right'

export type Walker = Point & Sleep & {
  mode: Mode
  facing: Facing
  /** Points still to walk. */
  path: Point[]
  /** Trips waiting, oldest first. A trip is a report to the lead, or a visit to the peer named in `to`. */
  queue: Report[]
  talk: number
  text: string
  /** Id of the peer being visited, none when the trip is to the lead. */
  to?: string
  /** The way out, seat first: the way home is it reversed. */
  route: Point[]
  /** True while outbound: arriving starts the talk. */
  out: boolean
}

/** Where things are: supplied by the layout (and later the Tiled map). */
export type Places = {
  seat: (id: string) => Point
  /** Where `id` stands to report to the lead. */
  lead: (id: string) => Point
  /** Where `from` stands to talk to the peer `to`. */
  stand: (to: string, from: string) => Point
}

export const idle = (w: Walker) => w.mode === 'sit' && w.path.length === 0

export class Walkers {
  readonly all = new Map<string, Walker>()
  private seen = new Map<string, number>()
  private first = true

  constructor(private route: Pathfinder, private places: Places) {}

  /** Back at its desk with nothing queued, or never walked: its ghost may go. */
  settled = (id: string) => {
    const w = this.all.get(id)
    return !w || (idle(w) && w.queue.length === 0)
  }

  private visited = (id: string) => [...this.all.values()].some(v => v.to === id && v.mode !== 'sit')

  /** One frame, for the agents on the roster, in slot order. `now` in ms, `dt` in s. */
  tick(agents: Agent[], dt: number, now: number) {
    for (const a of agents) {
      const w = this.all.get(a.id) ?? this.spawn(a.id)
      // Desks move when the team changes: whoever sits follows its desk.
      if (idle(w)) Object.assign(w, this.places.seat(a.id))
      // Reports seen on the first frame were already old when the page opened.
      if (a.report && this.seen.get(a.id) !== a.report.at) {
        this.seen.set(a.id, a.report.at)
        if (!this.first) w.queue.push(a.report)
      }
      this.depart(w, a, agents)
      this.move(w, dt)
      const awake = !a.sleeping || w.queue.length > 0 || w.mode !== 'sit' || w.path.length > 0
      Object.assign(w, wake(w, awake, now))
    }
    this.first = false
  }

  private spawn(id: string): Walker {
    const w: Walker = { ...this.places.seat(id), asleep: false, wakeAt: 0, mode: 'sit', facing: 'down', path: [], queue: [], talk: 0, text: '', route: [], out: false }
    this.all.set(id, w)
    return w
  }

  // A visit goes to the person, not the desk: wait until they sit at it, and stay put while someone visits.
  private depart(w: Walker, a: Agent, agents: Agent[]) {
    if (!w.queue.length || !idle(w) || this.visited(a.id)) return
    const trip = w.queue[0]!
    const peer = agents.find(b => b.id !== a.id && (b.name === trip.to || b.id === trip.to))
    const peerWalker = peer && this.all.get(peer.id)
    if (peer && !(peerWalker && idle(peerWalker))) return
    w.queue.shift()
    w.text = trip.text
    w.to = peer?.id
    const from = { x: w.x, y: w.y }
    const target = peer ? this.places.stand(peer.id, a.id) : this.places.lead(a.id)
    w.route = [from, ...this.route(from, target)]
    w.path = w.route.slice(1)
    w.out = true
  }

  private move(w: Walker, dt: number) {
    if (w.path.length) {
      const p = w.path[0]!
      const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy), step = SPEED * dt
      w.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      if (d <= step) { w.x = p.x; w.y = p.y; w.path.shift() } else { w.x += (dx / d) * step; w.y += (dy / d) * step }
      w.mode = 'walk'
      if (!w.path.length) {
        if (w.out) { w.mode = 'talk'; w.talk = TALK_S; w.facing = 'right' }
        else { w.mode = 'sit'; w.facing = 'down'; w.to = undefined }
      }
    } else if (w.mode === 'talk') {
      w.talk -= dt
      if (w.talk <= 0) { w.out = false; w.path = w.route.slice(0, -1).reverse() }
    }
  }
}
