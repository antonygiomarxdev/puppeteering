# SPEC-01-2: The herdr panel: match agents to sessions, and draw them

Status: Approved (2026-11-23)
Approval: content haZWbM--dE0B; rests on ../../requests/REQ-12-herdr-panel.md Y_wn_krhL6Fb
Rests on: ../../requests/REQ-12-herdr-panel.md

## Summary

A mod `mods/puppet-herdr/` for the Herdr desktop app. A pure module names, for each herdr agent whose `app` is `claude-code`, the state file of its pane's folder, checks what `main.js` read from it, and formats the line; `main.js` reads those files with `readTextFile` every 2 s and draws them. No folder listing. Second of three runs. Reads the files SPEC-01-1 writes.

Last change: 2026-11-23, reads one named file per agent (review of task 151, F1)

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-33 | 2026-11-22 | The Herdr desktop app (GPUI mods in `~/.config/herdr-app`) is the first surface beyond Claude Code's own, an exception to D-12's "later": its agents are still Claude Code agents. A read-only panel, `mods/puppet-herdr/`, shows each Claude Code agent herdr sees, with its status from herdr and, from puppet-monitor, its session's tasks and alerts (LOOPING, STUCK, QUIET). Windows first; macOS and Linux where they work at no extra cost, and what nobody ran is said untested Source: owner, via the lead, 2026-11-22. | PRODUCT §5 (UC-9), §6, §7; `docs/requests/REQ-12-herdr-panel.md`; `docs/herdr/specs/` |
| D-3 | 2026-11-18 | Every behaviour must handle the OS and the surface Source: os-and-surface-aware memory note (paraphrase). | PRODUCT P9; CROSS-CUTTING CC-6 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-herdr/match.js` | Create | Pure: `normPath`, `folderKey`, `stateFile`, `matchAgents`, `lineOf`, `STALE_MS` (no herdr import) |
| `mods/puppet-herdr/main.js` | Create | The `View`: timer, `readTextFile` per agent, rows, click to focus the agent |
| `mods/puppet-herdr/mod.json` | Create | `{ "place": "right", "size": 340, "title": "Puppets" }` |

## Reuses
- `~/.config/herdr-app/mods/agents/main.js` (shipped, read only): the `View` shape and `agents()`, `theme()`, `run()` use. Not copied; the file is Herdr's and rewritten on start.
- Precedent: SPEC-01-1-public-state-file.md: `normPath` and `folderKey` are written twice, once there and once here, because a Claude plugin and a herdr mod share no code. Both specs carry the same vectors, so a drift fails a test.

## Tests first
D-33, D-3, by the tester, in `mods/puppet-herdr/match.test.js` (`covers: herdr/REQ-12/<ID>`), with no herdr: plain objects shaped like `AgentInfo`, `PaneInfo` (`herdr.d.ts`) and `PublicState`. Why folder and not session id: `AgentInfo` has no session id (fields: address, pane, space, status, app, program, title, seq), and `PaneInfo.cwd` is the terminal's live folder. Why one named file and not a listing: `readTextFile` is the documented file read (`herdr.d.ts`); `fs/promises` `readdir` is declared (`gpui-kit.d.ts`) but no shipped mod uses it and a grant may deny it, and a listing would grow with every folder ever worked in. Cases: `folderKey('C:\\Users\\anton\\dev\\puppeteering-herdr')` and `folderKey('c:/users/anton/dev/puppeteering-herdr/')` are both `27494bdf`; `folderKey('/home/a/proj')` and `folderKey('/home/a/proj/')` are both `5c92b791`; `folderKey('/')` is `2a0c975e`; `folderKey('\\\\srv\\Share\\X')` is `d1ce8abf` (D-3); `normPath` lowercases only a drive-letter or `//` path (D-3); `stateFile('C:/Users/a', 'C:\\p')` is `C:/Users/a/.claude/puppet-monitor/<folderKey('C:\\p')>.json` (D-3); `matchAgents(agents, panes, states, now)` takes `states`, an object from each `stateFile` path to the parsed JSON or `null`: an agent whose state has the same `normPath(cwd)` as its pane, `schema` 1 and `now - at <= STALE_MS` (30 000) matches (D-33); a `null` state, another `cwd` (a name collision), another `schema` or an older `at` does not (D-33); a pane missing for the agent does not; an agent with `app` other than `claude-code` is not returned (D-33); `shared: true` in the state reaches the match (D-33); `lineOf` gives the herdr status, `done/total`, one string per open task ("#3 subject (owner)", blocked ones marked), one per alert ("lead loop: ...") and, when shared, the note "2 sessions here, showing the latest"; for no match only the status and the note "no session" (D-33).

## Build
```js
export const STALE_MS = 30_000
export function normPath(p)                    // exactly as SPEC-01-1
export function folderKey(cwd)                 // exactly as SPEC-01-1
export const stateFile = (home, cwd) => `${home.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/.claude/puppet-monitor/${folderKey(cwd)}.json`
export function matchAgents(agents, panes, states, now) // -> { agent, session|null, shared }[]
export function lineOf(match)                  // -> { name, status, count, open: string[], alerts: string[], note? }
```
`main.js`: `default class Puppets extends View`; `init` starts `cx.timer.every(2000, ...)` unless `checking()`. Each tick: for every agent with `app === 'claude-code'` find its pane in `panes()`, `readTextFile(stateFile(home(), pane.cwd))`, `JSON.parse` it (null on a missing file or bad JSON), build `states`, call `matchAgents(agents(), panes(), states, Date.now())` (it finds an agent's state by the key of `states` that ends with `/<folderKey(pane.cwd)>.json`, then checks the state's `cwd` as above), `cx.notify()`. Colours come from `theme()` (`working`, `blocked`, `done`, `idle`); a row click runs `run('agent.focus', { terminal: agent.address })`.

## Done when
`node --test mods/puppet-herdr/match.test.js`

## Out of scope
Install (SPEC-01-3). A live run in the app and `herdr-app check` (owner steps in SPEC-01-3). Agents on a remote machine (a coincident local folder would match: known limit). Writing to herdr or to the session.

## Open questions
None.
