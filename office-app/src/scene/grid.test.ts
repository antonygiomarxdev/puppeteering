import { describe, expect, it } from 'vitest'
import { pathfinder, walkGrid } from './grid'
import { leadSpot, standBeside } from './layout'
import { hits, office, walk } from './testkit'

describe('walking paths', () => {
  for (const n of [1, 6, 9, 20]) {
    it(`from every desk of ${n} to the lead, to the door and to a peer avoid the furniture`, () => {
      const { L } = office(n)
      const find = pathfinder(walkGrid(L))
      const seats = Object.values(L.seatOf)
      seats.forEach((from, i) => {
        const peer = seats[(i + 1) % seats.length]!
        const goals = [leadSpot(L, i), L.doorSpot, standBeside(peer)]
        for (const to of goals) {
          const path = [from, ...find(from, to)]
          expect(path.at(-1)).toEqual(to)
          expect(walk(path).filter(p => L.blocked.some(b => hits(p, b)))).toEqual([])
        }
      })
    })
  }
})
