// What a critter looks like in each mood: pure, so the table is testable against the sheets' frame names.
import type { LeadMood, Mood } from '../office/mood'

export type Pose = {
  /** A critter frame. `type-N` and `talk-N` mean "with a pen": see bareOf. */
  frame: string
  /** A frame of the marks sheet shown over the head. */
  mark?: string
  /** The mark blinks. */
  blink?: boolean
  /** Drawn grey and still. */
  grey?: boolean
}

const IDLE_MS = 4000
const WINK_MS = 250

/** `idle`, with a wink every few seconds at a per-agent offset. */
export const idleFrame = (time: number, seed: number) => ((time + (seed % IDLE_MS)) % IDLE_MS < WINK_MS ? 'wink' : 'idle')

/** One mood, one pose. `time` in ms, `seed` any per-agent number. */
export function poseOf(mood: Mood | LeadMood, time: number, seed = 0): Pose {
  const tick = Math.floor(time / 250)
  const pair = tick % 2
  switch (mood) {
    case 'Leaving': return { frame: `wave-${pair}` }
    case 'Error': return { frame: 'sweat', mark: 'bang-red', blink: true }
    case 'Stuck': return { frame: 'idle', mark: 'bang-amber', grey: true }
    case 'Looping': return { frame: `type-${pair}`, mark: 'spiral' }
    case 'Quiet': return { frame: 'think' }
    case 'WaitingPermission': return { frame: 'hand-up', mark: tick % 8 < 4 ? 'question' : 'lock' }
    case 'Blocked': return { frame: 'wait', mark: 'clock' }
    case 'Typing': return { frame: `type-${pair}` }
    case 'Reading': return { frame: 'read', mark: 'page' }
    case 'RunningCommand': return { frame: `type-${Math.floor(time / 125) % 2}`, mark: 'prompt' }
    case 'LongCommand': return { frame: 'sip', mark: 'cup' }
    case 'Browsing': return { frame: 'think', mark: 'globe' }
    case 'Whiteboard': return { frame: idleFrame(time, seed), mark: 'card' }
    case 'Talking': case 'Visiting': return { frame: `talk-${tick % 4}` }
    case 'Thinking': return { frame: 'think' }
    case 'TakingTask': return { frame: 'hand-up', mark: 'card' }
    case 'FinishingTask': return { frame: pair ? 'hop' : 'arms-up', mark: 'star' }
    case 'Reporting': return { frame: idleFrame(time, seed), mark: 'page' }
    case 'Sleeping': return { frame: 'asleep' }
    case 'Assigning': return { frame: 'hand-up', mark: 'card' }
    case 'ReviewingReports': return { frame: 'read', mark: 'page' }
    case 'WaitingOnTeam': return { frame: 'wait' }
    case 'Celebrating': return { frame: pair ? 'hop' : 'arms-up', mark: 'note' }
    case 'IdleAwake': return { frame: idleFrame(time, seed) }
  }
}

/** The celebration hop, for every awake agent while the lead celebrates. */
export const hopFrame = (time: number) => (Math.floor(time / 250) % 2 ? 'hop' : 'arms-up')

/** Under a costume the pen comes off the body: the prop overlay carries it. */
export const bareOf = (frame: string) => (/^(type|talk)-\d$/.test(frame) ? `bare-${frame}` : frame)

/** Costume overlays come in a front and a three-quarter view: typing and walking sideways are three-quarter. */
export const isSide = (frame: string) => /^(bare-)?type-\d$/.test(frame) || frame.startsWith('walk-left')

export type ExtraPose = 'walk' | 'idle' | 'note' | 'clap' | 'shake' | 'shrug' | 'carry'

/**
 * The critter frame of an office extra. Moving, it walks whatever its pose; at rest the pose decides.
 * `dx` is a sideways shake in px for the vending machine.
 */
export function extraFrame(pose: ExtraPose, moving: boolean, facing: 'up' | 'down' | 'left' | 'right', time: number, seed = 0): { frame: string; flip: boolean; dx: number } {
  const tick = Math.floor(time / 250)
  if (moving) return { frame: `walk-${facing === 'right' ? 'left' : facing}-${tick % 2}`, flip: facing === 'right', dx: 0 }
  switch (pose) {
    case 'note': return { frame: `type-${tick % 2}`, flip: false, dx: 0 }
    case 'clap': return { frame: tick % 2 ? 'hop' : 'arms-up', flip: false, dx: 0 }
    case 'shake': return { frame: 'arms-up', flip: false, dx: Math.floor(time / 80) % 2 ? 1 : -1 }
    case 'shrug': return { frame: 'hand-up', flip: false, dx: 0 }
    case 'carry': return { frame: 'sip', flip: false, dx: 0 }
    default: return { frame: idleFrame(time, seed), flip: false, dx: 0 }
  }
}
