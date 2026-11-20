// A theme is data: adding one is adding an entry to themes.ts (and a theme-<name> sheet), with no scene code.
export type Anchor = 'wall' | 'floor-corner' | 'desk' | 'lounge' | 'meeting'

export type Theme = {
  name: string
  /** 'MM-DD'. `to` may be earlier than `from`: the window then wraps across new year. */
  from: string
  to: string
  /** Atlas key of the sheet; defaults to `theme-<name>`. A missing sheet falls back to placeholders. */
  sheet?: string
  /** Tints, '#rrggbb', multiplied over the matching art. */
  palette?: Partial<Record<'floor' | 'wall' | 'window' | 'lounge' | 'meeting', string>>
  /** `count` defaults to every slot of the anchor. */
  decor: { frame: string; anchor: Anchor; count?: number }[]
  /** Draws the sheet's `hat` frames over each critter's head. */
  hat?: boolean
  /** `rate` is particles per second. */
  particles?: { frame: string; rate: number; drift: 'fall' | 'float' | 'burst' }
}

const mmdd = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function inWindow(t: Pick<Theme, 'from' | 'to'>, date: Date): boolean {
  const md = mmdd(date)
  return t.from <= t.to ? md >= t.from && md <= t.to : md >= t.from || md <= t.to
}

/**
 * `?theme=<name>` wins and `?theme=none` turns themes off. Otherwise the first theme whose window holds the date, or none.
 * An unknown name is a typo, not a request: it falls through to the date.
 */
export function pickTheme(date: Date, search: string, list: Theme[]): Theme | undefined {
  const asked = new URLSearchParams(search).get('theme')
  if (asked === 'none') return undefined
  return list.find(t => t.name === asked) ?? list.find(t => inWindow(t, date))
}

export const sheetOf = (t: Theme) => t.sheet ?? `theme-${t.name}`
