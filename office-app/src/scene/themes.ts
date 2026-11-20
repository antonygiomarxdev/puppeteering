import type { Theme } from './theme'

// Frame names are the same in every sheet (see tools/sprite-export): hat, hat-front, hat-side, deco-wall, deco-floor-big, deco-floor-small, deco-desk, particle.
const decor = (): Theme['decor'] => [
  { frame: 'deco-wall', anchor: 'wall' },
  { frame: 'deco-floor-big', anchor: 'floor-corner' },
  { frame: 'deco-floor-small', anchor: 'lounge' },
  { frame: 'deco-floor-small', anchor: 'meeting' },
  { frame: 'deco-desk', anchor: 'desk' },
]

// shortcut: Easter moves every year; a fixed window (03-20..04-20) covers it. Compute it from the date if the owner wants the exact Sunday.
export const THEMES: Theme[] = [
  { name: 'christmas', from: '12-01', to: '12-26', decor: decor(), hat: true, particles: { frame: 'particle', rate: 6, drift: 'fall' } },
  { name: 'newyear', from: '12-27', to: '01-03', decor: decor(), hat: true, particles: { frame: 'particle', rate: 8, drift: 'burst' } },
  { name: 'halloween', from: '10-20', to: '10-31', decor: decor(), hat: true, particles: { frame: 'particle', rate: 3, drift: 'float' }, palette: { lounge: '#c9b6e8', meeting: '#c9b6e8' } },
  { name: 'easter', from: '03-20', to: '04-20', decor: decor(), hat: true, particles: { frame: 'particle', rate: 4, drift: 'fall' } },
]
