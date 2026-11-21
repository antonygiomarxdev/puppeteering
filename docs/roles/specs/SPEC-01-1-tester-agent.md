# SPEC-01-1: The puppet-teams tester agent

Status: Approved (2026-11-21)
Rests on: ../../requests/REQ-10-a-tester-role-before-the-builder.md

## Summary

One plugin agent definition, `puppet-teams:tester`, holding only the method, and a node test of its frontmatter and headings. The tester gets a spec path and works with no implementation (D-31), and writes the tests before the builder, in the project's own framework and style.

Last change: 2026-11-21, approved by the owner

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-25 | 2026-11-20 | A standing tester role runs before the builder: its input is the spec path only, no code; its tests name the row they cover and must fail for the right reason; the builder may not edit them Source: owner, 2026-11-20. Amended by D-31. | REQ-10; GUIDE Roles; `mods/puppet-teams/agents/` |
| D-26 | 2026-11-20 | A brief is the path of one approved small spec, drafted by a researcher; its Done command is run by the writer before assigning Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |
| D-30 | 2026-11-20 | There is no universal rule set: review depends on each project's context. The agent holds only the method; the rules come from the project's own documents, and with none the reviewer says so and judges against the spec only. The per-area lists (backend, frontend, hooks, docs, security) are examples in GUIDE that a project may adopt into its own docs, never applied by an agent by itself. Refines D-27 Source: owner, 2026-11-20. | GUIDE Review; `mods/puppet-teams/agents/` |
| D-31 | 2026-11-20 | Amends D-25: the tester's input is the spec path, and it works with no implementation: the spec, the public interface (signatures, types) and the test config only. No tool enforces this; process and review cover it: the tests are committed before the builder starts, and the reviewer checks they are unchanged Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/agents/tester.md` | Create | Frontmatter name `tester` (no ":"), description, model sonnet, `tools: Read, Grep, Glob, Write, Edit, Bash`; body with the method |
| `mods/puppet-teams/agents/agents.test.js` | Create | Asserts frontmatter fields and required headings of tester.md |

## Reuses
Nothing to reuse: the plugin has no agents/ directory yet. The test copies the node:test style of hooks/inject.test.js.

## Tests first
D-25, D-26, D-30 and D-31, in `mods/puppet-teams/agents/agents.test.js`, written before the agent file, without it in view. Each test carries `covers: roles/REQ-10/D-25`, `D-26`, `D-30` or `D-31`. Cases: file exists; frontmatter has `name: tester` with no ":"; `model: sonnet`; non-empty `description` and `tools`; `tools` has no `Agent` and no entry starting `mcp__`; no `hooks`, `mcpServers` or `permissionMode` key (a plugin agent ignores them); body headings `## Input`, `## Method`, `## Output`, `## Skip when`; the body names no framework (no "jest", "vitest", "pytest", "node:test"), because the project decides; the body contains "no implementation", "only at a path listed in the input spec's Files", "the tester writes no other file" and "committed before the builder".

## Build
Body, one heading each. The recipe is Anthropic's: write the tests, confirm they fail, commit them, then implement without modifying them ([best practices](https://www.anthropic.com/research/claude-code-best-practices)).
- Input: the path of one approved spec. Work with no implementation: read the spec, its Rests-on parent, the public interface (signatures, types) and the test config, and one existing test file for style.
- Method: write tests in the project's own framework and style. Each test names the spec row it covers. Red gate: each test must fail on its assertion, not on an import. When the module does not exist, add a stub with the export shape returning a neutral value (observed in another project). The tester writes a stub only at a path listed in the input spec's Files; the builder owns it and replaces it; the tester writes no other file. Run the tests and paste the failing output lines. Then break one branch by hand on a copy, never in the checkout, and name the test that fails.
- Output: a table `row | test file | command | failing line | why it fails`, and a "Not verified" line for what the tests do not reach. The tests are committed before the builder starts (the lead commits them); the builder may not edit them.
- Skip when: the change is docs only or one line.
- No tool guarantees the tester never opens the implementation: the `tools` list leaves out Agent and MCP tools, and process plus review cover the rest (D-31). No custom hook.
```js
// agents.test.js: parseFrontmatter(path) -> {name, description, model, tools, body}
```

## Done when
`node --test mods/puppet-teams/agents/agents.test.js`

## Out of scope
The reviewer agent (SPEC-01-2). Installing or spawning it live. GUIDE Roles wording (done by the builder task of D-25).

## Open questions
None.
