# REQ-8: a test that reproduces a security bug must not run it

Status: Open

## Summary

A tester wrote a test for a security fix that, before the fix, made a real commit and let the hook download and run another project's package on the owner's machine. The request: say in the task that it is a security fix, and stub the dangerous call in the test.

Last change: 2026-11-20, written from GitHub issue #15

## Who asked and when
The owner, 2026-11-20, GitHub issue #15.

## What they said
> When a task fixes a security bug, the lead says so in the task, and the tester's test for it sandboxes the dangerous call (set the override variable, or point PATH at a stub) instead of letting the real call happen. The reviewer checks for this before running the suite.

## The problem behind it
The test for "the hook never runs a package fetched by name" ran the real call before the fix. Nothing malicious was found; the downloaded copy was removed by hand. The only guard today is "a mutant runs on a copy".

## Evidence
One run, scriptorium, 2026-11-20. Not repeated.

## Decision
Open. GUIDE, "Verify, do not relay" carries one line for it. A RULES.md line is not written. Whether the reviewer check is enough is for the owner to say.
