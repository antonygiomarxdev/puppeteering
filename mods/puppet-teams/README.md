# puppet-teams

puppet-teams injects the agent-teams rules at session start, adds a short reminder to each work prompt in the main session, and sends an idle teammate back to its open task (TeammateIdle).

It runs on `SessionStart` (startup, resume, clear, compact). It reads `RULES.md` and adds it as context. When the repo has `ONBOARDING.md`, the rules point to the local files; otherwise they point to the GitHub copy.

## Skill and reminder

The `agent-teams` skill holds the lead procedure: fill the task pile first, then spawn a standing team with one teammate per role. `hooks/remind.js` runs on `UserPromptSubmit` in the main session only (never for a teammate) and tells the model to load that skill for multi-step work. `hooks/idle.js` runs on `TeammateIdle`: a teammate that goes idle while the task files give it an open task (owned, or free with its role as the subject prefix) is sent back with exit 2 and `new task N: <subject>, not task M again`. For its own task left in_progress it says to mark the task completed, tell team-lead once if it may not, or keep going; for an in_progress task with an open blocker it says to set it back to pending. Version 0.3.2: bumped so installed copies refresh.

## Merge setting

Who merges a pull request is set per project in `.puppeteering/config.json`, in the project root:

```json
{ "merge": "owner" }
```

- `owner`, the default: the agents review the pull request and the reviewer ends with `Merge: recommend` or `Merge: do not merge`; you merge. A missing or unreadable file, a missing key or any other value also means `owner`.
- `auto`: the lead merges once the gates and the review pass.

Under `owner`, `hooks/merge-gate.js` runs on `PreToolUse` and denies a Bash command that holds the word `push` with `main` or `master`, or the word `merge` with `gh` or `pulls`, in any case, with quotes, backslashes, braces and `$` ignored; and any tool whose name ends in `merge_pull_request` or `enable_pr_auto_merge`. It reads words, not shell syntax, on purpose: every attempt to parse bash left a new way around it. So `gh pr merge 3`, `git push origin main` and `bash -c "git push origin main"` are denied, and so is a commit message that only mentions a push to main: the agent is told to rewrite it.

What the hook cannot see: a branch name held in a variable or produced by a command, a git alias, a bare `git push` while on main, and a merge made through the API by another program. It is a guard rail for the agents, not a lock.

### The real gate: branch protection on GitHub

To make sure nothing reaches `main` without your approval, protect the branch on GitHub:

1. On the repository, open **Settings**, then **Branches** (or **Rules**, then **Rulesets**).
2. Add a rule for `main`.
3. Turn on **Require a pull request before merging** and **Require approvals** (at least 1), and **Require review from Code Owners** if you use a CODEOWNERS file.
4. Leave **Allow bypass** off for the accounts or apps the agents use.

With that rule, an agent cannot push to `main` or merge without your approval, whatever command it runs. Under `auto`, keep the rule but allow the merge once the required checks pass.

## Install

```
/plugin install puppet-teams@puppeteering
```

## Turn it off

```
/plugin disable puppet-teams
```

## Where it runs

- Windows, macOS and Linux: the hook is plain Node with no dependencies.
- Terminal and desktop app: `SessionStart` hooks run in both. Only the terminal was tested.

## Check

```
node --test mods/puppet-teams/hooks/*.test.js
```
