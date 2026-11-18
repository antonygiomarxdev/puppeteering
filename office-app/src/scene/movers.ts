import type { Point } from '../office/types'

export const MIN_SPEED = 90 // art pixels per second, as the walkers
export const MAX_WALK_S = 4.5 // a walk to or from the door never takes longer: seats.ts keeps a move for 5 s
export const WAVE_S = 0.8
export const FADE_S = 0.7
export const FADE_IN_S = 0.4

export type Facing = 'up' | 'down' | 'left' | 'right'

/** An agent walking in from the door (`arrive`) or out to it (`leave`): waves at the door, then fades. */
export type Mover = {
  id: string
  kind: 'arrive' | 'leave'
  x: number
  y: number
  path: Point[]
  speed: number
  phase: 'walk' | 'wave' | 'fade' | 'done'
  /** Seconds in the current phase. */
  t: number
  facing: Facing
  alpha: number
}

const length = (from: Point, path: Point[]) => path.reduce((sum, p, i) => sum + Math.hypot(p.x - (path[i - 1] ?? from).x, p.y - (path[i - 1] ?? from).y), 0)

/** `path` is the waypoints after `from`, the last one the destination. */
export function startMove(kind: Mover['kind'], id: string, from: Point, path: Point[]): Mover {
  return { id, kind, x: from.x, y: from.y, path: [...path], speed: Math.max(MIN_SPEED, length(from, path) / MAX_WALK_S), phase: path.length ? 'walk' : kind === 'leave' ? 'wave' : 'done', t: 0, facing: 'down', alpha: kind === 'arrive' ? 0 : 1 }
}

export function stepMove(m: Mover, dt: number): void {
  if (m.phase === 'done') return
  m.t += dt
  if (m.phase === 'walk') {
    let left = m.speed * dt
    while (left > 0 && m.path.length) {
      const p = m.path[0]!
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy)
      if (d > 0) m.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      if (d <= left) { m.x = p.x; m.y = p.y; m.path.shift(); left -= d } else { m.x += (dx / d) * left; m.y += (dy / d) * left; left = 0 }
    }
    if (m.kind === 'arrive') m.alpha = Math.min(1, m.t / FADE_IN_S)
    if (!m.path.length) { m.phase = m.kind === 'leave' ? 'wave' : 'done'; m.t = 0; m.facing = 'down' }
  } else if (m.phase === 'wave') {
    if (m.t >= WAVE_S) { m.phase = 'fade'; m.t = 0 }
  } else {
    m.alpha = Math.max(0, 1 - m.t / FADE_S)
    if (m.t >= FADE_S) m.phase = 'done'
  }
}
