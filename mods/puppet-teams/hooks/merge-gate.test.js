const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const hook = path.join(__dirname, 'merge-gate.js');
const readme = path.join(__dirname, '..', 'README.md');
const made = [];
after(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

// Required per test, so a missing module fails each test on its own and the README test still runs.
const gate = () => require('./merge-gate.js');

// A project folder; config is a string written as .puppeteering/config.json, or undefined for none.
function project(config) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-merge-'));
  made.push(root);
  if (config !== undefined) {
    fs.mkdirSync(path.join(root, '.puppeteering'));
    fs.writeFileSync(path.join(root, '.puppeteering', 'config.json'), config);
  }
  return root;
}
const bash = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, cwd });
const tool = (name, cwd) => ({ tool_name: name, tool_input: {}, cwd });
function run(input) {
  assert.ok(fs.existsSync(hook), 'merge-gate.js exists');
  return spawnSync(process.execPath, [hook], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
}

const DENIED = [
  bash('gh pr merge 12 --squash'),
  bash('git push origin main'),
  bash('git push origin HEAD:master'),
  bash('git push -u origin main'),
  tool('mcp__github__merge_pull_request'),
  tool('mcp__github__enable_pr_auto_merge'),
];
const ALLOWED = [
  bash('git push origin feature/main-menu'),
  bash('git push origin claude/x'),
  bash('gh pr view 12'),
  bash('git merge origin/main'),
  tool('mcp__github__get_merge_status'),
];
const label = (i) => i.tool_name === 'Bash' ? i.tool_input.command : i.tool_name;

// MG-1
test('covers: merge/REQ-18/MG-1 mergeSetting gives owner with no config file', () => {
  assert.strictEqual(gate().mergeSetting(project()), 'owner');
});

test('covers: merge/REQ-18/MG-1 mergeSetting gives owner for a file that is not JSON', () => {
  assert.strictEqual(gate().mergeSetting(project('not json {')), 'owner');
});

test('covers: merge/REQ-18/MG-1 mergeSetting gives owner with no merge key', () => {
  assert.strictEqual(gate().mergeSetting(project('{"other": "auto"}')), 'owner');
});

test('covers: merge/REQ-18/MG-1 mergeSetting gives owner for "merge": "never"', () => {
  assert.strictEqual(gate().mergeSetting(project('{"merge": "never"}')), 'owner');
});

test('covers: merge/REQ-18/MG-1 mergeSetting gives owner for "merge": "owner"', () => {
  assert.strictEqual(gate().mergeSetting(project('{"merge": "owner"}')), 'owner');
});

test('covers: merge/REQ-18/MG-1 mergeSetting gives auto only for "merge": "auto"', () => {
  assert.strictEqual(gate().mergeSetting(project('{"merge": "auto"}')), 'auto');
});

// MG-2
test('covers: merge/REQ-18/MG-2 under owner the merge calls are denied with a reason naming the setting and the recommendation', () => {
  const { decide } = gate();
  for (const input of DENIED) {
    const d = decide(input, 'owner');
    assert.ok(d && typeof d.reason === 'string', 'denied: ' + label(input));
    const low = d.reason.toLowerCase();
    for (const s of ['merge setting', 'owner', 'recommendation']) assert.ok(low.includes(s), label(input) + ' reason names "' + s + '"');
  }
});

test('covers: merge/REQ-18/MG-2 under owner other calls are allowed', () => {
  const { decide } = gate();
  for (const input of ALLOWED) assert.strictEqual(decide(input, 'owner'), null, 'allowed: ' + label(input));
});

test('covers: merge/REQ-18/MG-2 under auto the merge calls are allowed', () => {
  const { decide } = gate();
  for (const input of DENIED) assert.strictEqual(decide(input, 'auto'), null, 'allowed under auto: ' + label(input));
});

test('covers: merge/REQ-18/MG-2 stdin that is not JSON exits 0 with no output', () => {
  const r = run('not json {');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

// MG-1 through the hook: the setting comes from the project folder in cwd.
test('covers: merge/REQ-18/MG-1 the hook run in a project whose config says auto allows gh pr merge', () => {
  const r = run(bash('gh pr merge 12 --squash', project('{"merge": "auto"}')));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('covers: merge/REQ-18/MG-1 the hook run in a project whose config says owner denies gh pr merge', () => {
  const r = run(bash('gh pr merge 12 --squash', project('{"merge": "owner"}')));
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout).hookSpecificOutput;
  assert.strictEqual(out.hookEventName, 'PreToolUse');
  assert.strictEqual(out.permissionDecision, 'deny');
  assert.ok(out.permissionDecisionReason && out.permissionDecisionReason.length > 0, 'a reason');
});

// MG-5
test('covers: merge/REQ-18/MG-5 the README documents the merge setting, its values and gh pr merge', () => {
  const text = fs.readFileSync(readme, 'utf8');
  assert.match(text, /^#+ Merge setting\s*$/im, 'a "Merge setting" heading');
  const low = text.toLowerCase();
  for (const s of ['.puppeteering/config.json', 'owner', 'auto', 'gh pr merge']) assert.ok(low.includes(s), 'README holds "' + s + '"');
});

// Added by the builder after the tests were committed: the hook must work when launched the way hooks.json launches it
// (node -e "require(...)"), where require.main is not the hook. The tester's tests ran the file directly and could not see it.
test('covers: merge/REQ-18/MG-2 the hooks.json PreToolUse command denies gh pr merge under owner', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, 'hooks.json'), 'utf8'));
  const entry = hooks.hooks.PreToolUse[0];
  assert.ok(new RegExp(entry.matcher).test('Bash'), 'matcher covers Bash');
  assert.ok(new RegExp('^(?:' + entry.matcher + ')$').test('mcp__github__merge_pull_request'), 'matcher covers MCP tools');
  const cmd = entry.hooks[0].command;
  const code = cmd.slice(cmd.indexOf('"') + 1, cmd.lastIndexOf('"')).replace(/\\"/g, '"');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-merge-json-'));
  try {
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 3' }, cwd: dir });
    const r = spawnSync(process.execPath, ['-e', code], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: path.join(__dirname, '..') } });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Added by the builder after review round 1 (FAIL on MG-2): pushes to main wrapped in shell syntax got through,
// and two commands that push elsewhere were denied.
test('covers: merge/REQ-18/MG-2 under owner, pushes to main or master in shell wrappers are denied', () => {
  const { decide } = gate();
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  for (const c of [
    'git push origin master',
    'bash -c "git push origin main"',
    "sh -c 'git push origin main'",
    '(git push origin main)',
    '$(git push origin main)',
    '`git push origin main`',
    'git push origin main>/dev/null',
    'git push origin main 2>&1',
    'git push origin main&',
    'git -C . push origin main',
    'git -c k=v push origin main',
    'git --no-pager push origin main',
  ]) assert.ok(decide(bash(c), 'owner'), 'denied: ' + c);
});

test('covers: merge/REQ-18/MG-2 under owner, a later line or a comment naming main is not a push to main', () => {
  const { decide } = gate();
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  for (const c of ['git push origin feature\necho main', 'git push origin feature # main', 'git push origin main-fix', 'git log main'])
    assert.strictEqual(decide(bash(c), 'owner'), null, 'allowed: ' + JSON.stringify(c));
});

// Added by the builder after review round 2 (FAIL on MG-2): a quoted # dropped the rest of the line, and a quoted
// option value with a space split in two. The gate now splits shell text the way the shell does.
test('covers: merge/REQ-18/MG-2 under owner, quoted text does not hide a push to main', () => {
  const { decide } = gate();
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  for (const c of [
    'git commit -m "fix #12" && git push origin main',
    "git commit -m 'close #4'; git push origin main",
    'git -C "my dir" push origin main',
    "git -C 'a b' push origin main",
    'bash -c "git push origin \\"main\\""',
    'git push origin ma"in"',
    "git push origin ma''in",
    'git push origin m\\ain',
  ]) assert.ok(decide(bash(c), 'owner'), 'denied: ' + c);
  for (const c of ['git commit -m "git push origin main"', 'echo "# git push origin main"', 'git push origin feature 2>&1 # main'])
    assert.strictEqual(decide(bash(c), 'owner'), null, 'allowed: ' + c);
});

test('covers: merge/REQ-18/MG-1 the hook reads the setting from CLAUDE_PROJECT_DIR before the call\'s folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-merge-root-'));
  try {
    fs.mkdirSync(path.join(root, '.puppeteering'));
    fs.writeFileSync(path.join(root, '.puppeteering', 'config.json'), '{"merge": "auto"}');
    fs.mkdirSync(path.join(root, 'sub'));
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 1' }, cwd: path.join(root, 'sub') });
    const r = spawnSync(process.execPath, [path.join(__dirname, 'merge-gate.js')], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '', 'auto from the project root');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
