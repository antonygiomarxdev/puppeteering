# puppet-teams

Injects the agent-teams rules into every Claude Code session at start, so each session knows it works with a shared task list and a team of agents.

It runs on `SessionStart` (startup, resume, clear, compact). It reads `RULES.md` and adds it as context. When the repo has `ONBOARDING.md`, the rules point to the local files; otherwise they point to the GitHub copy.

## Skill and reminder

The `agent-teams` skill holds the lead procedure: fill the task pile first, then spawn a standing team with one teammate per role. `hooks/remind.js` runs on `UserPromptSubmit` in the main session only (never for a teammate) and tells the model to load that skill for multi-step work. `hooks/idle.js` runs on `TeammateIdle`: a teammate that goes idle while the task files give it an open task (owned, or free with its role as the subject prefix) is sent back with exit 2 and `new task N: <subject>, not task M again`. Version 0.3.0: bumped so installed copies refresh.

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
