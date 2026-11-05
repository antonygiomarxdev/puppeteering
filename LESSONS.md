# Lessons

Newest first. Each one is something a real run showed. A rule in the guide changes when a run shows it wrong, and the run goes here.

## 2026-11: a team with no task list is subagents

A team ran for a day with zero tasks in its shared list. On newer models the Task tools are off by default, and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` does not turn them on. The person running it noticed before the lead did: the agents looked like subagents, because they nearly were.

Changed: `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in the user settings. The tools loaded in the running session once the file was saved. A new teammate had them, and took tasks from the list with no task named in its prompt.

Learned: the lead's own tasks need an owner, or a teammate can claim them. Setting one sends the lead a notice per task.

Open: whether teammates already running get the tools, and how several of one role compete.

## 2026-11: reusing teammates needs a rule that fits the pile

The lead reused teammates across pull requests with no rule, and most sat idle. It then proposed "new task, new builder", which goes against the docs' few teammates with several tasks each. The rule is not settled, and the cost of an idle teammate is not measured.

## 2026-11: parallel work finds what serial work hid

With seven pull requests open at once, and an independent reviewer on each, reviews found real defects that gates had passed: a synced table with no `id` column, which would have kept one row on the phone, and a guard against teammates running git that held only in the lead's checkout.

A throwaway probe, run beside the rest, showed that an OAuth token issued to a client could do more than the design assumed. Ask of any credential you hand to a third party: what else accepts it?

Cost seen: each merge makes the other pull requests re-integrate and re-run their gate, and CI on one self-hosted runner queues.

## 2026-11: the lead was the bottleneck

The lead wrote each brief by hand and started a track only when another ended. Researchers drafting briefs removed that. The briefs still held defects that builders caught before their first edit: a path that did not exist, a required step the same brief forbade. A brief's start check must be run by whoever writes it.

## 2026-11: a document said the opposite of the goal

The team's own document said one team means one pull request at a time, so the lead worked in series while builders were already working in other worktrees. A rule that describes the first days of a tool goes stale. Re-measure it when the way of working changes.
