import type { Desk } from '../types'
import { fnv1a } from './shiny'

export type Archetype = 'Conductor' | 'Builder' | 'Designer' | 'Reviewer' | 'Researcher' | 'Planner' | 'Ops' | 'Helper'

/** Desk plus the fields the mod adds (characters task A). All optional, so this works before them. */
export type Identity = Pick<Desk, 'id' | 'name'> & Partial<Desk>

// Section 1, step 1. Lower-case keys; `render-*` is handled as a prefix below.
const BY_TYPE: Record<string, Archetype> = {
  'general-purpose': 'Builder', builder: 'Builder',
  designer: 'Designer',
  reviewer: 'Reviewer',
  researcher: 'Researcher', explore: 'Researcher',
  plan: 'Planner', architect: 'Planner',
  'statusline-setup': 'Ops',
}

// Section 1, step 2. Role words from GUIDE.md ("Builder.") are keywords too, so they match here.
const KEYWORDS: Record<Exclude<Archetype, 'Conductor' | 'Helper'>, string[]> = {
  Builder: ['builder', 'build', 'implement', 'fix', 'code', 'scaffold', 'port'],
  Designer: ['designer', 'design', 'art', 'sprite', 'ui', 'css', 'palette', 'logo', 'brand'],
  Reviewer: ['reviewer', 'review', 'audit', 'verify', 'check', 'qa', 'tester', 'test'],
  Researcher: ['researcher', 'research', 'explore', 'investigate', 'find', 'locate', 'survey'],
  Planner: ['planner', 'plan', 'architect', 'spec', 'design doc', 'strategy', 'roadmap'],
  Ops: ['deploy', 'release', 'ci', 'infra', 'devops', 'server', 'migrate', 'build pipeline'],
}

/** Earliest whole-word hit wins; on a tie the longer phrase wins ("build pipeline" beats "build"). */
function keywordHit(text: string): Archetype | undefined {
  let best: { at: number; len: number; arch: Archetype } | undefined
  for (const [arch, words] of Object.entries(KEYWORDS) as [Archetype, string[]][]) {
    for (const word of words) {
      const m = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(text)
      if (!m) continue
      if (!best || m.index < best.at || (m.index === best.at && word.length > best.len)) best = { at: m.index, len: word.length, arch }
    }
  }
  return best?.arch
}

export function archetypeOf(desk: Identity): Archetype {
  if (desk.id === 'lead') return 'Conductor'
  const type = desk.type?.toLowerCase()
  if (type) {
    if (type.startsWith('render-')) return 'Ops'
    if (BY_TYPE[type]) return BY_TYPE[type]
  }
  return keywordHit(desk.name) ?? keywordHit(desk.description ?? '') ?? 'Helper'
}

/** Section 2: fnv1a(id) % 3 picks the personality. */
export const variantOf = (id: string): 0 | 1 | 2 => (fnv1a(id) % 3) as 0 | 1 | 2

// Section 1 table: costume, prop, walk. Sizes are in the 10x7 cell grid.
export const COSTUME: Record<Archetype, string> = {
  Conductor: 'gold crown and tiny bow tie',
  Builder: 'yellow hard hat (2x1 cells)',
  Designer: 'tilted beret (3x1) in the accent colour',
  Reviewer: 'round glasses (2 dark pixels and a bridge)',
  Researcher: 'small cap; magnifier held at the side',
  Planner: 'headband with a tiny scroll at the ear',
  Ops: 'headset arc over the head',
  Helper: 'plain, with a small colour scarf',
}

export const PROP: Record<Archetype, string> = {
  Conductor: 'baton',
  Builder: 'pen',
  Designer: 'paintbrush with a coloured tip',
  Reviewer: 'clipboard with a tick',
  Researcher: 'magnifier',
  Planner: 'rolled blueprint',
  Ops: 'wrench',
  Helper: 'pen',
}

export const WALK: Record<Archetype, string> = {
  Conductor: 'upright, slow, pauses at corners to look around',
  Builder: 'brisk, short even steps',
  Designer: 'light skip, a small bounce every 3 steps',
  Reviewer: 'slow, upright, stops to look both ways',
  Researcher: 'sniffing walk: head dips every 2 steps',
  Planner: 'measured, hands behind (no prop swing)',
  Ops: 'steady march, wide steps',
  Helper: 'standard walk',
}

// Section 2 table: per archetype, the three variants (index = variantOf). Accent is the colour named in the spec.
export type Personality = { accent: string; idle: string; phrases: string[] }

export const PERSONALITY: Record<Archetype, [Personality, Personality, Personality]> = {
  Conductor: [
    { accent: 'blue bow', idle: 'sips tea', phrases: ['All good.', 'Nice.'] },
    { accent: 'red bow', idle: 'taps the baton', phrases: ['Go go!', 'Onward.'] },
    { accent: 'violet bow', idle: 'stares at the ceiling', phrases: ['Hmm, yes.', 'Lovely.'] },
  ],
  Builder: [
    { accent: 'amber', idle: 'rolls the neck', phrases: ['On it.', 'Brick by brick.'] },
    { accent: 'orange', idle: 'taps feet, hops after a finish', phrases: ['Zoom!', 'Quick one.'] },
    { accent: 'teal', idle: 'twirls the pen', phrases: ["Let's see...", 'Ooh.'] },
  ],
  Designer: [
    { accent: 'pink', idle: 'sways, tilts the head', phrases: ['Pretty.', 'Hmm, softer.'] },
    { accent: 'magenta', idle: 'flourish with the brush', phrases: ['Ta-da!', 'More colour!'] },
    { accent: 'mint', idle: 'straightens things', phrases: ['Align.', 'Just so.'] },
  ],
  Reviewer: [
    { accent: 'grey', idle: 'adjusts glasses', phrases: ['Hmm.', 'Show me.'] },
    { accent: 'peach', idle: 'nods', phrases: ['Looks good.', 'Nice one.'] },
    { accent: 'lilac', idle: 'leans in', phrases: ['Why though?', 'Ooh, neat.'] },
  ],
  Researcher: [
    { accent: 'green', idle: 'looks far away', phrases: ["What's this?"] },
    { accent: 'brown', idle: 'reads an imaginary book', phrases: ['Fascinating.'] },
    { accent: 'red', idle: 'crouches, sniffs', phrases: ['Got a trail.'] },
  ],
  Planner: [
    { accent: 'navy', idle: 'draws a line in the air', phrases: ['Step one.'] },
    { accent: 'gold', idle: 'spreads arms', phrases: ['Zoom out.'] },
    { accent: 'sage', idle: 'counts on fingers', phrases: ['Then this.'] },
  ],
  Ops: [
    { accent: 'steel', idle: 'bobs to music', phrases: ['Smooth.'] },
    { accent: 'cyan', idle: 'taps a beat', phrases: ['Ship it!'] },
    { accent: 'slate', idle: 'sighs, then smiles', phrases: ['Fine, fine.'] },
  ],
  Helper: [
    { accent: 'yellow', idle: 'hums', phrases: ['Hi!'] },
    { accent: 'rose', idle: 'looks down', phrases: ['Um, hi.'] },
    { accent: 'sky', idle: 'stretches', phrases: ['Easy.'] },
  ],
}
