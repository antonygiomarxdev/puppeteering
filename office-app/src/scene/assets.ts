// Imported, not linked: Vite inlines each PNG as a data URI, so the build stays one file.
import critterJson from '../../public/assets/sprites/critter.json'
import critterPng from '../../public/assets/sprites/critter.png'
import goldJson from '../../public/assets/sprites/critter-gold.json'
import goldPng from '../../public/assets/sprites/critter-gold.png'
import furnitureJson from '../../public/assets/sprites/furniture.json'
import furniturePng from '../../public/assets/sprites/furniture.png'
import costumesJson from '../../public/assets/sprites/costumes.json'
import costumesPng from '../../public/assets/sprites/costumes.png'
import marksJson from '../../public/assets/sprites/marks.json'
import marksPng from '../../public/assets/sprites/marks.png'
import tilesPng from '../../public/assets/sprites/tileset.png'

export const ATLASES = [
  ['critter', critterPng, critterJson],
  ['critter-gold', goldPng, goldJson],
  ['furniture', furniturePng, furnitureJson],
  ['marks', marksPng, marksJson],
  ['costumes', costumesPng, costumesJson],
] as const

export { tilesPng }

// Theme sheets are optional: whatever theme-<name>.png/json exists in the sprites folder is inlined, and a theme without one runs on placeholders.
const themePngs = import.meta.glob('../../public/assets/sprites/theme-*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>
const themeJsons = import.meta.glob('../../public/assets/sprites/theme-*.json', { import: 'default', eager: true }) as Record<string, object>
const nameOf = (path: string) => path.replace(/^.*\//, '').replace(/\.(png|json)$/, '')

export const THEME_SHEETS: Record<string, { png: string; json: object }> = {}
for (const [path, png] of Object.entries(themePngs)) {
  const json = themeJsons[path.replace(/\.png$/, '.json')]
  if (json) THEME_SHEETS[nameOf(path)] = { png, json }
}
