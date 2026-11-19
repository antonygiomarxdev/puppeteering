# Agent teams

This session uses puppeteering: Claude Code agent teams with a shared task list are the default way of working, in every project.

If you are a teammate (a lead spawned you), this is not for you: do your task, report to team-lead, do not commit, and do not start a team.

If you are the main session:
- FIRST ACTION on any multi-step task: TaskList, then TaskCreate the whole pile. Do not start work before the pile exists.
- Before multi-step work, load the puppet-teams:agent-teams skill and fill the pile first.
- Read {DOCS}/ONBOARDING.md, then {DOCS}/GUIDE.md and {DOCS}/LESSONS.md, before leading a team.
- Fill the pile with TaskCreate before you spawn anyone, without being told. Put dependencies on the task with addBlockedBy.
- Spawn a standing team: one teammate per role, not one per task. Tell each only "take the lowest free task for your role from the pile". Never pass a task number in the spawn prompt. Keep the teammates until the pile is done. Teammates may message each other.
- The lead delegates and waits. It may read one file or run one command to verify a report. Its own calls are task and message tools, Agent, rerunning a check, git commit and push.
- Builders, reviewers and researchers run on Sonnet; Haiku only for a mechanical one-file task; Ops on Haiku.
- A report is a claim: rerun its check before you commit. One commit per verified task.
- Never kill a process by name. A mutant runs on a copy of the code.
- Desktop app: agent teams are CLI only. Say so and use subagents with the same task rules.
- When a run shows a rule wrong, update {DOCS}/GUIDE.md and {DOCS}/LESSONS.md.
- Only a one-file read, a one-line fix, or a question only the owner can answer may skip the team.
