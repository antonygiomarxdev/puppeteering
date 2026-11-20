import EasyStar from 'easystarjs'
import type { Pathfinder, Point } from '../office/types'
import type { Layout, Rect } from './layout'

export const CELL = 4

const touches = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** A walk grid over the floor: 1 is blocked, from the furniture footprints. Cell (cx, cy) covers CELL art pixels. */
export function walkGrid(L: Layout): number[][] {
  const cols = Math.ceil(L.W / CELL)
  const rows = Math.ceil(L.H / CELL)
  const f = L.floor
  return Array.from({ length: rows }, (_, cy) =>
    Array.from({ length: cols }, (_, cx) => {
      const cell = { x: cx * CELL, y: cy * CELL, w: CELL, h: CELL }
      const onFloor = cell.x >= f.x && cell.y >= f.y && cell.x + CELL <= f.x + f.w && cell.y + CELL <= f.y + f.h
      return onFloor && !L.blocked.some(b => touches(cell, b)) ? 0 : 1
    }),
  )
}

const cellOf = (p: Point) => ({ cx: Math.floor(p.x / CELL), cy: Math.floor(p.y / CELL) })

/** The free cell nearest to `p`, searching outward in rings: a seat can sit on a blocked cell's edge. */
function nearestFree(grid: number[][], p: Point) {
  const { cx, cy } = cellOf(p)
  for (let r = 0; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (grid[cy + dy]?.[cx + dx] === 0) return { cx: cx + dx, cy: cy + dy }
      }
  return { cx, cy }
}

/** Keeps the corners of an orthogonal run of cells. */
function corners(points: Point[]): Point[] {
  return points.filter((p, i) => {
    const a = points[i - 1], b = points[i + 1]
    return !a || !b || (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x)
  })
}

/**
 * The (from, to) => Point[] the walkers take: easystar on the walk grid, orthogonal, `to` last.
 * shortcut: the first and last hop go straight to and from the free cell nearest the ends; fine at CELL=4.
 */
export function pathfinder(grid: number[][]): Pathfinder {
  const star = new EasyStar.js()
  star.setGrid(grid)
  star.setAcceptableTiles([0])
  star.enableSync()
  return (from, to) => {
    const a = nearestFree(grid, from), b = nearestFree(grid, to)
    let cells: Point[] | null = null
    star.findPath(a.cx, a.cy, b.cx, b.cy, found => { cells = found })
    star.calculate()
    const mid = ((cells ?? []) as Point[]).map(c => ({ x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 }))
    return [...corners(mid), to]
  }
}
