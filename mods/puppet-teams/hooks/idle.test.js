const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const idle = path.join(__dirname, 'idle.js');
let n = 0;

// Each call gets its own config dir and session id, so the loop guard file never leaks between tests.
function setup(tasks) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-idle-'));
  const sid = ('t' + process.pid + (n++) + 'xxxxxxxx').slice(0, 8);
  if (tasks) {
    const dir = path.join(cfg, 'tasks', 'session-' + sid);
    fs.mkdirSync(dir, { recursive: true });
    tasks.forEach((t) => fs.writeFileSync(path.join(dir, t.id + '.json'), typeof t === 'string' ? t : JSON.stringify(t)));
  }
  return { cfg, sid };
}
function run(env, name, input) {
  const stdin = input !== undefined ? input : JSON.stringify({ session_id: env.sid, teammate_name: name });
  return spawnSync(process.execPath, [idle], { input: stdin, encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: env.cfg } });
}
const T = (id, subject, o = {}) => ({ id: String(id), subject, status: 'pending', owner: '', blockedBy: [], ...o });

test('owned pending task gives exit 2 naming id and subject', () => {
  const e = setup([T(1, 'Builder. x', { owner: 'builder' })]);
  const r = run(e, 'builder');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /new task 1: Builder\. x/);
});

test('earlier completed task of the same owner is named', () => {
  const e = setup([T(1, 'Builder. a', { owner: 'builder', status: 'completed' }), T(2, 'Builder. b', { owner: 'builder' })]);
  assert.match(run(e, 'builder').stderr, /new task 2: Builder\. b, not task 1 again/);
});

test('owned task blocked by a pending task is not nudged', () => {
  const e = setup([T(1, 'Researcher. r', { owner: 'researcher' }), T(2, 'Builder. b', { owner: 'builder', blockedBy: ['1'] })]);
  assert.strictEqual(run(e, 'builder').status, 0);
});

test('blocker completed unblocks it', () => {
  const e = setup([T(1, 'Researcher. r', { status: 'completed' }), T(2, 'Builder. b', { owner: 'builder', blockedBy: ['1'] })]);
  assert.strictEqual(run(e, 'builder').status, 2);
});

test('free task of my role nudges; other role does not', () => {
  const e = setup([T(3, 'Builder. b')]);
  assert.strictEqual(run(e, 'builder-2').status, 2);
  assert.strictEqual(run(e, 'researcher').status, 0);
});

test('free task owned by someone else is left alone', () => {
  const e = setup([T(3, 'Builder. b', { owner: 'builder-1' })]);
  assert.strictEqual(run(e, 'builder-2').status, 0);
});

test('everything completed gives exit 0', () => {
  const e = setup([T(1, 'Builder. a', { owner: 'builder', status: 'completed' })]);
  assert.strictEqual(run(e, 'builder').status, 0);
});

test('missing dir, bad stdin, empty stdin, bad task file: exit 0, no stderr', () => {
  const cases = [
    [setup(null), undefined],
    [setup([T(1, 'Builder. a')]), 'not json'],
    [setup([T(1, 'Builder. a')]), ''],
    [setup(['{bad']), undefined],
  ];
  for (const [e, input] of cases) {
    const r = run(e, 'builder', input);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stderr, '');
  }
});

test('loop guard: third identical call exits 0', () => {
  const e = setup([T(1, 'Builder. a', { owner: 'builder' })]);
  assert.strictEqual(run(e, 'builder').status, 2);
  assert.strictEqual(run(e, 'builder').status, 2);
  assert.strictEqual(run(e, 'builder').status, 0);
});

test('role match uses the first name part; Reviewer is not Researcher', () => {
  const e = setup([T(1, 'Builder. a'), T(2, 'Reviewer. r')]);
  assert.match(run(e, 'builder-roles-2').stderr, /new task 1/);
  assert.strictEqual(run(e, 'researcher').status, 0);
});

test('hooks.json lists TeammateIdle without a matcher', () => {
  const h = JSON.parse(fs.readFileSync(path.join(__dirname, 'hooks.json'), 'utf8')).hooks.TeammateIdle;
  assert.strictEqual(h.length, 1);
  assert.strictEqual(h[0].matcher, undefined);
  assert.match(h[0].hooks[0].command, /hooks\/idle\.js/);
});
