# SPEC-01-1: A hook that keeps the merge with the owner

Status: Approved (2026-11-28)
Approval: content VCOcxXLmmdx1; rests on ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md QWTa4VYG7ywI
Rests on: ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md

## Summary

A PreToolUse hook reads the project's merge setting and, under `owner`, the default, denies the calls that merge: `gh pr merge`, a push to main or master, and the merge tools. Under `auto` it allows them. CHK-10 runs its tests.

Last change: 2026-11-27, written from REQ-18

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- MG-1: A project's merge setting is the key `merge` of `.puppeteering/config.json` in the project root: `owner` or `auto`. A missing or unreadable file, a missing key or any other value means `owner`.
- MG-2: Under `owner`, a PreToolUse hook (`mods/puppet-teams/hooks/merge-gate.js`) denies a Bash command that holds `gh pr merge`, or a `git push` that names `main` or `master` as the target, and any tool whose name ends in `merge_pull_request` or `enable_pr_auto_merge`. The reason says the merge setting is owner and to give the owner the review and a merge recommendation. Under `auto` it allows them. It allows every other call, and a call it cannot parse.

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/hooks/merge-gate.js` | Create | Pure `mergeSetting(root)` and `decide(input, setting)`, and the hook: read stdin, print the deny JSON or nothing |
| `mods/puppet-teams/hooks/hooks.json` | Change | A PreToolUse entry that runs merge-gate.js the way the other entries run their scripts |
| `docs/CHECKS.md` | Change | Row CHK-10: `node --test mods/puppet-teams/hooks/merge-gate.test.js`, and its replay |

## Reuses
- `mods/puppet-teams/hooks/idle.js` `stdin`: the stdin read with a 1 s guard and silent exit on error.
- `mods/puppet-teams/hooks/inject.js` `hookSpecificOutput`: the JSON output shape.
- Precedent: SPEC-01-1-public-state-file.md, a hook with pure functions tested apart from the engine.

## Tests first
MG-1, MG-2, by the tester, in `mods/puppet-teams/hooks/merge-gate.test.js`; each carries `covers: merge/REQ-18/<ID>`. Cases: `mergeSetting` gives `owner` for no file, a file that is not JSON, no key, `"merge": "never"`, and `"owner"`; `auto` only for `"auto"` (MG-1); under owner, `gh pr merge 12 --squash`, `git push origin main`, `git push origin HEAD:master`, `git push -u origin main`, and a tool named `mcp__github__merge_pull_request` or `mcp__github__enable_pr_auto_merge` are denied with a reason naming the setting and the recommendation (MG-2); under owner, `git push origin feature/main-menu`, `git push origin claude/x`, `gh pr view 12`, `git merge origin/main` on a feature branch, and `mcp__github__get_merge_status` are allowed (MG-2); under auto the denied list is allowed (MG-2); stdin that is not JSON exits 0 with no output (MG-2); the hook run with a project folder holding the config file decides from it (MG-1).

## Build
```js
// mods/puppet-teams/hooks/merge-gate.js (CommonJS, like idle.js)
function mergeSetting(root) // -> 'owner' | 'auto'; reads path.join(root, '.puppeteering', 'config.json')
function decide(input, setting) // -> null | { reason: string }; input is the PreToolUse JSON (tool_name, tool_input.command)
// main: root = input.cwd; deny prints {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason}}
module.exports = { mergeSetting, decide }
```
A push names main or master as the target when a refspec after the remote is `main`, `master`, or ends in `:main` or `:master`.

## Done when
`node --test mods/puppet-teams/hooks/merge-gate.test.js`

## Out of scope
The reviewer's recommendation and the guide's wording (SPEC-01-2). The README (SPEC-01-3). A merge through the web UI: the hook sees only the agents' calls.

## Open questions
None.
