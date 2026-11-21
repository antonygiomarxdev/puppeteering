# Scriptorium adoption plan for puppeteering

Status: plan only, 2026-11-20. Branch `scriptorium-adopt` (from origin/main 7eefda5). Nothing is moved or edited until the owner approves. Written by the researcher; verified by reading every file named below.

Start check: `git status` shows only `assets/render-video.sh` as modified, with 0 lines changed (an exec-bit difference). `bun --version` answers 1.4.4. The skill asks for a clean tree: the owner decides whether to restore that bit before the migration.

## 1. What the repo is

About 1,150 lines of markdown plus two mods (`puppet-teams`: 3 Node hooks, a skill, rules text; `puppet-monitor`: a mod, a Phaser/React office app, tools). There is no `docs/` folder, no PRD, FRD, UX, TP or ADR. The documents are of three kinds:

1. **The deliverable.** GUIDE, ONBOARDING, LESSONS, REFERENCES, README. They are what the product is, and other things link to them by path and anchor: the README, the injected rules (`{DOCS}/ONBOARDING.md`), the GitHub copy, the issue templates, the marketplace.
2. **Per-mod and per-tool READMEs.** User-facing install and behaviour notes that sit next to code.
3. **One spec.** `office-app/docs/characters.md` ("Spec only. No code.", with open questions for the owner).

## 2. Proposed slices

| Slice | SLICE_ID | Folder | Covers |
|---|---|---|---|
| method | METHOD | `docs/method/` | Guide, onboarding, lessons: how a lead runs a team |
| teams | TEAMS | `docs/teams/` | puppet-teams: session rules, reminder, idle redirect |
| monitor | MONITOR | `docs/monitor/` | puppet-monitor, the band, the office page |

Showcase (demo video, sprite export, social drafts) is not part of the product (owner, D-7): no slice, no use case, and its files stay outside the chain, untouched. No reserved names are used.

## 3. Mapping, one row per existing document

Action key: KEEP = stays where it is, outside the chain, and the chain cites it. EXTRACT = it stays and its rules also become chain rows (nothing is deleted from it). MV = `git mv` and edit into the template. NEW = a chain document written from it.

| Source | Chain step and target | Missing for the check | Action |
|---|---|---|---|
| README.md "Why this exists" | PRODUCT §1 Problem, §2 Product | n/a | EXTRACT; README stays the front door |
| README.md "The idea in five rules" | PRODUCT §4 Principles (P1-P5) | ids | EXTRACT |
| README.md Quick start, What's inside, Name, License | none | n/a | KEEP |
| ONBOARDING.md §1 Set up once | FRD METHOD-01 (setup), TEAMS FRD-01 | EARS rows, ids | EXTRACT |
| ONBOARDING.md §3 Lead a team (rule table, talking to teammates) | FRD METHOD-02..04; duplicates GUIDE | EARS rows, RULE/EX | EXTRACT, merge with the GUIDE rows |
| ONBOARDING.md §3 role table, §4 Read the office, page options | FRD MONITOR-01..02 and UX-01 | EARS rows, UX template | EXTRACT |
| ONBOARDING.md §5 OS and surface table | CROSS-CUTTING CC-6, DT in FRD MONITOR-03 | rows with a check | EXTRACT |
| ONBOARDING.md §6 Work on this repo | CHECKS.md rows (commands), CONTRIBUTING | Replay per row | EXTRACT |
| ONBOARDING.md §7 When something is wrong | FRD rows (IF ... THEN) per symptom | EARS | EXTRACT |
| GUIDE.md Should you use a team, Cost, Known limits | PRODUCT §6 Scope, §9 Facts; CC-5 | ids | EXTRACT |
| GUIDE.md Roles | GLOSSARY terms; FRD METHOD-02 | `Avoid` words | EXTRACT |
| GUIDE.md One coordinator per goal | PRD METHOD R-METHOD-1; PRODUCT P1 | R ids | EXTRACT |
| GUIDE.md The pile, Parallel, Files and worktrees | FRD METHOD-02 (pile), METHOD-03 (files) | RULE, EX | EXTRACT |
| GUIDE.md Verify, Review | FRD METHOD-04 (verify and review) | RULE, EX | EXTRACT |
| GUIDE.md Put what must hold in a hook, Safety | CC-1; TEAMS FRDs; INVARIANTS | Check column | EXTRACT |
| GUIDE.md In the desktop app | FRD METHOD-05 (desktop path); issue #8 | EARS, D-16 | EXTRACT |
| GUIDE.md as a file | stays at root; links to it must not break | n/a | KEEP (D-14) |
| LESSONS.md, 19 entries | one RETRO-n per entry that has a prevention that exists (file:line) and a replay; 3 today (table in §4). The other entries stay LESSONS evidence | Class, Recurrence, Prevention, Replay | EXTRACT; nothing in the file is deleted or rewritten; the file stays as the evidence log (D-14) |
| REFERENCES.md | PRODUCT §9 Verified column cites it | n/a | KEEP |
| CONTRIBUTING.md | PRD METHOD (UC-7, the owner reporting what failed) and CHECKS; field-report template is the REQ intake | n/a | KEEP; EXTRACT the Versions rule to INVARIANTS |
| SECURITY.md, CODE_OF_CONDUCT.md, LICENSE, .github/pull_request_template.md, issue templates | none | n/a | KEEP |
| mods/puppet-teams/README.md | PRD TEAMS; FRD TEAMS-01..03 (inject, remind, idle) | R ids, EARS | EXTRACT; stays next to the code |
| mods/puppet-teams/RULES.md | none: it is the text the hook injects, a product artefact | n/a | KEEP; FRD TEAMS-01 cites it |
| mods/puppet-teams/skills/agent-teams/SKILL.md | none: it is a prompt | n/a | KEEP |
| mods/puppet-monitor/README.md | PRD MONITOR; FRD MONITOR-03 (open the office, 6 OS and surface rows as a decision table), MONITOR-04 (alerts: LOOPING 3 in a row, STUCK 5 min, QUIET 2 min), MONITOR-05 (narration sentence), "What it cannot show" to Out of scope | EARS, EX, DT | EXTRACT |
| mods/puppet-teams/CHANGELOG.md (does not exist) | release log, written with changesets (section 15) | all versions | NEW |
| mods/puppet-monitor/CHANGELOG.md | release log; evidence for gap report | n/a | KEEP |
| office-app/README.md "Contract" | TP MONITOR (Interfaces and contracts: `state-<key>.js`, `?s=`, polling) | TD ids | EXTRACT; stays |
| office-app/docs/characters.md | UX MONITOR-01 (archetypes, states, ambient life) and its §7 questions as Q-n | UX template, ids | MV to `docs/monitor/ux/UX-01-characters.md` and rewrite (126 lines; UX cap is 150) |
| office-app/tools/demo-video/README.md, sprite-export/README.md | none | n/a | KEEP, outside the product (D-7) |
| GitHub issues #5, #8, #9, #10 | REQ-1..4 in `docs/requests/` | Who, said, evidence | NEW |
| Owner notes (vision, monitor purpose, OS and surface, lead delegates, Concord declined) | D-1..D-5 in DECISIONS; REQ-5, REQ-6 | dates, quotes | NEW |

## 4. LESSONS entries

Each entry is evidence and stays in LESSONS.md, unchanged. A RETRO-n needs two things: a prevention that exists today (a check, hook or rule, cited file:line) and a replay. Only entries with both become RETRO-n. Prose-only entries stay LESSONS evidence and are cited by PRODUCT §1. Every RETRO starts open: none closes on adoption, because closing needs the replay run against the prevention and the retro skill's close step.

Replay run 2026-11-20 on the `scriptorium-adopt` tree, in `mods/puppet-teams/hooks`: `node --test idle.test.js remind.test.js` gave `ℹ tests 24`, `ℹ pass 24`, `ℹ fail 0`. That shows the two hook tests pass today; it does not close any RETRO.

| LESSONS.md entry | RETRO-n? | Prevention today (file:line) | Replay |
|---|---|---|---|
| assignment by message crossed the idle notice | yes, open | `mods/puppet-teams/hooks/idle.js:39-40,51-53` | `idle.test.js:31-41`, passes |
| sessions got the rules but did not start a team | yes, open | `mods/puppet-teams/hooks/remind.js`, `hooks/hooks.json` | `remind.test.js:52`, passes; 9 probes in the entry |
| a finished teammate reads every message as its task | yes, open, partial | `idle.js:52-53`: the notice names the new task and "not task M again". It covers the idle notice only; the rest of the entry is prose | `idle.test.js:38-41`, passes |
| a team with no task list is subagents | no | `mods/puppet-teams/skills/agent-teams/SKILL.md:13` is a rule in prompt text | none |
| the lead did the work itself | no | `RULES.md` text, not enforced (X-13) | none |
| two researchers wrote the same file; several builders duplicate work | no | prose only; issue #5 is a request, not a prevention | none |
| a teammate killed the owner's browser | no | prose only; a `PreToolUse` deny is possible but does not exist | none |
| teammates from the desktop app had no task tools | no | `SKILL.md:13` and `RULES.md` say CLI only; prose | none |
| reported as working, sitting idle; the same report twice | no | prose | none |
| a reviewer's mutant is a write | no | prose | none |
| the guide said more than the docs | no: audit result | none | none |
| a stop in plain text does not end a teammate; CRLF files defeat patch scripts | no: one rule each | GUIDE Cost; ONBOARDING §5 | none |
| reusing teammates; parallel work finds; the lead was the bottleneck; a document said the opposite | no: no failure with a prevention; open questions | none | none |

Open RETROs at adoption: 3 (idle crossing, sessions, finished teammate).

## 5. The two carried LESSONS entries and three GUIDE lines

From `other-sessions-guide-lessons.patch`. It does not apply to this branch: `git apply --check` fails in `LESSONS.md`, because PR #3 changed the top of the file. Each item needs hand placement.

| Item | Goes to | Note |
|---|---|---|
| LESSONS "a change to a finished task needs a new task" (2026-11) | FRD METHOD-02 rule; the LESSONS entry added at the top of LESSONS.md | No RETRO-n: its prevention is a GUIDE line (prose) and no replay exists. It stays LESSONS evidence. Its "Changed: GUIDE, Review and Verify" names the lines below |
| LESSONS "a resumed lead kept running beside its old self" | REQ-7 (open: "no rule yet stops a second live lead"); the LESSONS entry | It says "Open"; REQ-7 is accepted (D-17). No RETRO-n: no prevention and no replay. It is not a coordinator of coordinators (D-6): it is one conversation led twice |
| GUIDE Verify: "A test run while another teammate edits the same tree proves nothing. Make the final run with the team idle." | FRD METHOD-04 rule, one positive and one negative example; INVARIANTS row once a check exists | No executable check yet, so no INVARIANTS row now |
| GUIDE Verify: "A change to a task already completed goes into a new task with a new number" | FRD METHOD-02 rule | As above |
| GUIDE Review: "Keep every reviewer until its last report is in..." | FRD METHOD-04 rule | The same entry records a shipped unreviewed fix. No RETRO-n: the prevention is a GUIDE line and no replay exists |

The three GUIDE lines and two entries are also added, in their original wording, to GUIDE.md and LESSONS.md in the migration commit for those files, because those files stay at the root (D-14). They are not committed as they stand in the other checkout.

## 6. Chain steps with no document yet

PRODUCT, PRD x3, FRD x14, UX x2, cross-cutting TP, TP per slice, ADRs, specs, GLOSSARY, INVARIANTS, CROSS-CUTTING, CHECKS, DECISIONS, RETRO, REQUESTS. Specs are not planned: the code exists. A spec is written only for a new task.

CHECKS.md candidates, each with a real command today: `claude plugin test .` (monitor), `claude plugin validate .` (monitor), `node --test mods/puppet-teams/hooks/*.test.js`, `npm test` and `npm run build` in `office-app`. INVARIANTS candidate with a check: the plugin version equals `office-app/package.json` (a test fails if they differ).

## 7. Technology in the material, and where it moves

- Phaser 3, React, Vite, TypeScript, the single-file build, `state-<key>.js` polling, `file://` limits, the launcher page, `cmd /c start`, `open`, `xdg-open`: TP MONITOR. FRD rows say "the system shall open the office".
- Hook names (`SessionStart`, `UserPromptSubmit`, `TeammateIdle`, exit code 2), Node, `~/.claude/tasks/<session>/*.json`, `.session-list`: TP TEAMS.
- Claude Code, agent teams, TaskList and the settings variables are the domain, not implementation (Q-6). They stay in PRODUCT and FRDs as terms.

## 8. Section 3 (map from code): offered, not run

Offer to the owner, never forced. Recommend yes for monitor and teams: both have tests, and the READMEs state behaviour the code may no longer match. If accepted, each inferred FRD row is marked inferred in its Open questions. Not run yet.

Gaps found from documents alone (document says / document says / which is right?):

| # | One says | Another says | Question |
|---|---|---|---|
| G-1 | RULES.md and SKILL.md: agent teams are CLI only on the desktop app | GUIDE "In the desktop app" and LESSONS "teammates spawned from the desktop app": "the docs do not say". The official desktop page does say: "available in the CLI, not in Desktop" (https://code.claude.com/docs/en/desktop, read 2026-11-20). RULES and SKILL are right; GUIDE and LESSONS are stale | D-16, section 14 |
| G-2 | GUIDE Roles and the RULES say "lead" | GUIDE "One coordinator per goal" and the README say "coordinator" for the same session | D-15 |
| G-3 | CONTRIBUTING "Versions": each mod keeps its changes in a `CHANGELOG.md` next to it | `mods/puppet-teams/` has no CHANGELOG; its README holds "Version 0.3.1: bumped so installed copies refresh" | D-18 |
| G-4 | ONBOARDING §4: a Code Mode script shows as one "Code" entry with its calls inside | ONBOARDING §7: Code Mode refuses an installed mod that checks tool calls, "whether this mod blocks it is not settled" | D-19 |
| G-5 | GUIDE Safety: a rule that stops teammates must hold in every directory, tested from a sibling worktree | puppet-teams README: "Only the terminal was tested", no sibling-worktree test named | D-19 |

## 8a. Section 3 run: code against documents (puppet-teams, puppet-monitor)

Run 2026-11-20 on the `scriptorium-adopt` tree. Read in full: `mods/puppet-teams/` (README, RULES, SKILL, 3 hooks, hooks.json, plugin.json), `mods/puppet-monitor/` (README, CHANGELOG, `hooks/register.tsx`, `hooks/theatre.ts`, hooks.json, plugin.json), `office-app/README.md`, `office-app/docs/characters.md`, and in `office-app/src` the files `state.ts`, `normalize.ts`, `types.ts`, `App.tsx`, `hud/*` (except tests) and `office/{mood,archetype,ambient,wake,shiny}.ts`. Read only by search for one claim: `office-app/src/scene/*`, `office/{seats,extras,walkers}.ts`. Not read: test files, `office/index.html` (generated), sprite JSON, `tools/` (showcase, D-7). Nothing was run: every row is from reading, so a row may be wrong where a runtime path was missed. No gap is resolved here; each row is a question for the owner. Each U row also becomes an *inferred* FRD row, marked in Open questions, until the owner confirms it.

Count: 19 behaviours the code has that no document states (U), 16 document claims the code does not do or does differently (X).

### Code has it, no document states it (U)

| # | Code does (file:line) | Documents say | Question |
|---|---|---|---|
| U-1 | The reminder skips a prompt from a teammate or subagent (`input.agent_id`), a prompt starting with `/`, and one of 15 characters or less (`mods/puppet-teams/hooks/remind.js:16,18`) | README:9 says only "main session only (never for a teammate)". the LESSONS entry "sessions got the rules but did not start a team" states all three rules; README, RULES and SKILL do not | Do the three rules, with the threshold 15, go into FRD TEAMS-02 as written? |
| U-2 | The idle hook counts nudges in `puppet-teams-idle-<first 8 of the session id>.json` in `os.tmpdir()` (or `PUPPET_TEAMS_TMP`): at most 2 per teammate and task; nothing deletes the file (`idle.js:44-50`) | GUIDE.md:143 says "twice per task". The file, the variable and the leftover are in no document | Is "twice" the requirement? Is a file left in the temp dir acceptable? |
| U-3 | A teammate's role is its name up to the first `-`, lower-cased; a free task matches when its subject text before the first `.` equals that role (`idle.js:20,40`) | README:9 and GUIDE.md:143 say "role as the subject prefix". SKILL.md:36 says "Name each teammate by its role" as advice | Is the naming rule (`researcher-2` takes `Researcher.`) a requirement on the lead? A teammate named `rev` gets no free task |
| U-4 | A task with a `blockedBy` entry that is not completed is never offered (`idle.js:36-37`) | README:9: "an open task" | Confirm: a blocked task is not open |
| U-5 | Tasks dir order: `CLAUDE_CONFIG_DIR` or `~/.claude`; then `tasks/session-<8>`, then `tasks/<team_name>`, then the dir a `.session-list` names (`idle.js:21-29`) | the LESSONS entry "an assignment by message crossed the teammate's idle notice" names `~/.claude/tasks/<session>/*.json` only | Technology: moves to the TP. Confirm no FRD row needed |
| U-6 | Every hook error exits 0 with no output, and the two stdin hooks stop after 1 s (`idle.js:9,55-57`, `inject.js:19-21`, `remind.js:7,22-24`) | Code comments only | INVARIANT candidate: a hook never fails a session or a prompt. Accept? |
| U-7 | Timeouts: SessionStart 15 s with the message "Loading puppet-teams rules...", the other two 10 s (`hooks/hooks.json:10-11,22,34`) | None | TP only. Confirm |
| U-8 | A resumed agent gets no narration sentence (`mods/puppet-monitor/hooks/register.tsx:205`) | README:47: "every agent spawned while it is loaded" | Is skipping a resumed agent right? Say so in the FRD |
| U-9 | At turn end an agent reports only if it made a call other than `SendMessage` since its last turn; the text is the first sentence of its final answer, else its last line, else "Done." (`register.tsx:222-227,292`; `theatre.ts:148-153`) | README:14: "When an agent ends its turn or sends a message, it walks to whoever it reports to" | Add the condition and the text rule to the FRD? |
| U-10 | QUIET needs no call running (`theatre.ts:214`: `loop.running.length === 0`) | README:24: "Working, with no activity for 2 minutes" | Which is right? A long call is STUCK's job, not QUIET's |
| U-11 | Alerts count only for agents whose status is `running` or `pending`, and for the lead only while it is busy (`theatre.ts:251-260`) | README:26 says alerts show in the band, status line and office, with no condition | Confirm |
| U-12 | Caps: said 8, text 200 characters, thinking text 2,000, history kept 200 and shown 50, shells 20 (`theatre.ts:5,8,15,18,20`; `register.tsx:336`) | CHANGELOG:37 gives only 40 timeline entries and 20 files | Which caps are requirements, which are tuning? |
| U-13 | The session key is the session id without characters outside `A-Za-z0-9-`, else an FNV hash of the working directory (`register.tsx:33-43`) | README and CHANGELOG say `<session>` or `<key>` only | TP, plus a rule for surfaces with no `session.id`. Confirm |
| U-14 | No code deletes `office/state-<key>.js` or `open-<key>.html`: one pair per session piles up in the plugin folder (no delete call found under `mods/puppet-monitor`; `office/.gitignore:1-2` ignores them) | None | Accept, or a new requirement (cleanup)? Not part of the adoption |
| U-15 | Two meanings of "working": the band counts status `running` or `pending` (`register.tsx:163`); the page header counts `working` and not `sleeping` (`office-app/src/hud/format.ts:20-21`) | README:12 "counts your agents" only | One meaning, and which? Ties to X-4 |
| U-16 | An error is shown, and ranks a card first, for 10 minutes only (`hud/teamview.ts:5,47`; `hud/Team.tsx:8,31`); a QUIET alert also ranks first (`teamview.ts:48`) | CHANGELOG:35: "problems first (stuck, looping, error, blocked)" | Confirm the 10 minutes and that QUIET counts |
| U-17 | A lead that is idle with open tasks and nobody working shows WaitingOnTeam; the code calls it a "Shortcut" (`office-app/src/office/mood.ts:73-74`) | characters.md section 4 has no row for it | Add a row, or change the code? |
| U-18 | `?shiny=all` forces the gold critter for everyone (`office/shiny.ts:9-10`) | None | Keep as a debug switch and document it? |
| U-19 | Theme windows: Christmas 12-01 to 12-26, New Year 12-27 to 01-03, Halloween 10-20 to 10-31, Easter a fixed 03-20 to 04-20 (`scene/themes.ts:12-17`) | CHANGELOG:41: "picked by date or `?theme=`", no dates | Dates into the FRD? Is a fixed Easter window enough? |

### Document says it, code does not, or does it differently (X)

| # | Document says (file:line) | Code does (file:line) | Which is right? |
|---|---|---|---|
| X-1 | puppet-monitor README:26: "A shell in the background turns red after 5 minutes" | The shell is stored (`register.tsx:335-336`) but nothing reads its age: `alerts` and `office` (`theatre.ts:251-261,369-399`) ignore `shells`. Only a shell that ends `failed` marks its starter's error (`register.tsx:379-381`) | Remove the sentence, or build the 5-minute rule? |
| X-2 | README:14 and office-app README:15: the mod rewrites the state file every second | It ticks every second but writes only when the text changed (`register.tsx:7,143-146`) | Wording only: "when it changes"? |
| X-3 | office-app README:16: "no key: `state.js`" | The mod never writes `state.js`; the file is always `state-<key>.js` (`register.tsx:30`). The page still asks for `state.js` without a key (`state.ts:8`) and says "no session picked" if it finds an old one (`App.tsx:25`) | Remove the fallback, or keep it for old mods? |
| X-4 | README:14: "An agent with no task in progress sleeps ... and wakes when it takes one" | `sleeping` is "no in-progress task and no alert", whether or not the agent is running calls (`theatre.ts:353`, `office/wake.ts:4`). The scene keeps such an agent asleep (`office/walkers.ts:66`), the card hides its action (`hud/teamview.ts:89`) and the header does not count it (`hud/format.ts:20`). A task counts only if its owner is the agent's name, or the agent set it in progress (`theatre.ts:277-280`) | Should a teammate that is running calls ever sleep? This hides real work from the owner, against D-2 |
| X-5 | characters.md:3: "Spec only. No code." and :7: type, description, tool kind, `since`, `gone` "not in the state today" | All exist: `office-app/src/types.ts:26-47`, `office/archetype.ts`, `office/mood.ts`, `scene/costumes.ts`, `OfficeScene.ts:339-357` | The header is stale. Rewrite it as the UX document? |
| X-6 | characters.md:55 (state "Waiting for permission", field `asks`) and :125 (open question: no hook may exist) | `mood.ts:31` tests `desk.asks`, but the mod never writes it (`theatre.ts:305-334` has no such field): the state cannot be reached | Drop the row, or find a hook? |
| X-7 | characters.md:60: a long command is "over 30 s, or `Bash` with `backgroundTaskId`" | Only the 30 s test (`mood.ts:36`). The mod stores `backgroundTaskId` (`register.tsx:335`) but `office()` does not send it | Which? |
| X-8 | characters.md:28-43: personalities with idle habits and catchphrases (a bubble 2 s, once per 20 s), a walk style per archetype, a gold sparkle every ~8 s | The table exists (`archetype.ts:90-130`, `WALK` 78-87) but no code reads `phrases`, `idle` or `WALK`; only the accent colour is used, through `costumes.json` (`scene/costumes.ts:26`). Sparkles flicker every 0.5 s (`OfficeScene.ts:279`) | Not built: keep as a requirement, or cut from the spec? CHANGELOG:39 says "three personalities each" |
| X-9 | characters.md:94-104: five ambient scenes (coffee, lounge, ping-pong, plant, stretch); stretch after 60 s idle | `office/ambient.ts` has the rules and `AmbientDirector`, tested, but nothing in the scene imports them (only `seeded` is: `office/extras.ts:1`, `scene/extrasLayer.ts:2`). The 60 s stretch is effectively 90 s (`ambient.ts:5,16`) | Not running: build, or cut? |
| X-10 | characters.md:87-88: lead "Talking to the owner" on a `message` call or text to the user; Celebrating when done equals total | Talking only on `kind==='message'` (`mood.ts:67`). Celebrating also needs a done event within 5 s (`mood.ts:69`), while its comment says `EVENT_MS`, which is 3 s (`mood.ts:14,68`) | Fix the spec or the comment? |
| X-11 | puppet-teams README:5: "When the repo has `ONBOARDING.md`, the rules point to the local files"; RULES.md:3 "in every project" | The test is the folder two levels above the plugin root, not the session's repo (`inject.js:11-14`). From a marketplace install that folder is the plugin cache, so the GitHub link is used. Inferred, not run | Reword the README, or change the code? |
| X-12 | README:9 and GUIDE.md:143: a teammate with an open task gets `new task N: <subject>, not task M again` | Three variants: an in-progress task says `keep going on task N: <subject>`; "not task M again" appears only if the teammate has finished one; a free task must be `pending` with no owner, an owned one may be in any state but completed (`idle.js:39-40,51-53`) | Wording only, or a real rule? |
| X-13 | RULES.md:8-19 and SKILL.md:16-43: fill the pile first, standing team, no task number in the spawn prompt, models by role, one commit per verified task, the lead delegates | Nothing checks any of it. The hooks do three things: inject the rules, remind on a prompt, send an idle teammate back (`hooks.json`) | Which rules are requirements with a probe (as the 3-of-3 probes of D-9), and which are advice? |
| X-14 | README:34: the OS is "read from `session.info` or the drive in the plugin root" | The root path is tested first; `session.info` is read only when the root is not a Windows path (`register.tsx:64-73`) | Wording only |
| X-15 | CHANGELOG:22: a script that makes one read "reads \"Code: 1 calls\"" | Written as the plural every time (`theatre.ts:72,294`) | Is "1 calls" accepted, or a bug? |
| X-16 | puppet-monitor CHANGELOG:5-28: one Unreleased section with 7 Added, 2 Changed, 5 Fixed and 1 Removed entries. teams README:9: a bump is what makes installed copies refresh | `plugin.json:3` is still 0.2.0, as is `office-app/package.json:4` | When is the monitor release cut? Installed 0.2.0 copies show none of it |

### The five gaps that matter most

1. **X-4**: an agent that runs calls without an in-progress task is drawn asleep, hidden from the header count and its card. That is the one place where the monitor can hide work, and D-2 says it exists to show it.
2. **X-1**: the README promises a 5-minute red alert for background shells that no code produces.
3. **X-13**: the RULES and the skill are prompt text; only three behaviours are enforced. The TEAMS FRDs need acceptance rows, each with a probe, or they promise what nothing checks.
4. **X-8 and X-9**: characters.md specifies personalities, catchphrases, walk styles and ambient scenes that exist as tested rules but never run. Its header still says "No code".
5. **X-11**: puppet-teams points a marketplace install to GitHub, not to the local ONBOARDING, against its README. Inferred from the code, not run.

## 9. Slice and FRD list, to approve

- **METHOD** (R-METHOD): FRD-01 set up and start a session; FRD-02 the pile (tasks, owners, dependencies, assignment); FRD-03 files and worktrees; FRD-04 verify and review; FRD-05 the desktop path; FRD-06 reporting what failed (field report).
- **TEAMS** (R-TEAMS): FRD-01 inject the rules; FRD-02 remind on a work prompt; FRD-03 send an idle teammate back.
- **MONITOR** (R-MONITOR): FRD-01 team panel and cards; FRD-02 agent detail and history; FRD-03 open the office on each OS and surface; FRD-04 alerts; FRD-05 narration; UX-01 characters.

## 10. Questions

None open from the owner's list. The owner answered Q-1 to Q-19 on 2026-11-20 and each answer is a D-n in section 11 (Q-16 is D-21, Q-17 is D-23, Q-18 is D-24, Q-19 is D-22). Open: the questions in the U and X tables of section 8a.

## 11. Owner decisions recorded 2026-11-20

Written to `docs/DECISIONS.md` as D-n when the migration starts (Goes into: the document named). Source: D-1 to D-4 and D-20 are memory notes, written here as paraphrase; D-5 is the owner's comment on issue #5; D-6 to D-19 are the owner's words relayed by the lead from this conversation, marked "owner, via the lead, 2026-11-20"; D-21 to D-24 are the owner's answers, marked "owner, 2026-11-20".

| ID | Date | Source | Decision | Goes into |
|---|---|---|---|---|
| D-1 | 2026-11-18 | memory note (paraphrase) | One coordinator per goal and worktree; it splits the work and drives it to done (vision note, paraphrase of the owner) | PRODUCT P1; PRD METHOD |
| D-2 | 2026-11-18 | memory note (paraphrase) | The monitor exists so the owner knows what each agent is doing without asking the lead; looks come second (monitor-purpose note, paraphrase) | PRODUCT P8; PRD MONITOR |
| D-3 | 2026-11-18 | memory note (paraphrase) | Every behaviour must handle the OS and the surface (os-and-surface-aware note) | PRODUCT P9; CROSS-CUTTING CC-6 |
| D-4 | 2026-11-19 | memory note (paraphrase) | The lead (main session) delegates every piece of work to a teammate by role and model and stays free; it may read one file or run one command to verify. Verified by reading `lead-delegates.md` in full: the note says the owner said so on 2026-11-19, after asking twice for delegation by role (memory note, paraphrase) | PRODUCT P6; PRD METHOD; FRD METHOD-02 |
| D-5 | 2026-11-18 | owner's comment on issue #5; memory note (paraphrase) | Concord MCP (peer-to-peer claim gate) is not adopted now: "I'll star it and try it in the future. For now I'll stay with puppeteering ... one coordinator per goal, in its own worktree". Source: the owner's comment on issue #5, 2026-11-18T15:09Z. The memory notes say it was declined (paraphrase); the comment says "for now", so I wrote "not adopted now" | PRODUCT §6 Scope |
| D-6 | 2026-11-20 | owner, via the lead, 2026-11-20 | A coordinator of coordinators is not in this version | PRODUCT §6 Scope; GUIDE keeps its section marked untested |
| D-7 | 2026-11-20 | owner, via the lead, 2026-11-20 | Showcase (video, sprites, social) is not part of the product: no showcase use case, no showcase slice | PRODUCT §5, §6, §7 |
| D-8 | 2026-11-20 | owner, via the lead, 2026-11-20 | The owner is the only user; no Contributor user | PRODUCT §3 |
| D-9 | 2026-11-20 | owner, via the lead, 2026-11-20 | Success criteria: (1) a fresh session in any project starts the pile and a team on a multi-step prompt, 3 of 3 probes; (2) no two agents take the same task in a run (no double claim, by two teammates or two leads), counted from the task files and LESSONS per run; (3) no task built twice in a run; (4) the owner knows what each agent is doing without asking the lead, judged by the owner on a real run with the monitor | PRODUCT §8 |
| D-10 | 2026-11-20 | owner, via the lead, 2026-11-20 | Count the runs, tasks and sessions from LESSONS.md and the git log and put the numbers in Problem (accepted) | PRODUCT §1 (done in the draft) |
| D-11 | 2026-11-20 | owner, via the lead, 2026-11-20 | One product; puppet-teams and puppet-monitor are its add-ons | PRODUCT §2 |
| D-12 | 2026-11-20 | owner, via the lead, 2026-11-20 | The product is not only for Claude Code: it starts on Claude Code and may be extended to other platforms later. PRODUCT names Claude Code as the first platform, a constraint and fact, not what the product is | PRODUCT §2, §6, §9 |
| D-13 | 2026-11-20 | owner, via the lead, 2026-11-20 | No document is approved yet. The owner wants to be told later which documents to approve; every document is Draft and every request Open, except REQ-7 (Accepted, D-17) | all statuses |
| D-14 | 2026-11-20 | owner, via the lead, 2026-11-20 | GUIDE, ONBOARDING, LESSONS, REFERENCES and README stay at the root | section 3 (KEEP and EXTRACT rows) |
| D-15 | 2026-11-20 | owner, via the lead, 2026-11-20 | "Coordinator" fits what is really done: use it in the chain. GLOSSARY: Coordinator, with "lead" mapped as the platform's word for it | GLOSSARY; every chain document |
| D-16 | 2026-11-20 | owner, via the lead, 2026-11-20 | The desktop app should work too: a requirement (UC-8). Current fact, from the official desktop page: agent teams "are available in the CLI, not in Desktop" | PRD METHOD; FRD METHOD-05; PRODUCT §9 |
| D-17 | 2026-11-20 | owner, via the lead, 2026-11-20 | REQ-7 yes (a second live coordinator on one conversation). Two coordinators, each in its own worktree, that message each other, are fine. Once one must coordinate the other, decide who is the real coordinator and who is not | REQ-7; FRD METHOD-02 |
| D-18 | 2026-11-20 | owner, via the lead, 2026-11-20 | puppet-teams gets a CHANGELOG, managed with changesets | section 15; `mods/puppet-teams/CHANGELOG.md` |
| D-19 | 2026-11-20 | owner, via the lead, 2026-11-20 | Run a code-versus-document pass for monitor and teams (task 92); its findings join this plan | section 8 and the gap report |
| D-20 | 2026-11-19 | memory note (paraphrase) | Fill the pile first: when a goal arrives, create every known step as a task with addBlockedBy before spawning anyone; the note calls it the most important part (memory note, paraphrase; `lead-delegates.md` verified in full) | FRD METHOD-02; TEAMS FRD-02 |
| D-21 | 2026-11-20 | owner, 2026-11-20 | Document caps (option A): LESSONS 180 now, GUIDE 220, ONBOARDING 200, RETRO 15, each a CHECKS row. LESSONS.md stays at the root (D-14) | section 13; CHECKS |
| D-22 | 2026-11-20 | owner, 2026-11-20 | Archive whole LESSONS entries by month in `docs/retro/lessons/YYYY-MM.md` when LESSONS would pass its cap of 180 lines, with a one-line index entry left in LESSONS; delete nothing | section 13; GUIDE |
| D-23 | 2026-11-20 | owner, 2026-11-20 | Do not rename "lead" in the root documents for now | GLOSSARY; section 11 |
| D-24 | 2026-11-20 | owner, 2026-11-20 | Changesets with npm (`npx changeset`), no Bun at the root | section 15 |

Effects: the PRODUCT draft has every answer applied: Coordinator replaces lead; counts in section 1; a desktop use case (UC-8) and the desktop fact in section 9; the open-questions section says none open. Criterion 2 names two leads, so REQ-7 stays a request counted by criterion 2. D-17's rule (who is the real coordinator once one must coordinate the other) is a requirement for FRD METHOD-02, not yet written. Criteria 3 and 4 are measured by hand today; no INVARIANTS row until a check exists.

Consequence of D-14 with D-15: the root documents, RULES.md, the skill and the hook messages say "lead" while the chain says "coordinator". `team-lead` is the platform's own agent id and stays. The root documents keep "lead" for now (D-23); a GLOSSARY Avoid entry for "lead" needs a `<!-- lint-ok: platform term -->` on each quote of the official pages.

## 12. After approval

Order: PRODUCT, created in the same step as DECISIONS.md and GLOSSARY.md (PRODUCT cites both), with INVARIANTS, CROSS-CUTTING and CHECKS; requests; PRDs; FRDs; UX; TP and ADRs. One commit per chain step, only if the owner asks. `bun "${CLAUDE_PLUGIN_ROOT}/scripts/check.ts"` per step, then `status .` and `lint-docs.ts`. Remove this file after the merge.

## 13. Growth and order

Owner, via the lead, 2026-11-20: "hay muchas cosas que si no van a crecer hasta el infinito y necesitamos orden." Read from `scriptorium/scripts/lint-docs.ts`, `check.ts`, `summary-diff.ts`, the skills and templates, 2026-11-20. Line numbers are those of scriptorium HEAD 3395172; its working tree has uncommitted edits to `check.ts`, `lint-docs.ts` and `pre-commit.ts` that shift them.

### 13.1 Every mechanism that bounds a document

| # | Mechanism | Where it lives | Enforced by code? |
|---|---|---|---|
| B-1 | Line cap per type: `CAPS = { PRODUCT: 250, PRD: 150, FRD: 300, UX: 150, TP: 250, ADR: 80, SPEC: 250, REQUEST: 60, DECISIONS: 120 }` (`lint-docs.ts:8`); the failure is `kind + " is " + total + " lines, over its cap of " + CAPS[kind]` (`lint-docs.ts:105`). The count includes fenced code. | lint-docs | Yes, on every `.md` under `docs/` whose `docKind` is one of those nine |
| B-2 | One feature per FRD: the `frd` skill says "Split the PRD into features, one FRD each" (`skills/frd/SKILL.md:14`). The 300-line cap is what makes a fat FRD fail. | skill prose + B-1 | Only through B-1 |
| B-3 | DECISIONS is an inbox: a row has a `Goes into` cell (empty cell fails, `REGISTRY` at `lint-docs.ts:10`); when the governing document says it, the row moves to `docs/decisions/YYYY-MM.md`; "Agents do not read `docs/decisions/` by default" (`skills/decision/SKILL.md`). | decision skill + B-1 + lint | The 120-line cap and the empty cell: yes. The absorb-and-archive step: no |
| B-4 | RETRO is open entries only: an entry closes when the replay of the failure fails against the prevention; then it moves to `docs/retro/YYYY-MM.md` (`skills/retro/SKILL.md`, "The log holds open entries only"). | retro skill | No |
| B-5 | A Summary of five lines at most, in the first 20 lines, ending `Last change: YYYY-MM-DD, <what>`: `if (at < 0 || at >= 20) return ["no ## Summary within the first 20 lines"]` (`check.ts:220`). The five-line limit is template and skill prose only; `checkSummary` does not count the body. | check.ts | Position and `Last change` line: yes. Length: no |
| B-6 | Summary stays current: in a pull request, a chain document whose body changed must change its Summary (`summary-diff.ts:24`, `return b.body !== h.body && b.summary === h.summary`), waiver line "Summary unchanged: <file>, <reason>". Registries and archives are skipped (`summary-diff.ts:8`). | CI only (`ci.yml:41`) | Yes, in CI of a pull request. Not in the hooks or pre-commit |
| B-7 | Status lifecycle: `Draft`, `Approved (date)`; an approved document rests on an approved one and has no open Q-n (`check.ts status`). ADR: `Proposed`, `Accepted`, `Superseded`, `Rejected` (`check.ts:211`). | check.ts | Yes. It bounds when a document is final, not how long it is |
| B-8 | An accepted ADR is never edited; a changed decision is a new ADR that supersedes the old (`skills/adr/SKILL.md:9`); ADR cap 80. | adr skill + B-1 | Cap and status words: yes. Never-edited: no |
| B-9 | Duplicated text: an FRD, UX, TP or SPEC sentence copied from the PRD or PRODUCT fails (`lint-docs.ts:133`, 12-word sentences, `COPY_WORDS`). Link the id. | lint-docs | Yes |
| B-10 | Filler: an empty section, or one that holds only TBD, TODO or n/a, fails (`lint-docs.ts:100-101`). Banned phrases and dead links also fail. | lint-docs | Yes |
| B-11 | Three layers run the checks without the agent choosing to: plugin hooks after an edit under `docs/` and before stop, git pre-commit, CI (`skills/scriptorium/SKILL.md:84`). | hooks.json, pre-commit.ts | Yes, but only when `docs/PRODUCT.md` exists |
| B-12 | Reserved folders `requests`, `tp`, `adr`, `retro`, `decisions`, `research` are not slices (`check.ts:17`). | check.ts | Yes |

### 13.2 Where scriptorium has no mechanism

1. **No cap on GLOSSARY, INVARIANTS, CHECKS, CROSS-CUTTING, RETRO.** `CAPS` has no key for them. `RETRO.md` has no `docKind` at all (`docKind` matches only a top-level PRODUCT, DECISIONS, INVARIANTS, CHECKS or CROSS-CUTTING). A retro log that is never closed grows without bound and nothing fails.
2. **No cap on the archives** (`docs/decisions/YYYY-MM.md`, `docs/retro/YYYY-MM.md`) or on `docs/research/`. They are meant to grow; the only bound is that agents do not read them by default, and that is a sentence in a skill.
3. **No age rule.** The decision skill says "older than the set age" and no code, template or file defines that age. Only the line cap and the agent's judgment trigger an absorb.
4. **Absorb, archive and close are manual steps.** No script moves a row. Skipping them fails only when the cap is hit.
5. **Nothing outside `docs/` is linted.** `lintDocs` walks `join(root, "docs")` only (`lint-docs.ts:138`, and returns no failures when `docs/` is missing). A root `LESSONS.md`, `GUIDE.md` or `ONBOARDING.md` has no cap, no Summary check, no copied-text check, no dead-link check. This matters for D-14: the recommendation keeps them at the root, and that choice leaves them outside every mechanism above.
6. **Summary length** is not counted (B-5), and `summary-diff` runs only in CI, so a local commit can leave a stale Summary.
7. **No check that an archived row was really absorbed.** Nothing verifies that the document named in `Goes into` now says the decision.

### 13.3 Applied to this repo

Current sizes: LESSONS.md 138 lines, 19 entries, all dated 2026-11, one entry added per failure so far; with the carried 13 and 8 lines it is 159. GUIDE.md 191, 194 with the 3 carried lines; ONBOARDING.md 177. All three sit at the root, so scriptorium bounds none of them today.

| Document | Grows how | Bound I propose | What leaves, when | Mechanism |
|---|---|---|---|---|
| LESSONS.md | One entry per run that fails; 19 entries and 138 lines in the first month, so roughly 40 lines per week of work; 159 with the carried entries | Nothing is deleted or rewritten: LESSONS stays the evidence log (D-14). The cap is 180 (D-21; 150 was below the real 159). Growth (D-22): when LESSONS would pass its cap of 180 lines, whole old entries move by month, unchanged, to `docs/retro/lessons/YYYY-MM.md`, with a one-line index left in LESSONS | Nothing is deleted; nothing moves until LESSONS would pass 180 lines. RETRO-n entries (3 today, section 4) point to a LESSONS entry and do not replace it. A rule that a lesson led to is added to GUIDE or ONBOARDING as a new line; the lesson stays | A line-count CHECKS row (no scriptorium mechanism for a root file). The move is manual |
| GUIDE.md | Each lesson that becomes a rule adds lines (the two carried GUIDE lines are an example) | Cap 220 lines (D-21); 191 today, 194 with the carried lines. The owner's rules in it are extracted into FRD rows (section 3); the guide keeps the short statement and cites the FRD id | A rule that now lives in an FRD with a check can be cut from GUIDE to a one-line pointer. A section marked untested (the coordinator of coordinators, D-6) stays marked, not deleted | Same: B-1 does not reach the root; a CHECKS row |
| ONBOARDING.md | Setup, OS table, symptom list (section 7 grows by one row per new symptom) | Cap 200 lines (D-21). Section 7 is the growth point: each symptom row cites a FRD row with an IF-THEN | A symptom whose cause is fixed in code is removed and its FRD row stays | CHECKS row; no scriptorium mechanism |
| DECISIONS.md (new) | D-1..D-9 now, one row per owner decision | Scriptorium cap 120 lines, enforced | Absorb each row into PRODUCT or the PRD the day the document says it; archive to `docs/decisions/2026-11.md`. At adoption, D-1..D-9 are absorbed in the same pass (their `Goes into` is already named in section 11), so DECISIONS starts near empty | decision skill (manual) + lint cap |
| RETRO.md (new) | 3 open entries from section 4 on day one; the carried entries add none | Open entries only; no scriptorium cap. Cap 15, as a CHECKS row (D-21) | None closes on adoption. A RETRO closes when its replay is run against the prevention and the retro skill's close step is done; the three, whose tests pass (24 of 24 on 2026-11-20), are still open until then | retro skill (manual) |
| FRD, PRD, UX, TP, ADR | 14 FRDs, 3 PRDs, 2 UX | Scriptorium caps B-1; METHOD has 6 FRDs, so no slice is near a cap. A PRD past 150 lines is split into a new slice | A FRD past 300 lines is split by feature (B-2) | lint cap + `frd` skill |
| GLOSSARY, INVARIANTS, CHECKS, CROSS-CUTTING | One row per term, rule, check, concern | No scriptorium cap. Proposed: 150 lines each, as CHECKS rows | Rows leave only when the thing they describe is deleted from the product | none in scriptorium |
| `docs/research/` | One file per research run | No cap | Dated files; agents do not read them by default | none beyond the skill sentence |

Order, not size, is the other half: after adoption each rule has one home (a chain document), the root guide cites it, and LESSONS.md stays the evidence log, the only place a failure story is told in full. Nothing in it is deleted or rewritten (D-14). The two carried LESSONS entries in section 5 go into LESSONS.md in their original wording; RETRO-n entries only point to a LESSONS entry.

### 13.4 What I propose, in order

1. Use `/scriptorium:decision` and `/scriptorium:retro` as written; they are the only archive mechanisms scriptorium has.
2. Add a CHECKS.md row for each root document, so the cap is a command and not a sentence. Command: `node -e` or a shell line that fails when `wc -l` of the file is over its cap. Replay: a copy of the file padded past the cap. CHECKS rows run only when the agent or a hook runs them, so also add them to the pre-commit script of this repo.
3. **Document caps (D-21).** Real counts today: LESSONS.md 138 lines, 159 with the carried 13 and 8; GUIDE.md 191, 194 with the carried 3; ONBOARDING.md 177. Caps: LESSONS 180, GUIDE 220, ONBOARDING 200, RETRO 15, each a CHECKS row. The three root files stay at the root (D-14), because a move breaks their links.
4. Report to scriptorium, not here, the gaps in 13.2 items 1, 3 and 5: no cap on the registries, an undefined "set age", and no lint outside `docs/`. They are the owner's own project; a REQ there is the owner's call.
5. **How LESSONS grows (D-22).** Nothing is deleted or rewritten. When LESSONS would pass its cap of 180 lines, whole old entries move, unchanged, to an archive file by month, and LESSONS keeps a one-line index entry (title and archive link) in their place. All 19 entries are dated 2026-11, so nothing is old before 2026-12. Do not use `docs/lessons/`: `check.ts` treats every folder under `docs/` that is not in `RESERVED` (`check.ts:17`: requests, tp, adr, retro, decisions, research) as a slice, so it would be read as a slice. Path: `docs/retro/lessons/YYYY-MM.md` (not run).

## 14. The desktop answer, and what it changes (D-16)

Verified 2026-11-20 on https://code.claude.com/docs/en/desktop: "Agent teams: coordinated teams, where Claude as the team lead assigns tasks to teammates from a shared task list, are available in the CLI, not in Desktop. For multi-agent work inside one session, use dynamic workflows, which run in Desktop". So the docs do say, and RULES.md and SKILL.md ("CLI only") are right. These lines are stale and need a fix at migration:

| Where | Says now | Fix |
|---|---|---|
| GUIDE.md "In the desktop app", paragraph 2 ("What the docs say: ... never names the desktop app. The desktop page never mentions agent teams ... So the docs do not say") | the docs are silent | Replace with the quote above and the URL; keep the run as the observation that agrees with it |
| GUIDE.md same section, "So in the app, work as if you have subagents" and "For a real team with a shared list, use the terminal" | correct advice | Keep. Add: the desktop page names dynamic workflows for multi-agent work in Desktop; whether the method can use them is not researched |
| LESSONS.md "teammates spawned from the desktop app had no task tools", line "Answer: the docs do not say" | stale | Do not rewrite history: add a dated line "2026-11-20: the desktop page says agent teams are CLI only" |
| GUIDE.md Setup, "In the desktop app the lead had the tools and its teammates did not" | an observation | Keep; it matches |
| mods/puppet-teams/README.md "Terminal and desktop app: SessionStart hooks run in both. Only the terminal was tested." | untested | Keep; D-16 makes a desktop test a requirement for FRD TEAMS-01 |

D-16 is a requirement the platform does not meet for teams: the desktop path must work without agent teams. FRD METHOD-05 states what the desktop owner gets (a pile held by the coordinator, roles as subagents, review, the monitor) and carries an Open question: can dynamic workflows give the pile and the independent review? That is new research, not part of this adoption.

## 15. Changesets for puppet-teams (D-18)

What exists. puppeteering has no `.changeset/` and no root `package.json`. puppet-monitor keeps a hand-written `CHANGELOG.md` with `## Unreleased`, mirrors its version in `office-app/package.json` (a test fails if they differ) and tags `puppet-monitor@<version>` (CONTRIBUTING, Versions). puppet-teams has only `.claude-plugin/plugin.json` (0.3.1) and no changelog. Scriptorium (`C:/Users/anton/dev/scriptorium`) uses `@changesets/cli`: `.changeset/config.json` (`baseBranch: main`, `privatePackages: { version: true, tag: true }`, `access: restricted`), scripts `changeset` and `version` (`changeset version && bun scripts/sync-version.ts`), and `.github/workflows/version.yml` with `changesets/action@v1`, which keeps a "Version Packages" pull request open and tags on merge. `scripts/sync-version.ts` copies `package.json`'s version into `.claude-plugin/plugin.json`.

What to add, for puppet-teams only (the monitor keeps its own scheme until the owner says):

1. Root `package.json`: `{ "private": true, "workspaces": ["mods/puppet-teams"], "devDependencies": { "@changesets/cli": "^3.0.3" }, "scripts": { "changeset": "changeset", "version": "changeset version && node scripts/sync-version.js" } }`.
2. `mods/puppet-teams/package.json`: `{ "name": "puppet-teams", "version": "0.3.1", "private": true }`.
3. `.changeset/config.json`: copy scriptorium's.
4. `scripts/sync-version.js`: scriptorium's script, with the manifest path `mods/puppet-teams/.claude-plugin/plugin.json`.
5. `mods/puppet-teams/CHANGELOG.md`, backfilled by hand from git (each version is its own commit): 0.1.0 (620a51f, 2026-11-18), 0.2.0 (9d5195e), 0.2.1 (02d6ad5), 0.3.0 (b0d4d05), 0.3.1 (1b505e3), 2026-11-19. Changesets prepends from the next version.
6. A workflow like scriptorium's `version.yml`. Changesets' default tag for a package is `puppet-teams@0.3.1`, the same pattern CONTRIBUTING already uses for the monitor.
7. Each change: `npx changeset`, pick patch or minor, one line; commit the `.changeset/*.md` with the change. Update CONTRIBUTING "Versions" and ONBOARDING §6 to say so, and delete "Version 0.3.1: bumped so installed copies refresh" from the README (the changelog holds it).

Not verified: I did not run changesets here. The owner chose npm (D-24): the plan above uses `npx` and node, not Bun. Putting the monitor under the same flow later needs its `office-app/package.json` mirror reworked.
