# REQ-12: a panel for the herdr desktop app

Status: Accepted

## Summary

A read-only panel for the Herdr desktop app, `mods/puppet-herdr/`. It lists the Claude Code agents herdr runs, with the status herdr reports, and for each its session's open tasks and alerts from puppet-monitor. The owner accepted it on 2026-11-22 (D-33).

Last change: 2026-11-22, written from the owner's answers to the research of task 149

## Who asked and when
The owner, 2026-11-22, through the lead: "armate un mod para herdr". After the research of task 149 they chose the Herdr desktop app and its option B.

## What they said
> armate un mod para herdr

Answers of 2026-11-22: the target is the Herdr desktop app (GPUI mods in `~/.config/herdr-app`); an agents panel fed by puppet-monitor (status from herdr, tasks and alerts from the monitor); the mod lives in this repo as `mods/puppet-herdr/`; Windows first, macOS and Linux if they work at no extra cost.

## The problem behind it
The owner runs agents in herdr panes. herdr shows each pane as working, blocked or idle, and nothing of what the session's task list says or whether an agent loops. The office shows that in a browser, away from the panes (D-2: know what each agent does without asking the lead).

## Evidence
One owner, one machine (Windows 11, Herdr app on disk under `~/.config/herdr-app`). The mod API reads `agents()`, `panes()` (with `cwd`) and files in home: `herdr.d.ts` and `AGENTS.md` in that folder. Not run: no mod was loaded in the app yet.

## Decision
Accepted (D-33). Answered by `docs/herdr/specs/SPEC-01-1-public-state-file.md`, `SPEC-01-2-herdr-panel-mod.md` and `SPEC-01-3-install-the-mod.md`.
