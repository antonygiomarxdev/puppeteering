# The guide

What running [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams) on real work taught. Read the official page first: this file adds to it and does not replace it. Where a rule is this guide's own choice and not the docs', it says so. Links for every topic are in [`REFERENCES.md`](REFERENCES.md).

## Contents

- [Should you use a team?](#should-you-use-a-team)
- [Setup that is easy to miss](#setup-that-is-easy-to-miss)
- [Roles](#roles)
- [The pile](#the-pile)
- [Files and worktrees](#files-and-worktrees)
- [Parallel, and where it stops](#parallel-and-where-it-stops)
- [Verify, do not relay](#verify-do-not-relay)
- [Review](#review)
- [Put what must hold in a hook](#put-what-must-hold-in-a-hook)
- [Cost](#cost)
- [Safety](#safety)
- [Status](#status)
- [In the desktop app](#in-the-desktop-app)
- [Known limits](#known-limits)

## Should you use a team?

Teams cost more and coordinate more. The docs recommend them for research and review, new modules with separate owners, debugging with competing hypotheses, and work across layers. For sequential work, edits to one file, or many dependencies, use one session or subagents.

Anthropic measured multi-agent systems at "about 15x more tokens than chats", and found most coding tasks less parallel than research ([multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)). Use a subagent when only the result matters. Use a team when workers need to share findings or take work from a common list.

A team that has one person's attention as its only reviewer is limited by that attention. Addy Osmani calls this [the orchestration tax](https://addyosmani.com/blog/orchestration-tax/): run as many agents as you can properly review, and let them verify routine work with tests.

## Setup that is easy to miss

| Variable | Does |
| --- | --- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Turns teams on |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` | Gives the shared task list on models newer than Opus 4.7, Sonnet 4.6 and Haiku 4.5, which leave it out by default |

With only the first, a team exists and has no task list: teammates work by message, and the lead ends up assigning everything by hand.

- Check at the start of a session: `TaskList` answers, for the lead and for the first teammate. In the desktop app the lead had the tools and its teammates did not; see `LESSONS.md`.
- A split-pane teammate does not inherit a variable you exported in your shell. Start the lead with `claude --settings '{"env":{"CLAUDE_CODE_ENABLE_TODO_TOOLS":"1"}}'`.
- *Observed, not in the docs:* with the variable in `~/.claude/settings.json`, the tools appeared in a running session once the file was saved, and new in-process teammates had them.

## Roles

*Models: the docs recommend Sonnet for teammates and Haiku only for simple subagent tasks ([costs](https://code.claude.com/docs/en/costs)). Anthropic's research system used an Opus lead with Sonnet workers ([how they built it](https://www.anthropic.com/engineering/multi-agent-research-system)). The Ops role is this guide's own.*

| Role | Model | Does |
| --- | --- | --- |
| Lead | Opus | Talks to the owner, decides how, creates tasks, verifies, commits, pushes, merges |
| Builder | Sonnet (Haiku for a mechanical one-file task) | Writes code in the files its task names |
| Reviewer | Sonnet | Independent review of a pushed head. Never the author |
| Researcher | Sonnet | Answers one question, or investigates a track and drafts its brief |
| Ops | Haiku | Runs long commands and recordings, and reports what they printed |

The lead coordinates, assigns and verifies. It does not do teammates' tasks: it delegates them by role and waits. The docs say: "Wait for your teammates to complete their tasks before proceeding" ([agent teams](https://code.claude.com/docs/en/agent-teams)). Reading code to find a cause, editing files, research, long commands and recordings go to a teammate: a Researcher (Sonnet) to understand, a Builder (Sonnet) to change, a Reviewer (Sonnet) to check, Ops (Haiku) to run. The lead may read one file or run one command to verify a report. Its own calls are task and message tools, Agent, rerunning a check, git commit and push. It watches the team and steers, because "Letting a team run unattended for too long increases the risk of wasted effort" (same page). A lead that does the work itself is busy when the owner needs it, and nobody reviews what it did.

Define roles once as [subagent definitions](https://code.claude.com/docs/en/sub-agents), and spawn by role. A model named in a spawn prompt overrides the definition. The definition's `skills` field does not apply to a teammate.

## The pile

The lead fills the shared task list. Teammates take the next free task.

- **Team size:** 3 to 5 teammates, with 5 to 6 tasks each (the docs). More adds coordination, not speed.
- **A task** carries its brief, its files and how it is verified. A teammate does not inherit the lead's conversation.
- **Dependencies** go on the task, because a blocked task is not self-claimed: a review waits for the push; a task that edits a file waits for the PR that also edits it.
- **Give the lead's own tasks an owner**, or a teammate can claim them. Writing them down lets you see the whole queue with `Ctrl+T`.
- **Name a role in the description**, such as "Builder." or "Reviewer.", and spawn each teammate with one instruction: take the lowest free task for your role.

- **A brief names its output format and what the teammate must not touch.** Anthropic: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries" ([multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)).
- **Set the owner before the work starts.** The lead sets it before pointing anyone at a task, and a teammate sets it before its first edit. With several teammates of one role, a task with an empty owner gets built twice.

Status: run with one researcher, one builder and one reviewer, and then with three builders and one reviewer on one pile. With three builders, a task was built twice three times when the owner was set late; see [`LESSONS.md`](LESSONS.md). The rule for how long a teammate lives is not settled; see [`LESSONS.md`](LESSONS.md).

## Files and worktrees

A teammate never kills a process by name (`taskkill /IM`, `pkill`, `killall`): that closes the owner's own windows too. It kills only the PID it started, or one whose command line holds its own profile or temp folder.
Two teammates editing one file overwrite each other, and teams do not isolate teammates. So every task names a set of files that does not overlap with another running task. A hand mutant counts as an edit: a reviewer mutates a copy of the code, not the live file, unless no other task writes there.

*This guide's practice, not the docs':* for several branches at once, create one sibling worktree per stream with `git worktree add`, and name it by absolute path in the task. Passing `isolation` on the Agent call would make it a subagent, not a teammate. Install dependencies in each worktree, because a fresh checkout has none.

## Parallel, and where it stops

While an independent task is ready, it runs. What stops one is a shared file, an unmet dependency, a decision only a person can make, or the machine.

- Merges are serial when the base must be current: each merge makes the next PR re-integrate and re-check. Writing and reviewing scale; merging does not. Order the merges by what they unblock.
- If the lead writes every brief by hand, the team is serial. A researcher drafts; the lead verifies the draft.
- Watch the machine. Heavy checks in parallel compete for it, and a shared CI runner becomes a queue.

## Verify, do not relay

- A report is a claim. Read its commands and output, then run the check again.
- Give every task a check that returns pass or fail, and ask for the command and its output as evidence. Define success before the agent starts; see Osmani on [agentic verification](https://addyo.substack.com/p/agentic-verification).
- A brief states only what was just run. Whoever writes it runs its start check, and names every file the change reaches.
- Do not cite an issue, a spec or a page you have not opened.
- A pull request says what was not verified, because a check always leaves something out.
- Prove a test with a hand mutant: break the code, watch it fail, restore it.

## Review

- A reviewer is a session that did not write the code. The [best practices](https://code.claude.com/docs/en/best-practices) say why: it is not swayed by the reasoning that produced the code.
- Review against a spec, and say to skip style: a reviewer asked to find problems always finds something.
- Ask reviewers to run things, not to read them, and to report what they did not check.
- The docs' example runs several reviewers on one PR, each with one lens (security, performance, tests).
- Read the decisions an agent made, not only its summary. Accepting output because it looks right is what Osmani calls [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/).

## Put what must hold in a hook

`CLAUDE.md` is context, and hooks are deterministic. If you keep adding emphasis to a line and it is still missed, make it a hook. Delete hooks that are only preferences.

| Hook | Use |
| --- | --- |
| `TaskCreated` | Refuse a task with no check or no owner role |
| `TaskCompleted` | Refuse completion until the check passes |
| `TeammateIdle` | Send a teammate back when work is left |
| `PreToolUse` | Deny a dangerous command. A deny holds in every permission mode |
| `Stop` | Send the session back when a check fails. It blocks at most 8 times in a row |

puppet-teams enforces none of these yet: it only adds the rules at session start. Exit code 2 blocks and sends stderr back. Keep `CLAUDE.md` short, under 200 lines, and move procedures to [skills](https://code.claude.com/docs/en/skills).

## Cost

Token use grows with each active teammate; the [costs page](https://code.claude.com/docs/en/costs) says about 7 times a normal session when teammates run in plan mode.

- Use Sonnet for teammates: the [costs page](https://code.claude.com/docs/en/costs) says "It balances capability and cost for coordination tasks." For simple subagent tasks it says to specify `model: haiku`.
- Keep teams small and spawn prompts focused. Shut a teammate down when its work is done.
- A teammate's prompt cache lasts 5 minutes by default, so waking one after a long idle costs more. `subagentPromptCacheTtl` extends it, at a higher write price.
- The built-in `Explore` runs on your session's model. A subagent [named `Explore`](https://code.claude.com/docs/en/sub-agents#built-in-subagents) in `~/.claude/agents` overrides it, so `model: haiku` makes every search cheaper. Set `omitClaudeMd: true` too: the built-in starts without `CLAUDE.md`, and an override does not unless you say so. Keep `CLAUDE.md` on any agent that needs your rules.
- `/usage` shows the share by subagent type. Measure before you tune; this guide has not measured its own rules yet.

## Safety

- Teammates start in the lead's permission mode, including `bypassPermissions`. Pre-approve the common operations instead.
- A teammate's message is never your approval, and a teammate that was denied something cannot relay it.
- A rule that stops teammates must hold in every directory they work in. Test it from a sibling worktree: `${CLAUDE_PROJECT_DIR}` stays at the project root while the hook's `cwd` follows the worktree.
- Anything that changes production waits for a person's yes, for that step.

## Status

Before telling anyone where things stand, list the agents and read the last comment of each open pull request. A teammate's message can arrive late, in a batch.

Say plainly when the process is not what the documents say.

## In the desktop app

Not docs: the Claude desktop app (Code tab) ran named agents as subagents, not as teammates. One Windows 11 run showed it (see [`LESSONS.md`](LESSONS.md)). The lead had the Task tools. The agents had none, could not claim, and reached the lead as `main`, not `team-lead`.

What the docs say: the agent-teams page describes in-process teammates and split panes in a terminal, and never names the desktop app. The desktop page never mentions agent teams or teammates; it lists a subagent pane. So the docs do not say whether the app supports teams. They say only that a subagent has the Task tools "only when your session has them", and that without them "an agent coordinates with its team through messages instead of the shared task list". The subagents page says that "in an interactive session with agent teams enabled", a subagent spawned with a `name` "launches as a teammate instead"; the app run did not match that, and the docs do not say why.

So in the app, work as if you have subagents:

- The lead owns the task list and marks every task itself, when the agent hands back.
- The lead assigns by message, and names the task: "new task N, not task M again".
- Each agent gets its own files, so two never write the same one. Nobody claims, so nothing else stops them.
- Run `TaskList` as the first call in an agent. If it fails, the agent has no task tools: it reports by message and does not edit `~/.claude/tasks`.
- For a real team with a shared list, use the terminal.

## Known limits

From the docs: `/resume` and `/rewind` do not restore in-process teammates; one team per session; no nested teams; the lead is fixed; task status can lag, so check whether stuck work is really done; shutdown can be slow; split panes need tmux or iTerm2.

So keep a status file a restarted session can read, with each builder's files and task.
