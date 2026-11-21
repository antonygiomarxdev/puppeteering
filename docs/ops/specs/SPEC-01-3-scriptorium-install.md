# SPEC-01-3: Scriptorium install in the worktree

Status: Draft
Rests on: ../../requests/REQ-11-changesets-and-scriptorium-install.md

## Summary

Run `scriptorium install` so the pre-commit gate runs. `core.hooksPath` is repo config shared by every worktree, so it is set once; only `.scriptorium/pre-commit` and `.scriptorium/local` are per worktree, so run install in each. Done runs in Git Bash.

Last change: 2026-11-21, drafted

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-28 | 2026-11-20 | The scriptorium gate stays on; the project pins format 3 (migrate dry run first, then `--apply`) Source: owner, 2026-11-20. | `.scriptorium/config.json`; section 13 |
| D-29 | 2026-11-20 | Run `scriptorium install` in each worktree and set up changesets (npm, D-24), as an Ops task later Source: owner, 2026-11-20. | Ops task; section 15 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `.scriptorium/pre-commit` | Create | The hook file install writes (executable) |
| `.scriptorium/.gitignore` | Create | Ignores `local`, the path of the CLI on this machine |

## Reuses
Nothing to reuse: the scriptorium plugin `install` command (outside this repo) writes every file; nothing is written by hand.

## Tests first
D-28 and D-29: after install, `git config core.hooksPath` prints `.scriptorium`, `.scriptorium/pre-commit` exists, and `lint-docs.ts .` passes. No test file.

## Build
`bun C:/Users/anton/dev/scriptorium/scripts/cli.ts install .` from the worktree root. If core.hooksPath already points elsewhere install stops and prints the line to add; do not override it.

## Done when
`git config core.hooksPath && test -x .scriptorium/pre-commit`

## Out of scope
Changesets (SPEC-01-1, SPEC-01-2). Pinning format 3 (done by D-28). Other worktrees: run the same command in each; `core.hooksPath` is already set there.

## Open questions
None.
