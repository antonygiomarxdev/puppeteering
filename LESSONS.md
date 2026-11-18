# Lessons

Newest first. Each one is something a real run showed. A rule in the guide changes when a run shows it wrong, and the run goes here.

## 2026-11: teammates spawned from the desktop app had no task tools

In a Claude desktop (Code tab) session with both team variables set, the lead had TaskCreate, TaskList and TaskUpdate, and filled the pile. Its four teammates, spawned with the Agent tool and a `name`, had none of them. One found the tasks by reading `~/.claude/tasks/<session>/*.json`, picked the lowest free "Researcher." task, and was refused by the permission classifier when it tried to mark it. It finished as a subagent and handed back.

With no way to claim, two researchers both took task 1 and wrote the same file, minutes apart; the second write won. Two others edited task JSON files on disk before the lead's message arrived, then reverted. `SendMessage` to `team-lead` failed ("not reachable"); the agents reached the lead as `main`.

Answer: the docs do not say. The agent-teams page covers terminals only, and the desktop page does not mention teams. The run itself showed subagents with message access, not teammates. The guide now has a section for the app: [`GUIDE.md`](GUIDE.md#in-the-desktop-app). In that app the lead marks every task itself and assigns the next task by message ("new task N, not task M again").

## 2026-11: CRLF files defeat patch scripts

On Windows the repo checks out with CRLF. Two builders patched files with scripts that matched multi-line strings written with 
, and the matches silently failed. The Edit tool handles line endings; a script must read with newline='' and use the file's own ending.

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

## 2026-11: several builders of one role duplicate work

First run with three builders and one reviewer on one pile of about 40 tasks, with stacked pull requests. Three times, two builders built the same task: twice the lead pointed a builder at a task whose owner field was still empty while another builder had already started it, and once a builder saw a task as unowned although the lead had set an owner. Each time a full task's work was thrown away.

Changed: the lead sets the owner on a task before pointing anyone at it, and a builder sets the owner before it writes a line. A builder that finds a branch for the task already in another worktree asks before it builds.

Learned: "take the lowest free task" is not enough once the lead also assigns by hand. One of the two must own assignment. Messages also cross: a teammate's report often predates the lead's last message, so the lead must read the timestamp before acting on it.

Also seen: the reviewer's hand mutants found real defects that all checks had passed (a lease that could not be taken after release, a supervisor that waited forever on stop, a foreign key that made a replace impossible to save, a trigger that a NULL let through). Running the architecture test on each branch merged with main found two specs that asked the domain to import a port.
