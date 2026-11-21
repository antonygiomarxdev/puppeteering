# SPEC-01-1: Changesets workspace and config

Status: Approved (2026-11-21)
Approval: content xVn4CGCIilk-; rests on ../../requests/REQ-11-changesets-and-scriptorium-install.md -7r3Kd275stH
Rests on: ../../requests/REQ-11-changesets-and-scriptorium-install.md

## Summary

The npm workspace and changesets config: a root `package.json` with `workspaces: ["mods/*"]`, a `package.json` for puppet-teams so changesets can version it, and `.changeset/config.json`. First of two runs; the changeset itself is SPEC-01-2.

Last change: 2026-11-21, approved by the owner

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-24 | 2026-11-20 | Changesets with npm (`npx changeset`), no Bun at the root Source: owner, 2026-11-20. | section 15 |
| D-29 | 2026-11-20 | Run `scriptorium install` in each worktree and set up changesets (npm, D-24), as an Ops task later Source: owner, 2026-11-20. | Ops task; section 15 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `package.json` | Create | Private root, `workspaces: ["mods/*"]`, devDependency `@changesets/cli`, script `changeset` |
| `mods/puppet-teams/package.json` | Create | `private: true`, name `puppet-teams`, version equal to `.claude-plugin/plugin.json` (0.3.2) |
| `.changeset/config.json` | Create | Changesets config, baseBranch main, access restricted |

## Reuses
Nothing to reuse: the repo has no package.json or .changeset yet (ls at the repo root).

## Tests first
D-24 and D-29, no test file: the Done command is the proof. It runs offline and does not need `npm install`.

## Build
Write the three files by hand (no `npm install` here, so no lockfile yet; SPEC-01-2 states the install as its precondition). `mods/puppet-monitor` is not a workspace member: it has no package.json and a fourth file would break the 3-file cap.

## Done when
`node -e "const j=f=>JSON.parse(require('fs').readFileSync(f,'utf8'));const p=j('package.json');if(p.workspaces.join()!=='mods/*'||!p.devDependencies['@changesets/cli'])process.exit(1);const t=j('mods/puppet-teams/package.json');if(t.name!=='puppet-teams'||!t.private||t.version!==j('mods/puppet-teams/.claude-plugin/plugin.json').version)process.exit(1);j('.changeset/config.json')"`

## Out of scope
The changeset and the version check (SPEC-01-2). puppet-monitor as a workspace member (one more package.json, a later spec). Publishing and CI release jobs.

## Open questions
None.
