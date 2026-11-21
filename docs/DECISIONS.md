# Decisions

The inbox of decisions not yet absorbed into the document they govern. A decision is done when that document says it; then it moves to `decisions/YYYY-MM.md`. Owner decisions are D-n, the coordinator's design calls L-n. This file stays under its line cap.

| ID | Date | Decision | Goes into |
|---|---|---|---|
| D-1 | 2026-11-18 | One coordinator per goal and worktree; it splits the work and drives it to done Source: vision memory note (paraphrase of the owner). | PRODUCT P1; PRD METHOD |
| D-2 | 2026-11-18 | The monitor exists so the owner knows what each agent is doing without asking the lead; looks come second Source: monitor-purpose memory note (paraphrase). | PRODUCT P8; PRD MONITOR |
| D-3 | 2026-11-18 | Every behaviour must handle the OS and the surface Source: os-and-surface-aware memory note (paraphrase). | PRODUCT P9; CROSS-CUTTING CC-6 |
| D-4 | 2026-11-19 | The lead (main session) delegates every piece of work to a teammate by role and model and stays free; it may read one file or run one command to verify. Verified by reading `lead-delegates.md` in full: the owner said so on 2026-11-19, after asking twice for delegation by role. Source: lead-delegates memory note (paraphrase). | PRODUCT P6; PRD METHOD; FRD METHOD-02 |
| D-5 | 2026-11-18 | Concord MCP (peer-to-peer claim gate) is not adopted now: "I'll star it and try it in the future. For now I'll stay with puppeteering ... one coordinator per goal, in its own worktree". The memory notes say it was declined; the comment says "for now", so this says "not adopted now". Source: the owner's comment on issue #5, 2026-11-18T15:09Z. | PRODUCT §6 Scope |
| D-6 | 2026-11-20 | A coordinator of coordinators is not in this version Source: owner, via the lead, 2026-11-20. | PRODUCT §6 Scope; GUIDE keeps its section marked untested |
| D-7 | 2026-11-20 | Showcase (video, sprites, social) is not part of the product: no showcase use case, no showcase slice Source: owner, via the lead, 2026-11-20. | PRODUCT §5, §6, §7 |
| D-8 | 2026-11-20 | The owner is the only user; no Contributor user Source: owner, via the lead, 2026-11-20. | PRODUCT §3 |
| D-9 | 2026-11-20 | Success criteria: (1) a fresh session in any project starts the pile and a team on a multi-step prompt, 3 of 3 probes; (2) no two agents take the same task in a run (no double claim, by two teammates or two leads), counted from the task files and LESSONS per run; (3) no task built twice in a run; (4) the owner knows what each agent is doing without asking the lead, judged by the owner on a real run with the monitor Source: owner, via the lead, 2026-11-20. | PRODUCT §8 |
| D-10 | 2026-11-20 | Count the runs, tasks and sessions from LESSONS.md and the git log and put the numbers in Problem (accepted) Source: owner, via the lead, 2026-11-20. | PRODUCT §1 (done in the draft) |
| D-11 | 2026-11-20 | One product; puppet-teams and puppet-monitor are its add-ons Source: owner, via the lead, 2026-11-20. | PRODUCT §2 |
| D-12 | 2026-11-20 | The product is not only for Claude Code: it starts on Claude Code and may be extended to other platforms later. PRODUCT names Claude Code as the first platform, a constraint and fact, not what the product is Source: owner, via the lead, 2026-11-20. | PRODUCT §2, §6, §9 |
| D-13 | 2026-11-20 | No document is approved yet. The owner wants to be told later which documents to approve; every document is Draft and every request Open, except REQ-7 (Accepted, D-17). Source: owner, via the lead, 2026-11-20. | all statuses |
| D-14 | 2026-11-20 | GUIDE, ONBOARDING, LESSONS, REFERENCES and README stay at the root Source: owner, via the lead, 2026-11-20. | section 3 (KEEP and EXTRACT rows) |
| D-15 | 2026-11-20 | "Coordinator" fits what is really done: use it in the chain. GLOSSARY: Coordinator, with "lead" mapped as the platform's word for it Source: owner, via the lead, 2026-11-20. | GLOSSARY; every chain document |
| D-16 | 2026-11-20 | The desktop app should work too: a requirement (UC-8). Current fact, from the official desktop page: agent teams "are available in the CLI, not in Desktop" Source: owner, via the lead, 2026-11-20. | PRD METHOD; FRD METHOD-05; PRODUCT §9 |
| D-17 | 2026-11-20 | REQ-7 yes (a second live coordinator on one conversation). Two coordinators, each in its own worktree, that message each other, are fine. Once one must coordinate the other, decide who is the real coordinator and who is not Source: owner, via the lead, 2026-11-20. | REQ-7; FRD METHOD-02 |
| D-18 | 2026-11-20 | puppet-teams gets a CHANGELOG, managed with changesets Source: owner, via the lead, 2026-11-20. | section 15; `mods/puppet-teams/CHANGELOG.md` |
| D-19 | 2026-11-20 | Run a code-versus-document pass for monitor and teams (task 92); its findings join this plan Source: owner, via the lead, 2026-11-20. | section 8 and the gap report |
| D-20 | 2026-11-19 | Fill the pile first: when a goal arrives, create every known step as a task with addBlockedBy before spawning anyone; the note calls it the most important part. Source: lead-delegates memory note (paraphrase; verified in full). | FRD METHOD-02; TEAMS FRD-02 |
| D-21 | 2026-11-20 | Document caps (option A): LESSONS 180 now, GUIDE 220, ONBOARDING 200, RETRO 15, each a CHECKS row. LESSONS.md stays at the root (D-14) Source: owner, 2026-11-20. | section 13; CHECKS |
| D-22 | 2026-11-20 | Archive whole LESSONS entries by month in `docs/retro/lessons/YYYY-MM.md` when LESSONS would pass its cap of 180 lines, with a one-line index entry left in LESSONS; delete nothing Source: owner, 2026-11-20. | section 13; GUIDE |
| D-23 | 2026-11-20 | Do not rename "lead" in the root documents for now Source: owner, 2026-11-20. | GLOSSARY; section 11 |
| D-24 | 2026-11-20 | Changesets with npm (`npx changeset`), no Bun at the root Source: owner, 2026-11-20. | section 15 |
