import Phaser from 'phaser'
import type { Archetype } from '../office/archetype'
import { variantOf } from '../office/archetype'
import costumesJson from '../../public/assets/sprites/costumes.json'

const KEY = [0xff, 0x00, 0xff] // the colour every variant-coloured pixel is drawn in (meta.accentKey)

/** Replaces the key colour in RGBA data with `rgb`. Pure, so the swap is testable. */
export function swapKey(data: Uint8ClampedArray, rgb: readonly [number, number, number]): number {
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === KEY[0] && data[i + 1] === KEY[1] && data[i + 2] === KEY[2] && data[i + 3] > 0) {
      data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]
      n++
    }
  }
  return n
}

type Meta = { accents: Record<string, string[]> }
const META = (costumesJson as unknown as { meta: Meta }).meta
const FRAMES = (costumesJson as unknown as { frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> }).frames

export const costumeName = (arch: Archetype) => arch.toLowerCase()
export const accentOf = (arch: Archetype, id: string): [number, number, number] => {
  const hex = META.accents[costumeName(arch)]?.[variantOf(id)] ?? '#ffffff'
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

/**
 * The costumes sheet with the key colour swapped for one archetype's accent, made once and cached as a texture.
 * Returns its key, with the frames `<arch>-head-front`, `-head-side`, `-prop-front`, `-prop-side`; undefined if the sheet is not loaded.
 */
export function costumeTexture(scene: Phaser.Scene, arch: Archetype, id: string): string | undefined {
  if (!scene.textures.exists('costumes')) return undefined
  const key = `costumes-${costumeName(arch)}-${variantOf(id)}`
  if (scene.textures.exists(key)) return key
  const src = scene.textures.get('costumes').getSourceImage() as CanvasImageSource & { width: number; height: number }
  const tex = scene.textures.createCanvas(key, src.width, src.height)
  if (!tex) return undefined
  const ctx = tex.getContext()
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, src.width, src.height)
  swapKey(img.data, accentOf(arch, id))
  ctx.putImageData(img, 0, 0)
  for (const part of ['head-front', 'head-side', 'prop-front', 'prop-side']) {
    const name = `${costumeName(arch)}-${part}`
    const f = FRAMES[name]
    if (f) tex.add(name, 0, f.frame.x, f.frame.y, f.frame.w, f.frame.h)
  }
  tex.refresh()
  return key
}
