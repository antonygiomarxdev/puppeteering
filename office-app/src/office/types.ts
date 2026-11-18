// Shared by the office rules. Nothing here imports Phaser, so every rule is unit-testable.
export type Point = { x: number; y: number }
/** Route geometry plugs in here (Phaser, easystar, a stub in tests): the points to walk through, `from` excluded, `to` last. */
export type Pathfinder = (from: Point, to: Point) => Point[]

export type Report = { at: number; text: string; to?: string }
/** The slice of a state agent the rules read. */
export type Agent = { id: string; name: string; sleeping: boolean; report?: Report }
