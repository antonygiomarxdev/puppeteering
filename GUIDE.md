# The guide

What running [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams) on real work taught. Read the official page first: this file adds to it and does not replace it. Where a rule is this guide's own choice and not the docs', it says so. Links for every topic are in [`REFERENCES.md`](REFERENCES.md).

## Contents

- [Should you use a team?](#should-you-use-a-team)
- [Setup that is easy to miss](#setup-that-is-easy-to-miss)
- [Roles](#roles)
- [One coordinator per goal](#one-coordinator-per-goal)
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

On those newer models, with only the first, a team exists and has no task list: teammates work by message. *Observed:* the lead ends up assigning everything by hand.

- Check at the start of a session: `TaskList` answers, for the lead and for the first teammate. In the desktop app the lead had the tools and its teammates did not; see `LESSONS.md`.
- A split-pane teammate does not inherit `CLAUDE_CODE_ENABLE_TODO_TOOLS` exported in your shell. Start the lead with `claude --settings '{"env":{"CLAUDE_CODE_ENABLE_TODO_TOOLS":"1"}}'`.
- *Observed:* with the variable in `~/.claude/settings.json`, the tools appeared in a running session once the file was saved, and new in-process teammates had them.

## Roles

*Models: the docs recommend Sonnet for teammates and Haiku only for simple subagent tasks ([costs](https://code.claude.com/docs/en/costs)). Anthropic's research system used an Opus lead with Sonnet workers ([how they built it](https://www.anthropic.com/engineering/multi-agent-research-system)). The Ops role is this guide's own.*

| Role | Model | Does |
| --- | --- | --- |
| Lead | Opus | Coordinates one goal: talks to the owner, splits the goal, creates tasks, verifies, commits, pushes, and takes it to a merged pull request |
| Tester | Sonnet | Runs before the builder. Input is the spec path; it works with no implementation: the spec, the public interface (signatures, types) and the test config only (D-31). Writes tests that name the row they cover and fail for the right reason; the builder may not edit them |
| Builder | Sonnet (Haiku for a mechanical one-file task) | Writes code in the files its task names |
| Reviewer | Sonnet | Independent review of a pushed head, by area (backend, frontend, hooks, docs, security). Never the author. Gates first, every FAIL cites a row or gate, at most 3 rounds, a binary verdict, check output pasted |
| Researcher | Sonnet | Answers one question, or investigates a track and drafts its brief |
| Ops | Haiku | Runs long commands and recordings, and reports what they printed |

The lead coordinates, assigns and verifies. It does not do teammates' tasks: it delegates them by role and waits. The docs say: "Wait for your teammates to complete their tasks before proceeding" ([agent teams](https://code.claude.com/docs/en/agent-teams)). Reading code to find a cause, editing files, research, long commands and recordings go to a teammate: a Researcher (Sonnet) to understand, a Builder (Sonnet) to change, a Reviewer (Sonnet) to check, Ops (Haiku) to run. The lead may read one file or run one command to verify a report. Its own calls are task and message tools, Agent, rerunning a check, git commit and push. It watches the team and steers, because "Letting a team run unattended for too long increases the risk of wasted effort" (same page). A lead that does the work itself is busy when the owner needs it, and nobody reviews what it did.

A brief is the path of one approved small spec, drafted by a researcher; the writer runs its Done command before assigning it. A spec-driven pile runs tester, then builder blocked by it, then review blocked by the build.

Define roles once as [subagent definitions](https://code.claude.com/docs/en/sub-agents), and spawn by role. A model named in a spawn prompt overrides the definition. The definition's `skills` field does not apply to a teammate.

## One coordinator per goal

*This guide's practice, not the docs':* give one goal to one lead, in its own worktree, and let it finish the goal. The lead splits the goal, coordinates its team and takes it to a merged pull request. It does not stop at a plan.

Avoiding conflicts is the coordinator's job, not the workers'. As a lead, it delegates so no two teammates touch the same file. Among leads, it keeps goals apart so no two coordinators touch the same file. A collision means the split was wrong, so fix the split, not the worker.

- **A coordinator is a session, not a teammate.** A session has one team, a teammate cannot start teammates, and the lead is fixed for the session's life ([limitations](https://code.claude.com/docs/en/agent-teams#limitations)). So start each coordinator yourself, in its own worktree: `git worktree add ../<repo>-<goal> -b <goal>`, then `claude` there, or open the worktree in a workspace tool such as Orca.
- **One goal, one branch, one worktree.** Two coordinators never edit the same file. If two goals need the same file, one waits for the other's merge, or both become one goal.
- **You set the limit.** Watch the coordinators yourself while you can review what they ship. Past that, add a coordinator of coordinators.

### A coordinator of coordinators

A session that only coordinates. It writes no code: it briefs each goal's coordinator, reads their pull requests and orders the merges.

- It reaches the other sessions with [cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging): Claude finds them with `ListAgents` and writes with `SendMessage`. A message is plain text, and it never approves anything in the session that receives it.
- To hear when a coordinator is done, ask for one notice when that session next goes idle, instead of checking on it. Only the main conversation can ask, only for sessions on the same machine, and the request expires after 12 hours.
- Run every coordinator in the same permission class. By default, a session that bypasses permission prompts holds a message from one that does not, and the other way round, for your approval; an unanswered approval drops the message after 5 minutes. If the classes must differ, set `crossSessionInbound` to `accept`.
- Merges stay serial (see [Parallel, and where it stops](#parallel-and-where-it-stops)). One session or one person owns the merge order.

Status: one coordinator per worktree, several side by side, is how this guide's owner works day to day. Not yet run: a coordinator of coordinators.

## The pile

The lead fills the shared task list. Teammates take the next free task.

- **Team size:** Start with 3 to 5 teammates, with 5 to 6 tasks each (the docs). Past some point, more adds coordination faster than speed.
- **A task** carries its brief, its files and how it is verified. A teammate does not inherit the lead's conversation.
- **Dependencies** go on the task, because a blocked task is not self-claimed: a review waits for the push; a task that edits a file waits for the PR that also edits it. A teammate may still set a blocked task to in_progress with `blockedBy` intact (*observed*, [issue #13](https://github.com/antonygiomarxdev/puppeteering/issues/13)): spawn prompts should say "a task whose `blockedBy` is not empty is not free, even if it looks idle", and the lead checks the pile once right after spawning. A block clears when the blocking task completes, not when its PR merges ([issue #10](https://github.com/antonygiomarxdev/puppeteering/issues/10)); when a dependency needs the code on the base branch, block on a "Merge PR N" task owned by the lead (proposed there, not yet run).
- **Give the lead's own tasks an owner**, or a teammate can claim them. Writing them down lets you see the whole queue with `Ctrl+T`.
- **Name a role in the description**, such as "Builder." or "Reviewer.". With one teammate per role, spawn it with one instruction: take the lowest free task for your role.
- **With several teammates of one role, assign by name before they start.** Set each task's owner before spawning, and name the task and its files in the spawn prompt. Tell the teammate not to claim other tasks and to stop when its own are done. An owner on the task alone did not stop a claim, and an owner set mid-run arrives too late.
- **A teammate that creates a file stops if it already exists.** *Observed:* a Write result that says "updated", not "created", meant another teammate wrote there first.
- **One file per task and no messages between workers?** Fix each agent's file in its prompt and skip the shared list: a Workflow ran that way with no collisions.
- **A brief names its output format and what the teammate must not touch.** Anthropic: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries" ([multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)).
- **Set the owner before the work starts.** The lead sets it before pointing anyone at a task, and a teammate sets it before its first edit. With several teammates of one role, a task with an empty owner gets built twice.
- **An assignment by message must also set the owner on the task.** A message can cross the teammate's idle notice, and in the run seen the idle teammate was not woken. The task file holds the truth, and the `TeammateIdle` hook reads it. `TaskUpdate` has no `removeBlockedBy`; the agent-teams docs let the lead assign a blocked task anyway.
- **A spec-driven pile hands a spec path, not a brief.** The description is the path of one approved small spec (rows quoted from its parent, at most 3 files, one done command). A teammate that needs a file outside the spec stops and asks, and the lead fixes the spec, not the report. *Observed* ([issue #11](https://github.com/antonygiomarxdev/puppeteering/issues/11)): briefs that retold the decision made builders optimise for the brief, and one touched six files where the spec named three. The lead runs the final gates on every system CI covers.
- **One instruction per message, stated once, as the last line.** If you change your mind while writing, delete the first half before sending. *Observed* ([issue #14](https://github.com/antonygiomarxdev/puppeteering/issues/14)): an answer held "export it" and "leave both copies"; the builder had already exported, then reverted a file outside its spec.
- **To pause a team, change the pile first,** then message: reassign or block every open task of that role. *Observed* ([issue #12](https://github.com/antonygiomarxdev/puppeteering/issues/12)): a "PAUSE now" message alone did not stop two builders; each took one or two more tasks. Moving the tasks to an owner no teammate has, then a shutdown request, did.

Status: run with one researcher, one builder and one reviewer, each given no task by name, and each found, claimed and finished its tasks. Several of one role taking the lowest free task collided three times in one run, and the second write replaced the first; assigned by name in the spawn prompt, the next run wrote 24 files with none ([#5](https://github.com/antonygiomarxdev/puppeteering/issues/5)). Claiming [uses file locking](https://code.claude.com/docs/en/agent-teams#assign-and-claim-tasks), and the list kept one owner, so the loser wrote anyway: a teammate writes only after `TaskGet` shows it as the owner. The rule for how long a teammate lives is not settled; see [`LESSONS.md`](LESSONS.md).

## Files and worktrees

A teammate never kills a process by name (`taskkill /IM`, `pkill`, `killall`): that closes the owner's own windows too. It kills only the PID it started, or one whose command line holds its own profile or temp folder.
Two teammates editing one file overwrite each other, and teams do not isolate teammates. So every task names a set of files that does not overlap with another running task. A hand mutant counts as an edit: a reviewer mutates a copy of the code, not the live file, unless no other task writes there.

*This guide's practice, not the docs':* one worktree per coordinator (see [One coordinator per goal](#one-coordinator-per-goal)). Inside it, teammates share the checkout and split by files. A goal that needs two branches at once is two goals. Passing `isolation` on the Agent call would make it a subagent, not a teammate. Install dependencies in each worktree, because a fresh checkout has none.

## Parallel, and where it stops

While an independent task is ready, it runs. What stops one is a shared file, an unmet dependency, a decision only a person can make, or the machine.

- Merges are serial when the base must be current: each merge makes the next PR re-integrate and re-check. Writing and reviewing scale; merging does not. Order the merges by what they unblock.
- If the lead writes every brief by hand, the team is serial. A researcher drafts; the lead verifies the draft.
- Watch the machine. Heavy checks in parallel compete for it, and a shared CI runner becomes a queue.
- Before asking the owner, sort each open question: **Owner** (only the owner can answer: product, priority, money, risk), **Research** (a researcher answers it with sources) or **Lead** (the lead decides and records it). Close the last two first, then send the owner the Owner questions in one message, each with a recommendation. *Observed* ([issue #17](https://github.com/antonygiomarxdev/puppeteering/issues/17)): four questions went to the owner at once and one was researchable.

## Verify, do not relay

- A report is a claim. Read its commands and output, then run the check again.
- Telling a teammate to run the check is not the check. *Observed in another project* (mill, [lesson 13](https://github.com/antonygiomarxdev/mill/blob/main/LESSONS.md)): three Haiku agents whose briefs said "actually RUN these commands" reported "verified by inspection"; the code happened to be green, and the lead learned that only by running the commands itself.
- Verify by running the behaviour, not by reading the shape of the result. *Observed in another project* (mill, [lesson 17](https://github.com/antonygiomarxdev/mill/blob/main/LESSONS.md)): tests asserted the configured `core.hooksPath` and never ran a hook, so every delegated worktree ran no hooks while they all passed. State the acceptance test as something observable: make a violating commit and assert it is rejected.
- Give every task a check that returns pass or fail, and ask for the command and its output as evidence. Define success before the agent starts; see Osmani on [agentic verification](https://addyo.substack.com/p/agentic-verification).
- A brief states only what was just run. Whoever writes it runs its start check, and names every file the change reaches.
- Do not cite an issue, a spec or a page you have not opened.
- A pull request says what was not verified, because a check always leaves something out.
- Prove a test with a hand mutant: break the code, watch it fail, restore it.
- A task that fixes a security bug says so, and its test stubs the dangerous call (set the override variable, or point `PATH` at a stub) instead of letting the real call happen. The reviewer checks that before running the suite. *Observed* ([issue #15](https://github.com/antonygiomarxdev/puppeteering/issues/15)): a test for "the hook never runs a package fetched by name" ran the real call and downloaded another project's package.
- A test run while another teammate edits the same tree proves nothing. Make the final run with the team idle.
- A change to a task already completed goes into a new task with a new number, not into the old task's description.

## Review

- A reviewer is a session that did not write the code. The [best practices](https://code.claude.com/docs/en/best-practices) say why: it is not swayed by the reasoning that produced the code.
- Review against a spec, and say to skip style: a reviewer asked to find problems always finds something.
- Ask reviewers to run things, not to read them, and to report what they did not check.
- A reviewer holds the method; the rules come from the project (D-30). Examples a project may adopt into its own docs: backend (dependency direction, error paths, negative examples tested), frontend (UI rules, screenshot, UX states), hooks (exit codes, `stop_hook_active`, Windows and Linux), docs (claims opened and linked, caps), security (the test stubs the dangerous call). No agent applies these by itself.
- The docs' example runs several reviewers on one PR, each with one lens (security, performance, tests).
- Keep every reviewer until its last report is in. Do not call the work ready, or send shutdowns, before then.
- Read the decisions an agent made, not only its summary. Accepting output because it looks right is what Osmani calls [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/).

## Put what must hold in a hook

`CLAUDE.md` is context, and `command` and `http` hooks are deterministic. If you keep adding emphasis to a line and it is still missed, make it a hook. Delete hooks that are only preferences. *Observed in another project* (mill, [lesson 10](https://github.com/antonygiomarxdev/mill/blob/main/LESSONS.md)): a skill said "you MUST spawn reviewer" and "coverage must be ≥90%"; the reviewer was never spawned and 85.5% coverage went on. A script that exits non-zero stops the work; a MUST in markdown does not.

| Hook | Use |
| --- | --- |
| `TaskCreated` | Refuse a task with no check or no owner role |
| `TaskCompleted` | Refuse completion until the check passes |
| `TeammateIdle` | Send a teammate back when work is left |
| `PreToolUse` | Deny a dangerous command. A deny holds in every permission mode |
| `Stop` | Send the session back when a check fails. By default it blocks at most 8 times in a row with no tool call between. `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` changes that |

puppet-teams enforces `TeammateIdle` (since 0.3.0, `hooks/idle.js`): an idle teammate with an open task, owned by it or free with its role as the subject prefix, gets exit 2 and `new task N: <subject>, not task M again`. It nudges twice per task, then lets the teammate idle. Exit code 2 blocks and sends stderr back. Keep `CLAUDE.md` short, under 200 lines, and move procedures to [skills](https://code.claude.com/docs/en/skills).

A lesson becomes a rule, a `RULES.md` line or a hook only with `Status: adopted`, and only on an RC-n row of [the rule ledger](docs/retro/rule-ledger.md) whose verdict is not `confounded`. Every change to a rule adds an RC-n row: `confounded` when more than one rule changed or one run is all there is.

## Cost

Token use grows with each active teammate; the [costs page](https://code.claude.com/docs/en/costs) says about 7 times a normal session when teammates run in plan mode.

- Use Sonnet for teammates: the [costs page](https://code.claude.com/docs/en/costs) says "It balances capability and cost for coordination tasks." For simple subagent tasks it says to specify `model: haiku`.
- Keep teams small and spawn prompts focused. Shut a teammate down when its work is done. Send `{"type": "shutdown_request", "reason": "..."}` with SendMessage; a teammate told in prose says it stops and keeps running.
- A teammate that stops already delivers its final answer to the lead. Have it report only there, and message the lead only when blocked: every message wakes the lead, and every wake re-reads the lead's whole conversation.
- Wait on several CI runs with one watcher, not one each, and do not answer a notice that needs nothing.
- A teammate runs commands in the foreground: its background command does not wake it, and it sits idle with the work unfinished. Idle with no final report means stalled, so read the agent list before you say who is working.
- If a reviewed pull request falls behind, merge the base into it rather than rebasing, when your merge check keeps a review across merge commits. Then only CI runs again, and the reviewer sleeps.
- A lead's context outweighs its duplicates. Keep state in files and an issue tracker, and start a new session at a natural stop: `/clear` costs nothing.
- An in-process teammate's prompt cache lasts 5 minutes by default, so waking one after a long idle costs more. `subagentPromptCacheTtl` extends it, at a higher write price.
- The built-in `Explore` runs on your session's model, or on Opus when that is Fable on a subscription, Console account or LLM gateway. A subagent [named `Explore`](https://code.claude.com/docs/en/sub-agents#built-in-subagents) in `~/.claude/agents` overrides it, so `model: haiku` makes every search cheaper. Set `omitClaudeMd: true` too: the built-in starts without `CLAUDE.md`, and an override does not unless you say so. Keep `CLAUDE.md` on any agent that needs your rules.
- On a Pro, Max, Ultra, Team or Enterprise plan, `/usage` shows the share by subagent type. Measure before you tune; this guide has not measured its own rules yet.

## Safety

- Teammates start in the lead's permission mode, including `bypassPermissions`. If the lead is in `dontAsk`, they start in Manual. Pre-approve the common operations instead.
- A teammate's message is never your approval, and a teammate that was denied something cannot relay it.
- A rule that stops teammates must hold in every directory they work in. Test it from a sibling worktree: `${CLAUDE_PROJECT_DIR}` stays at the project root while the hook's `cwd` follows the worktree.
- Anything that changes production waits for a person's yes, for that step.

## Status

Before telling anyone where things stand, list the agents and read the last comment of each open pull request. *Observed:* a teammate's message can arrive late, in a batch.

Say plainly when the process is not what the documents say.

## In the desktop app

Not docs: the Claude desktop app (Code tab) ran named agents as subagents, not as teammates. One Windows 11 run showed it (see [`LESSONS.md`](LESSONS.md)). The lead had the Task tools. The agents had none, could not claim, and reached the lead as `main`, not `team-lead`.

What the docs say: the desktop page (https://code.claude.com/docs/en/desktop, read 2026-11-20) says "Agent teams: coordinated teams, where Claude as the team lead assigns tasks to teammates from a shared task list, are available in the CLI, not in Desktop." The run above agrees: named agents were subagents. A subagent has the Task tools "only when your session has them", and without them "an agent coordinates with its team through messages instead of the shared task list".

So in the app, work as if you have subagents:

- The lead owns the task list and marks every task itself, when the agent hands back.
- The lead assigns by message, and names the task: "new task N, not task M again".
- Each agent gets its own files, so two never write the same one. Nobody claims, so nothing else stops them.
- Run `TaskList` as the first call in an agent. If it fails, the agent has no task tools: it reports by message and does not edit `~/.claude/tasks`.
- For a real team with a shared list, use the terminal. The desktop page names dynamic workflows for multi-agent work in Desktop; whether this method can use them is not researched.

## Known limits

From the docs: `/resume` and `/rewind` do not restore in-process teammates; one team per session; no nested teams; the lead is fixed, so each coordinator is its own session; task status can lag, so check whether stuck work is really done; shutdown can be slow; split panes need tmux or iTerm2.

So keep a status file a restarted session can read, with each builder's files and task.
