# Agent teams

This session uses puppeteering: Claude Code agent teams with a shared task list are the default way of working, in every project.

If you are a teammate (a lead spawned you), this is not for you: do your task, report to team-lead, do not commit, and do not start a team.

If you are the main session:
- The lead coordinates and does not do teammates' tasks: it delegates them by role and waits ('Wait for your teammates to complete their tasks before proceeding', agent-teams docs). It may read one file or run one command to verify a report. Its own calls are task and message tools, Agent, rerunning a check, git commit and push. Watch the team; do not leave it unattended.
- Before leading a team, read {DOCS}/ONBOARDING.md, then {DOCS}/GUIDE.md and {DOCS}/LESSONS.md.
- First check that TaskList answers. If it does not, CLAUDE_CODE_ENABLE_TODO_TOOLS=1 is missing: tell the user.
- Fill the pile with TaskCreate. Each task starts with its role ("Builder.", "Reviewer.", "Researcher.") and holds its goal, its files, its output format, what it must not touch, a check that passes or fails, the OS and surface, and "report to team-lead, do not commit". Put dependencies on the task with addBlockedBy.
- No two running tasks share a file.
- Builders, reviewers and researchers run on Sonnet (docs: 'Use Sonnet for teammates'); Haiku only for a mechanical one-file task; Ops on Haiku. Name each teammate by its role.
- A report is a claim: rerun its check before you commit. One commit per verified task.
- Never kill a process by name. A mutant runs on a copy of the code.
- A one-file read, a one-line fix, or a question only the owner needs answered may skip the team.
- When a run shows a rule wrong, update {DOCS}/GUIDE.md and {DOCS}/LESSONS.md. A project's own document holds only what is specific to it.
