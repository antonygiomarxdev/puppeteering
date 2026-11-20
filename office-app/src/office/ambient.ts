/** What the guard reads. Works with the full Desk too. */
export type Guarded = { id: string; working: boolean; task?: string; alert?: unknown }

/** Section 5: every ambient behaviour needs an agent idle for longer than this. */
export const IDLE_GUARD_MS = 90_000

/** Only an agent that is not working, has no task and no alert, and has been idle past the guard. */
export function mayJoinAmbient(desk: Guarded, idleMs: number): boolean {
  return !desk.working && !desk.task && !desk.alert && idleMs > IDLE_GUARD_MS
}

export type Scene = 'coffee' | 'lounge' | 'pingpong' | 'plant' | 'stretch'

/**
 * Section 5 triggers. `chance` is the roll per `tickMs`; deterministic scenes use chance 1.
 * Shortcut: stretch's 60 s idle is below IDLE_GUARD_MS, so the guard makes it effectively 90 s.
 */
export const SCENES: Record<Scene, { minIdleMs: number; tickMs: number; chance: number }> = {
  coffee: { minIdleMs: 180_000, tickMs: 30_000, chance: 1 / 10 },
  lounge: { minIdleMs: 0, tickMs: 60_000, chance: 1 / 15 },
  pingpong: { minIdleMs: 0, tickMs: 60_000, chance: 1 / 20 },
  plant: { minIdleMs: 240_000, tickMs: 0, chance: 1 },
  stretch: { minIdleMs: 60_000, tickMs: 0, chance: 1 },
}

/** Lounge needs two idle agents within this many cells. */
export const LOUNGE_CELLS = 6

/** Seeded PRNG (mulberry32). Same seed, same dice. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The scene's own idle threshold (the guard is checked separately). */
export const eligible = (scene: Scene, idleMs: number): boolean => idleMs >= SCENES[scene].minIdleMs

/** One roll for a scene's tick. Always true for deterministic scenes. */
export const rollScene = (scene: Scene, rand: () => number): boolean => rand() < SCENES[scene].chance

/** Shared across the office: at most one ambient scene at a time. A real event (a task, an alert, work) ends it. */
export class AmbientDirector {
  private current?: { scene: Scene; members: string[] }

  get active(): Scene | undefined {
    return this.current?.scene
  }

  /** Starts a scene only if none runs and every member passes the guard. */
  start(scene: Scene, members: Guarded[], idleOf: (id: string) => number): boolean {
    if (this.current || members.length === 0) return false
    if (!members.every(m => mayJoinAmbient(m, idleOf(m.id)))) return false
    this.current = { scene, members: members.map(m => m.id) }
    return true
  }

  /** Call every tick with the live desks. Cancels the scene when a member is gone or no longer passes the guard. */
  review(desks: Guarded[], idleOf: (id: string) => number): void {
    if (!this.current) return
    const byId = new Map(desks.map(d => [d.id, d]))
    const ok = this.current.members.every(id => {
      const desk = byId.get(id)
      return desk !== undefined && mayJoinAmbient(desk, idleOf(id))
    })
    if (!ok) this.current = undefined
  }

  cancel(): void {
    this.current = undefined
  }
}
