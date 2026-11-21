# REQ-10: a tester role before the builder

Status: Open

## Summary

A report from three runs on one codebase: a separate tester who wrote the tests first left fewer surviving mutants than a builder who wrote its own. The request: make the tester a standing role for any spec-driven pile. The owner decides.

Last change: 2026-11-20, written from GitHub issue #16

## Who asked and when
The owner, 2026-11-20, GitHub issue #16.

## What they said
> Make the tester a standing role in GUIDE.md for any spec-driven pile: tester task, then builder task blocked by it, then review blocked by the build. Reviews log each surviving mutant against the step that should have caught it.

## The problem behind it
Without a tester, a builder writes the tests and the reviews find more surviving mutants and more edits outside the spec. The issue gives the counts per run.

## Evidence
Three runs on the same codebase, 2026-11-20: builder-written tests, 8 surviving mutants; tester first, 5 and then 2. The issue says 17 of 24 logged findings were examples the spec lacked. One codebase, so not shown beyond it.

## Decision
Open: the owner decides whether the guide gets a tester role. Nothing is added to GUIDE for it.
