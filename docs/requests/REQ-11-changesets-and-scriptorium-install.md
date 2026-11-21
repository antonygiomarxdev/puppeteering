# REQ-11: changesets and scriptorium install

Status: Accepted

## Summary

Set up changesets with npm and run `scriptorium install` in each worktree, so a user-visible change carries a changeset and the pre-commit gate runs. The owner accepted it as an Ops task (D-29).

Last change: 2026-11-21, drafted from D-29 so the two ops specs have an accepted request to rest on

## Who asked and when
The owner, 2026-11-20, in the decisions that became D-28 and D-29.

## What they said
> Run `scriptorium install` in each worktree and set up changesets (npm, D-24), as an Ops task later

## The problem behind it
The repository has no root package.json or .changeset, and no worktree has the scriptorium hook installed, so neither check runs at commit.

## Evidence
Unknown beyond the decision: `ls` at the repo root shows no package.json and no .changeset.

## Decision
Accepted by the owner on 2026-11-20 (D-29). Answered by docs/ops/specs/SPEC-01-1-changesets-config.md, SPEC-01-2-changeset-and-version-check.md and SPEC-01-3-scriptorium-install.md.
