# REQ-18: The owner chooses how merges happen

Status: Accepted

## Summary

The guide has the coordinator take every goal to a merged pull request, so a change can merge without the owner's review. Merging is the owner's choice, set per project: `owner`, the default, where the agents review the pull request and recommend, and the owner merges; or `auto`, where the coordinator merges once the gates and the review pass. A hook enforces the setting; a line in a document would be advice.

Last change: 2026-11-27, accepted by the owner

## Who asked and when
The owner, 2026-11-27.

## What they said
> Something I feel is not being respected is that things can be merged with or without my approval, with or without my code review. I think the question is: review the PR and tell me whether I merge it or not. Automatic merge does not make much sense to me. It should be configurable: if I do not want to review code, fine, but I should also be able to if I want. (Translated from Spanish.)

## The problem behind it
GUIDE.md, Roles: the lead "takes it to a merged pull request"; One coordinator per goal: "takes it to a merged pull request. It does not stop at a plan." Nothing stops a coordinator from merging, and no setting lets the owner keep the merge.

## Evidence
GUIDE.md lines 50 and 65. Rule 5 of the README: "What must hold goes in a hook."

## Decision
Accepted. The specs are docs/merge/specs/SPEC-01-*.

- MG-1: A project's merge setting is the key `merge` of `.puppeteering/config.json` in the project root: `owner` or `auto`. A missing or unreadable file, a missing key or any other value means `owner`.
- MG-2: Under `owner`, a PreToolUse hook (`mods/puppet-teams/hooks/merge-gate.js`) denies a Bash command that holds `gh pr merge`, or a `git push` that names `main` or `master` as the target, and any tool whose name ends in `merge_pull_request` or `enable_pr_auto_merge`. The reason says the merge setting is owner and to give the owner the review and a merge recommendation. Under `auto` it allows them. It allows every other call, and a call it cannot parse.
- MG-3: Under `owner`, the reviewer's verdict ends with `Merge: recommend` or `Merge: do not merge`, and the reasons, for the owner.
- MG-4: RULES.md and GUIDE.md say the lead takes a goal to a reviewed pull request with the merge recommendation, merges it only when the merge setting is `auto`, and under `owner` tells the owner the pull request is ready and waits.
- MG-5: The puppet-teams README documents the setting, its default and what the hook blocks.
