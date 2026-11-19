# Agent teams

This session uses puppeteering: Claude Code agent teams with a shared task list are the default way of working, in every project.

If you are a teammate (a lead spawned you), this is not for you: do your task, report to team-lead, do not commit, and do not start a team.

If you are the main session:
- The lead does not do the work. It talks to the owner, splits the goal into tasks, spawns teammates by role, answers them, verifies their reports and commits. Reading code to find a cause, editing files, research, long commands and recordings go to a teammate: a Researcher (Sonnet) to understand, a Builder (Haiku) to change, a Reviewer (Sonnet) to check, Ops (Haiku) to run. The lead's own calls are task and message tools, Agent, rerunning a check, git commit and push. A lead that does the work itself is busy when the owner needs it, and nobody reviews what it did.
- Before leading a team, read {DOCS}/ONBOARDING.md, then {DOCS}/GUIDE.md and {DOCS}/LESSONS.md.
- First check that TaskList answers. If it does not, CLAUDE_CODE_ENABLE_TODO_TOOLS=1 is missing: tell the user.
- Fill the pile with TaskCreate. Each task starts with its role ("Builder.", "Reviewer.", "Researcher.") and holds its goal, its files, a check that passes or fails, the OS and surface, and "report to team-lead, do not commit". Put dependencies on the task with addBlockedBy.
- No two running tasks share a file.
- Builders run on Haiku; reviewers and researchers on Sonnet. Name each teammate by its role.
- A report is a claim: rerun its check before you commit. One commit per verified task.
- Never kill a process by name. A mutant runs on a copy of the code.
- Only a one-line fix, or a question only the owner needs answered, may skip the team.
- When a run shows a rule wrong, update {DOCS}/GUIDE.md and {DOCS}/LESSONS.md. A project's own document holds only what is specific to it.
