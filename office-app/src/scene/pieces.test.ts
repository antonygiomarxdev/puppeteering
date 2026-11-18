import { describe, expect, it } from 'vitest'
import costumes from '../../public/assets/sprites/costumes.json'
import critter from '../../public/assets/sprites/critter.json'
import marks from '../../public/assets/sprites/marks.json'
import type { LeadMood, Mood } from '../office/mood'
import { swapKey } from './costumes'
import { startMove, stepMove, FADE_S, MAX_WALK_S, MIN_SPEED, WAVE_S } from './movers'
import { bareOf, idleFrame, isSide, poseOf } from './pose'
import { clampCenter, fitZoom, nudge } from './view'

const critterFrames = new Set(Object.keys(critter.frames))
const markFrames = new Set(Object.keys(marks.frames))
const MOODS: (Mood | LeadMood)[] = [
  'Leaving', 'Error', 'Stuck', 'Looping', 'Quiet', 'WaitingPermission', 'Blocked', 'Typing', 'Reading', 'RunningCommand', 'LongCommand',
  'Browsing', 'Whiteboard', 'Talking', 'Thinking', 'TakingTask', 'FinishingTask', 'Reporting', 'Visiting', 'IdleAwake', 'Sleeping',
  'Assigning', 'ReviewingReports', 'WaitingOnTeam', 'Celebrating',
]

describe('poseOf', () => {
  it('gives every mood a frame of the critter sheet and a mark of the marks sheet, at any time', () => {
    for (const mood of MOODS) for (const time of [0, 100, 250, 500, 1000, 3900, 4100, 99999]) {
      const p = poseOf(mood, time, 7)
      expect(critterFrames.has(bareOf(p.frame)), `${mood}@${time}: ${p.frame}`).toBe(true)
      if (p.mark) expect(markFrames.has(p.mark), `${mood}: ${p.mark}`).toBe(true)
    }
  })
  it('winks for a quarter second every four, at a per-agent offset', () => {
    expect(idleFrame(0, 0)).toBe('wink')
    expect(idleFrame(300, 0)).toBe('idle')
    expect(idleFrame(0, 1000)).toBe('idle')
    expect(idleFrame(3000, 1000)).toBe('wink')
  })
  it('takes the pen off the body under a costume and picks the view', () => {
    expect(bareOf('type-1')).toBe('bare-type-1')
    expect(bareOf('talk-3')).toBe('bare-talk-3')
    expect(bareOf('idle')).toBe('idle')
    expect(isSide('bare-type-0')).toBe(true)
    expect(isSide('walk-left-1')).toBe(true)
    expect(isSide('idle')).toBe(false)
  })
})

describe('costume frames', () => {
  it('exist for every archetype, in both views', () => {
    for (const a of ['conductor', 'builder', 'designer', 'reviewer', 'researcher', 'planner', 'ops', 'helper'])
      for (const part of ['head-front', 'head-side', 'prop-front', 'prop-side']) expect(Object.keys(costumes.frames)).toContain(`${a}-${part}`)
  })
  it('swapKey replaces the key colour, and only it', () => {
    const data = new Uint8ClampedArray([255, 0, 255, 255, 10, 20, 30, 255, 255, 0, 255, 0, 255, 0, 254, 255])
    expect(swapKey(data, [1, 2, 3])).toBe(1)
    expect([...data]).toEqual([1, 2, 3, 255, 10, 20, 30, 255, 255, 0, 255, 0, 255, 0, 254, 255])
  })
})

describe('movers', () => {
  const run = (m: ReturnType<typeof startMove>, seconds: number) => { for (let i = 0; i < seconds * 20; i++) stepMove(m, 0.05) }
  it('a leaver walks to the door, waves, fades and is done', () => {
    const m = startMove('leave', 'a', { x: 0, y: 0 }, [{ x: 90, y: 0 }])
    expect(m.alpha).toBe(1)
    run(m, 1.05)
    expect(m.phase).toBe('wave')
    expect({ x: m.x, y: m.y }).toEqual({ x: 90, y: 0 })
    run(m, WAVE_S + 0.1)
    expect(m.phase).toBe('fade')
    run(m, FADE_S / 2)
    expect(m.alpha).toBeGreaterThan(0)
    expect(m.alpha).toBeLessThan(1)
    run(m, FADE_S)
    expect(m.phase).toBe('done')
    expect(m.alpha).toBe(0)
  })
  it('a newcomer fades in while walking from the door to the seat and ends there', () => {
    const m = startMove('arrive', 'b', { x: 0, y: 0 }, [{ x: 0, y: 90 }])
    expect(m.alpha).toBe(0)
    run(m, 0.2)
    expect(m.alpha).toBeGreaterThan(0)
    run(m, 1)
    expect(m.phase).toBe('done')
    expect(m.alpha).toBe(1)
    expect(m.y).toBe(90)
  })
  it('speeds up so a long walk never takes more than MAX_WALK_S', () => {
    const long = startMove('arrive', 'c', { x: 0, y: 0 }, [{ x: 3000, y: 0 }])
    expect(long.speed).toBeCloseTo(3000 / MAX_WALK_S)
    expect(startMove('arrive', 'c', { x: 0, y: 0 }, [{ x: 100, y: 0 }]).speed).toBe(MIN_SPEED)
    run(long, MAX_WALK_S + 0.1)
    expect(long.phase).toBe('done')
  })
})

describe('view', () => {
  it('fitZoom takes whole zooms when the office fits, a fraction down to the minimum otherwise', () => {
    expect(fitZoom(1500, 1000, 384, 316)).toBe(3)
    expect(fitZoom(800, 600, 600, 400)).toBe(1)
    expect(fitZoom(600, 400, 1200, 400)).toBe(0.6) // 0.5 would not be legible: it scrolls instead
    expect(fitZoom(900, 400, 1200, 400)).toBeCloseTo(0.75)
  })
  it('clampCenter centres a small scene and keeps a big one in view', () => {
    expect(clampCenter(5, 800, 500)).toBe(250)
    expect(clampCenter(0, 400, 1000)).toBe(200)
    expect(clampCenter(5000, 400, 1000)).toBe(800)
    expect(clampCenter(500, 400, 1000)).toBe(500)
  })
  it('nudge leaves apart labels alone and stacks colliding ones upward without overlap', () => {
    const apart = nudge([{ id: 'a', x: 0, y: 100, w: 80, h: 40 }, { id: 'b', x: 200, y: 100, w: 80, h: 40 }])
    expect([apart.get('a'), apart.get('b')]).toEqual([0, 0])
    const boxes = [
      { id: 'a', x: 100, y: 100, w: 80, h: 40 }, { id: 'b', x: 120, y: 110, w: 80, h: 40 }, { id: 'c', x: 90, y: 90, w: 80, h: 40 },
    ]
    const dy = nudge(boxes)
    expect(dy.get('b')).toBe(0) // the lowest stays
    const placed = boxes.map(b => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y + dy.get(b.id)! - b.h, b: b.y + dy.get(b.id)! }))
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i]!, q = placed[j]!
      expect(p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b, `${i} overlaps ${j}`).toBe(false)
    }
    boxes.forEach(b => expect(dy.get(b.id)!).toBeLessThanOrEqual(0))
  })
})
