import Phaser from 'phaser'
import { OfficeScene } from './scene/OfficeScene'

export function startGame(parent: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: OfficeScene,
    pixelArt: true,
    roundPixels: true,
  })
}
