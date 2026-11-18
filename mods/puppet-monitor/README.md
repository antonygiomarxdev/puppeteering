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
| Windows | Desktop app | The same `cmd` opener. The app has no `session.info`, so a drive or UNC plugin root says Windows. A rejected `process.run` counts as a failed opener | The toast, and the `[open file]` link in the band, which opens the launcher |
| macOS | Terminal | `open <launcher>` | The same toast and `/office` link |
| macOS | Desktop app | No `session.info`: tries `open`, then `xdg-open` | The toast, and the `[open file]` link |
| Linux | Terminal | `xdg-open <launcher>` | The same toast and `/office` link |
| Linux | Desktop app | No `session.info`: tries `open`, then `xdg-open` | The toast, and the `[open file]` link |

The `[open file]` link is Markdown, because remote surfaces (the desktop app, vscode, mobile) draw a non-https Link as text but keep `file:` links in Markdown. It points to the launcher, not to `index.html?s=`: a shell association drops the query of a `file:` link. The terminal band has no link. Where nothing opens, open `office/open-<session>.html` by hand.

Not simulated in tests: a POSIX plugin root with the macOS and Linux openers (the harness root is a Windows path), and the vscode and mobile surfaces.

## What it changes

It adds one sentence to the prompt of every agent spawned while it is loaded, asking the agent to say what it is about to do before each tool call. That is where the quotes come from, and it costs some tokens. The quotes are what an agent says it is doing, not its reasoning.

## What it cannot show

- **What an agent thinks.** The office shows *that* an agent is thinking, and for how long, in a Thinking line of its own, apart from what it says. It cannot show the words. In Claude Code 2.1.327 a `turn.step` thinking chunk is `{ kind, index, text, ref }` with `text` empty, and the transcript row a mod sees in `session.append` holds `thinking: ""` beside a signature of about 1,200 characters. No summary field exists, and `showThinkingSummaries: true` changed nothing. Checked on Windows in the terminal, with a new `claude -p` run at high effort; the desktop app is not checked. If text ever arrives, the Thinking line shows it.
- **Progress as a percentage.** No event reports it. You see elapsed time, not time left.
- **Teammates in a terminal pane of their own.** Going by the API types, only their status reaches this session.
- **Proof.** `STUCK` can be a slow, healthy command, and `LOOPING` can be a poll. An alert says where to look.

## How it was checked

Live, with in-process teammates: a real loop raised `LOOPING`, narration arrived, and a render raised `STUCK` with the threshold lowered to 60 seconds for the test. The 5 minute threshold itself is in unit tests only, as is `QUIET`. Reading the end of a background shell relies on the text of an engine notice, which is not a documented format. Not run: teammates in terminal panes.
