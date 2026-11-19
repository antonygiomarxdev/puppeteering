# puppet-teams

Injects the agent-teams rules into every Claude Code session at start, so each session knows it works with a shared task list and a team of agents.

It runs on `SessionStart` (startup, resume, clear, compact). It reads `RULES.md` and adds it as context. When the repo has `ONBOARDING.md`, the rules point to the local files; otherwise they point to the GitHub copy.

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
node --test mods/puppet-teams/hooks/
```
