# SPEC-01-2: The puppet-teams reviewer agent

Status: Draft
Rests on: ../../requests/REQ-10-a-tester-role-before-the-builder.md

## Summary

One plugin agent definition, `puppet-teams:reviewer`, with a per-area checklist, and its test cases added to `agents.test.js`. Second of two runs.

Last change: 2026-11-21, drafted

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-27 | 2026-11-20 | Reviewers are by area (backend, frontend, hooks, docs, security) and follow /scriptorium:review: gates first, every FAIL cites a row or gate, at most 3 rounds, a binary verdict, and the check output pasted. Roles ship as agent definitions in `mods/puppet-teams/agents/` Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/agents/reviewer.md` | Create | Frontmatter name `reviewer`, description, model, tools; the closed-review rules and five area checklists |
| `mods/puppet-teams/agents/agents.test.js` | Change | Reviewer cases added to the SPEC-01-1 file |

## Reuses
- Precedent: SPEC-01-1-tester-agent.md, same shape of agent file and test; it creates `parseFrontmatter` in agents.test.js, reused here.

## Tests first
D-27, in `mods/puppet-teams/agents/agents.test.js`, written before the agent file, without it in view; carries `covers: roles/REQ-10/D-27`. Cases: `name: reviewer` with no ":"; `model` set; non-empty `description` and `tools`; none of `hooks`, `mcpServers`, `permissionMode`; headings `## Rules`, `## backend`, `## frontend`, `## hooks`, `## docs`, `## security`; the Rules text contains "gates first", "cite", "3 rounds", "PASS or FAIL" and "paste".

## Build
Rules: run the gates first; every FAIL cites a spec row or a gate; a file outside the spec is a FAIL; all findings in round 1; at most 3 rounds; a binary verdict; paste the check output, never "PASS (rerun)" before running. Areas: backend (ADR dependency direction, error paths, negative examples tested); frontend (UI ADR rules, screenshot, UX states); hooks (exit codes, stop_hook_active, Windows and Linux); docs (claims opened and linked, caps); security (the test stubs the dangerous call, REQ-8). Mutants only on a copy.

## Done when
`node --test mods/puppet-teams/agents/agents.test.js`

## Out of scope
The tester agent (SPEC-01-1). Per-project ADR checks: the area headings name where the project ADRs go, they do not copy them.

## Open questions
None.
