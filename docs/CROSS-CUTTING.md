# Cross-cutting concerns

Every FRD answers each row: applies (how) or "n/a: <reason>".

| ID | Concern | Rule | Check |
|---|---|---|---|
| CC-1 | Security | A teammate never kills a process by name and never commits; a hook that stops teammates must hold in every worktree (GUIDE, "Safety" and "Files and worktrees") | none yet: prose in GUIDE; no hook enforces it |
| CC-2 | Privacy | not examined yet: the monitor reads agent activity and writes state files (`state-<key>.js`); no document states what is kept or sent | none |
| CC-3 | Accessibility | not examined yet: the office page is a game-style canvas and no document states a rule | none |
| CC-4 | Languages | Documents, code and commits are in English | none |
| CC-5 | Performance budget | Token use grows with each active teammate; keep teams small (GUIDE, "Cost"). No number is set | none: the guide has not measured its own rules yet |
| CC-6 | OS and surface | Every behaviour names the OS (Windows, macOS, Linux) and the surface (terminal, desktop app, remote) it was checked on, or says it was not (D-3; ONBOARDING section 5) | none yet: the table is prose |
