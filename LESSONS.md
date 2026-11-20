# Lessons

Newest first. Each one is something a real run showed. A rule in the guide changes when a run shows it wrong, and the run goes here.

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

## 2026-11: sessions got the rules but did not start a team

The SessionStart rules reached 5 of 5 project folders (`claude -p` quoted "# Agent teams"), yet a session started a team only when the owner said so. The rules arrived once, and the skip clause read as covering most requests.

puppet-teams 0.2.0 added a `UserPromptSubmit` reminder (main session only; silent for `agent_id`, slash commands and prompts of 15 characters or less) and the `puppet-teams:agent-teams` skill. Probes with fresh sessions:

- One-file prompt: 3 of 3 correctly skipped the team. That probe did not test pile-first.
- Multi-step prompt (a `--verbose` flag, code, README and tests): 1 of 3 put TaskList first. One explored the code first, because it could not split the work without it.
- After 0.2.1 made that exploration the first task, a Researcher task: 3 of 3 called ToolSearch to load the task tools, then TaskList, then TaskCreate of a Researcher task.

Also in this run, the lead used teammates as one-shot subagents: one spawn per task, given a task number. A standing team by role, taking tasks from the pile, replaced that.

Changed: puppet-teams 0.2.1, the RULES.md FIRST ACTION line, and the `agent-teams` skill.

## 2026-11: the lead did the work itself

In the 2026-11-18 run the lead read code, grepped, extracted video frames and checked docs itself between delegated tasks. The owner had to ask twice for delegation by role.

Changed: GUIDE Roles and puppet-teams RULES.md: the lead delegates every piece of work to a teammate of the right role, and stays free.

Then checked against the sources: the docs recommend Sonnet for teammates, not Haiku, and say the lead should wait for teammates rather than implement. Changed: builders on Sonnet; the lead may read one file or run one command to verify.

## 2026-11: a stop in plain text does not end a teammate

The lead told three idle teammates by message to shut down. Each answered that it was stopping and did nothing more, but none ended; one said so outright: it waits for a `shutdown_request`. Sent as `{"type": "shutdown_request", "reason": "..."}` through SendMessage, it ended within seconds with `shutdown_approved`.

Changed: GUIDE, Cost: a shutdown is the structured `shutdown_request`, never prose.

## 2026-11: teammates spawned from the desktop app had no task tools

In a Claude desktop (Code tab) session with both team variables set, the lead had TaskCreate, TaskList and TaskUpdate, and filled the pile. Its four teammates, spawned with the Agent tool and a `name`, had none of them. One found the tasks by reading `~/.claude/tasks/<session>/*.json`, picked the lowest free "Researcher." task, and was refused by the permission classifier when it tried to mark it. It finished as a subagent and handed back.

With no way to claim, two researchers both took task 1 and wrote the same file, minutes apart; the second write won. Two others edited task JSON files on disk before the lead's message arrived, then reverted. `SendMessage` to `team-lead` failed ("not reachable"); the agents reached the lead as `main`.

Answer: the docs do not say. The agent-teams page covers terminals only, and the desktop page does not mention teams. The run itself showed subagents with message access, not teammates. The guide now has a section for the app: [`GUIDE.md`](GUIDE.md#in-the-desktop-app). In that app the lead marks every task itself and assigns the next task by message ("new task N, not task M again").

## 2026-11: CRLF files defeat patch scripts

On Windows the repo checks out with CRLF. Two builders patched files with scripts that matched multi-line strings written with `\n` while the files had `\r\n`, and the matches silently failed. The Edit tool handles line endings; a script must read with newline='' and use the file's own ending.

## 2026-11: a teammate killed the owner's browser

A builder recording a video with headless Chrome ran `taskkill /IM chrome.exe` to clear a stuck run. That closed every Chrome window on the machine, the owner's included. It noticed and reported it, and its script then killed only processes whose command line held its own profile folder.

Changed: GUIDE now says a teammate kills only the PID it started, or a process marked by its own folder, never a process by name.

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

## 2026-11: several builders of one role duplicate work

First run with three builders and one reviewer on one pile of about 40 tasks, with stacked pull requests. Three times, two builders built the same task: twice the lead pointed a builder at a task whose owner field was still empty while another builder had already started it, and once a builder saw a task as unowned although the lead had set an owner. Each time a full task's work was thrown away.

Changed: the lead sets the owner on a task before pointing anyone at it, and a builder sets the owner before it writes a line. A builder that finds a branch for the task already in another worktree asks before it builds.

Learned: "take the lowest free task" is not enough once the lead also assigns by hand. One of the two must own assignment. Messages also cross: a teammate's report often predates the lead's last message, so the lead must read the timestamp before acting on it.

Also seen: the reviewer's hand mutants found real defects that all checks had passed (a lease that could not be taken after release, a supervisor that waited forever on stop, a foreign key that made a replace impossible to save, a trigger that a NULL let through). Running the architecture test on each branch merged with main found two specs that asked the domain to import a port.
