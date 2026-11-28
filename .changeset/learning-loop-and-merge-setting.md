---
---

The learning loop: a rule change is probed blind (tools/probe-blind.mjs, the judge agent, the probe skill) before it is adopted, and every pile ends with a reflector that writes at most one observed lesson (REQ-17). Merging is the owner's choice per project: `.puppeteering/config.json` with `"merge": "owner"` (the default) or `"auto"`, enforced by a PreToolUse hook; the reviewer ends with a merge recommendation (REQ-18).
