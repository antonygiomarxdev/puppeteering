---
name: probe
description: Probe a change to a rule before it is adopted - the same task run with the current rules and with the change, at least 2 runs a side, judged blind, recorded as an RC-n row of the rule ledger. Use before changing RULES.md, a hook, a role, an agent definition or a guide rule.
---

# Probe a rule change (REQ-17)

A rule change is adopted on evidence, not on a hunch: one run decides nothing, and a judge who knows which version is new sees what they expect.

## Steps

1. **Write the change.** One rule only: a RULES.md line, a hook, a role, an agent definition or a guide rule. Two rules changed at once give a confounded row.
2. **Pick a real task.** One task the team really runs, with a brief and a check. Use the same brief for both sides.
3. **Run it at least 2 runs a side.** Each run in its own worktree: the current rules on one side, the change on the other, identical prompts except the change. Save each run's output folder.
4. **Blind each pair.** For each pair, one current run and one change run: `node tools/probe-blind.mjs <current-output> <change-output> <out>`. Hand the judge only `<out>`; the key stays beside it, unread.
5. **Judge each pair.** Spawn the judge (`agents/judge.md`) with the `<out>` path and the brief. Keep its verdict and notes.
6. **Reveal.** `node tools/probe-blind.mjs --reveal <out>` for each pair, after the judge has answered.
7. **Record.** Add an RC-n row to the rule ledger, `docs/retro/rule-ledger.md`: the date, the change, the runs it was seen in, and the verdict below. Then `node tools/lessons-check.mjs`.

## Verdict

| Verdict | When |
|---|---|
| helped | the judge picked the change in every pair |
| hurt | the judge picked the current rules in every pair |
| no observed effect | the judge called every pair equal |
| confounded | the picks are mixed, more than one rule changed, or fewer than 2 runs a side |

A lesson becomes `Status: adopted`, and its rule enters the guide, RULES.md or a hook, only on an RC-n row that is not confounded (REQ-15).
