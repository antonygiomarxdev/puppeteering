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
Accepted. To specify:
- LESSONS.md entries take four fields: Cue (the shape of the situation, not this run's facts), Lesson (an operation on a named rule, hook or role), Evidence (the runs and the contrast), Confidence (high, medium, low, and why). Old entries stay as they are, marked as the earlier format.
- A ledger of rule changes: one row per changed rule, hook or role, with what changed, what the next run showed, and the verdict. `confounded` whenever more than one rule changed or one run is all there is.
- The gate: a rule enters the guide, RULES.md or a hook only on a lesson whose evidence holds at least one row that is not `confounded`. An observation seen once stays in LESSONS.md as observed.
