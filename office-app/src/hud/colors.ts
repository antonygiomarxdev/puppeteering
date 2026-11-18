// Every agent is a little orange critter; a hash of its name picks its shade. Shared by the HUD dots and the scene.
export const SHADES = ['#d97757', '#e08a5f', '#c9654a', '#e39b6d', '#cf6f4f', '#da7f62']

export const hash = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export const shadeOf = (name: string): string => SHADES[hash(name) % SHADES.length]
