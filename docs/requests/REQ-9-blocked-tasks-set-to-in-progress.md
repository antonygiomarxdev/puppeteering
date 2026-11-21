# REQ-9: blocked tasks set to in progress

Status: Open

## Summary

Teammates set tasks to in_progress while their blockedBy was still set, so a builder and a reviewer started before the tester they depended on. The request: tell spawned teammates that a task with an open blocker is not free, and check the pile once after spawning.

Last change: 2026-11-20, written from GitHub issue #13

## Who asked and when
The owner, 2026-11-20, GitHub issue #13.

## What they said
> Spawn prompts say in one line: "a task whose blockedBy is not empty is not free, even if it looks idle". The lead checks the pile once right after spawning.

## The problem behind it
The pile showed a builder task, a reviewer task and the tester task all in_progress; TaskGet still showed blockedBy. After the lead set them back to pending and sent one message, both waited. Related to REQ-4 (issue #10): there a block cleared too early, here it was set and ignored.

## Evidence
One run, scriptorium, 2026-11-20, right after the pile was created. Not repeated.

## Decision
Open. The idle hook in puppet-teams 0.3.2 (not merged) asks a teammate to set such a task back to pending, and RULES.md says so. The spawn-prompt line from the issue is not written. GUIDE, "The pile" cites this issue.
