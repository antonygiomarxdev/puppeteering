import { seeded } from './ambient'
import { fnv1a } from './shiny'
import type { Point } from './seats'

// Original office staff. Not agents: no name, never in the Team panel or any count, `extra: true`.
export type ExtraKind = 'hr' | 'pet' | 'intern' | 'vending' | 'it'
export type Pose = 'walk' | 'idle' | 'note' | 'clap' | 'shake' | 'shrug' | 'carry'
export type ExtraView = { extra: true; kind: ExtraKind; target: Point; pose: Pose; bubble?: string }

/** One scene tile, in world px. */
export const TILE = 32
/** Where a visitor stands behind a desk's chair spot. */
export const BEHIND = 40
const NOTE_MS = 4_000
const LEG_MS = 4_000
const IT_GO_MS = 2_000
const IT_LOOK_MS = 3_000
const IT_SHRUG_MS = 1_000
const IT_BACK_MS = 2_000
const SHAKE_MS = 1_500

/** The scene's world at one tick. `target` is where a real agent is heading, when it differs from its seat. */
export type World = {
  spots: { coffee: Point; vending: Point; lead: Point; corner: Point; aisles: Point[] }
  agents: { id: string; seat: Point; working: boolean; target?: Point; lastError?: { at: number; text: string } }[]
  leadCelebrating: boolean
}

const shuffle = <T>(xs: T[], rand: () => number): T[] => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Which extras this session shows. Order and choice come from the session key, so a reload shows the same ones. */
export function extrasFor(agentCount: number, search: string, sessionKey: string): ExtraKind[] {
  if (new URLSearchParams(search).get('extras') === 'off') return []
  const count = agentCount <= 3 ? 2 : agentCount <= 8 ? 3 : 4
  const rand = seeded(fnv1a(sessionKey))
  const others = shuffle<ExtraKind>(['intern', 'vending', 'it'], rand)
  return shuffle<ExtraKind>(['hr', 'pet', ...others.slice(0, count - 2)], rand)
}

const behind = (seat: Point): Point => ({ x: seat.x, y: seat.y - BEHIND })
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const wander = (w: World, now: number): Point => w.spots.aisles[Math.floor(now / 10_000) % w.spots.aisles.length]
const visitKey = (id: string, at: number) => `${id}@${at}`

type Raw = { target: Point; pose: Pose; bubble?: string }
type Intern = { route: { to: Point; carry: boolean }[]; legStart: number; restUntil: number }
type Visit = { desk: Point; start: number }

export class ExtrasDirector {
  private hrNext = 0
  private hrNoting?: { until: number; at: Point }
  private lastNoted?: string
  private vendingNext = 0
  private shakeUntil = 0
  private intern: Intern = { route: [], legStart: 0, restUntil: 0 }
  private visit?: Visit
  private visited = new Set<string>()

  constructor(private readonly kinds: ExtraKind[]) {}

  /** One view per extra, in `kinds` order. Each target is moved aside if a seat, the lead's spot or a real agent's target has it. */
  tick(w: World, now: number, rand: () => number): ExtraView[] {
    const taken = [...w.agents.map(a => a.seat), ...w.agents.flatMap(a => (a.target ? [a.target] : [])), w.spots.lead]
    return this.kinds.map(kind => {
      const raw = this.raw(kind, w, now, rand)
      const target = taken.some(t => same(t, raw.target)) ? this.sideStep(raw.target, taken, w, rand) : raw.target
      return { extra: true, kind, target, pose: raw.pose, ...(raw.bubble ? { bubble: raw.bubble } : {}) }
    })
  }

  private raw(kind: ExtraKind, w: World, now: number, rand: () => number): Raw {
    switch (kind) {
      case 'hr': return this.hr(w, now, rand)
      case 'pet': return {
        target: { x: w.spots.lead.x - 2 * TILE, y: w.spots.lead.y },
        pose: w.leadCelebrating ? 'clap' : 'idle',
      }
      case 'vending': {
        if (now >= this.vendingNext) {
          this.shakeUntil = now + SHAKE_MS
          this.vendingNext = now + 20_000 + rand() * 20_000
        }
        return { target: w.spots.vending, pose: now < this.shakeUntil ? 'shake' : 'idle' }
      }
      case 'intern': return this.internStep(w, now, rand)
      case 'it': return this.itStep(w, now)
    }
  }

  private hr(w: World, now: number, rand: () => number): Raw {
    if (this.hrNoting && now < this.hrNoting.until) return { target: this.hrNoting.at, pose: 'note', bubble: 'Noted.' }
    if (this.hrNoting) {
      this.hrNoting = undefined
      this.hrNext = now + 8_000 + rand() * 12_000
    }
    if (now >= this.hrNext) {
      // Never the same agent twice in a row. With one working agent, HR wanders instead.
      const candidates = w.agents.filter(a => a.working && a.id !== this.lastNoted)
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(rand() * candidates.length)]
        this.lastNoted = pick.id
        this.hrNoting = { until: now + NOTE_MS, at: behind(pick.seat) }
        return { target: this.hrNoting.at, pose: 'note', bubble: 'Noted.' }
      }
    }
    return { target: wander(w, now), pose: 'walk' }
  }

  private internStep(w: World, now: number, rand: () => number): Raw {
    const it = this.intern
    if (it.route.length === 0 && now >= it.restUntil) {
      const working = w.agents.filter(a => a.working)
      if (working.length > 0) {
        const pick = working[Math.floor(rand() * working.length)]
        const route: Intern['route'] = []
        if (rand() < 1 / 4) route.push({ to: wander(w, now + 10_000 * Math.floor(rand() * 3)), carry: false }) // a wrong spot first
        route.push({ to: w.spots.coffee, carry: false })
        route.push({ to: behind(pick.seat), carry: true })
        it.route = route
        it.legStart = now
      } else {
        it.restUntil = now + 5_000
      }
    }
    while (it.route.length > 0 && now - it.legStart >= LEG_MS) {
      it.route.shift()
      it.legStart += LEG_MS
      if (it.route.length === 0) it.restUntil = it.legStart + 15_000 + rand() * 10_000
    }
    const leg = it.route[0]
    if (!leg) return { target: w.spots.coffee, pose: 'idle' }
    return leg.carry ? { target: leg.to, pose: 'carry', bubble: 'Coffee!' } : { target: leg.to, pose: 'walk' }
  }

  private itStep(w: World, now: number): Raw {
    if (this.visit) {
      const t = now - this.visit.start
      const desk = this.visit.desk
      if (t < IT_GO_MS) return { target: desk, pose: 'walk' }
      if (t < IT_GO_MS + IT_LOOK_MS) return { target: desk, pose: 'idle' }
      if (t < IT_GO_MS + IT_LOOK_MS + IT_SHRUG_MS) return { target: desk, pose: 'shrug', bubble: '?' }
      if (t < IT_GO_MS + IT_LOOK_MS + IT_SHRUG_MS + IT_BACK_MS) return { target: w.spots.corner, pose: 'walk' }
      this.visit = undefined
    }
    // At most one visit per error: the key is the agent id and the error's time.
    const next = w.agents.find(a => a.lastError && !this.visited.has(visitKey(a.id, a.lastError.at)))
    if (next?.lastError) {
      this.visited.add(visitKey(next.id, next.lastError.at))
      this.visit = { desk: behind(next.seat), start: now }
      return { target: this.visit.desk, pose: 'walk' }
    }
    return { target: w.spots.corner, pose: 'idle' }
  }

  /** Another spot: a free aisle, else the corner. A target that is still taken stays, and never lands on a seat. */
  private sideStep(target: Point, taken: Point[], w: World, rand: () => number): Point {
    const free = w.spots.aisles.filter(p => !taken.some(t => same(t, p)))
    if (free.length > 0) return free[Math.floor(rand() * free.length)]
    return taken.some(t => same(t, w.spots.corner)) ? target : w.spots.corner
  }
}
