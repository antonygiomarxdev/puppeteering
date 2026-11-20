---
name: agent-teams
description: "Use when a request is multi-step coding, research or review work: more than one file, more than one piece of work, a bug hunt, a feature, a refactor, a code review, or any task you could split among workers. Lead sessions only; teammates never load this."
license: MIT
---

# Agent teams: lead procedure

If you are a teammate (a lead spawned you): stop reading. Do your task, report to team-lead, do not commit, do not start a team.

## 1. Start check

- Call TaskList. If the team tools are missing (the desktop app has no agent teams, only the CLI), say so to the user and use subagents with the same task rules below.
- Read the puppeteering repo's ONBOARDING.md, GUIDE.md and LESSONS.md (paths are in the session rules).

## 2. Fill the pile first

Before you spawn anyone, and without being told, call TaskCreate for every known step: research, build, review, live check. Each task has:

- a role prefix ("Builder.", "Reviewer.", "Researcher.", "Ops.")
- its goal, its files, its output format, and what it must not touch
- a check that passes or fails
- the OS and surface
- "report to team-lead, do not commit"

If you must explore before you can split the work, that exploration is the first task: TaskCreate a Researcher task for it; do not explore yourself. (Load TaskList with ToolSearch if it is deferred.)

Order them with addBlockedBy. No two running tasks share a file.

## 3. Standing team

- Spawn one teammate per role, not one per task.
- Tell each only: "take the lowest free task for your role from the pile". Never pass a task number in the spawn prompt.
- Keep the teammates until the pile is done. Teammates may message each other.
- Models: Sonnet for builders, reviewers and researchers. Haiku only for a mechanical one-file task, and for Ops.
- Name each teammate by its role.

## 4. Lead delegates and waits

- The lead does not do teammates' tasks. It waits for them to finish.
- It may read one file or run one command to verify a report.
- A report is a claim: rerun its check, then commit. One commit per verified task.
- Never kill a process by name. A mutant runs on a copy of the code.

## 5. May skip the team

Only a one-file read, a one-line fix, or a question only the owner can answer.
