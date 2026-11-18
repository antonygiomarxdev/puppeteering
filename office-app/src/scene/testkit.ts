// Fixtures for the scene's tests: a mixed team, seated by the real seat plan.
import type { Identity } from '../office/archetype'
import { seatPlan, type Plan } from '../office/seats'
import { layoutOf, type Layout, type Rect } from './layout'
import type { Point } from '../office/types'

const TYPES = ['builder', 'designer', 'reviewer', 'researcher', 'Plan', 'statusline-setup', undefined]

/** `n` agents of mixed kinds, in a fixed order: builder-0, designer-1, reviewer-2, ... */
export const team = (n: number): Identity[] =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i}`, name: `${TYPES[i % TYPES.length] ?? 'helper'}-${i}`, type: TYPES[i % TYPES.length] }))

export function office(n: number): { plan: Plan; L: Layout } {
  const plan = seatPlan(undefined, team(n), 0)
  return { plan, L: layoutOf(plan) }
}

export const hits = (p: Point, r: Rect) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h
export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
export const inside = (r: Rect, f: Rect) => r.x >= f.x && r.y >= f.y && r.x + r.w <= f.x + f.w && r.y + r.h <= f.y + f.h

/** Every 1px along a polyline, so a diagonal hop through furniture shows. */
export function walk(points: Point[]): Point[] {
  const out: Point[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)))
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}
