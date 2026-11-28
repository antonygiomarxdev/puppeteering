# SPEC-02-1: A tool that blinds a probe's two outputs

Status: Approved (2026-11-28)
Approval: content QKI6SS62brQa; rests on ../../requests/REQ-17-a-rule-change-is-probed-and-runs-teach.md U5aA9sWt4ur0
Rests on: ../../requests/REQ-17-a-rule-change-is-probed-and-runs-teach.md

## Summary

`tools/probe-blind.mjs` copies the output of a run with the current rules and of a run with a change into candidate-1 and candidate-2 in a random order, keeps the key beside the folder, and reveals it on request. CHK-9 runs its tests. First of four runs for REQ-17.

Last change: 2026-11-27, written from REQ-17

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- LL-1: `node tools/probe-blind.mjs <base> <change> <out>` copies the folder `<base>` to `<out>/candidate-1` or `<out>/candidate-2` and `<change>` to the other, in a random order, writes which is which to `<out>.key.json` beside `<out>`, never inside it, and prints only the two candidate paths. It exits 1 with a message when `<base>` or `<change>` is not a folder, or `<out>` exists and is not empty.
- LL-2: `node tools/probe-blind.mjs --reveal <out>` prints `candidate-1: base` and `candidate-2: change`, or the reverse, from the key file, and exits 1 with a message when the key file is missing or unreadable.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `tools/probe-blind.mjs` | Create | Pure `assign(random)` and the command: blind `<base> <change> <out>` and `--reveal <out>`, its messages and exit codes |
| `docs/CHECKS.md` | Change | Row CHK-9: `node --test tools/probe-blind.test.mjs`, and its replay |

## Reuses
- `tools/lessons-check.mjs` `MARKER`: the module next to it; same layout, an ES module with a command part guarded by the main-module test.
- Precedent: SPEC-01-1-lessons-check.md, whose test runs the command in a temporary folder with `spawnSync` and asserts exit code and output.

## Tests first
LL-1, LL-2, by the tester, in `tools/probe-blind.test.mjs`, without the implementation in view; each carries `covers: method/REQ-17/<ID>`. Cases: two folders with different files end up one in each candidate folder, byte for byte (LL-1); with `random` returning below 0.5 and then at or above it, the order flips (LL-1, via `assign`); the key file is `<out>.key.json` beside `<out>`, and `<out>` holds only `candidate-1` and `candidate-2` (LL-1); stdout names the two candidate paths and neither the word base nor change (LL-1); a missing `<base>`, a `<change>` that is a file, and an `<out>` with a file in it each exit 1 with a message and write no key (LL-1); `--reveal` prints both lines in the order the key holds (LL-2); `--reveal` with no key file, and with a key file that is not JSON, exits 1 with a message (LL-2).

## Build
```js
// tools/probe-blind.mjs (ES module, Node 20+, no dependencies)
export function assign(random = Math.random) // -> { 'candidate-1': 'base' | 'change', 'candidate-2': 'change' | 'base' }
// main only: blind copies with fs.cpSync(src, dst, { recursive: true }); key = path.resolve(out) + '.key.json'
```

## Done when
`node --test tools/probe-blind.test.mjs`

## Out of scope
The judge and the probe skill (SPEC-02-2). Keeping the key from the judge beyond writing it outside the folder: the probe skill hands the judge the `<out>` path only.

## Open questions
None.
