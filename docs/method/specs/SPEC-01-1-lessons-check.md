# SPEC-01-1: A check that holds lessons to evidence

Status: Approved (2026-11-27)
Approval: content 2KIgzG4SUlue; rests on ../../requests/REQ-15-lessons-with-evidence-and-a-verdict.md pXKZVj3Q_To_
Rests on: ../../requests/REQ-15-lessons-with-evidence-and-a-verdict.md

## Summary

A Node script, `tools/lessons-check.mjs`, that checks the five-field lesson format in LESSONS.md and the rule ledger in docs/retro/rule-ledger.md, and refuses an adopted lesson whose evidence is only confounded. CHK-8 runs it. First of two runs; SPEC-01-2 writes the documents it checks.

Last change: 2026-11-27, written from REQ-15

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- LS-1: An entry of LESSONS.md is a `## ` heading and the lines under it. Every entry above the line `<!-- Entries below use the earlier format. -->` has five lines that start, in this order, `Cue:`, `Lesson:`, `Evidence:`, `Confidence:` and `Status:`. Entries below that line are not checked, and with no such line no entry is checked.
- LS-2: `Confidence:` is followed by `high`, `medium` or `low`, then a reason. `Status:` is followed by `observed` or `adopted` and nothing else.
- LS-3: docs/retro/rule-ledger.md holds one table with the header `| ID | Date | Changed | Seen in | Verdict |`. Each ID is `RC-` and a number, used once. Each Verdict is `helped`, `hurt`, `no observed effect` or `confounded`. A missing file is an empty ledger.
- LS-4: An entry with `Status: adopted` cites in its Evidence line at least one RC-n that is in the ledger with a verdict other than `confounded`. An RC-n cited by any entry and missing from the ledger fails.
- LS-5: `node tools/lessons-check.mjs` exits 0 when LS-1 to LS-4 hold for the files in the folder it runs in, and otherwise exits 1 and prints one line per failure, `<file>: <entry heading or RC-n>: <what is wrong>`.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `tools/lessons-check.mjs` | Create | Pure `checkLessons`, `parseLedger` and `checkLedger`, and the command that reads the two files in its working folder and sets the exit code |
| `docs/CHECKS.md` | Change | Row CHK-8: the command `node tools/lessons-check.mjs`, and its replay |

## Reuses
- Precedent: SPEC-01-3-install-the-mod.md, whose `mods/puppet-herdr/install.test.js` runs a script in a temporary folder with `spawnSync` and asserts its exit code and output; the command test here does the same.
- `docs/CHECKS.md` `CHK-4`: the row shape (Prevents, Command, Replay) CHK-8 follows.

## Tests first
LS-1, LS-2, LS-3, LS-4, LS-5, by the tester, in `tools/lessons-check.test.mjs`, without the implementation in view; each test carries `covers: method/REQ-15/<ID>`. Cases: an entry above the marker with all five lines passes, one missing `Evidence:` fails, one with the five in another order fails, an entry below the marker with none passes, a file with no marker passes (LS-1); `Confidence: high, two runs` passes, `Confidence: sure` fails, `Status: adopted` and `Status: observed` pass, `Status: adopted later` fails (LS-2); a ledger with a wrong header fails, one id used twice fails, an id that is not `RC-` and a number fails, Verdict `maybe` fails, each of the four verdicts passes, no file passes (LS-3); adopted citing a row whose verdict is `helped` passes, adopted citing only a `confounded` row fails, adopted citing no row fails, observed citing an id absent from the ledger fails (LS-4); the command in a temporary folder exits 0 on good files and 1 on a bad entry, printing `LESSONS.md: <heading>: <what>` (LS-5).

## Build
```js
// tools/lessons-check.mjs (ES module, Node 20+, no dependencies)
export const MARKER = '<!-- Entries below use the earlier format. -->'
export const VERDICTS = ['helped', 'hurt', 'no observed effect', 'confounded']
export function parseLedger(text) // -> { rows: [{ id, date, changed, seenIn, verdict }], errors: string[] }
export function checkLedger(text) // -> string[] lines '<file>: RC-n: <what>'
export function checkLessons(lessonsText, ledgerRows) // -> string[] lines 'LESSONS.md: <heading>: <what>'
// main, only when run directly: read LESSONS.md and docs/retro/rule-ledger.md (missing ledger = ''),
// print every failure on its own line, process.exit(failures.length ? 1 : 0)
```
A field line is the first line under the heading that starts with that field name and a colon; the five must appear in order, other lines may sit between them.

## Done when
`node --test tools/lessons-check.test.mjs`

## Out of scope
The LESSONS.md header, the ledger's first rows and the GUIDE rule: SPEC-01-2. Rewriting old entries into the new format. Checking that a cited run or issue exists.

## Open questions
None.
