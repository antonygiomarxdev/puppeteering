// Camera and label rules as pure functions.

/** Integer zoom when the whole scene fits at least once, so pixels stay square; below that a fractional fit, never under `min`. */
export function fitZoom(vw: number, vh: number, W: number, H: number, min = 0.6): number {
  const z = Math.min(vw / W, vh / H)
  return z >= 1 ? Math.floor(z) : Math.max(z, min)
}

/** The centre of the view along one axis: the middle when the scene is smaller than the view, otherwise kept inside the scene. */
export function clampCenter(center: number, viewSize: number, sceneSize: number): number {
  if (sceneSize <= viewSize) return sceneSize / 2
  return Math.min(Math.max(center, viewSize / 2), sceneSize - viewSize / 2)
}

/** A label: x is its centre, y its bottom edge (the anchor), in screen px. */
export type Box = { id: string; x: number; y: number; w: number; h: number }

/**
 * Stacks colliding labels upward: lower labels stay, each higher one rises just clear of what it overlaps.
 * Returns the change of y per id (zero or negative).
 */
export function nudge(boxes: Box[], gap = 2): Map<string, number> {
  const out = new Map<string, number>()
  const placed: { l: number; r: number; t: number; b: number }[] = []
  for (const b of [...boxes].sort((p, q) => q.y - p.y || p.id.localeCompare(q.id))) {
    let bottom = b.y
    for (let i = 0; i < 50; i++) {
      const hit = placed.find(p => b.x - b.w / 2 < p.r && p.l < b.x + b.w / 2 && bottom - b.h < p.b && p.t < bottom)
      if (!hit) break
      bottom = hit.t - gap
    }
    out.set(b.id, bottom - b.y)
    placed.push({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: bottom - b.h, b: bottom })
  }
  return out
}
