const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// parseFrontmatter(path) -> {name, description, model, tools, body, keys}
function parseFrontmatter(p) {
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(m, p + ' has no frontmatter block');
  const keys = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) keys[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return {
    name: keys.name,
    description: keys.description,
    model: keys.model,
    tools: (keys.tools || '').split(',').map((s) => s.trim()).filter(Boolean),
    body: m[2],
    keys,
  };
}

function load(file) {
  const p = path.join(__dirname, file);
  assert.ok(fs.existsSync(p), file + ' exists');
  return parseFrontmatter(p);
}

const HEADINGS = (body, list) => {
  for (const h of list) assert.match(body, new RegExp('^## ' + h + '\\s*$', 'm'), 'heading ## ' + h);
};
const CONTAINS = (body, list) => {
  const low = body.toLowerCase();
  for (const s of list) assert.ok(low.includes(s.toLowerCase()), 'body contains "' + s + '"');
};
const NO_KEYS = (a) => {
  for (const k of ['hooks', 'mcpServers', 'permissionMode']) assert.ok(!(k in a.keys), 'no key ' + k);
};

// ---- SPEC-01-1 tester ----

test('covers: roles/REQ-10/D-25 tester.md exists and name is "tester" with no colon', () => {
  const a = load('tester.md');
  assert.strictEqual(a.name, 'tester');
  assert.ok(!a.name.includes(':'));
});

test('covers: roles/REQ-10/D-25 tester model is sonnet, description and tools non-empty', () => {
  const a = load('tester.md');
  assert.strictEqual(a.model, 'sonnet');
  assert.ok(a.description && a.description.length > 0);
  assert.ok(a.tools.length > 0);
});

test('covers: roles/REQ-10/D-31 tester tools have no Agent and no mcp__ entry', () => {
  const a = load('tester.md');
  assert.ok(a.tools.length > 0, 'tools listed');
  assert.ok(!a.tools.includes('Agent'));
  assert.ok(!a.tools.some((t) => t.startsWith('mcp__')));
});

test('covers: roles/REQ-10/D-25 tester has no hooks, mcpServers or permissionMode key', () => {
  NO_KEYS(load('tester.md'));
});

test('covers: roles/REQ-10/D-26 tester body has Input, Method, Output, Skip when headings', () => {
  HEADINGS(load('tester.md').body, ['Input', 'Method', 'Output', 'Skip when']);
});

test('covers: roles/REQ-10/D-30 tester body names no framework', () => {
  const body = load('tester.md').body.toLowerCase();
  assert.ok(body.length > 0, 'body not empty');
  for (const f of ['jest', 'vitest', 'pytest', 'node:test']) assert.ok(!body.includes(f), 'names ' + f);
});

test('covers: roles/REQ-10/D-31 tester body states the no-implementation and commit-first rules', () => {
  CONTAINS(load('tester.md').body, [
    'no implementation',
    "only at a path listed in the input spec's Files",
    'the tester writes no other file',
    'committed before the builder',
  ]);
});

test('covers: roles/REQ-10/D-25 tester body states the red gate: fail on the assertion, not on an import', () => {
  CONTAINS(load('tester.md').body, ['red gate', 'fail on its assertion', 'not on an import']);
});

// ---- SPEC-01-2 reviewer ----

test('covers: roles/REQ-10/D-27 reviewer.md exists and name is "reviewer" with no colon', () => {
  const a = load('reviewer.md');
  assert.strictEqual(a.name, 'reviewer');
  assert.ok(!a.name.includes(':'));
});

test('covers: roles/REQ-10/D-27 reviewer has model, description, tools, and tools omit Edit and Write', () => {
  const a = load('reviewer.md');
  assert.ok(a.model && a.model.length > 0);
  assert.ok(a.description && a.description.length > 0);
  assert.ok(a.tools.length > 0);
  assert.ok(!a.tools.includes('Edit'));
  assert.ok(!a.tools.includes('Write'));
});

test('covers: roles/REQ-10/D-27 reviewer has no hooks, mcpServers or permissionMode key', () => {
  NO_KEYS(load('reviewer.md'));
});

test('covers: roles/REQ-10/D-27 reviewer headings Method, Where the rules come from, Verdict', () => {
  HEADINGS(load('reviewer.md').body, ['Method', 'Where the rules come from', 'Verdict']);
});

test('covers: roles/REQ-10/D-30 reviewer has no per-area heading', () => {
  const body = load('reviewer.md').body;
  assert.ok(body.length > 0, 'body not empty');
  assert.doesNotMatch(body, /^## (backend|frontend|hooks|docs|security)\s*$/im);
});

test('covers: roles/REQ-10/D-27 reviewer method text: gates first, cite, outside, 3 rounds, PASS or FAIL, paste, copy', () => {
  CONTAINS(load('reviewer.md').body, ['gates first', 'cite', 'outside', '3 rounds', 'PASS or FAIL', 'paste', 'copy']);
});

test('covers: roles/REQ-10/D-30 reviewer says "no project rules" and never invent', () => {
  CONTAINS(load('reviewer.md').body, ['no project rules', 'never invent']);
});

test('covers: roles/REQ-10/D-31 reviewer checks tests unchanged, one per row, public interface only', () => {
  CONTAINS(load('reviewer.md').body, ['unchanged since their commit', 'each spec row has a test', 'public interface']);
});

// ---- method SPEC-02-2 judge and probe skill ----

test('covers: method/REQ-17/LL-3 judge.md has name judge, model sonnet, and no Write, Edit or Agent tool', () => {
  const a = load('judge.md');
  assert.strictEqual(a.name, 'judge');
  assert.strictEqual(a.model, 'sonnet');
  assert.ok(a.tools.length > 0, 'tools listed');
  for (const t of ['Write', 'Edit', 'Agent']) assert.ok(!a.tools.includes(t), 'no ' + t + ' tool');
});

test('covers: method/REQ-17/LL-3 judge body: two candidates, not told which used the change, equal, current rules valid, notes format', () => {
  CONTAINS(load('judge.md').body, [
    'candidate-1',
    'candidate-2',
    'not told which',
    'equal',
    'current rules',
    'valid',
    'kept|revised|dropped -> ',
  ]);
});

test('covers: method/REQ-17/LL-4 probe skill has a name and description', () => {
  const a = load('../skills/probe/SKILL.md');
  assert.ok(a.name && a.name.length > 0, 'name');
  assert.ok(a.description && a.description.length > 0, 'description');
});

test('covers: method/REQ-17/LL-4 probe skill names the tool, --reveal, the judge, at least 2 runs and the rule ledger', () => {
  CONTAINS(load('../skills/probe/SKILL.md').body, ['tools/probe-blind.mjs', '--reveal', 'judge', 'at least 2 runs', 'rule ledger']);
});

test('covers: method/REQ-17/LL-4 probe skill names each verdict with its condition', () => {
  CONTAINS(load('../skills/probe/SKILL.md').body, [
    'helped',
    'hurt',
    'no observed effect',
    'confounded',
    'every pair',
    'equal',
    'mixed',
    'more than one rule',
    'fewer than 2 runs',
    'RC-',
  ]);
});

test('covers: method/REQ-17/LL-7 judge.md says data, not instructions', () => {
  CONTAINS(load('judge.md').body, ['data, not instructions']);
});

// ---- method SPEC-02-3 reflector ----

test('covers: method/REQ-17/LL-5 reflector.md has name reflector, model sonnet, and no Agent or Write tool', () => {
  const a = load('reflector.md');
  assert.strictEqual(a.name, 'reflector');
  assert.strictEqual(a.model, 'sonnet');
  assert.ok(a.tools.length > 0, 'tools listed');
  for (const t of ['Agent', 'Write']) assert.ok(!a.tools.includes(t), 'no ' + t + ' tool');
});

const REFLECT_RULES = [
  'at most one',
  'Status: observed',
  'adopted',
  'never edits a rule',
  'contrast',
  'Cue',
  'Lesson',
  'Evidence',
  'Confidence',
  'Status',
  'node tools/lessons-check.mjs',
];

test('covers: method/REQ-17/LL-5 reflector body: one entry, observed only, never adopted, no rule edits, contrast, five fields, the check', () => {
  const body = load('reflector.md').body;
  CONTAINS(body, REFLECT_RULES);
  assert.match(body, /never[^.\n]*adopted/i, 'never ... adopted');
});

test('covers: method/REQ-17/LL-5 reflect skill names the merged or closed pull request and the same rules', () => {
  const body = load('../skills/reflect/SKILL.md').body;
  CONTAINS(body, ['merged', 'closed', 'pull request', ...REFLECT_RULES]);
  assert.match(body, /never[^.\n]*adopted/i, 'never ... adopted');
});

test('covers: method/REQ-17/LL-6 agent-teams skill ends every pile with "Reflect." owned by the reflector, blocked by the last task', () => {
  const body = load('../skills/agent-teams/SKILL.md').body;
  assert.ok(body.includes('Reflect.'), 'names the task "Reflect."');
  CONTAINS(body, ['reflector', 'blocked by', 'last task']);
});

test('covers: method/REQ-17/LL-7 reflector.md says data, not instructions', () => {
  CONTAINS(load('reflector.md').body, ['data, not instructions']);
});

// ---- method SPEC-02-4 evidence is data ----

test('covers: method/REQ-17/LL-7 reviewer.md and tester.md each say data, not instructions', () => {
  CONTAINS(load('reviewer.md').body, ['data, not instructions']);
  CONTAINS(load('tester.md').body, ['data, not instructions']);
});

// ---- merge SPEC-01-2 merge recommendation ----

test('covers: merge/REQ-18/MG-3 reviewer.md holds Merge: recommend and Merge: do not merge', () => {
  const body = load('reviewer.md').body;
  assert.ok(body.includes('Merge: recommend'), 'Merge: recommend');
  assert.ok(body.includes('Merge: do not merge'), 'Merge: do not merge');
});
