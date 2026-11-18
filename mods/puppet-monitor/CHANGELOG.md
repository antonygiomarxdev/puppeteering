# Changelog

All notable changes to puppet-monitor. Versions follow [SemVer](https://semver.org). The version lives in `.claude-plugin/plugin.json`; `office-app/package.json` mirrors it, and a test fails if they differ. A release is tagged `puppet-monitor@<version>` on main.

## Unreleased

## 0.2.0

The office becomes an app: Phaser 3, React and Vite in `office-app/`, built to the single page `office/index.html`.

### Added
- **Team panel, always visible.** One card per agent, problems first (stuck, looping, error, blocked). Each card shows the task, what the agent is doing now with a live clock, its last words and its last report.
- **Agent detail.** Click a card or a critter to open its timeline: calls with duration and outcome, messages sent and received, files edited, task events. A ring marks it on the map.
- **Per-agent timeline in the state.** The last 40 entries and 20 files per agent and per lead. Each desk also carries the agent's type, tool kind, `since`, `lastError`, `blockedBy`, and `gone` for 60s after the agent leaves.
- **Task history.** Created, taken and done events with who and when.
- **Characters.** Eight archetypes with a costume, prop, walk and three personalities each; a state table with every mood; the coordinator's own states. See `office-app/docs/characters.md`.
- **Stable seats.** Neighbourhoods per kind of agent that grow by half-pods. Nobody moves when someone joins or leaves, and leavers walk out through the door.
- **Seasonal themes as data.** Christmas, New Year, Halloween and Easter, picked by date or `?theme=`. `?theme=none` turns them off.
- **Office extras.** HR, the boss's pet, an intern, the vending guy and IT. They never pass for agents. `?extras=off` removes them.
- **A gold shiny critter** at 1 in 4096.
- **Sleep.** An agent with no task sleeps and wakes when it gets one.

### Changed
- One state file per session (`office/state-<key>.js`, opened with `?s=<key>`), so sessions from different repos no longer mix.
- The Pane button toggles, and still works after a hand close.
- On desktop, the office opens through a `file:` link plus a button, and failures show a toast.

### Not yet in the scene
- Costumes, moods, stable seats and extras exist as tested rules and sprites, but the scene does not draw them yet.

## 0.1.0

- A puppet theatre pane: the lead and each agent, with its task, what it says and does, and who is stuck or looping.
- `/office`: the team as a pixel-art office in the browser. The coordinator wears a crown, and agents walk to report.
- Installed from the repo's own marketplace, with a band above the prompt holding Office and Pane buttons.
