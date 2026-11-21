# SPEC-01-4: The version test holds after a release, plus lockfile and gitignore

Status: Approved (2026-11-21)
Approval: content JYToJQFhLyfQ; rests on ../../requests/REQ-11-changesets-and-scriptorium-install.md -7r3Kd275stH
Rests on: ../../requests/REQ-11-changesets-and-scriptorium-install.md

## Summary

After `npx changeset version` consumes the changesets, the SPEC-01-2 test fails ("a changeset names puppet-teams"), so main would be red after every release. The test now passes when a pending changeset names puppet-teams or the newest CHANGELOG version equals the package version. It also checks that the lockfile pins `@changesets/cli` and that `.gitignore` ignores `node_modules/`. Fourth of four ops runs.

Last change: 2026-11-21, approved by the owner

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-24 | 2026-11-20 | Changesets with npm (`npx changeset`), no Bun at the root Source: owner, 2026-11-20. | section 15 |
| D-29 | 2026-11-20 | Run `scriptorium install` in each worktree and set up changesets (npm, D-24), as an Ops task later Source: owner, 2026-11-20. | Ops task; section 15 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/hooks/version.test.js` | Change | The release check and the lockfile and gitignore checks |
| `package-lock.json` | Change | Pins `@changesets/cli`; written by `npm install` (precondition), never by hand |
| `.gitignore` | Change | A line `node_modules/` |

## Reuses
- `mods/puppet-teams/hooks/version.test.js` `readJson`: reads the JSON files, kept
- Precedent: SPEC-01-2-changeset-and-version-check.md, it created this test; this run replaces its changeset case.

## Tests first
D-24 and D-29, written before the code by the tester, in `mods/puppet-teams/hooks/version.test.js`. Each carries `covers: ops/REQ-11/D-24` or `D-29`. The release rule is a pure function `releaseRecorded(changesetDir, changelogPath, version)` in the test file, tested on temp dirs: a pending `.changeset/*.md` (not README) naming `puppet-teams` in its front matter returns true; no such file but the first `## <version>` heading of the CHANGELOG equals `version` returns true; neither returns false (a failing case). Then on the real repo: `releaseRecorded` is true for `mods/puppet-teams/package.json`; `package-lock.json` lists `node_modules/@changesets/cli`; `.gitignore` has a line `node_modules/`.

## Build
```js
function releaseRecorded(changesetDir, changelogPath, version) { /* boolean */ }
```
Replace the SPEC-01-2 case "a changeset names puppet-teams" by a call to it. The CHANGELOG is optional: a missing file counts as no match. Precondition, not part of Done: `npm install` at the root (needs network) has written `package-lock.json`.

## Done when
`node --test mods/puppet-teams/hooks/version.test.js`

## Out of scope
Syncing the version after `changeset version`: the version-equality case from SPEC-01-2 stays and tells the person to copy it. puppet-monitor.

## Open questions
None.
