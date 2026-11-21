# REQ-2: agent teams in the desktop app

Status: Open

## Summary

In the desktop app, named agents ran as subagents with no task tools, so no one could claim a task. The request: say what the app supports and what to do there. The desktop page says agent teams are CLI only; the desktop path is a requirement the platform does not meet (D-16).

Last change: 2026-11-20, written from the source named below

## Who asked and when
The owner, 2026-11-18, GitHub issue #8.

## What they said
> Agent teams are built for the terminal (TUI): in-process teammates or split panes, a shared task list, and messages between teammates. A run in the Claude desktop app (Code tab) did not behave like that. This is probably how the app works, not a Claude Code bug, so the guide should say what to do in the app.

## The problem behind it
Four agents had no Task tool and two took the same task. SendMessage to team-lead failed; they reached the coordinator as main.

## Evidence
One run on Windows 11, desktop app, Claude Code 2.1.327 on the same machine. The desktop page (https://code.claude.com/docs/en/desktop, read 2026-11-20) agrees: agent teams are available in the CLI, not in Desktop.

## Decision
The issue is closed with the GUIDE section "In the desktop app". The owner wants the desktop app to work (D-16, UC-8); how, without agent teams, is open for FRD METHOD-05.
