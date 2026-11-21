# REQ-4: dependency clears when the task completes

Status: Open

## Summary

A task blocked by another cleared when the blocker completed, not when its pull request merged, so two pull requests were built on the wrong base. The request: block on a merge step, not on the build task.

Last change: 2026-11-20, written from the source named below

## Who asked and when
The owner, 2026-11-19, GitHub issue #10.

## What they said
> A task's completion means "PR open", not "code on main". When a dependency needs another task's code on the base branch, block on a merge step:
> - create a lead-owned task "Lead. Merge PR N" when a PR opens;
> - block the dependent tasks on that merge task, not on the build task.

## The problem behind it
The builder marked task 118 completed when it opened the pull request, which cleared the block on task 128. Two builders then built on main without 118's code.

## Evidence
One run on another project, 2026-11-19: 3 Haiku builders, 2 Sonnet reviewers, 16 refactor tasks, two pull requests on the wrong base.

## Decision
Open. Issue #10 is open. A rule for GUIDE, "The pile", and FRD METHOD-02 is not written.
