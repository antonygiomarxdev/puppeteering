# SPEC-01-1: puppet-monitor writes a public per-session state file

Status: Approved (2026-11-23)
Approval: content f4vQDlGeJPPc; rests on ../../requests/REQ-12-herdr-panel.md Y_wn_krhL6Fb
Rests on: ../../requests/REQ-12-herdr-panel.md

## Summary

Next to the office page's private `state-<key>.js`, puppet-monitor writes `<home>/.claude/puppet-monitor/<folder>.json`, one file per working folder (`<folder>` is `folderKey(cwd)`, defined below): plain JSON, schema 1, tasks and alerts, documented in its README. The herdr panel (SPEC-01-2) computes the same name from a pane's folder, so it needs no folder listing. First of three runs.

Last change: 2026-11-23, `shared` comes from when the tick last saw another session, so it does not flap (review 154, N1)

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-33 | 2026-11-22 | The Herdr desktop app (GPUI mods in `~/.config/herdr-app`) is the first surface beyond Claude Code's own, an exception to D-12's "later": its agents are still Claude Code agents. A read-only panel, `mods/puppet-herdr/`, shows each Claude Code agent herdr sees, with its status from herdr and, from puppet-monitor, its session's tasks and alerts (LOOPING, STUCK, QUIET). Windows first; macOS and Linux where they work at no extra cost, and what nobody ran is said untested Source: owner, via the lead, 2026-11-22. | PRODUCT §5 (UC-9), §6, §7; `docs/requests/REQ-12-herdr-panel.md`; `docs/herdr/specs/` |
| D-2 | 2026-11-18 | The monitor exists so the owner knows what each agent is doing without asking the lead; looks come second Source: monitor-purpose memory note (paraphrase). | PRODUCT P8; PRD MONITOR |
| D-3 | 2026-11-18 | Every behaviour must handle the OS and the surface Source: os-and-surface-aware memory note (paraphrase). | PRODUCT P9; CROSS-CUTTING CC-6 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-monitor/hooks/theatre.ts` | Change | Pure `publicState`, `normPath`, `folderKey`, `publicStatePath` and the `PublicState` type |
| `mods/puppet-monitor/hooks/register.tsx` | Change | The tick reads the previous file, then writes `publicState` to the contract path (the write of `STATE(key)` is the precedent) |
| `mods/puppet-monitor/README.md` | Change | Section "State file for other tools": path, `normPath` and `folderKey` with the vectors, fields, the 30 s staleness rule |

## Reuses
- `mods/puppet-monitor/hooks/theatre.ts` `alertOf`, `office`: the alerts and the task rows the office already builds; `publicState` is their subset, not a second rule.
- `mods/puppet-monitor/hooks/register.tsx` `STATE` and `keyOf`: the write-when-changed loop in the tick, and the FNV-1a loop (same constants) that `folderKey` repeats on a normalised path.
- Precedent: `mods/puppet-monitor/hooks/theatre.test.ts`, the pure-function tests this run extends, and `office.test.tsx`, whose `fs.write` mock the path test follows.
- `$.env.get`, `$.session.info`, `$.fs.read` (engine API): the home folder, `isHosted`, and the file's previous content.

## Tests first
D-33, D-2, D-3, by the tester, in `mods/puppet-monitor/hooks/theatre.test.ts` (each carries `covers: herdr/REQ-12/<ID>`). Cases: the result has `schema: 1`, the given `key` and `cwd` verbatim (a Windows path keeps its backslashes) and `at` equal to `board.now` (D-33); `tasks.done` and `tasks.total` count completed and all tasks, and `tasks.open` lists only the others, each with `id`, `subject`, `status`, `owner`, `blocked` (D-2); an agent that loops gives `alerts: [{ who: <name>, kind: 'loop', text }]`, a busy lead that is quiet gives `who: 'lead'`, an idle agent and an idle lead give none, and the list equals what `alerts(board)` prints (D-2); an empty board gives empty lists; `JSON.parse(JSON.stringify(x))` equals `x` (D-3); the output holds no thinking text, timeline or file list (D-3). Two sessions in one folder (D-33): `otherSeenAt(previous, key, last)` gives `previous.at` when `previous` has another `key` and `last` is undefined or smaller than `previous.at`, else `last` (`otherSeenAt({key:'b',at:5},'a',undefined)` is `5`); `isShared(otherAt, now)` is `true` for `now - otherAt <= 30000` (30 000 yes, 30 001 no) and `false` for an undefined `otherAt`; a run of ticks where the other session wrote at t=0 and each tick then reads the file this session wrote itself keeps `shared` `true` until t=30 001, then `false`, and a later write by the other raises it again (no flapping). The name function (D-3), the same vectors as SPEC-01-2: `folderKey('C:\\Users\\anton\\dev\\puppeteering-herdr')` and `folderKey('c:/users/anton/dev/puppeteering-herdr/')` are both `27494bdf`; `folderKey('/home/a/proj')` and `folderKey('/home/a/proj/')` are both `5c92b791`; `folderKey('/')` is `2a0c975e`; `folderKey('\\\\srv\\Share\\X')` is `d1ce8abf`; `publicStatePath('C:\\Users\\a\\', 'C:\\p')` is `C:/Users/a/.claude/puppet-monitor/<folderKey('C:\\p')>.json`. In `office.test.tsx`, with the mocked engine: a tick writes that file when `HOME` is set; with `HOME` unset and `USERPROFILE` set it writes under `USERPROFILE`; with neither, or with `isHosted` true, it writes no public file and still writes `state-<key>.js`; with an existing file of another fresh `key` the written text has `shared: true`, still `true` on the next tick, which reads the file it wrote itself, and `false` once the clock is 30 001 ms past the other's last `at`; a missing file (the mocked read rejects) is not an error (D-3).

## Build
```ts
export type PublicState = {
  schema: 1; key: string; cwd: string; at: number  // epoch ms, board.now
  busy: boolean; shared: boolean                     // lead busy; another session wrote this file within the last 30 s
  tasks: { done: number; total: number; open: { id: string; subject: string; status: string; owner?: string; blocked: boolean }[] }
  alerts: { who: string; kind: 'loop' | 'stuck' | 'quiet'; text: string }[]
}
export function publicState(board: Board, key: string, cwd: string, shared: boolean): PublicState
export function otherSeenAt(previous: { key: string; at: number } | undefined, key: string, last?: number): number | undefined
export const isShared = (otherAt: number | undefined, now: number): boolean
export function normPath(p: string): string   // \ to /, strip trailing /, but '/' stays; lowercase when it starts with a drive letter (/^[A-Za-z]:/) or //
export function folderKey(cwd: string): string // FNV-1a 32 over normPath(cwd) UTF-16 units: h=0x811c9dc5; h^=unit; h=Math.imul(h,0x01000193)>>>0; then h.toString(16).padStart(8,'0')
export const publicStatePath = (home: string, cwd: string): string  // `${home without trailing / or \, \ as /}/.claude/puppet-monitor/${folderKey(cwd)}.json`
```
In `register.tsx` the tick, after the `STATE(key)` write, reads the file at `publicStatePath(home, cwd)` (`$.fs.read` rejects for a missing file, per the engine types: the tick catches it, and an unparsable file counts as none), keeps `otherAt = otherSeenAt(previous, key, otherAt)` in memory next to `written`, builds `publicState(state, key, cwd, isShared(otherAt, state.now))` and writes its JSON. `at` is `board.now`, so the text differs every tick: the file is rewritten about once a second, and the write is skipped only when the text equals the last one written. A failed read or write does not stop the tick. Home: `(await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))`, skipped when neither is set or `(await $.session.info()).isHosted` is true. The path ignores `CLAUDE_CONFIG_DIR`: a contract path must not move.
Two sessions in one folder write the same file, so the later write wins, and each remembers in memory when it last read a file with the other's `key` (`otherAt`, the other's `at`), so `shared` stays `true` while that was within 30 s, even on ticks that read its own write; the panel then says "2 sessions here, showing the latest". The README spells out `normPath` and `folderKey` and the vectors, since the panel repeats them. Why writing outside the plugin root works (engine types, `$.fs`): "An absolute path is used as given; where one may go is an `fs.*` hook's to say"; `SessionInfo.configRoot` is the project's settings folder, not `~/.claude`. Not verified live: that no other plugin's `fs.*` hook denies it, `USERPROFILE` in the desktop app, and the hosted surface.

## Done when
`claude plugin test mods/puppet-monitor`

## Out of scope
The panel (SPEC-01-2). Deleting files of ended sessions: the reader ignores a file older than 30 s, and one file per folder keeps the count to the folders worked in. Honouring `CLAUDE_CONFIG_DIR`. A third session in one folder is not told apart from a second.

## Open questions
None.
