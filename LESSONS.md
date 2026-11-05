# Lessons

Newest first. Each one is something a run showed.

## 2026-11-05: a team with no task list is subagents

The team ran for a day with zero tasks in its shared list. On Opus 5.5 the Task tools are off by default, and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` does not turn them on. The owner noticed before the lead did: «yo veo que estás trabajando como con subagentes prácticamente».

Changed: `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in the user settings. The tools loaded in the running session once the file was saved, through tool search, with no restart.

Open: whether teammates already running get the tools, and whether self-claiming across worktrees works.

## 2026-11-05: reusing teammates needs a rule that fits the pile

The lead reused teammates across PRs with no rule, and most sat idle. It then proposed "new task, new builder", which goes against the docs' few teammates with several tasks each. The rule is not settled. The cost of an idle teammate is not measured.

## 2026-11-05: parallel work finds what serial work hid

With seven PRs open at once, one independent reviewer per PR found real defects: a table with no `id` column that would have kept one row on the phone, and a hook that let a builder in a sibling worktree commit. A probe run the same way, beside the rest, found a sign-in token that could change a password.

Cost seen: each merge makes the other PRs re-integrate and re-run their gate, and CI on one self-hosted runner queues.

## 2026-11-05: the lead was the bottleneck

The lead wrote each brief by hand and started a track only when another ended. Researchers drafting briefs removed that, and the briefs still held defects builders caught before their first edit: a path that did not exist, a required step the same brief forbade. A brief's start check must be run by whoever writes it.
