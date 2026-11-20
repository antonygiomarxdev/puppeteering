const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const plugin = path.resolve(__dirname, '..');
const inject = path.join(plugin, 'hooks', 'inject.js');

function run(root) {
  return spawnSync(process.execPath, [inject], {
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
    encoding: 'utf8',
  });
}

test('emits valid SessionStart JSON with the rules and a path to ONBOARDING.md that exists', () => {
  const r = run(plugin);
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const text = out.hookSpecificOutput.additionalContext;
  assert.match(text, /Agent teams/);
  const m = text.match(/(\S+\/ONBOARDING\.md)/);
  assert.ok(m, 'no ONBOARDING.md path in the text');
  assert.ok(fs.existsSync(m[1]), 'ONBOARDING.md path does not exist: ' + m[1]);
});

test('uses the GitHub URL when the repo has no ONBOARDING.md', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'puppet-teams-'));
  const root = path.join(tmp, 'mods', 'puppet-teams');
  fs.mkdirSync(root, { recursive: true });
  fs.copyFileSync(path.join(plugin, 'RULES.md'), path.join(root, 'RULES.md'));
  const r = run(root);
  assert.strictEqual(r.status, 0);
  const text = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.ok(text.includes('https://github.com/antonygiomarxdev/puppeteering/blob/main/ONBOARDING.md'));
  assert.ok(!text.includes('{DOCS}'));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('exits 0 and prints nothing when the rules file is missing', () => {
  const r = run(path.join(os.tmpdir(), 'puppet-teams-missing-' + process.pid));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});
