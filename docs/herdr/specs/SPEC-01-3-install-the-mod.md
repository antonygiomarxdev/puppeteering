# SPEC-01-3: Install the mod into the Herdr app and check it

Status: Approved (2026-11-23)
Approval: content VCoz-3jg7R4H; rests on ../../requests/REQ-12-herdr-panel.md Y_wn_krhL6Fb
Rests on: ../../requests/REQ-12-herdr-panel.md

## Summary

A small Node script copies `mods/puppet-herdr/` into `<HERDR_APP_HOME or ~/.config/herdr-app>/mods/puppet-herdr/`; the README says how to run `herdr-app check`. Third of three runs.

Last change: 2026-11-22, drafted from D-33

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-33 | 2026-11-22 | The Herdr desktop app (GPUI mods in `~/.config/herdr-app`) is the first surface beyond Claude Code's own, an exception to D-12's "later": its agents are still Claude Code agents. A read-only panel, `mods/puppet-herdr/`, shows each Claude Code agent herdr sees, with its status from herdr and, from puppet-monitor, its session's tasks and alerts (LOOPING, STUCK, QUIET). Windows first; macOS and Linux where they work at no extra cost, and what nobody ran is said untested Source: owner, via the lead, 2026-11-22. | PRODUCT §5 (UC-9), §6, §7; `docs/requests/REQ-12-herdr-panel.md`; `docs/herdr/specs/` |
| D-3 | 2026-11-18 | Every behaviour must handle the OS and the surface Source: os-and-surface-aware memory note (paraphrase). | PRODUCT P9; CROSS-CUTTING CC-6 |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-herdr/install.js` | Create | `node install.js [dest]`: copies `main.js`, `match.js`, `mod.json` |
| `mods/puppet-herdr/README.md` | Create | What it shows, install, check, what is untested, how to remove it |

## Reuses
Nothing to reuse: no script in the repo installs a mod; Claude plugins install with `/plugin install`. A copy, not a link: a symlink needs rights on Windows, and Herdr hot-reloads a saved copy.

## Tests first
D-33, D-3, by the tester, in `mods/puppet-herdr/install.test.js` (`covers: herdr/REQ-12/<ID>`), against a temp folder: with `HERDR_APP_HOME` set the three files land in `<it>/mods/puppet-herdr/` and nothing else is written (D-33); a second run overwrites them and exits 0 (D-33); with no `HERDR_APP_HOME` the default is `<os.homedir()>/.config/herdr-app`, built with `path.join` (D-3); a missing source file exits 1 with a message that names it (D-3); the README text contains `~/.claude/puppet-monitor/` and says the panel reads files outside its own folder, and that it runs no program and opens no network connection (D-33, AGENTS.md of the Herdr app asks a person to be told this before adding a mod).

## Build
`install.js` exports `target(env, home)` and runs the copy only when it is the main module. README sections: What it reads (the files in `~/.claude/puppet-monitor/`, outside its own folder; no `exec`, no `fetch`), Install (`node mods/puppet-herdr/install.js`), Check (`herdr-app check <dest>`, exits nonzero with the error), Where it runs (Windows: designed for it, not run in the app; macOS, Linux: untested; remote machines: not matched), Remove (delete the folder).

## Done when
`node --test mods/puppet-herdr/install.test.js`

## Out of scope
Running `herdr-app` and loading the mod: the owner runs `herdr-app check` and looks at the panel, and the README says it was not done. Any change under `~/.claude/settings.json`; `herdr integration install`.

## Open questions
None.
