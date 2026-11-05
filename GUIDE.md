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
- [Known limits](#known-limits)

## Should you use a team?

Teams cost more and coordinate more. The docs recommend them for research and review, new modules with separate owners, debugging with competing hypotheses, and work across layers. For sequential work, edits to one file, or many dependencies, use one session or subagents.

Use a subagent when only the result matters. Use a team when workers need to share findings or take work from a common list.

A team that has one person's attention as its only reviewer is limited by that attention. Addy Osmani calls this [the orchestration tax](https://addyosmani.com/blog/orchestration-tax/): run as many agents as you can properly review, and let them verify routine work with tests.

## Setup that is easy to miss

| Variable | Does |
| --- | --- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Turns teams on |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` | Gives the shared task list on models newer than Opus 4.7, Sonnet 4.6 and Haiku 4.5, which leave it out by default |

With only the first, a team exists and has no task list: teammates work by message, and the lead ends up assigning everything by hand.

- Check at the start of a session: `TaskList` answers.
- A split-pane teammate does not inherit a variable you exported in your shell. Start the lead with `claude --settings '{"env":{"CLAUDE_CODE_ENABLE_TODO_TOOLS":"1"}}'`.
- *Observed, not in the docs:* with the variable in `~/.claude/settings.json`, the tools appeared in a running session once the file was saved, and new in-process teammates had them.

## Roles

*This guide's choice. The docs recommend Sonnet for teammates, and Haiku for simple subagent work.*

| Role | Model | Does |
| --- | --- | --- |
| Lead | Opus | Talks to the owner, decides how, creates tasks, verifies, commits, pushes, merges |
| Builder | Haiku | Writes code in the files its task names |
| Reviewer | Sonnet | Independent review of a pushed head. Never the author |
| Researcher | Sonnet | Answers one question, or investigates a track and drafts its brief |

Define roles once as [subagent definitions](https://code.claude.com/docs/en/sub-agents), and spawn by role. A model named in a spawn prompt overrides the definition. The definition's `skills` field does not apply to a teammate.

## The pile

The lead fills the shared task list. Teammates take the next free task.

- **Team size:** 3 to 5 teammates, with 5 to 6 tasks each (the docs). More adds coordination, not speed.
- **A task** carries its brief, its files and how it is verified. A teammate does not inherit the lead's conversation.
- **Dependencies** go on the task, because a blocked task is not self-claimed: a review waits for the push; a task that edits a file waits for the PR that also edits it.
- **Give the lead's own tasks an owner**, or a teammate can claim them. Writing them down lets you see the whole queue with `Ctrl+T`.
- **Name a role in the description**, such as "Builder." or "Reviewer.", and spawn each teammate with one instruction: take the lowest free task for your role.

Status: run with one researcher, one builder and one reviewer, each given no task by name, and each found, claimed and finished its tasks. Not yet run: several teammates of one role competing for tasks. The rule for how long a teammate lives is not settled; see [`LESSONS.md`](LESSONS.md).

## Files and worktrees

Two teammates editing one file overwrite each other, and teams do not isolate teammates. So every task names a set of files that does not overlap with another running task.

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

Exit code 2 blocks and sends stderr back. Keep `CLAUDE.md` short, under 200 lines, and move procedures to [skills](https://code.claude.com/docs/en/skills).

## Cost

Token use grows with each active teammate; the [costs page](https://code.claude.com/docs/en/costs) says about 7 times a normal session when teammates run in plan mode.

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

## Known limits

From the docs: `/resume` and `/rewind` do not restore in-process teammates; one team per session; no nested teams; the lead is fixed; task status can lag, so check whether stuck work is really done; shutdown can be slow; split panes need tmux or iTerm2.

So keep a status file a restarted session can read, with each builder's files and task.
