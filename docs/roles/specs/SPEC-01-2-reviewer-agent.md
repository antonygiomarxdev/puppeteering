# SPEC-01-2: The puppet-teams reviewer agent

Status: Approved (2026-11-21)
Rests on: ../../requests/REQ-10-a-tester-role-before-the-builder.md

## Summary

One plugin agent definition, `puppet-teams:reviewer`, holding only the method, and its test cases added to `agents.test.js`. The rules come from the project's own documents, read in a stated order. Second of two runs.

Last change: 2026-11-21, approved by the owner

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-27 | 2026-11-20 | Reviewers are by area (backend, frontend, hooks, docs, security) and follow /scriptorium:review: gates first, every FAIL cites a row or gate, at most 3 rounds, a binary verdict, and the check output pasted. Roles ship as agent definitions in `mods/puppet-teams/agents/` Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |
| D-30 | 2026-11-20 | There is no universal rule set: review depends on each project's context. The agent holds only the method; the rules come from the project's own documents, and with none the reviewer says so and judges against the spec only. The per-area lists (backend, frontend, hooks, docs, security) are examples in GUIDE that a project may adopt into its own docs, never applied by an agent by itself. Refines D-27 Source: owner, 2026-11-20. | GUIDE Review; `mods/puppet-teams/agents/` |
| D-31 | 2026-11-20 | Amends D-25: the tester's input is the spec path, and it works with no implementation: the spec, the public interface (signatures, types) and the test config only. No tool enforces this; process and review cover it: the tests are committed before the builder starts, and the reviewer checks they are unchanged Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/agents/reviewer.md` | Create | Frontmatter name `reviewer`, description, model, tools; the method and the lookup order; no area lists |
| `mods/puppet-teams/agents/agents.test.js` | Change | Reviewer cases added to the SPEC-01-1 file |

## Reuses
- Precedent: SPEC-01-1-tester-agent.md, same shape of agent file and test; it creates `parseFrontmatter` in agents.test.js, reused here.

## Tests first
D-27, D-30 and D-31, in `mods/puppet-teams/agents/agents.test.js`, written before the agent file, without it in view; each test carries `covers: roles/REQ-10/D-27`, `D-30` or `D-31`. Cases: `name: reviewer` with no ":"; `model` set; non-empty `description` and `tools`, with `tools` leaving out Edit and Write; none of `hooks`, `mcpServers`, `permissionMode`; headings `## Method`, `## Where the rules come from`, `## Verdict`; no heading `## backend`, `## frontend`, `## hooks`, `## docs` or `## security`; the text contains "gates first", "cite", "outside", "3 rounds", "PASS or FAIL", "paste", "copy", "no project rules", "never invent", "unchanged since their commit", "each spec row has a test" and "public interface".

## Build
Body, three headings.
- Method: run the project's gates first (observed in another project: lint, types, tests, grep checks). Ask whether the code needs to exist: does the platform or an installed dependency already do it. Every FAIL cites a row of a project document or a failed gate; anything else is a note, not a FAIL. A changed file outside the spec's Files is a FAIL. Pre-existing lines the change did not touch are not findings. Report all findings in round 1; at most 3 rounds; a new head is re-checked by the same reviewer. Mark a rule N/A only with a reason. Run something, do not only read: re-run at least one claim and paste its command and output lines, never "PASS (rerun)" before running. Mutants only on a copy outside the checkout. When the pile has a tester task, check its tests: they are unchanged since their commit (`git diff <commit> -- <test files>` is empty), each spec row has a test, and the tests do not import internals beyond the public interface. The reviewer edits nothing.
- Where the rules come from: read in this order and list the files read in the review. (1) the spec's quoted rows and its Rests-on parent (FRD, TP, ADR, request); (2) root CLAUDE.md or AGENTS.md, and the nearest one to each changed file; (3) `.claude/rules/*.md` whose `paths` glob matches a changed file; (4) `docs/DECISIONS.md` and `docs/adr/` entries the spec or diff cites, `docs/CROSS-CUTTING.md`; (5) `docs/CHECKS.md`, CONTRIBUTING.md, linter and CI config, as gates; (6) the project's own review skill, if any. Load only what matches the changed paths. If none is found, say "no project rules", mark the other areas "no rule found", judge against the spec rows and the gates that exist, and never invent a rule or fail on taste.
- Verdict: PASS or FAIL, one line, then one line per finding with its cited row or gate.

## Done when
`node --test mods/puppet-teams/agents/agents.test.js`

## Out of scope
The tester agent (SPEC-01-1). The per-area lists (backend, frontend, hooks, docs, security): they are GUIDE examples a project may adopt (D-30), not agent text. Running the agent live.

## Open questions
None.
