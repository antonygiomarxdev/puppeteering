// A light particle field: no Phaser, so the cap and the motion rules are testable. The scene draws what step() returns.
export const MAX_PARTICLES = 60

export type Drift = 'fall' | 'float' | 'burst'
export type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number }

export class ParticleField {
  readonly alive: Particle[] = []
  private owed = 0

  /** `rate` per second; `rnd` returns [0, 1). With `off` (reduced motion) nothing is ever spawned. */
  constructor(private W: number, private H: number, private drift: Drift, private rate: number, private off = false, private rnd = Math.random) {}

  resize(W: number, H: number) { this.W = W; this.H = H }

  private spawn(): Particle {
    const r = this.rnd
    if (this.drift === 'fall') return { x: r() * this.W, y: -4, vx: (r() - 0.5) * 10, vy: 14 + r() * 16, age: 0, life: (this.H + 8) / 14 }
    if (this.drift === 'float') return { x: r() * this.W, y: this.H * (0.5 + r() * 0.5), vx: (r() - 0.5) * 14, vy: -(6 + r() * 8), age: 0, life: 5 + r() * 3 }
    const angle = r() * Math.PI * 2, speed = 20 + r() * 25
    return { x: this.W * (0.2 + r() * 0.6), y: this.H * (0.1 + r() * 0.4), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 10, age: 0, life: 1 + r() }
  }

  /** Advances `dt` seconds. Particles past their life or the scene's edge die; at most MAX_PARTICLES live. */
  step(dt: number): Particle[] {
    if (this.off) return this.alive
    this.owed += this.rate * dt
    while (this.owed >= 1) {
      this.owed -= 1
      if (this.alive.length < MAX_PARTICLES) this.alive.push(this.spawn())
    }
    for (const p of this.alive) {
      p.age += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (this.drift === 'burst') p.vy += 40 * dt // gravity: confetti falls back
    }
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const p = this.alive[i]!
      if (p.age >= p.life || p.y > this.H + 8 || p.y < -8) this.alive.splice(i, 1)
    }
    return this.alive
  }
}
