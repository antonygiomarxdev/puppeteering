const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const plugin = path.resolve(__dirname, '..');
const remind = path.join(plugin, 'hooks', 'remind.js');

function run(input) {
  return spawnSync(process.execPath, [remind], { input, encoding: 'utf8' });
}

test('main prompt gives UserPromptSubmit JSON that names the skill', () => {
  const r = run(JSON.stringify({ prompt: 'fix the bug in the login flow' }));
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout).hookSpecificOutput;
  assert.strictEqual(out.hookEventName, 'UserPromptSubmit');
  assert.match(out.additionalContext, /agent-teams/);
});

test('a teammate (agent_id) gets no output', () => {
  const r = run(JSON.stringify({ prompt: 'fix the bug in the login flow', agent_id: 'abc' }));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('bad JSON gives no output and exit 0', () => {
  const r = run('not json');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('JSON with a BOM still outputs', () => {
  const r = run('\uFEFF' + JSON.stringify({ prompt: 'fix the bug in the login flow' }));
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /agent-teams/);
});

test('a short prompt gets no output', () => {
  const r = run(JSON.stringify({ prompt: 'ok' }));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('a slash command gets no output', () => {
  const r = run(JSON.stringify({ prompt: '/help me with something long' }));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('a work prompt tells the model to start with TaskList', () => {
  const r = run(JSON.stringify({ prompt: 'add a retry to the gateway and test it' }));
  assert.strictEqual(r.status, 0);
  const text = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(text, /TaskList/);
  assert.match(text, /puppet-teams:agent-teams/);
});

test('SKILL.md frontmatter is valid', () => {
  const text = fs.readFileSync(path.join(plugin, 'skills', 'agent-teams', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, 'no frontmatter');
  const keys = m[1].split('\n').filter((l) => /^\w/.test(l)).map((l) => l.split(':')[0]);
  assert.deepStrictEqual(keys, ['name', 'description', 'license']);
  const desc = m[1].match(/^description: "(.*)"$/m)[1];
  assert.ok(desc.startsWith('Use when'));
  assert.ok(desc.length < 1536);
  assert.ok(!/[<>]/.test(desc));
  assert.ok(m[2].split('\n').length < 60, 'body too long');
});

test('hooks.json has SessionStart and UserPromptSubmit', () => {
  const h = JSON.parse(fs.readFileSync(path.join(plugin, 'hooks', 'hooks.json'), 'utf8')).hooks;
  assert.ok(h.SessionStart);
  assert.match(h.UserPromptSubmit[0].hooks[0].command, /hooks\/remind\.js/);
});
