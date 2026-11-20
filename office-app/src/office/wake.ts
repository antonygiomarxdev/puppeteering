export const WAKE_MS = 1500

/** No task in progress and no alert: the agent is drawn asleep. */
export const isSleeping = (a: { task?: string; alert?: unknown }) => !a.task && !a.alert

export type Sleep = { asleep: boolean; wakeAt: number }

/** Asleep going to awake sets `wakeAt`, so a "!" shows for WAKE_MS. */
export function wake(prev: Sleep, awake: boolean, now: number): Sleep {
  return { asleep: !awake, wakeAt: prev.asleep && awake ? now + WAKE_MS : prev.wakeAt }
}

export const showsBang = (s: Sleep, now: number) => s.wakeAt > now
