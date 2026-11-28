# SPEC-01-3: The README explains the merge setting

Status: Approved (2026-11-28)
Approval: content 46e9k2Ufcp6a; rests on ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md r4fanrF5I0UZ
Rests on: ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md

## Summary

The puppet-teams README gets a section on the merge setting: the file, the two values, the default, what the hook blocks and cannot see, and how to turn on GitHub branch protection, the real gate.

Last change: 2026-11-28, MG-5 amended by the owner: what the hook cannot see, and branch protection as the real gate

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- MG-5: The puppet-teams README documents the setting, its default, what the hook blocks and what it cannot see (variables, git aliases, the API from other programs), and how to turn on GitHub branch protection that requires the owner's approval, which is the real gate.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/README.md` | Change | Section "Merge setting": `.puppeteering/config.json`, owner and auto, owner by default, what the hook denies and cannot see, and the GitHub branch protection steps |

## Reuses
- `mods/puppet-teams/README.md` `Turn it off`: the section style this one follows.
- Precedent: SPEC-01-3-install-the-mod.md, a README section shipped with its feature.

## Tests first
MG-5, in `mods/puppet-teams/hooks/merge-gate.test.js`: the tester's test (a "Merge setting" heading, `.puppeteering/config.json`, owner, auto, `gh pr merge`), and one added for the amended row: "cannot see", variable, alias, branch protection, "require approvals", "require a pull request before merging".

## Build
Text only.

## Done when
`node --test mods/puppet-teams/hooks/merge-gate.test.js`

## Out of scope
Anything beyond the README.

## Open questions
None.
