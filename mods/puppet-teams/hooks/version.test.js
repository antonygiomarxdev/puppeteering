const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const plugin = path.resolve(__dirname, '..');
const root = path.resolve(plugin, '..', '..');
const readJson = (p) => {
  assert.ok(fs.existsSync(p), p + ' exists');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

test('covers: ops/REQ-11/D-24 package.json version equals .claude-plugin/plugin.json version', () => {
  const pkg = readJson(path.join(plugin, 'package.json'));
  const manifest = readJson(path.join(plugin, '.claude-plugin', 'plugin.json'));
  assert.ok(pkg.version, 'package.json has a version');
  assert.strictEqual(pkg.version, manifest.version, 'copy the version into both files after a bump');
});

// True when a pending changeset names puppet-teams, or the newest CHANGELOG version equals version.
function releaseRecorded(changesetDir, changelogPath, version) {
  if (fs.existsSync(changesetDir)) {
    const named = fs.readdirSync(changesetDir)
      .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
      .some((f) => {
        const m = fs.readFileSync(path.join(changesetDir, f), 'utf8').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
        return m && /^\s*["']puppet-teams["']\s*:/m.test(m[1]);
      });
    if (named) return true;
  }
  if (!fs.existsSync(changelogPath)) return false;
  const h = fs.readFileSync(changelogPath, 'utf8').match(/^## +(\S+)/m);
  return !!h && h[1] === version;
}

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pt-ver-'));

test('covers: ops/REQ-11/D-29 releaseRecorded: pending changeset naming puppet-teams is true', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.changeset'));
  fs.writeFileSync(path.join(d, '.changeset', 'a.md'), '---\n"puppet-teams": patch\n---\n\nx\n');
  fs.writeFileSync(path.join(d, '.changeset', 'README.md'), '---\n"other": patch\n---\n');
  assert.strictEqual(releaseRecorded(path.join(d, '.changeset'), path.join(d, 'CHANGELOG.md'), '9.9.9'), true);
  fs.rmSync(d, { recursive: true, force: true });
});

test('covers: ops/REQ-11/D-29 releaseRecorded: first CHANGELOG version equal to version is true after a release', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.changeset'));
  fs.writeFileSync(path.join(d, 'CHANGELOG.md'), '# puppet-teams\n\n## 0.4.0\n\n- a\n\n## 0.3.2\n');
  assert.strictEqual(releaseRecorded(path.join(d, '.changeset'), path.join(d, 'CHANGELOG.md'), '0.4.0'), true);
  fs.rmSync(d, { recursive: true, force: true });
});

test('covers: ops/REQ-11/D-29 releaseRecorded: no changeset, stale or missing CHANGELOG, README only is false', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.changeset'));
  fs.writeFileSync(path.join(d, '.changeset', 'README.md'), '---\n"puppet-teams": patch\n---\n');
  fs.writeFileSync(path.join(d, '.changeset', 'b.md'), '---\n"other": patch\n---\n');
  assert.strictEqual(releaseRecorded(path.join(d, '.changeset'), path.join(d, 'CHANGELOG.md'), '0.4.0'), false, 'missing CHANGELOG');
  fs.writeFileSync(path.join(d, 'CHANGELOG.md'), '## 0.3.2\n\n## 0.4.0\n');
  assert.strictEqual(releaseRecorded(path.join(d, '.changeset'), path.join(d, 'CHANGELOG.md'), '0.4.0'), false, 'newest is 0.3.2');
  fs.rmSync(d, { recursive: true, force: true });
});

test('covers: ops/REQ-11/D-29 a release is recorded for puppet-teams in the real repo', () => {
  const pkg = readJson(path.join(plugin, 'package.json'));
  assert.ok(releaseRecorded(path.join(root, '.changeset'), path.join(plugin, 'CHANGELOG.md'), pkg.version), 'add a changeset naming puppet-teams');
});

test('covers: ops/REQ-11/D-24 package-lock.json lists node_modules/@changesets/cli', () => {
  const lock = readJson(path.join(root, 'package-lock.json'));
  assert.ok(lock.packages && lock.packages['node_modules/@changesets/cli'], 'run npm install at the root');
});

test('covers: ops/REQ-11/D-24 .gitignore has a line node_modules/', () => {
  const lines = fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
  assert.ok(lines.includes('node_modules/'), '.gitignore ignores node_modules/');
});
