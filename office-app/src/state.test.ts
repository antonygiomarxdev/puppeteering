import { describe, expect, it, vi } from 'vitest'
vi.mock('./EventBus', () => ({ EventBus: {}, STATE_EVENT: 'x' })) // phaser needs a real canvas
import { stateFile } from './state'

describe('stateFile', () => {
  it('picks state-<key>.js from ?s=', () => expect(stateFile('?s=abc')).toBe('state-abc.js'))
  it('falls back to state.js with no key', () => expect(stateFile('')).toBe('state.js'))
  it('strips characters that could escape the file name', () => expect(stateFile('?s=../x')).toBe('state-x.js'))
})
