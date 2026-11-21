# SPEC-01-2: First changeset and a plugin version check

Status: Draft
Rests on: ../../requests/REQ-11-changesets-and-scriptorium-install.md

## Summary

One changeset for puppet-teams and a node test that fails when `package.json` and `.claude-plugin/plugin.json` carry different versions. I chose the test over a sync script: one file, nothing to wire into `changeset version`; the failure after a bump tells the person to copy the version. Second of two runs.

Last change: 2026-11-21, split after review 118

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-24 | 2026-11-20 | Changesets with npm (`npx changeset`), no Bun at the root Source: owner, 2026-11-20. | section 15 |
| D-29 | 2026-11-20 | Run `scriptorium install` in each worktree and set up changesets (npm, D-24), as an Ops task later Source: owner, 2026-11-20. | Ops task; section 15 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `.changeset/puppet-teams-agents.md` | Create | A minor changeset for puppet-teams: tester and reviewer agents |
| `mods/puppet-teams/hooks/version.test.js` | Create | Fails if the two versions differ or no changeset names puppet-teams |

## Reuses
- `mods/puppet-teams/hooks/inject.test.js` `plugin`: the node:test style and plugin root path to copy
- Precedent: SPEC-01-1-changesets-config.md, it creates the package.json files this test reads.

## Tests first
D-24 and D-29, in `mods/puppet-teams/hooks/version.test.js`, before the changeset file: `package.json` version equals `.claude-plugin/plugin.json` version; some `.changeset/*.md` (not README) has front matter naming `"puppet-teams"`.

## Build
Changeset file: front matter `"puppet-teams": minor`, body "Add tester and reviewer agents". The test reads both JSON files with `fs` and the changeset front matter with a regex.

Precondition, not part of Done: SPEC-01-1 done; `npm install` run once at the root (needs network) so `npx changeset status` works; run it by hand as an extra look.

## Done when
`node --test mods/puppet-teams/hooks/version.test.js`

## Out of scope
Config and workspace (SPEC-01-1). Syncing the version automatically after `changeset version`. puppet-monitor.

## Open questions
None.
