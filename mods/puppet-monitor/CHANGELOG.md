# Changelog

All notable changes to puppet-monitor. Versions follow [SemVer](https://semver.org). The version lives in `.claude-plugin/plugin.json`; `office-app/package.json` mirrors it, and a test fails if they differ. A release is tagged `puppet-monitor@<version>` on main.

## Unreleased

### Added
- Thinking has its own place, apart from what an agent says. Each loop keeps its last thinking block (`thinking: { since, at, end?, text? }`) and its timeline gets a `thought` entry. The Team card shows a dim, italic 💭 line, "thinking… 4s" live while the block is open, and the drawer has a Thinking section with a "more" control for long text. The engine sends thinking without text today, so the line shows the time.
- A REPL script (Code Mode) is one timeline entry, "Code: <first line>", with the calls it made nested under it; its desk shows "Running code (N calls)". The `code` tool kind is new.
- The scene draws costumes per archetype, poses and marks per mood, and the coordinator's celebration once per completion.
- Stable seats on the map: a compact grid of neighbourhoods, one per kind of agent. Leavers walk out through the door and newcomers walk in; nobody else moves.
- The office extras walk the floor, pale and unnamed. `?extras=off` removes them.
- Name pills that would collide stack instead of overlapping.
- `office-app/tools/demo-video/record.mjs`: records a scripted 31 s demo of the office to MP4, landscape and square, with `--theme=`.

### Changed
- Thinking text no longer goes into `said`. The board's shape tag is `board-7`, so a state saved by an earlier version is dropped once.

### Fixed
- The Office button opens the session's own page on Windows. The browser got the office without `?s=<key>` and read a stale state, because Windows drops the query of a file link. The mod now writes `office/open-<key>.html`, which redirects with the key, and opens that. It is also written on the first open after `/reload-plugins`.
- A state file from an older mod no longer blanks the page: the page normalizes every state it reads. With no `?s=`, a stale state shows "no session picked".

### Removed
- The Pane, its button and `/puppets`. The office in the browser replaces it. The band keeps the count, the alert and the Office button.

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

## 0.1.0

- A puppet theatre pane: the lead and each agent, with its task, what it says and does, and who is stuck or looping.
- `/office`: the team as a pixel-art office in the browser. The coordinator wears a crown, and agents walk to report.
- Installed from the repo's own marketplace, with a band above the prompt holding Office and Pane buttons.
