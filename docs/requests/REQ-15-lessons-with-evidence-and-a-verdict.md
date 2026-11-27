# REQ-15: A lesson needs evidence, and every rule change gets a verdict

Status: Accepted

## Summary

LESSONS.md takes any entry a run suggests, and a lesson can become a rule in the guide or a hook without a run that shows it helps. Rework goes down only if the rules that change are the ones that work. Take Harness2's format: every change to the rules gets a verdict (helped, hurt, no observed effect, confounded), and a lesson has a cue, the lesson, its evidence and a confidence. A lesson becomes a rule or a hook only on a contrast that is not confounded.

Last change: 2026-11-27, accepted by the owner after reading Harness2's code with the lead

## Who asked and when
The owner, 2026-11-27, after the lead read google-research/harness2.

## What they said
> Yes, it would be excellent, it is just what is missing and how we can lower rework. (Translated from Spanish.)

## The problem behind it
- An entry such as "set the owner only for an idle teammate" rests on 3 observations in one day, and it went into the rules with no run that compared the rule against its absence.
- Several rules often change in one commit; when the next run goes better, every one of them gets the credit.
- Entries mix the situation, the rule and the evidence in one paragraph, so a reader cannot tell when the lesson applies or how strong it is.

## Evidence
- LESSONS.md: 24 entries; each ends with "Rule: ..." and none has a field for evidence or confidence.
- Harness2 (github.com/google-research/harness2, harness2/core/prompts.py, `experience()`): a ledger row per changed component with verdict `helped|hurt|no observed effect|confounded`, "prefer it" when several components changed at once or one rollout is all there is; at most one lesson with `cue`, `lesson`, `evidence`, `confidence`; "A lesson resting only on confounded rows is a guess"; no contrast means `NO_ENTRY`. Also: "A defect in 1/k is noise."
- Scriptorium's [research note of 2026-11-27](https://github.com/antonygiomarxdev/scriptorium/blob/main/docs/research/2026-11-27-uber-factory-and-harness2.md).
- Unknown: how many current rules would pass this bar; the first spec audits them.

## Decision
Accepted. The rows below are what the specs build (docs/method/specs/).

- LS-1: An entry of LESSONS.md is a `## ` heading and the lines under it. Every entry above the line `<!-- Entries below use the earlier format. -->` has five lines that start, in this order, `Cue:`, `Lesson:`, `Evidence:`, `Confidence:` and `Status:`. Entries below that line are not checked, and with no such line no entry is checked.
- LS-2: `Confidence:` is followed by `high`, `medium` or `low`, then a reason. `Status:` is followed by `observed` or `adopted` and nothing else.
- LS-3: docs/retro/rule-ledger.md holds one table with the header `| ID | Date | Changed | Seen in | Verdict |`. Each ID is `RC-` and a number, used once. Each Verdict is `helped`, `hurt`, `no observed effect` or `confounded`. A missing file is an empty ledger.
- LS-4: An entry with `Status: adopted` cites in its Evidence line at least one RC-n that is in the ledger with a verdict other than `confounded`. An RC-n cited by any entry and missing from the ledger fails.
- LS-5: `node tools/lessons-check.mjs` exits 0 when LS-1 to LS-4 hold for the files in the folder it runs in, and otherwise exits 1 and prints one line per failure, `<file>: <entry heading or RC-n>: <what is wrong>`.
- LS-6: LESSONS.md states the five-field format in its opening lines, and the earlier-format line sits above its first existing entry.
- LS-7: GUIDE.md, in "Put what must hold in a hook", says a lesson becomes a rule, a RULES.md line or a hook only with `Status: adopted`, and that a change to a rule adds an RC-n row, `confounded` when more than one rule changed or one run is all there is.
- LS-8: docs/retro/rule-ledger.md opens with a summary of the verdicts and holds the ledger table with at least one row taken from a run already recorded.
