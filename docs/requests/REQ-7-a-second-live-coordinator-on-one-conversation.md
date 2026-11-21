# REQ-7: a second live coordinator on one conversation

Status: Accepted

## Summary

A resumed coordinator kept running beside its old self and both led the same pull requests. No rule yet stops a second live coordinator on one conversation. The owner said yes to this request (D-17).

Last change: 2026-11-20, written from the source named below

## Who asked and when
The owner, 2026-11-20, via the coordinator; evidence in [LESSONS.md, "2026-11: a resumed lead kept running beside its old self"](../../LESSONS.md#2026-11-a-resumed-lead-kept-running-beside-its-old-self).

## What they said
Paraphrase of the LESSONS entry above: a resumed lead kept running beside its old self, and no rule yet stops a second live lead. The owner's own answer is D-17.

## The problem behind it
Both held the same conversation, task list and worktrees. Each spawned its own builder or reviewer for the same pull request. The shared task list showed a task the coordinator had not created.

## Evidence
One run, one session, two pull requests with doubled work ([LESSONS.md, "2026-11: a resumed lead kept running beside its old self"](../../LESSONS.md#2026-11-a-resumed-lead-kept-running-beside-its-old-self)). It also enters success criterion 2 of PRODUCT section 8.

## Decision
Accepted (D-17). Two coordinators, each in its own worktree, that message each other, are fine. Once one must coordinate the other, decide which is the real coordinator. The rule goes into FRD METHOD-02, not yet written.
