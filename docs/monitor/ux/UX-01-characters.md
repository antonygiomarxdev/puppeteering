# UX-01: Office characters: archetypes, states, ambient life

Status: Draft

## Summary

What the owner sees on the monitor's office floor: eight archetypes with a costume, prop and walk, a mood per agent state, the coordinator's own states, and ambient life. Written as a spec before the code; the code now exists (`Desk` in `office-app/src/types.ts`, `office/archetype.ts`, `office/mood.ts`, `scene/costumes.ts`) and was not compared row by row here. Moved from `office-app/docs/characters.md`; no FRD exists yet for it.

Last change: 2026-11-20, moved into the chain as a draft with its open questions numbered

Written as a spec before the code; the code now exists (see the Summary). Every agent is a Claude critter (body 10x7 cells, frame 44x30 px, pivot at the feet). Each kind of agent gets a costume, a prop, a walk and a few personalities, so the floor reads at a glance and feels alive.

## What the data gives today

`Desk` in `src/types.ts`: `id`, `name`, `status`, `working`, `sleeping`, `alert` (`loop | stuck | quiet`), `task`, `said`, `doing`, `report`. `doing` is a string like `Edit: App.tsx` (from `summarize()` in `theatre.ts`). `board[].blocked` says a task has open dependencies. When this was written the state lacked agent `type`, `description`, the tool name as a field, whether a call waits for permission, whether a call is a long shell, and who an agent last messaged. That is out of date: `Desk` now has `type`, `description`, `kind`, `since`, `lastError`, `blockedBy`, `gone`, `thinking`, `timeline` and `files`.

Assets today: `critter.json` frames `type-0/1`, `walk-{left,down,up}-{0,1}`, `idle`, `wink`, `asleep`, `talk-0..3`; `critter-gold` (shiny); `marks` (`crown`, `z`, `bang-red`, `bang-amber`).

## 1. Archetypes

Detection runs top to bottom and the first match wins: (1) the agent type or the id `lead`, (2) a whole-word keyword in `name` then `description` (case-insensitive), (3) fallback `Helper`. Role words from GUIDE.md ("Builder.", "Reviewer.") sit in the description, so they match in step 2.

| Archetype | Detected by | Costume (reads at 10x7) | Prop (replaces the pen) | Walk |
|---|---|---|---|---|
| Conductor | id `lead`, or the main session | Gold crown (exists), tiny bow tie | Baton | Upright, slow, pauses at corners to look around |
| Builder | type `general-purpose`/`builder`; words `build, implement, fix, code, scaffold, port` | Yellow hard hat (2x1 cells) | Pen (current) | Brisk, short even steps |
| Designer | type `designer`; words `design, art, sprite, ui, css, palette, logo, brand` | Beret (tilted, 3x1) in the accent colour | Paintbrush with a coloured tip | Light skip, a small bounce every 3 steps |
| Reviewer | type `reviewer`; words `review, audit, verify, check, qa, tester, test` | Round glasses (2 dark pixels with a bridge) | Clipboard with a tick | Slow, upright, stops to look both ways |
| Researcher | type `researcher`, `Explore`; words `research, explore, investigate, find, locate, survey` | Magnifying glass held at the side, small cap | Magnifier | Sniffing walk: head dips every 2 steps |
| Planner | type `Plan`, `architect`; words `plan, architect, spec, design doc, strategy, roadmap` | Headband with a tiny scroll at the ear | Rolled blueprint | Measured, hands behind (no prop swing) |
| Ops | words `deploy, release, ci, infra, devops, server, migrate, build pipeline`; types `statusline-setup`, `render-*` | Headphones (headset arc over the head) | Wrench | Steady march, wide steps |
| Helper | fallback | Plain, a small colour scarf | Pen | Standard walk (existing frames) |

Conflicts: type beats words. Two keyword hits pick the one nearer the start of the name. A `Builder` named `ui-fixer` is a Builder by type. `Explore` is always Researcher.

## 2. Personalities (picked by `fnv1a(id) % 3`)

Variants change the accent colour (scarf, hat band, beret), idle habits and catchphrases. Phrases are 12 characters or fewer where possible, kind, never about failure.

| Archetype | Variant 0 | Variant 1 | Variant 2 |
|---|---|---|---|
| Conductor | Calm (blue bow): sips tea at idle. "All good." "Nice." | Eager (red bow): taps the baton. "Go go!" "Onward." | Dreamy (violet bow): stares at the ceiling. "Hmm, yes." "Lovely." |
| Builder | Steady (amber): rolls the neck. "On it." "Brick by brick." | Speedy (orange): taps feet, hops after a finish. "Zoom!" "Quick one." | Tinkerer (teal): twirls the pen. "Let's see..." "Ooh." |
| Designer | Dreamy (pink): sways, tilts the head. "Pretty." "Hmm, softer." | Bold (magenta): flourish with the brush. "Ta-da!" "More colour!" | Tidy (mint): straightens things. "Align." "Just so." |
| Reviewer | Strict (grey): adjusts glasses. "Hmm." "Show me." | Kind (peach): nods. "Looks good." "Nice one." | Curious (lilac): leans in. "Why though?" "Ooh, neat." |
| Researcher | Explorer (green): looks far away. "What's this?" | Bookworm (brown): reads an imaginary book. "Fascinating." | Hunter (red): crouches, sniffs. "Got a trail." |
| Planner | Neat (navy): draws a line in the air. "Step one." | Big picture (gold): spreads arms. "Zoom out." | Careful (sage): counts on fingers. "Then this." |
| Ops | Calm (steel): bobs to music. "Smooth." | Hyper (cyan): taps a beat. "Ship it!" | Grumpy-nice (slate): sighs, then smiles. "Fine, fine." |
| Helper | Cheery (yellow): hums. "Hi!" | Shy (rose): looks down. "Um, hi." | Chill (sky): stretches. "Easy." |

A shiny agent (1 in 4096, `isShiny`) uses the gold sheet; its costume stays, with a sparkle every ~8 s. Catchphrases show in a bubble for 2 s at most once per 20 s per agent.

## 3. States

"Field" marks a new field from the mod. Detection reads `Desk` unless noted. Priority runs top to bottom (an alert beats a tool state). Bubble means a text or icon over the head.

| State | Detected from | Animation or pose | Bubble or icon | Varies by archetype |
|---|---|---|---|---|
| Error | Field `lastError` (tool result error, `shellEnd` status `failed`) | Head down, sweat drop, 1 s shake | `!` red | Reviewer: removes glasses, rubs eyes. Ops: kicks the wrench |
| Stuck | `alert.kind==='stuck'` | Frozen mid-pose, grey tint, slow blink | `!` amber + `STUCK 5m` | None, same for all |
| Looping | `alert.kind==='loop'` | Paces in small circles at the desk | Spiral `@` | Builder: types the same key. Researcher: looks at the same spot |
| Quiet (no activity 2 min) | `alert.kind==='quiet'` | Chin on hand | `...` | Designer: doodles. Planner: stares at the blueprint |
| Waiting for permission | Field `asks` (set when a permission request is open for the agent) | Stands, raises one hand | `?` + lock icon | Conductor: tilts head. Others: wave |
| Blocked by a dependency | Field `blockedBy` on the desk (task `blocked` is true and the owner is this agent) | Sits at desk, arms crossed, small cloud | `zZ`-less clock icon | Planner: checks a watch. Builder: taps foot |
| Typing | Field `kind==='write'` (`Edit`, `Write`, `NotebookEdit`) | `type-0/1` loop at desk | Key sparks | Builder: hard hat bounces. Designer: brush strokes on a canvas. Ops: looks at two screens |
| Reading | Field `kind==='read'` (`Read`, `Grep`, `Glob`) | Head turns left and right, page flicks | Page icon | Researcher: raises the magnifier. Reviewer: glasses glint |
| Running a command | Field `kind==='shell'` (`Bash` in the foreground, under 30 s) | Fast typing, terminal glow | `>_` | Ops: headphones nod |
| Waiting on a long command | Field `kind==='shell'` and running over 30 s, or `Bash` with `backgroundTaskId` | Leans back, sips (cup), progress dots | `...` with elapsed time | Ops: foot taps. Builder: stretches |
| Browsing the web | Field `kind==='web'` (`WebFetch`, `WebSearch`, chrome tools) | Looks up at a floating globe | Globe | Researcher: magnifier on the globe |
| Thinking | `working` and no tool running, `said` updating (turn.step text or thinking) | Hand on chin, look up | Thought bubble `...` | Planner: draws in the air. Designer: tilts head |
| Talking to a teammate | Field `kind==='message'` (`SendMessage`) | `talk-0..3` loop, facing the target | Speech bubble | All; the catchphrase shows here |
| Taking a task | History `taken` event for this agent in the last 3 s | Reaches toward the board, nod | `+` on a card | Builder: puts on the hard hat |
| Finishing a task | History `done` event in the last 3 s | Hop, arms up, confetti burst (6 px, 1.5 s) | `*` star | Speedy variant: double hop. Designer: bow |
| Reporting to the lead | `report` with `to` unset or `lead`, newer than 10 s | Walks to the lead's desk, hands a paper | Paper icon | Per walk style |
| Visiting a peer | `report.to` is a peer id | Walks to the peer's desk, talks | Speech bubble | Per walk style |
| Walking to the whiteboard | `taken` or `created` event, or a TaskCreate/TaskUpdate call | Walks to the board, writes | Card icon | Planner: 2 s writing. Others: 1 s |
| Idle and awake | `!working`, `task` set or just woke | `idle` with `wink` every 6 to 12 s, idle habit | None | Per personality (section 2) |
| Waking up | `wake()` flag, 1.5 s | Stretch, startled hop | `!` (marks `bang`) | None |
| Sleeping | `sleeping` (no task, no alert) | `asleep`, `z` rising | `z` | Designer sleeps on a sketchbook. Researcher on a book |
| Leaving the team | Field `gone` (agent removed from `$.agent.list()` after being present) | Waves, walks to the door, fades at the door | Wave | Conductor never leaves |
| Shiny | `isShiny(id)` | Gold sheet plus sparkle | Sparkle | All |

Tool kind map for `kind`: `write`: Edit, Write, NotebookEdit; `read`: Read, Grep, Glob, LSP; `shell`: Bash, Monitor, PowerShell; `web`: WebFetch, WebSearch, `mcp__claude-in-chrome__*`; `message`: SendMessage; `board`: TaskCreate, TaskUpdate, TaskList, TaskGet; `agent`: Agent (spawning); `other`: the rest.

## 4. The coordinator's states

The Conductor wears the crown and holds the baton. Its states come from the `lead` fields (`busy`, `doing`, `alert`) and the board.

| State | Detected from | Pose | Bubble |
|---|---|---|---|
| Assigning | Field `kind==='board'` or `Agent` spawn on the lead; a `created` event | Baton points at the board, then at the target desk | Card icon |
| Reviewing reports | A `report` just arrived (any desk, under 10 s) | Reads a paper, nods; the reporter stands in front | Paper icon |
| Waiting on the team | `!lead.busy`, at least one desk working | Arms behind the back, watches the floor, slow head turn | `...` |
| Thinking | `lead.busy` with no tool running | Baton at the chin | Thought bubble |
| Talking to the owner | Field `kind==='message'` or text to the user | Faces the camera | Speech bubble |
| Celebrating | `tasks.done === tasks.total` and `total > 0` | Baton conducts, all awake agents hop together, confetti for 5 s, once per completion | Music note |
| Alert | `lead.alert` | Same as the agent alerts | Same icons |
| Sleeping | `!lead.busy`, nobody working, no tasks | Crown on the desk, asleep | `z` |

## 5. Ambient life

Rare, never in the way. Every behaviour checks the same guard: only an agent that is not working, has no task, no alert and has been idle over 90 s. Any real event cancels it, and the critter walks back to its desk.

| Behaviour | Trigger | Detail |
|---|---|---|
| Coffee run | Idle 3 min, a roll of 1 in 10 each 30 s | Walks to the machine, 4 s, walks back with a cup |
| Lounge chat | Two idle agents within 6 cells of each other, 1 in 15 each minute | Both walk to the lounge, alternate speech bubbles for 8 s |
| Ping-pong | Two idle agents, 1 in 20 each minute, table free | Both at the table, 12 s, the ball bounces between them |
| Plant watering | Designer or Helper idle 4 min | Waters the plant, 5 s |
| Stretch | Idle awake 60 s | One stretch, then back to idle |

Limits: at most 1 ambient scene at a time across the office. A scene ends the moment any member gets a task or an alert.

## 6. What is needed, split by file

No task shares a file with another.

| Task | Files | Content |
|---|---|---|
| A. Mod state fields | `mods/puppet-monitor/hooks/theatre.ts`, `register.tsx` | Add to `Desk`: `type`, `description`, `kind` (tool kind map above), `since` (start of the call), `asks` (permission open), `lastError`, `blockedBy`, `gone`. Add `Lead.kind`. Tests in `theatre.test.ts` |
| B. Type mirror | `office-app/src/types.ts` | Mirror the new fields (re-declared on purpose) |
| C. Archetype rules | new `office-app/src/office/archetype.ts` and test | `archetypeOf(desk)`, `variantOf(id)` (`fnv1a % 3`), the table in section 1 and 2 |
| D. State rules | new `office-app/src/office/mood.ts` and test | `moodOf(desk, now)` returns one state from section 3 by the priority order; coordinator `leadMoodOf` |
| E. Ambient rules | new `office-app/src/office/ambient.ts` and test | The guard and the dice in section 5, a seeded random for tests |
| F. Sprites: costumes | `office-app/tools/` exporter and `public/assets/sprites/costumes.{png,json}` | One overlay frame per archetype for head and one for prop, drawn on the 10x7 grid; 3 accent colours per variant by palette swap (no extra frames) |
| G. Sprites: poses and marks | `tools/` exporter and `marks.{png,json}`, `critter.json` | Poses: `read`, `think`, `wait` (arms crossed), `arms-up`, `hand-up`, `sweat`, `wave`, `hop`, `sip`; marks: `?`, lock, `>_`, globe, page, card, clock, spiral, note, star, confetti, sparkle, cup |
| H. Scene behaviours | `office-app/src/office/` scene file (Phaser) | Costume overlays, state animation, bubbles, the walk styles, ambient scenes, the celebration |

A and B go first. C, D, E, F, G are independent of each other and can run in parallel after B. H comes last.

## 7. Open questions for the owner

- Q-1 (Owner: the mod may not receive a permission hook): Permission state needs a hook that sees permission requests; the mod may not receive one. If it cannot, drop that row and show the long-wait pose.
- Q-2 (Lead): `gone` needs the mod to keep the last agent list between polls (a small change in task A).
