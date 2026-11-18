# Onboarding

Read this first if you are a Claude Code session, or a person, about to use puppeteering. It covers setup, leading a team, reading the office, and working on this repo. The rules themselves are in [`GUIDE.md`](GUIDE.md). This page points to them and adds what to do on day one.

Puppeteering has two parts:

| Part | What it is | Where |
| --- | --- | --- |
| The method | How one lead runs a team of agents: a shared pile of tasks, independent review, every claim checked | [`GUIDE.md`](GUIDE.md), [`LESSONS.md`](LESSONS.md) |
| The monitor | puppet-monitor, a mod that shows what every agent is doing without asking the lead: an office in the browser and a band above the prompt | [`mods/puppet-monitor/`](mods/puppet-monitor) |

## 1. Set up once

Tested on Claude Code 2.1.327. You also need git, and Node with npm to build the office. The sprite exporter and the video recorder need Chrome or Edge.

Clone this repo to `~/dev/puppeteering`. The `CLAUDE.md` lines below use that path; change them if you clone elsewhere.

**Settings.** Merge [`setup/settings.json`](setup/settings.json) into `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"
  }
}
```

The first variable turns on agent teams. The second gives the shared task list on current models. Without the second, a team has no pile.

**Install the monitor.** Send these as two prompts:

```
/plugin marketplace add antonygiomarxdev/puppeteering
/plugin install puppet-monitor@puppeteering
```

From a local clone, pass the folder instead: `/plugin marketplace add C:\Users\<you>\dev\puppeteering`. After changing the mod, run `/reload-plugins`.

**Point every session here.** Add this to `~/.claude/CLAUDE.md`:

```markdown
## Agent teams

Agent teams with the shared task list are the default way of working.
Before leading a team, read `~/dev/puppeteering/ONBOARDING.md`, then `~/dev/puppeteering/GUIDE.md`.
When a run shows a rule wrong, update GUIDE.md and LESSONS.md.
A project's own document holds only what is specific to it.
```

Nothing else is set per project. In every session, in any repo, the monitor picks up:
- the project, from the session's folder;
- the lead and each agent or teammate, with its name, type, description and status;
- every tool call, with its file or command, duration and outcome;
- the shared task list: who created, took and finished each task;
- messages between agents, and final reports;
- alerts: stuck, looping, quiet.

## 2. At the start of a session

1. Check that `TaskList` answers. If it does not, the task list is off: see step 1.
2. Read [`GUIDE.md`](GUIDE.md). Read [`LESSONS.md`](LESSONS.md) for what went wrong before.
3. Look for the puppets band above the prompt. Press **Office** to open this session's office in the browser.

## 3. Lead a team

The full rules are in [`GUIDE.md`](GUIDE.md). These are the ones a new lead breaks most often:

| Rule | Why |
| --- | --- |
| Builders on Haiku, reviewers and researchers on Sonnet. The lead verifies, commits and pushes; teammates never commit | [Roles](GUIDE.md#roles) |
| Each task names its files, and no two running tasks share a file | Two teammates in one file overwrite each other |
| A task carries its whole brief: goal, files, how to check, "report to team-lead, do not commit" | A teammate does not see the lead's conversation |
| Dependencies go on the task (`addBlockedBy`) | A blocked task is not taken |
| A report is a claim: rerun the tests and look at the screenshots yourself before you commit | [Verify, do not relay](GUIDE.md#verify-do-not-relay) |
| A mutant runs on a copy of the code, never the live file | A mutant is a write; it clobbered a builder once |
| Never kill a process by name (`taskkill /IM`, `pkill`); kill only the PIDs you started | It closed the owner's browser once |
| One commit per verified task, in English, with no attribution lines (no `Co-Authored-By`, no session link) | This repo's rule |
| `npm run build` rewrites the generated `mods/puppet-monitor/office/index.html`. It is not a task's file: the lead rebuilds it from all sources before committing | Two UI tasks would otherwise collide on it |

**Talking to teammates.** These come from [`LESSONS.md`](LESSONS.md):
- A finished teammate reads every new message as its old task. Say "new task N, not task M again", and name the subject.
- A redirect to a running task goes into the task's description (`TaskUpdate`), and also into a message. The teammate reads it with `TaskGet`.
- A shutdown goes alone, as `{"type": "shutdown_request"}`, with nothing else in the message.
- An idle notification can be an old message arriving late. Check the time and the task list before acting on it.

**Name teammates by role.** The office dresses each agent by what it does. It reads the agent's type first, then whole words in its name, then words in its description. Put the role in the name, such as `builder`, `reviewer`, `designer`, `researcher`, `planner` or `ops`. A name with no role word shows as a Helper, with a scarf.

The type wins over the name. A teammate has type `teammate`, which is not a role, so its name decides. A subagent of type `general-purpose` always shows as a Builder, whatever its name; give it a role type (`builder`, `reviewer`, `designer`, `researcher`) to change that.

| Archetype | Found by | Costume |
| --- | --- | --- |
| Conductor | the lead | crown, bow tie, baton |
| Builder | build, implement, fix, code, scaffold; type `general-purpose` | hard hat |
| Designer | design, art, sprite, ui, css | beret, brush |
| Reviewer | review, audit, verify, test, qa | glasses, clipboard |
| Researcher | research, explore, investigate; type `Explore` | cap, magnifier |
| Planner | plan, architect, spec; type `Plan` | headband, blueprint |
| Ops | deploy, release, ci, infra | headphones, wrench |
| Helper | anything else | scarf |

The full table is in [`office-app/docs/characters.md`](office-app/docs/characters.md).

## 4. Read the office

Press **Office** in the band, or run `/office`. The browser opens `office/open-<session>.html`, which redirects to this session's page. Every session has its own state file, so two repos never mix.

Read it in this order:
1. **Team panel, right side.** One card per agent, problems first. A red card means stuck, looping, an error, or blocked by another task, and says which. Each card shows the task, what the agent is doing NOW with a live clock, what it last said, and its last report.
2. **Click a card, or a critter.** A drawer opens with the agent's timeline: each call with its duration and ok or error, the messages it sent and received, the files it edited, and the tasks it took and finished. A Code Mode script shows as one "Code" entry with its calls inside it.
3. **History**, under the panel: every task created, taken and done, with who and when.
4. **The map.** It is for a glance: who is awake, who walks to report. Agents sleep when they have no task. Fake office staff (HR, the boss's pet, an intern) walk around for fun; they are pale and unnamed, and never count as agents.

Page options:

| Option | Does |
| --- | --- |
| `?s=<session>` | Which session to show. The launcher adds it for you |
| `?theme=christmas`, `halloween`, `easter`, `newyear`, `none` | Forces a seasonal theme. By default the date picks it |
| `?extras=off` | Hides the fake office staff |
| `?shiny=all` | Every critter gold (normally 1 in 4096) |

What the office cannot show: thinking text, progress as a percentage, and full detail for teammates in split panes (tmux). An alert says where to look; it is not proof that something is wrong.

## 5. Mind the OS and the surface

Everything built here must work on Windows, macOS and Linux, in the terminal and in the desktop app. Known differences:

| Where | Difference |
| --- | --- |
| Windows | `start` drops the `?query` and `#hash` of a `file:` URL. That is why Office opens a launcher page |
| Windows | Files check out with CRLF. A script that patches text with `\n` matches nothing; use the Edit tool |
| Desktop app | No `$.session.info`. `$.process.run` may reject |
| Desktop app, vscode, mobile | A non-https Link draws as plain text. A Markdown `file:` link works |
| Any surface | The engine rejects a bare `$.session` read: wrap the call in a try |

Each brief names the OS and the surface. Each fix is checked on more than one, or says which it was not checked on. The mod's README has a "Where it runs" table.

## 6. Work on this repo

| Path | What |
| --- | --- |
| `mods/puppet-monitor/hooks/` | The mod: `register.tsx` (hooks, band, state file), `theatre.ts` (pure state logic), tests |
| `mods/puppet-monitor/office/index.html` | The built office page. Do not edit it; it is generated |
| `office-app/` | The office source: Phaser 3 scene, React HUD, Vite, TypeScript |
| `office-app/src/office/` | Pure rules: archetypes, moods, seats, extras, shiny |
| `office-app/src/scene/` | The Phaser scene: layout, costumes, themes, labels |
| `office-app/src/hud/` | The React Team panel, detail drawer and history |
| `office-app/tools/sprite-export/` | Regenerates every sprite sheet |
| `office-app/tools/demo-video/` | Records a demo video |
| `social/` | Drafts for posts on X. Ignored by git |

First, in `office-app`, run `npm install`: a fresh clone or worktree has no `node_modules`.

Commands:

| Command | Where | Does |
| --- | --- | --- |
| `claude plugin test .` | `mods/puppet-monitor` | Mod tests |
| `claude plugin validate .` | `mods/puppet-monitor` | Checks the mod's hooks and manifest |
| `npm test` | `office-app` | Office tests |
| `npm run build` | `office-app` | Typecheck, then write the office page into the mod |
| `node office-app/tools/sprite-export/export.mjs` | repo root | All sprite sheets |
| `node office-app/tools/demo-video/record.mjs --size=square --theme=christmas` | repo root | A 31 s demo MP4 |

To see the office without a live team, write a fake `state-x.js` next to `index.html` and open `index.html?s=x`. `office-app/tools/demo-video/story.mjs` builds full fake states you can copy. The file must not declare a top-level `const` or `let`, because the loader re-adds it every second: wrap it in an IIFE.

**Versions.** The version lives in `mods/puppet-monitor/.claude-plugin/plugin.json`, and `office-app/package.json` mirrors it; a test fails if they differ. Add each change to `mods/puppet-monitor/CHANGELOG.md` under `## Unreleased`, in the same commit. See [`CONTRIBUTING.md`](CONTRIBUTING.md#versions).

## 7. When something is wrong

| Symptom | Cause and fix |
| --- | --- |
| The office page is blank or does not update | It was opened without `?s=` and is reading an old `state.js`. Press Office, or open `office/open-<session>.html`. Hard reload with Ctrl+F5 after a rebuild |
| The header says "no session picked" | Same cause: there is no `?s=`, or the state is stale |
| The header says "cannot load state-<key>.js" | That session has not written its file yet, or the mod is not loaded: run `/reload-plugins` |
| No band above the prompt | The mod is not installed or not enabled: `/plugin` |
| `TaskList` does not answer | `CLAUDE_CODE_ENABLE_TODO_TOOLS` is not set |
| A teammate redoes a finished task | It read a new message as its old task. Name the new task by number and subject |
| Code Mode does not start | [Code Mode](https://code.claude.com/docs/en/code-mode) refuses "an installed mod that checks tool calls", and this mod hooks `tool.call`. Start `claude` with `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` (from that page) and read the line at the top of the session. Whether this mod blocks it is not settled |

Not verified yet: teammates in split panes, Code Mode with the mod installed, and macOS and Linux.
