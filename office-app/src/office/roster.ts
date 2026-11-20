/**
 * Known agents keep their slot (insertion order) until they left the team AND `settled(id)`:
 * back at its desk with nothing queued, or never walked at all. Such a ghost is still drawn.
 */
export function updateRoster<T extends { id: string }>(known: Map<string, T>, live: T[], settled: (id: string) => boolean): T[] {
  for (const a of live) known.set(a.id, a)
  const liveIds = new Set(live.map(a => a.id))
  for (const id of [...known.keys()]) if (!liveIds.has(id) && settled(id)) known.delete(id)
  return [...known.values()]
}
