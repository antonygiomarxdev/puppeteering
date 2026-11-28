# SPEC-01-2: The reviewer recommends, the lead waits

Status: Approved (2026-11-28)
Approval: content b9xBAcQ1mEkq; rests on ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md r4fanrF5I0UZ
Rests on: ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md

## Summary

Under `owner` the reviewer's verdict ends with a merge recommendation for the owner; RULES.md and GUIDE.md say the lead takes a goal to a reviewed pull request and merges only under `auto`.

Last change: 2026-11-27, written from REQ-18

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- MG-3: Under `owner`, the reviewer's verdict ends with `Merge: recommend` or `Merge: do not merge`, and the reasons, for the owner.
- MG-4: RULES.md and GUIDE.md say the lead takes a goal to a reviewed pull request with the merge recommendation, merges it only when the merge setting is `auto`, and under `owner` tells the owner the pull request is ready and waits.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/agents/reviewer.md` | Change | In Verdict: under owner, a last line `Merge: recommend` or `Merge: do not merge` with the reasons |
| `mods/puppet-teams/RULES.md` | Change | One line: merge only when `.puppeteering/config.json` says auto; otherwise tell the owner the reviewed pull request is ready and wait |
| `GUIDE.md` | Change | Roles (Lead row) and One coordinator per goal: a reviewed pull request, merged only under auto; stays within CHK-5's 220 lines |

## Reuses
- `mods/puppet-teams/agents/reviewer.md` `Verdict`: the section the line joins.
- Precedent: SPEC-01-2-reviewer-agent.md.

## Tests first
MG-3, MG-4, in `mods/puppet-teams/agents/agents.test.js` and `mods/puppet-teams/hooks/inject.test.js`; each carries `covers: merge/REQ-18/<ID>`. Cases: reviewer.md holds `Merge: recommend` and `Merge: do not merge` (MG-3); the injected rules hold `.puppeteering/config.json`, auto and "wait" (MG-4); GUIDE.md no longer holds "takes it to a merged pull request" and holds "merge setting" (MG-4).

## Build
Text only.

## Done when
`node --test mods/puppet-teams/agents/agents.test.js mods/puppet-teams/hooks/inject.test.js`

## Out of scope
The hook (SPEC-01-1). The README (SPEC-01-3).

## Open questions
None.
