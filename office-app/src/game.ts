import Phaser from 'phaser'
import { EventBus, STATE_EVENT } from './EventBus'
import type { OfficeState } from './types'

const FLOOR = 0x3a3a42
const CRITTER = 0xd97757
const LEAD = 0xf2c14e

class OfficeScene extends Phaser.Scene {
  private items: Phaser.GameObjects.GameObject[] = []
  private state?: OfficeState

  constructor() { super('office') }

  create() {
    this.cameras.main.setBackgroundColor(FLOOR)
    const on = (s: OfficeState) => { this.state = s; this.redraw() }
    EventBus.on(STATE_EVENT, on)
    this.scale.on('resize', () => this.redraw())
    this.events.once('shutdown', () => EventBus.off(STATE_EVENT, on))
  }

  // Placeholder: one rectangle per agent plus the lead, in a row, each with its name.
  private redraw() {
    this.items.forEach(o => o.destroy())
    this.items = []
    const s = this.state
    if (!s) return
    const who = [{ name: 'lead', color: LEAD }, ...s.agents.map(a => ({ name: a.name, color: CRITTER }))]
    const cell = 96
    const perRow = Math.max(1, Math.floor(this.scale.width / cell))
    who.forEach((w, i) => {
      const x = (i % perRow) * cell + cell / 2
      const y = Math.floor(i / perRow) * cell + 56
      this.items.push(
        this.add.rectangle(x, y, 48, 48, w.color),
        this.add.text(x, y + 36, w.name, { fontSize: '12px', color: '#fff' }).setOrigin(0.5),
      )
    })
  }
}

export function startGame(parent: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: OfficeScene,
    pixelArt: true,
  })
}
