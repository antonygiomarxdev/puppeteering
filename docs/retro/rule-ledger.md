# Rule ledger

One row per change to a rule, a hook or a role, and what the next run showed (REQ-15). Verdicts: `helped`, `hurt`, `no observed effect`, `confounded`. Use `confounded` when more than one rule changed at once or one run is all there is: a rule rests only on a row that is not. Checked by `node tools/lessons-check.mjs`.

Summary: 1 row; helped 1, hurt 0, no observed effect 0, confounded 0.

| ID | Date | Changed | Seen in | Verdict |
|---|---|---|---|---|
| RC-1 | 2026-11 | Several teammates of one role: each task's owner set before spawning, and the task and its files named in the spawn prompt, instead of "take the lowest free task" | Before: three collisions in one run ([archived lesson](lessons/2026-11.md#2026-11-several-builders-of-one-role-duplicate-work)). After: the next run wrote 24 files with none ([#5](https://github.com/antonygiomarxdev/puppeteering/issues/5), GUIDE "The pile") | helped |
