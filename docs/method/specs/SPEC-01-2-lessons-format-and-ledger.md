# SPEC-01-2: The lesson format, the rule ledger and the gate in the guide

Status: Approved (2026-11-27)
Approval: content W7JGxTj3kxvA; rests on ../../requests/REQ-15-lessons-with-evidence-and-a-verdict.md pXKZVj3Q_To_
Rests on: ../../requests/REQ-15-lessons-with-evidence-and-a-verdict.md

## Summary

LESSONS.md states the five-field format and marks its existing entries as the earlier format. docs/retro/rule-ledger.md starts the ledger of rule changes with rows from runs already recorded. GUIDE.md says a lesson becomes a rule only when adopted on evidence that is not confounded. Second of two runs: `node tools/lessons-check.mjs` (SPEC-01-1) passes on the result.

Last change: 2026-11-27, the replay is an entry above the marker with a field missing, not a removed marker (LS-1 checks nothing without it)

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- LS-6: LESSONS.md states the five-field format in its opening lines, and the earlier-format line sits above its first existing entry.
- LS-7: GUIDE.md, in "Put what must hold in a hook", says a lesson becomes a rule, a RULES.md line or a hook only with `Status: adopted`, and that a change to a rule adds an RC-n row, `confounded` when more than one rule changed or one run is all there is.
- LS-8: docs/retro/rule-ledger.md opens with a summary of the verdicts and holds the ledger table with at least one row taken from a run already recorded.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `LESSONS.md` | Change | The format in its opening lines and the earlier-format marker above the first entry; stays within CHK-4's 180 lines |
| `docs/retro/rule-ledger.md` | Create | A summary of the verdicts and the ledger table, rows taken from runs LESSONS.md and the issues already record |
| `GUIDE.md` | Change | In "Put what must hold in a hook": the adopted-lesson gate and the RC-n row; stays within CHK-5's 220 lines |

## Reuses
- `docs/retro/lessons/2026-11.md` `owner`: "several builders of one role duplicate work" collided three times; assigned by name, the next run wrote 24 files with none (GUIDE "The pile", issue #5). The ledger's first row records that contrast as `helped`.
- Precedent: SPEC-01-1-lessons-check.md, which defines `MARKER`; the marker line is copied from `tools/lessons-check.mjs`, not retyped.

## Tests first
LS-6, LS-7, LS-8 are documents: the done command is their test. `node tools/lessons-check.mjs` must pass on the real files, and fail on a copy of LESSONS.md with one entry above the marker that lacks a field.

## Build
LESSONS.md, under its first paragraph: one line naming the five fields and what each holds (Cue: the shape of the situation, not this run's facts; Lesson: an operation on a named rule, hook or role; Evidence: the runs and RC-n rows; Confidence: high, medium or low, and why; Status: observed or adopted), then the marker. The ledger: a summary line, then `| ID | Date | Changed | Seen in | Verdict |`. GUIDE.md: two sentences, LS-7's words.

## Done when
`node tools/lessons-check.mjs`

## Out of scope
The check itself (SPEC-01-1). Rewriting old entries. REQ-16's move of rules into skills.

## Open questions
None.
