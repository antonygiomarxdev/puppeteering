// covers: ops/REQ-11/D-32 (SPEC-01-5)
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const readJson = (p) => {
  assert.ok(fs.existsSync(p), p + ' exists');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};
const major = (v) => parseInt(String(v).replace(/^[^0-9]*/, ''), 10);

test('covers: ops/REQ-11/D-24 package.json range for @changesets/cli is major 3 or more', () => {
  const pkg = readJson(path.join(root, 'package.json'));
  const range = (pkg.devDependencies || {})['@changesets/cli'];
  assert.ok(range, 'devDependencies has @changesets/cli');
  assert.ok(major(range) >= 3, 'range is ' + range);
});

test('covers: ops/REQ-11/D-24 lock entry node_modules/@changesets/cli is major 3 or more', () => {
  const lock = readJson(path.join(root, 'package-lock.json'));
  const entry = lock.packages && lock.packages['node_modules/@changesets/cli'];
  assert.ok(entry, 'lock lists @changesets/cli');
  assert.ok(major(entry.version) >= 3, 'locked version is ' + entry.version);
});

test('covers: ops/REQ-11/D-32 config.json opts private packages in to version and tag', () => {
  const cfg = readJson(path.join(root, '.changeset', 'config.json'));
  assert.strictEqual(cfg.privatePackages && cfg.privatePackages.version, true, 'privatePackages.version');
  assert.strictEqual(cfg.privatePackages && cfg.privatePackages.tag, true, 'privatePackages.tag');
});

test('covers: ops/REQ-11/D-32 scripts release:version starts with changeset version', () => {
  const s = readJson(path.join(root, 'package.json')).scripts['release:version'];
  assert.ok(s, 'script release:version exists');
  assert.ok(s.startsWith('changeset version'), 'starts with changeset version');
});

test('covers: ops/REQ-11/D-32 the step after && copies the package version into plugin.json (temp copy)', () => {
  const s = readJson(path.join(root, 'package.json')).scripts['release:version'];
  assert.ok(s && s.includes('&&'), 'script release:version has a step after &&');
  const step = s.slice(s.indexOf('&&') + 2).trim();
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-rel-'));
  try {
    const mod = path.join(d, 'mods', 'puppet-teams');
    fs.mkdirSync(path.join(mod, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(mod, 'package.json'), JSON.stringify({ name: 'puppet-teams', version: '9.9.9' }));
    fs.writeFileSync(path.join(mod, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'puppet-teams', version: '0.0.1' }));
    execSync(step, { cwd: d, stdio: 'pipe' });
    const m = JSON.parse(fs.readFileSync(path.join(mod, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.strictEqual(m.version, '9.9.9');
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
