import { describe, expect, it } from 'vitest'
import { pathfinder, walkGrid } from './grid'
import { layout, leadSpot, seatOf, standOf, type Rect } from './layout'
import type { Point } from '../office/types'

const hits = (p: Point, rects: Rect[]) => rects.some(r => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h)

// Every 1px along the polyline, so a diagonal hop through furniture would show.
function walk(points: Point[]): Point[] {
  const out: Point[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)))
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}

describe('walking paths', () => {
  for (const n of [1, 4, 6, 9, 13]) {
    it(`from every desk of ${n} to the lead's table avoid the furniture`, () => {
      const L = layout(n)
      const find = pathfinder(walkGrid(L))
      L.desks.forEach((d, i) => {
        const from = seatOf(d), to = leadSpot(L, i)
        const path = [from, ...find(from, to)]
        expect(path.at(-1)).toEqual(to)
        expect(path.length).toBeGreaterThan(2)
        expect(walk(path).filter(p => hits(p, L.blocked))).toEqual([])
      })
    })

    it(`from every desk of ${n} to the door avoid the furniture`, () => {
      const L = layout(n)
      const find = pathfinder(walkGrid(L))
      L.desks.forEach(d => {
        const from = seatOf(d)
        expect(walk([from, ...find(from, L.doorSpot)]).filter(p => hits(p, L.blocked))).toEqual([])
      })
    })

    it(`from desk to desk of ${n} avoid the furniture`, () => {
      const L = layout(n)
      const find = pathfinder(walkGrid(L))
      L.desks.forEach((d, i) => {
        const j = (i + 1) % n
        const from = seatOf(d), to = standOf(L, j)
        expect(walk([from, ...find(from, to)]).filter(p => hits(p, L.blocked))).toEqual([])
      })
    })
  }
})
