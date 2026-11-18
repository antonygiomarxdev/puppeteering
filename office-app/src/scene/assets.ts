// Imported, not linked: Vite inlines each PNG as a data URI, so the build stays one file.
import critterJson from '../../public/assets/sprites/critter.json'
import critterPng from '../../public/assets/sprites/critter.png'
import goldJson from '../../public/assets/sprites/critter-gold.json'
import goldPng from '../../public/assets/sprites/critter-gold.png'
import furnitureJson from '../../public/assets/sprites/furniture.json'
import furniturePng from '../../public/assets/sprites/furniture.png'
import marksJson from '../../public/assets/sprites/marks.json'
import marksPng from '../../public/assets/sprites/marks.png'
import tilesPng from '../../public/assets/sprites/tileset.png'

export const ATLASES = [
  ['critter', critterPng, critterJson],
  ['critter-gold', goldPng, goldJson],
  ['furniture', furniturePng, furnitureJson],
  ['marks', marksPng, marksJson],
] as const

export { tilesPng }
