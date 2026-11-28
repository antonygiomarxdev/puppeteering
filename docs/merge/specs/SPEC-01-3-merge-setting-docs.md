# SPEC-01-3: The README explains the merge setting

Status: Approved (2026-11-28)
Approval: content HzrtZYQjmTXV; rests on ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md QWTa4VYG7ywI
Rests on: ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md

## Summary

The puppet-teams README gets a section on the merge setting: the file, the two values, the default, and what the hook blocks.

Last change: 2026-11-27, written from REQ-18

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- MG-5: The puppet-teams README documents the setting, its default and what the hook blocks.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/README.md` | Change | Section "Merge setting": `.puppeteering/config.json`, owner and auto, owner by default, the calls the hook denies |

## Reuses
- `mods/puppet-teams/README.md` `Turn it off`: the section style this one follows.
- Precedent: SPEC-01-3-install-the-mod.md, a README section shipped with its feature.

## Tests first
MG-5, in `mods/puppet-teams/hooks/merge-gate.test.js`, carrying `covers: merge/REQ-18/MG-5`: the README holds a "Merge setting" heading, `.puppeteering/config.json`, owner, auto and `gh pr merge`.

## Build
Text only.

## Done when
`node --test mods/puppet-teams/hooks/merge-gate.test.js`

## Out of scope
Anything beyond the README.

## Open questions
None.
