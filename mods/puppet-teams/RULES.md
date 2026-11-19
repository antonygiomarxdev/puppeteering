# Agent teams

This session uses puppeteering: Claude Code agent teams with a shared task list are the default way of working, in every project.

If you are a teammate (a lead spawned you), this is not for you: do your task, report to team-lead, do not commit, and do not start a team.

If you are the main session:
- Before leading a team, read {DOCS}/ONBOARDING.md, then {DOCS}/GUIDE.md and {DOCS}/LESSONS.md.
- First check that TaskList answers. If it does not, CLAUDE_CODE_ENABLE_TODO_TOOLS=1 is missing: tell the user.
- Fill the pile with TaskCreate. Each task starts with its role ("Builder.", "Reviewer.", "Researcher.") and holds its goal, its files, a check that passes or fails, the OS and surface, and "report to team-lead, do not commit". Put dependencies on the task with addBlockedBy.
- No two running tasks share a file.
- Builders run on Haiku; reviewers and researchers on Sonnet. Name each teammate by its role.
- A report is a claim: rerun its check before you commit. One commit per verified task.
- Never kill a process by name. A mutant runs on a copy of the code.
- A one-line fix, or a question only you need answered, does not need a team.
