# puppet-monitor

An office in the browser that shows your team at work, and a band above the prompt. At a glance you see each agent's task, what it says, what it is running, and whether it is stuck or looping.

## Install

```
/plugin marketplace add antonygiomarxdev/puppeteering
/plugin install puppet-monitor@puppeteering
```

Send them as two prompts. A band above the prompt then counts your agents and shows any alert, with an **Office** button.

`/office` or the button opens the team as an office in the browser: each agent is a small orange critter at its own desk, typing while it works, and the coordinator wears a crown. When an agent ends its turn or sends a message, it walks to whoever it reports to, says the first line in a bubble, and walks back. An agent with no task in progress sleeps (eyes closed, "z" letters, screen off) and wakes when it takes one. The page reads `office/state-<session>.js`, which the mod rewrites every second, so it needs no server. The button opens `office/open-<session>.html`, a small page that redirects to the office with that session's key: Windows drops the `?s=` of a file link it hands to the browser.

You read it; you do not have to operate it.

## What the alerts mean

| Alert | Means |
| --- | --- |
| `LOOPING` | The same call, with the same arguments, 3 times or more in a row |
| `STUCK` | One call has run for 5 minutes |
| `QUIET` | Working, with no activity for 2 minutes |

Alerts show in the band, the status line and the office. A shell in the background turns red after 5 minutes.

## Where it runs

The button and `/office` open `office/open-<session>.html`, a launcher with no query, on every OS. The launcher redirects to the office with the session's key.

| OS | Surface | How Office opens | If it fails |
| --- | --- | --- | --- |
| Windows | Terminal | `cmd /c start "" <launcher>`; the OS is read from `session.info` or the drive in the plugin root | Toast `puppets: office failed: <reason>`; `/office` prints a `file:` link to the launcher |
| Windows | Desktop app | The same `cmd` opener. The app has no `session.info`, so a drive or UNC plugin root says Windows. A rejected `process.run` counts as a failed opener | The toast. After a failure, the `[open file]` link appears in the band and opens the launcher |
| macOS | Terminal | `open <launcher>` | The same toast and `/office` link |
| macOS | Desktop app | No `session.info`: tries `open`, then `xdg-open` | The toast. After a failure, the `[open file]` link appears in the band |
| Linux | Terminal | `xdg-open <launcher>` | The same toast and `/office` link |
| Linux | Desktop app | No `session.info`: tries `open`, then `xdg-open` | The toast. After a failure, the `[open file]` link appears in the band |

The `[open file]` link is Markdown, because remote surfaces (the desktop app, vscode, mobile) draw a non-https Link as text but keep `file:` links in Markdown. It points to the launcher, not to `index.html?s=`: a shell association drops the query of a `file:` link. The desktop band shows the link only after an Office open has failed in this session, since the button opens the page. The terminal band never has it. Where nothing opens, open `office/open-<session>.html` by hand.

Not simulated in tests: a POSIX plugin root with the macOS and Linux openers (the harness root is a Windows path), and the vscode and mobile surfaces.

## State file for other tools

Each tick also writes `<home>/.claude/puppet-monitor/<folder>.json`, one file per working folder, so a tool outside Claude Code (the herdr panel) can read a session's tasks and alerts. Plain JSON, schema 1:

| Field | Meaning |
| --- | --- |
| `schema` | `1` |
| `key`, `cwd` | The session key, and its working folder, verbatim |
| `at` | Epoch ms of the tick that wrote it |
| `busy` | The lead is working |
| `shared` | Another session wrote this file within the last 30 s |
| `tasks` | `done`, `total`, and `open`: each open task with `id`, `subject`, `status`, `owner`, `blocked` |
| `alerts` | `{ who, kind: loop \| stuck \| quiet, text }`, the same alerts the status line shows |

- **Home** is `HOME`, else `USERPROFILE`. With neither, or on the hosted surface, no file is written. `CLAUDE_CONFIG_DIR` is ignored: the path is a contract.
- **Staleness.** The file is rewritten about once a second. A reader ignores a file whose `at` is more than 30 s old. Files of ended sessions are not deleted.
- **`normPath(p)`**: `\` becomes `/`, trailing `/` is stripped (`/` stays), and the result is lowercased when it starts with a drive letter (`/^[A-Za-z]:/`) or `//`.
- **`folderKey(cwd)`**: FNV-1a 32 over the UTF-16 units of `normPath(cwd)`: `h = 0x811c9dc5`; per unit `h ^= unit; h = Math.imul(h, 0x01000193) >>> 0`; then `h.toString(16).padStart(8, '0')`.

| `cwd` | `folderKey` |
| --- | --- |
| `C:\Users\anton\dev\puppeteering-herdr` and `c:/users/anton/dev/puppeteering-herdr/` | `27494bdf` |
| `/home/a/proj` and `/home/a/proj/` | `5c92b791` |
| `/` | `2a0c975e` |
| `\\srv\Share\X` | `d1ce8abf` |

- **Two sessions in one folder** write the same file; the later write wins, and `shared` tells a reader there is another. A third session is not told apart from a second.
- Not verified live: that no other plugin's `fs.*` hook denies the write, `USERPROFILE` in the desktop app, and the hosted surface.

## What it changes

It adds one sentence to the prompt of every agent spawned while it is loaded, asking the agent to say what it is about to do before each tool call. That is where the quotes come from, and it costs some tokens. The quotes are what an agent says it is doing, not its reasoning.

## What it cannot show

- **What an agent thinks.** The office shows *that* an agent is thinking, and for how long, in a Thinking line of its own, apart from what it says. It cannot show the words. In Claude Code 2.1.327 a `turn.step` thinking chunk is `{ kind, index, text, ref }` with `text` empty, and the transcript row a mod sees in `session.append` holds `thinking: ""` beside a signature of about 1,200 characters. No summary field exists, and `showThinkingSummaries: true` changed nothing. Checked on Windows in the terminal, with a new `claude -p` run at high effort; the desktop app is not checked. If text ever arrives, the Thinking line shows it.
- **Progress as a percentage.** No event reports it. You see elapsed time, not time left.
- **Teammates in a terminal pane of their own.** Going by the API types, only their status reaches this session.
- **Proof.** `STUCK` can be a slow, healthy command, and `LOOPING` can be a poll. An alert says where to look.

## How it was checked

Live, with in-process teammates: a real loop raised `LOOPING`, narration arrived, and a render raised `STUCK` with the threshold lowered to 60 seconds for the test. The 5 minute threshold itself is in unit tests only, as is `QUIET`. Reading the end of a background shell relies on the text of an engine notice, which is not a documented format. Not run: teammates in terminal panes.
