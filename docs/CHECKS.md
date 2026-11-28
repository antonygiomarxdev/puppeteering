# Project checks

Every rule this project learned from a failure, enforced. A row with no command fails. Each check ships with the replay of the failure it catches.

| ID | Prevents | Command | Replay |
|---|---|---|---|
| CHK-1 | The idle redirect and the session reminder break (RETRO-1, RETRO-2, RETRO-3) | `node --test mods/puppet-teams/hooks/idle.test.js mods/puppet-teams/hooks/remind.test.js` | `mods/puppet-teams/hooks/idle.test.js` and `mods/puppet-teams/hooks/remind.test.js` are the replays; run 2026-11-20: 24 of 24 pass |
| CHK-2 | The monitor's versions drift apart (INV-1) | `npm --prefix office-app test` | `office-app/src/version.test.ts` fails when the versions differ |
| CHK-3 | The monitor's hooks or manifest break | `claude plugin validate mods/puppet-monitor` | none recorded: no failure of this class yet |
| CHK-4 | LESSONS.md passes 180 lines (D-21; old entries are archived before it would, D-22) | `node -e "process.exit(require('fs').readFileSync('LESSONS.md','utf8').split('\n').length-1>180?1:0)"` | run it on a copy padded past 180 lines: exit 1 |
| CHK-5 | GUIDE.md passes 220 lines (D-21) | `node -e "process.exit(require('fs').readFileSync('GUIDE.md','utf8').split('\n').length-1>220?1:0)"` | run it on a copy padded past 220 lines: exit 1 |
| CHK-6 | ONBOARDING.md passes 200 lines (D-21) | `node -e "process.exit(require('fs').readFileSync('ONBOARDING.md','utf8').split('\n').length-1>200?1:0)"` | run it on a copy padded past 200 lines: exit 1 |
| CHK-7 | RETRO.md holds more than 15 open entries (D-21) | `node -e "process.exit((require('fs').readFileSync('docs/retro/RETRO.md','utf8').match(/^## RETRO-/gm)||[]).length>15?1:0)"` | run it on a copy with 16 entries: exit 1 |
| CHK-8 | A lesson becomes a rule without evidence, or a lesson or a rule-ledger row loses its format (REQ-15) | `node tools/lessons-check.mjs` | `tools/lessons-check.test.mjs` is the replay: 29 tests; 15 mutants of the check, run on a copy, each fail at least one (2026-11-27) |
| CHK-9 | The probe's blinding leaks which output is which, or loses an output (REQ-17) | `node --test tools/probe-blind.test.mjs` | `tools/probe-blind.test.mjs` is the replay: 10 tests, written before the tool by the tester |
| CHK-10 | An agent merges a pull request while the project's merge setting is owner (REQ-18) | `node --test mods/puppet-teams/hooks/merge-gate.test.js` | `mods/puppet-teams/hooks/merge-gate.test.js` is the replay: 21 tests, 13 written before the hook by the tester and 8 added by the builder for the hooks.json launch, the root folder and the coarse word rule the owner chose after four reviews |
