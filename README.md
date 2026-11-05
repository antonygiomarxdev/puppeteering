# Puppeteering

How I run Claude Code agent teams, across every project. It is updated as it is learned: each rule says what it rests on, and anything not yet run says so.

Named after Neferpitou's Nen ability in Hunter x Hunter, which moves many bodies at once.

- [`GUIDE.md`](GUIDE.md): the way of working.
- [`setup/settings.json`](setup/settings.json): what goes in `~/.claude/settings.json`.
- [`LESSONS.md`](LESSONS.md): what failed, and what changed because of it.

## Use it in a project

1. Merge `setup/settings.json` into `~/.claude/settings.json`.
2. `~/.claude/CLAUDE.md` points here, so every session reads the guide.
3. The project keeps only what is its own in its own document: paths, gates, how it merges, who approves what.

## Change it

A rule changes when a real run shows it wrong. Add the run to `LESSONS.md` in the same commit.
