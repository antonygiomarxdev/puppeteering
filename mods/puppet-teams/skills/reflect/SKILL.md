---
name: reflect
description: Turn a finished run into at most one observed lesson. Use when a goal's pull request is merged or closed, as the last task of the pile, owned by the reflector.
---

# Reflect on a run (REQ-17)

Every pile ends with a task "Reflect.", owned by the reflector (`agents/reflector.md`) and blocked by the goal's last task. It runs once the goal's pull request is merged or closed, so learning does not depend on someone remembering.

The reflector:

- reads the run: the tasks, the reports, the review findings and the rule ledger;
- looks for a contrast the run shows, and writes at most one LESSONS.md entry, or none when there is no contrast;
- writes the five lines in order (Cue, Lesson, Evidence, Confidence, Status) with `Status: observed`, above the earlier-format marker;
- never writes `Status: adopted` and never edits a rule: a lesson is adopted only through the probe skill, on a rule-ledger row that is not confounded;
- runs `node tools/lessons-check.mjs` and reports its result.
