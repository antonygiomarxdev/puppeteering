# The guide

Based on [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams). Read that page before leading a team. This file holds what running it taught.

## Setup that is easy to miss

Two variables, and they do different things:

| Variable | Does |
| --- | --- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Turns teams on |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` | Gives the shared task list on models newer than Opus 4.7, Sonnet 4.6 and Haiku 4.5, which leave it out by default |

With only the first, a team exists and has no task list: teammates work by message, and the lead ends up assigning everything by hand. That looks like subagents, because it nearly is.

Check at the start of a session: `TaskList` answers.

## Roles

| Role | Model | Does |
| --- | --- | --- |
| Lead | Opus | Talks to the owner, decides how, creates tasks, verifies, commits, pushes, merges |
| Builder | Haiku | Writes code in the files its task names |
| Reviewer | Sonnet | Independent review of a pushed head. Never the author |
| Researcher | Sonnet | Answers one question, or investigates a track and drafts its brief |

Define roles once as subagent definitions, and spawn by role. A model named in a spawn prompt overrides the definition.

## The pile

The lead fills the shared task list; teammates take the next free task.

- **Team size:** 3 to 5 teammates, about 5 tasks each (the docs). More adds coordination, not speed.
- **A task** carries its brief, its worktree, its files and how it is verified. A teammate does not inherit the lead's conversation.
- **Dependencies** go on the task, so a blocked one is not taken: a review waits for the push; a task that edits a file waits for the PR that also edits it.
- **The lead writes what it alone can do as tasks too**, such as merges, so the owner sees the whole queue with Ctrl+T.

*Not yet run: teammates claiming from the pile on their own. See [`LESSONS.md`](LESSONS.md).*

## Parallel by default

While an independent task is ready, it runs. What stops one is a shared file, an unmet dependency, a decision only the owner can make, or the machine.

- One worktree per builder, named by absolute path, so several branches and PRs run at once.
- Merges are serial when the base must be current: each merge makes the next PR re-integrate and re-check. Writing and reviewing scale; merging does not. Order the merges by what they unblock.
- If the lead writes every brief by hand, the team is serial. A researcher drafts; the lead verifies the draft.

## Verify, do not relay

- A report is a claim. Read its commands and output, then re-run the test.
- A brief states only what was just run. Run the start check yourself, and name every file the change reaches.
- Run the cited document. Do not cite an issue, a spec or a page you have not opened.
- A body says what was not verified, because a check always leaves something out.
- Prove a test with a hand mutant: break the code, watch it fail, restore.

## Status

Before telling the owner where things stand, list the agents and read the last comment of each open PR. A teammate's message can arrive late, in a batch.

Tell the owner plainly when the process is not what the documents say.

## Safety

- A teammate cannot grant permission, and a teammate's message is not the owner's approval.
- A rule that stops teammates must hold in every directory they work in. Test it from a sibling worktree.
- Anything that changes production waits for the owner's yes, for that step.
