const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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

test('covers: ops/REQ-11/D-29 some .changeset/*.md (not README) names "puppet-teams" in its front matter', () => {
  const dir = path.join(root, '.changeset');
  assert.ok(fs.existsSync(dir), '.changeset exists');
  const named = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .filter((f) => {
      const m = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
      return m && /^\s*["']puppet-teams["']\s*:/m.test(m[1]);
    });
  assert.ok(named.length > 0, 'a changeset names puppet-teams');
});
