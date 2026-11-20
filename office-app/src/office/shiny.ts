// FNV-1a, 32 bits, over the UTF-8 bytes of the agent id.
export function fnv1a(text: string): number {
  let h = 0x811c9dc5
  for (const byte of new TextEncoder().encode(text)) h = Math.imul(h ^ byte, 0x01000193) >>> 0
  return h
}

/** One agent in 4096 is shiny; `?shiny=all` forces it for everyone. */
export const isShiny = (id: string, search = ''): boolean =>
  fnv1a(id) % 4096 === 0 || (search !== '' && new URLSearchParams(search).get('shiny') === 'all')
