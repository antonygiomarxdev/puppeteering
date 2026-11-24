# puppet-herdr

A panel for the Herdr desktop app. For each Claude Code agent Herdr sees, it shows the status from Herdr and, from puppet-monitor, the session's tasks and alerts (LOOPING, STUCK, QUIET). Read only. Click a row to focus the agent.

## What it reads

The panel reads files outside its own folder: `~/.claude/puppet-monitor/<folder>.json`, one per working folder, which puppet-monitor writes (see its README, "State file for other tools"). It names one file per agent, from the agent's pane folder, and lists no folder. A file older than 30 s counts as no session.

It runs no program (no `exec`) and opens no network connection (no `fetch`). It writes nothing.

## Install

```
node mods/puppet-herdr/install.js
```

This copies `main.js`, `match.js` and `mod.json` into `<HERDR_APP_HOME or ~/.config/herdr-app>/mods/puppet-herdr/`. Run it again to update. `node install.js <folder>` copies into that folder instead.

## Check

```
herdr-app check <dest>
```

`<dest>` is the folder install.js printed. It exits nonzero with the error when the mod does not load.

## Where it runs

- Windows: designed for it. Not run in the app yet.
- macOS, Linux: untested.
- Agents on a remote machine: not matched (a local folder with the same path would match).

Neither `herdr-app check` nor the panel in the app has been run: that is the owner's step.

## Remove

Delete `<HERDR_APP_HOME or ~/.config/herdr-app>/mods/puppet-herdr/`.
