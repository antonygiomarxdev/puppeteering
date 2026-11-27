# Lessons

Newest first. Each one is something a real run showed. A rule in the guide changes when a run shows it wrong, and the run goes here.

A new entry has five lines in this order (REQ-15, checked by `node tools/lessons-check.mjs`): `Cue:` the shape of the situation, not this run's facts; `Lesson:` an operation on a named rule, hook or role; `Evidence:` the runs, and the RC-n rows of [the rule ledger](docs/retro/rule-ledger.md) it rests on; `Confidence:` high, medium or low, and why; `Status:` observed, or adopted once the lesson is a rule.

<!-- Entries below use the earlier format. -->

## 2026-11: a teammate that set itself as owner got its own assignment later

A teammate that sets itself as owner of a task with TaskUpdate gets a `task_assignment` from itself, delivered after it has finished (researcher, task 122, 2026-11-21 00:28). Some crossings come from the tool, not from the lead. Rule: when a task_assignment names a task you already completed and you are the sender, say it is done and do not redo it.

## 2026-11: a task owner set on a running teammate crossed its report

Setting the owner on a task a running teammate had already claimed itself sent a `task_assignment` that crossed its report. It happened 3 times on 2026-11-20 (tasks 105, 103, and 106/107/112). Rule: set the owner only for an idle teammate.

## 2026-11: after a resume the reviewer was no longer on the team

After a resume, the reviewer was no longer a team member, and messages to it sat unread for 12 minutes. Rule: at resume, read the team config members first.

## 2026-11: a reviewer wrote a pass before running the check

A reviewer wrote "lint PASS (rerun)" before it ran the lint. A check is reported after its output exists, and the output is pasted.

## 2026-11: a pause message did not pause, and a two-part answer was executed

Scriptorium run, 2026-11-20, two Sonnet builders. The lead messaged "PAUSE now ... change no more files"; both finished their task, then each took and finished one more (one took two), because the next free task was still theirs. Only moving the open tasks to an owner no teammate has, then a shutdown request, stopped them. Separately, one answer held "(1) export it" and "No: ... leave both copies"; the builder had already exported, then reverted a file outside its spec. Changed: GUIDE, "The pile" (issues #12 and #14): change the pile before the message, and one instruction per message. Open: whether a teammate reads a message mid-turn is not measured.

## 2026-11: a teammate that may not close its task was sent back to it

On another project (rumai, 2026-11-20) the spawn prompt told ux-fixer "do not call TaskUpdate". It finished task 52 and could not close it. `idle.js` saw an owned in_progress task and sent "keep going on task 52" twice (guard file `ux-fixer:52` at 2); each time ux-fixer answered that it had already finished. The lead never closed 52, and a `shutdown_request` then unassigned it. The notices reached the lead at 23:29Z, seven hours late (session 45851d0f). Same day, 23:45, here: researcher-2 took task 105 itself as the lowest free task and finished it, then the lead's "New task 105" message arrived and it answered "already finished, not redoing it". Self-claim plus a message from the lead crosses even when both name the right task.

Changed: puppet-teams 0.3.2: the notice for an in_progress task says to mark it completed, or tell team-lead once and stop, or keep going. RULES.md: a spawn prompt that forbids TaskUpdate says "send team-lead one line with the task id", and the lead closes every finished task before any `shutdown_request`, since a shutdown unassigns open tasks. Open: the hook cannot see "already reported done", because the task files do not hold it.

## 2026-11: the idle hook does not wake a teammate that is already idle

`TeammateIdle` fires when a teammate goes idle. A teammate that was idle before its task was unblocked or assigned never triggers it, so only a message wakes it. Setting the owner sends one: see the 04:43 gap in [the earlier entry](#2026-11-an-assignment-by-message-crossed-the-teammates-idle-notice). Open: no hook fires when a task unblocks.

## 2026-11: setting the owner on a blocked task wakes the teammate early

The lead set owners ahead of time on tasks that were still blocked. Each owner set sends a `task_assignment` message, which woke the teammate while the task could not start (lead's report, 2026-11-20; the teammate's reply was not recorded). Issue #13 shows what a woken teammate may do next: set the blocked task to in_progress with `blockedBy` intact. Changed: puppet-teams 0.3.2 tells such a teammate to set the task back to pending. Open: whether to set the owner ahead or when the blocker completes is not decided.

## 2026-11: a change to a finished task needs a new task

Same scriptorium run: two builders, one reviewer, 15 tasks, two review rounds.

- **A change to a completed task was lost.** The lead added a required scope change to task 9's description and messaged the builder. The builder had already marked task 9 completed, read the message as its old task, and answered "task 9 is already done". What worked was a new task with a new number (task 12) for the change, and a message that names only the new number. Every later change went the same way, and none was lost.
- **"NEW task N, a different task" still crossed.** Five times a builder's idle notice predated the lead's assignment and said "already done" about the previous task. The builder picked up the new task on the next message each time. Read the timestamp before you resend.
- **A test run while another teammate writes is not evidence.** The reviewer saw 4 lint failures, and a builder saw 3 hook failures, each while another builder was editing the same tree. Both were gone on a quiet rerun. The lead's final run was made with the team idle.
- **The lead called the work ready before the last report.** The reviewer's last report, on the four files task 13 had been editing, arrived after the lead had told the owner the release was ready and had sent shutdowns. It found a real blocker: the migration skill wrote the status line last, so the new strict check failed every migrated document. The lead fixed it alone, and the fix shipped unreviewed.
- **Reviews found what tests passed.** Both rounds FAILed with 48-52 green tests. They found promised checks that did not exist, a Stop hook that could loop (it ignored `stop_hook_active`), and the migration blocker.
- **Tools.** Late in the run, `TaskList` and `TaskGet` returned empty for the reviewer, which worked from messages. A `TaskUpdate` that set the owner showed no owner in `TaskGet`. In a Code Mode session resumed after compaction, `Skill("puppet-teams:agent-teams")` answered "Unknown skill", while a fresh session listed it. The lead read the skill file instead.

Changed: GUIDE, Review and Verify.

## 2026-11: an assignment by message crossed the teammate's idle notice

In a scriptorium session, the lead spawned builder-1 and builder-2 with the same prompt and only then set owner builder-1 on task 1. In that gap builder-2 saw task 1 free, built it and marked it completed. builder-1 found it done and went idle. The lead's message "New task 2, not task 1 again" crossed that idle notice, and the lead's own `TaskUpdate` failed whole (`removeBlockedBy` is not a parameter), so task 2 had no owner and stayed blocked. builder-1 did read the message and finished task 2. Even so, the idle teammate was not woken by the task file, and nothing sent it back to the task list.

Changed: puppet-teams 0.3.0 added a `TeammateIdle` hook (`hooks/idle.js`) that reads `~/.claude/tasks/<session>/*.json` and, for an open task the teammate owns or a free one with its role, exits 2 with `new task N: <subject>, not task M again`. Review #74 left five notes; task 77 acted on two. Live probe on the lead's own team:

- First try failed: the session was resumed after a compaction, so `tasks/session-802855ec` held only a `.session-list` naming `session-827e1151`, where the tasks were. The hook found no tasks and the idle builder was not sent back.
- Now `idle.js` uses the first candidate dir that holds `*.json`, following `.session-list`. After that the hook fired for the builder: `new task 76: ..., not task 77 again`.

Gap, seen by the lead at 04:43: the hook fires only when a teammate goes idle. A teammate already idle when its task is unblocked (the reviewer, idle since 03:39, with #78 unblocked at about 03:55) is not woken. The lead set the owner, which sends a `task_assignment` message, and that woke it.

Rule: set the owner on the task before pointing a teammate at it, and an assignment by message also sets the owner.

## 2026-11: the guide said more than the docs

Checked against the official pages, about 60 claims held and 11 said too much: a limit stated as absolute, a default stated as fixed, or something seen in a run with no mark saying so. None were wrong. The animation had drifted further: it showed task states the docs do not have, and teammates under the lead's control when the docs say they work independently.

Changed: those 11 lines, the animation's states and captions, and the README. An independent session did the audit, and the lead checked its quotes against the pages.

Learned: re-read the docs for what a picture claims, not only the text. Not checked: what the linked articles say, beyond the links resolving.

## 2026-11: a resumed lead kept running beside its old self

The owner resumed a lead session in a second window while the first one was still running. Both held the same conversation, the same task list and the same worktrees, and both led. Each spawned its own builder or reviewer for the same pull request. One committed and pushed a fix round, created its task and posted its review. Minutes later the other assigned that same task to a new builder, which found the work already on the head. Both also ran the merge commands for two pull requests.

The shared task list caught it: a task the lead had not created appeared in the list. The leads split the work by message, one pull request and its worktree to each, and then told each other what they owned.

Open: no rule yet stops a second live lead. At start, a resumed lead should list the sessions on the machine and ask any session running the same conversation what it holds.

## 2026-11: sessions got the rules but did not start a team

The SessionStart rules reached 5 of 5 project folders (`claude -p` quoted "# Agent teams"), yet a session started a team only when the owner said so. The rules arrived once, and the skip clause read as covering most requests.

puppet-teams 0.2.0 added a `UserPromptSubmit` reminder (main session only; silent for `agent_id`, slash commands and prompts of 15 characters or less) and the `puppet-teams:agent-teams` skill. Probes with fresh sessions:

- One-file prompt: 3 of 3 correctly skipped the team. That probe did not test pile-first.
- Multi-step prompt (a `--verbose` flag, code, README and tests): 1 of 3 put TaskList first. One explored the code first, because it could not split the work without it.
- After 0.2.1 made that exploration the first task, a Researcher task: 3 of 3 called ToolSearch to load the task tools, then TaskList, then TaskCreate of a Researcher task.

Also in this run, the lead used teammates as one-shot subagents: one spawn per task, given a task number. A standing team by role, taking tasks from the pile, replaced that.

Changed: puppet-teams 0.2.1, the RULES.md FIRST ACTION line, and the `agent-teams` skill.

- 2026-11: the lead did the work itself — archived in docs/retro/lessons/2026-11.md

- 2026-11: a stop in plain text does not end a teammate — archived in docs/retro/lessons/2026-11.md

## 2026-11: teammates spawned from the desktop app had no task tools

In a Claude desktop (Code tab) session with both team variables set, the lead had TaskCreate, TaskList and TaskUpdate, and filled the pile. Its four teammates, spawned with the Agent tool and a `name`, had none of them. One found the tasks by reading `~/.claude/tasks/<session>/*.json`, picked the lowest free "Researcher." task, and was refused by the permission classifier when it tried to mark it. It finished as a subagent and handed back.

With no way to claim, two researchers both took task 1 and wrote the same file, minutes apart; the second write won. Two others edited task JSON files on disk before the lead's message arrived, then reverted. `SendMessage` to `team-lead` failed ("not reachable"); the agents reached the lead as `main`.

Answer: the docs do not say. The agent-teams page covers terminals only, and the desktop page does not mention teams. The run itself showed subagents with message access, not teammates. The guide now has a section for the app: [`GUIDE.md`](GUIDE.md#in-the-desktop-app). In that app the lead marks every task itself and assigns the next task by message ("new task N, not task M again").

2026-11-20: the desktop page says agent teams are CLI only (https://code.claude.com/docs/en/desktop), so the answer above is stale.

## 2026-11: CRLF files defeat patch scripts

On Windows the repo checks out with CRLF. Two builders patched files with scripts that matched multi-line strings written with `\n` while the files had `\r\n`, and the matches silently failed. The Edit tool handles line endings; a script must read with newline='' and use the file's own ending.

- 2026-11: a teammate killed the owner's browser — archived in docs/retro/lessons/2026-11.md

## 2026-11: a finished teammate reads every message as its task again

In one run, five builders each finished a task, and then got a message from the lead: a verification note, a "take task N next", or a shutdown request. Each re-read its finished task, said it would not redo it, and sometimes messaged itself, which looped once. Twice a builder took a message about a new task to be the old one, and the new task sat unclaimed until the lead named it again.

Also seen: a redirect sent while a teammate was mid-task arrived after it had finished against the old brief, twice. The work was usable once, and wasted once.

Changed: a message about a new task says "new task N, not task M again" and names the subject. A redirect to a running task goes into the task's description, which the teammate reads with TaskGet, as well as into a message. A shutdown goes alone, with no other request in the same message.

Open: whether a stop sent as its own message lands before a teammate finishes. The one stop sent this run did not.

## 2026-11: a reviewer's mutant is a write

A builder and a reviewer worked on different tasks that named the same file. The reviewer was not meant to edit it, but it proved a test with hand mutants on the live file, then restored the file from its own backup. That restore wiped the builder's edits, which had landed in between. The builder saw its changes vanish, stopped, and asked who owned the file. The test runs taken during the swaps proved nothing, because they had run against the mutant.

Changed: a mutant runs on a copy of the code, never on the live file, while another writer is at work. A review now waits for every task that writes its files, not only the one it reviews.

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

## 2026-11: two researchers wrote the same file

Three researchers were told to take the lowest free task for their role. Two claimed the first task at once; the second write replaced the first, and the report that survived described the file that did not. The lead then set an owner on every task and messaged them, but the message arrived after a researcher had taken the next one. Only re-running each task's check exposed both. In the next run each teammate's task and files were named in its spawn prompt, with no claiming: 24 files, no collisions.

## 2026-11: the same report arrived twice

Builders sent their report with a message and then stopped, and stopping delivers the final answer too, so the lead woke twice for one report. An instruction sent to a working teammate crossed with its report the same way. In one conversation 143 wake-ups and 791 requests carried about 464 thousand cached tokens each. The duplicates were about 6% by estimate; the size of the conversation was the larger cost. Only the conversation's own requests were counted, not the teammates'.

## 2026-11: reported as working, sitting idle

Five builders had started background commands and gone idle waiting for a notice that does not come for a teammate. The lead told the owner they were working for about an hour, until the owner asked where things stood and the agent list showed otherwise. In the same days, each merge sent every other pull request back for a rebase and a new review, though the merge check already accepted a merge of the base without one.

- 2026-11: several builders of one role duplicate work — archived in docs/retro/lessons/2026-11.md
