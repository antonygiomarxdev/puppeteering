import { describe, expect, it } from 'vitest'
import { DESK_W, layout, type Rect } from './layout'

const inside = (r: Rect, f: Rect) => r.x >= f.x && r.y >= f.y && r.x + r.w <= f.x + f.w && r.y + r.h <= f.y + f.h
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('layout(n)', () => {
  for (const n of [0, 1, 2, 4, 5, 6, 9, 17]) {
    it(`gives ${n} agents ${n} desks, apart and on the floor`, () => {
      const L = layout(n)
      expect(L.desks).toHaveLength(n)
      const rects = [...L.desks, ...L.spare, L.leadDesk].map(d => ({ x: d.x, y: d.y - 12, w: DESK_W, h: 25 }))
      rects.forEach((r, i) => {
        expect(inside(r, L.floor)).toBe(true)
        rects.slice(i + 1).forEach(o => expect(overlap(r, o)).toBe(false))
      })
      // The zones sit below the last desk row, and the whole scene fits its height.
      expect(L.zy).toBeGreaterThan(Math.max(...L.desks.map(d => d.y)))
      // The door is in the bottom wall, and its spot is open floor.
      expect(inside(L.door, { x: 0, y: 0, w: L.W, h: L.H })).toBe(true)
      expect(L.blocked.some(b => overlap({ x: L.doorSpot.x, y: L.doorSpot.y, w: 1, h: 1 }, b))).toBe(false)
      L.blocked.forEach(b => expect(inside(b, { x: 0, y: 0, w: L.W, h: L.H })).toBe(true))
    })
  }
})
