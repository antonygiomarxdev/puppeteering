import { Events } from 'phaser'

// Carries state from state.ts to the Phaser scene and the React HUD.
export const EventBus = new Events.EventEmitter()
export const STATE_EVENT = 'office-state'
