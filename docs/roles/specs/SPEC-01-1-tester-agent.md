# SPEC-01-1: The puppet-teams tester agent

Status: Draft
Rests on: ../../requests/REQ-10-a-tester-role-before-the-builder.md

## Summary

One plugin agent definition, `puppet-teams:tester`, and a node test of its frontmatter and checklist headings. The tester gets a spec path only and writes the tests before the builder.

Last change: 2026-11-21, drafted

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-25 | 2026-11-20 | A standing tester role runs before the builder: its input is the spec path only, no code; its tests name the row they cover and must fail for the right reason; the builder may not edit them Source: owner, 2026-11-20. | REQ-10; GUIDE Roles; `mods/puppet-teams/agents/` |
| D-26 | 2026-11-20 | A brief is the path of one approved small spec, drafted by a researcher; its Done command is run by the writer before assigning Source: owner, 2026-11-20. | GUIDE Roles; `mods/puppet-teams/agents/` |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `mods/puppet-teams/agents/tester.md` | Create | Frontmatter name `tester` (no ":"), description, model sonnet, tools; body with the checklist |
| `mods/puppet-teams/agents/agents.test.js` | Create | Asserts frontmatter fields and required headings of tester.md |

## Reuses
Nothing to reuse: the plugin has no agents/ directory yet. The test copies the node:test style of hooks/inject.test.js.

## Tests first
D-25 and D-26, in `mods/puppet-teams/agents/agents.test.js`, written before the agent file, without it in view. Each test carries `covers: roles/REQ-10/D-25` or `D-26`. Cases: file exists; frontmatter has `name: tester` with no ":"; `model: sonnet`; non-empty `description` and `tools`; no `hooks`, `mcpServers` or `permissionMode` key (a plugin agent ignores them); body headings `## Input`, `## Output`, `## Skip when`.

## Build
Body, one heading each. Input: the path of one approved spec, never the code; read only that file. Output: tests that name the row id they cover, fail for the right reason (assert the missing behaviour, not an import error), and one hand mutant run on a copy; the builder may not edit them. Skip when: the change is docs only or one line.
```js
// agents.test.js: parseFrontmatter(path) -> {name, description, model, tools, body}
```

## Done when
`node --test mods/puppet-teams/agents/agents.test.js`

## Out of scope
The reviewer agent (SPEC-01-2). Installing or spawning it live. GUIDE Roles wording (done by the builder task of D-25).

## Open questions
None.
