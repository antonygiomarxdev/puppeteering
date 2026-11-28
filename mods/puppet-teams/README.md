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

The hook only guards the agents' own calls. To make sure nothing reaches `main` without your approval, protect the branch on GitHub.

**First, give the agents their own identity.** GitHub never counts the approval of a pull request's author. If the agents push and open pull requests with your login, you cannot approve them, and as an admin they can bypass the rule. Let them work as a separate account or a GitHub App (for example the Claude GitHub App), with write access, and keep your own account for approving.

**Then add the rule**, either way:

- *Ruleset:* **Settings**, **Rules**, **Rulesets**, **New branch ruleset**. Target `main`, turn on **Require a pull request before merging** with **Required approvals** set to 1, and leave the **Bypass list** empty.
- *Classic:* **Settings**, **Branches**, **Add classic branch protection rule** for `main`. Turn on **Require a pull request before merging** and **Require approvals** (1), and turn on **Do not allow bypassing the above settings**, so admins are held too.

With that rule, and the agents on their own identity, nothing lands on `main` without your approval. Under `auto`, require status checks (**Require status checks to pass before merging**, with at least one check selected) instead of approvals, so the agents can merge once the checks pass.

On a private repository, rulesets and branch protection need a paid GitHub plan (Pro, Team or Enterprise).

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
