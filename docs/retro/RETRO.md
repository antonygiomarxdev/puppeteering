# Retro

Open entries only. An entry closes when its prevention exists and the replay of the original failure fails it; closed entries move to `retro/YYYY-MM.md`.

## RETRO-1: an assignment by message crossed the teammate's idle notice

- **Seen:** 2026-11, a scriptorium session ([LESSONS.md, "2026-11: an assignment by message crossed the teammate's idle notice"](../../LESSONS.md#2026-11-an-assignment-by-message-crossed-the-teammates-idle-notice))
- **Step that should have caught it:** code (a `TeammateIdle` hook)
- **Class:** assignment-crossed-idle
- **Recurrence:** 2 LESSONS entries ([LESSONS.md, "2026-11: an assignment by message crossed the teammate's idle notice"](../../LESSONS.md#2026-11-an-assignment-by-message-crossed-the-teammates-idle-notice) and [LESSONS.md, "2026-11: a change to a finished task needs a new task"](../../LESSONS.md#2026-11-a-change-to-a-finished-task-needs-a-new-task)); the second counts five crossings in one run
- **Prevention:** `mods/puppet-teams/hooks/idle.js:39-40,51-53`: an idle teammate with an open task gets exit 2 and `new task N: <subject>, not task M again`. It does not wake a teammate that is already idle
- **Replay:** `mods/puppet-teams/hooks/idle.test.js:31-41`; `node --test mods/puppet-teams/hooks/idle.test.js` passes (CHK-1). Closing needs the replay run against the prevention and the retro skill's close step, not done yet
- **Status:** open

## RETRO-2: sessions got the rules but did not start a team

- **Seen:** 2026-11, 5 project folders ([LESSONS.md, "2026-11: sessions got the rules but did not start a team"](../../LESSONS.md#2026-11-sessions-got-the-rules-but-did-not-start-a-team))
- **Step that should have caught it:** gate (the session-start rules)
- **Class:** rules-without-start
- **Recurrence:** 1 LESSONS entry; 1 of 3 fresh sessions put TaskList first on the multi-step probe, 3 of 3 after puppet-teams 0.2.1
- **Prevention:** `mods/puppet-teams/hooks/remind.js` through `mods/puppet-teams/hooks/hooks.json`: a per-prompt reminder to start with TaskList
- **Replay:** `mods/puppet-teams/hooks/remind.test.js:52`; `node --test mods/puppet-teams/hooks/remind.test.js` passes (CHK-1); 9 probes recorded in the LESSONS entry. Not closed
- **Status:** open

## RETRO-3: a finished teammate reads every message as its task again

- **Seen:** 2026-11, one run with five builders ([LESSONS.md, "2026-11: a finished teammate reads every message as its task again"](../../LESSONS.md#2026-11-a-finished-teammate-reads-every-message-as-its-task-again))
- **Step that should have caught it:** code (the idle notice text)
- **Class:** finished-reads-old-task
- **Recurrence:** 1 LESSONS entry, five builders in one run
- **Prevention:** partial. `mods/puppet-teams/hooks/idle.js:52-53`: the notice names the new task and "not task M again". It covers the idle notice only; the rest of the entry is prose
- **Replay:** `mods/puppet-teams/hooks/idle.test.js:38-41`; `node --test mods/puppet-teams/hooks/idle.test.js` passes (CHK-1). Not closed
- **Status:** open
