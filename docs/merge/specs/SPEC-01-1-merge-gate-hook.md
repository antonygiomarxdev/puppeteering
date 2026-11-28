# SPEC-01-1: A hook that keeps the merge with the owner

Status: Approved (2026-11-28)
Approval: content 5vJGmnfHby5-; rests on ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md r4fanrF5I0UZ
Rests on: ../../requests/REQ-18-the-owner-chooses-how-merges-happen.md

## Summary

A PreToolUse hook reads the project's merge setting and, under `owner`, the default, denies a Bash command by a coarse word rule (push with main or master, merge with gh or pulls) and the merge tools, asking for a command that only mentions the words to be rewritten. Under `auto` it allows them. CHK-10 runs its tests.

Last change: 2026-11-28, MG-2 amended by the owner to a coarse word rule after four reviews of the shell parser

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows

- MG-1: A project's merge setting is the key `merge` of `.puppeteering/config.json` in the project root: `owner` or `auto`. A missing or unreadable file, a missing key or any other value means `owner`.
- MG-2: Under `owner`, a PreToolUse hook (`mods/puppet-teams/hooks/merge-gate.js`) denies a Bash command whose text, in lower case, with `${IFS}` and `$IFS` read as spaces and quotes, backslashes, braces, commas and `$` removed, holds the word `push` and the word `main` or `master`, or the word `merge` and the word `gh` or `pulls`, where a word is a run of letters, digits, `_`, `-` and `.`; and any tool whose name ends in `merge_pull_request` or `enable_pr_auto_merge`. It reads no shell syntax, so a command that only mentions those words is denied too. The reason says the merge setting is owner, to give the owner the review and a merge recommendation, and to rewrite a command that only mentions those words. Under `auto` it allows them. It allows every other call, and input that is not JSON.

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
MG-1, MG-2. The tester's tests (commit 3632deb) stand: `mergeSetting` for each file case; the merge calls denied under owner with a reason naming the setting and the recommendation; the everyday calls allowed; under auto all allowed; stdin that is not JSON allowed; the hook run with a project folder. Added for the amended MG-2, in `mods/puppet-teams/hooks/merge-gate.test.js`: push with main or master denied in shell forms (an absolute git path, `--config-env`, `bash -c`, quoted `$( )`, `<( )`, `$'main'`, braces, backslashes, `${IFS}`, a variable, xargs, a heredoc before the push, `&>`); gh or pulls with merge denied (`--repo`, `-R`, a line continuation, quotes, `gh api` and `curl` to `pulls/<n>/merge`); a command that only mentions the words denied with a reason that says to rewrite it; everyday commands allowed (a push to a feature branch, `main-fix`, `git log main`, `git merge origin/main`, `main.js`, `gh pr view`, a longer word that starts with merge, 200 000 characters of text); a long command judged in under 2 s; the hooks.json launch path; the root from `CLAUDE_PROJECT_DIR`.

## Build
```js
// mods/puppet-teams/hooks/merge-gate.js (CommonJS, like idle.js)
function mergeSetting(root) // -> 'owner' | 'auto'; reads path.join(root, '.puppeteering', 'config.json')
function decide(input, setting) // -> null | { reason: string }; input is the PreToolUse JSON (tool_name, tool_input.command)
function run() // reads stdin; root = CLAUDE_PROJECT_DIR || input.cwd; deny prints {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason}}
module.exports = { mergeSetting, decide, run }
```
The words of a command: lower case, `${IFS}` and `$IFS` read as spaces, quotes, backslashes, braces, commas and `$` removed, then split on anything but letters, digits, `_`, `-` and `.`. No shell parsing.

## Done when
`node --test mods/puppet-teams/hooks/merge-gate.test.js`

## Out of scope
The reviewer's recommendation and the guide's wording (SPEC-01-2). The README (SPEC-01-3). A merge through the web UI: the hook sees only the agents' calls.

## Open questions
None.
