# REQ-1: several teammates of one role collide

Status: Open

## Summary

Several teammates of one role took the same task and wrote the same file, three times in one run, even after the coordinator set owners. The request: set owners before spawning, check that an output file does not exist, and tell a teammate to skip owned tasks.

Last change: 2026-11-20, written from the source named below

## Who asked and when
The owner, 2026-11-18, GitHub issue #5 and its two follow-up comments.

## What they said
> - With several teammates of one role, set each task's owner by name **before** spawning them. Reassigning mid-run does not prevent collisions, because messages arrive late.
> - A teammate checks that its task's output file does not exist before writing a new one, and stops if it does.

In a follow-up comment on the same issue:

> A teammate that may self-claim also needs to be told to skip tasks with any owner, or be stopped when its named tasks are done.

## The problem behind it
Two researchers claimed task 1 at the same moment and the second write replaced the first. An owner set afterwards did not stop a claim either. Open in the issue: whether TaskUpdate claiming is atomic.

## Evidence
Seven tasks, one file each, one run (Claude Code 2.1.327, Windows 11): three collisions. A Workflow with each agent's file fixed in its prompt ran 7 of 7 with 0 collisions in about 84 s. One run only.

## Decision
Not decided here. Issue #5 is closed through pull request #6; the rules it produced are in GUIDE, "The pile". Whether the request is met is for the owner to say.
