// covers: ops/REQ-11/D-32 (SPEC-01-6)
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', '..', '..', '.github', 'workflows', 'release.yml');
const yml = () => {
  assert.ok(fs.existsSync(file), file + ' exists');
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
};

test('covers: ops/REQ-11/D-32 release.yml exists', () => {
  assert.ok(fs.existsSync(file), '.github/workflows/release.yml exists');
});

test('covers: ops/REQ-11/D-32 uses changesets/action@v2', () => {
  assert.match(yml(), /uses:\s*changesets\/action@v2/);
});

test('covers: ops/REQ-11/D-32 triggers on push to main', () => {
  assert.match(yml(), /^on:\s*\n\s+push:\s*\n\s+branches:\s*\[?\s*-?\s*main\b/m);
});

test('covers: ops/REQ-11/D-32 permissions has contents write and pull-requests write', () => {
  const t = yml();
  assert.match(t, /^\s*contents:\s*write\s*$/m);
  assert.match(t, /^\s*pull-requests:\s*write\s*$/m);
});

test('covers: ops/REQ-11/D-32 version-script is npm run release:version', () => {
  assert.match(yml(), /version-script:\s*npm run release:version\s*$/m);
});

test('covers: ops/REQ-11/D-32 publish-script contains changeset git-tag', () => {
  assert.match(yml(), /publish-script:.*changeset git-tag/);
});

test('covers: ops/REQ-11/D-32 create-github-releases is true', () => {
  assert.match(yml(), /create-github-releases:\s*true\s*$/m);
});

test('covers: ops/REQ-11/D-32 node-version is 22 or higher', () => {
  const m = yml().match(/node-version:\s*['"]?(\d+)/);
  assert.ok(m, 'node-version is set');
  assert.ok(parseInt(m[1], 10) >= 22, 'node-version ' + m[1]);
});

test('covers: ops/REQ-11/D-32 npm ci runs before the action', () => {
  const t = yml();
  const ci = t.indexOf('npm ci');
  const act = t.indexOf('changesets/action@v2');
  assert.ok(ci >= 0, 'npm ci present');
  assert.ok(act >= 0 && ci < act, 'npm ci comes before changesets/action');
});

test('covers: ops/REQ-11/D-32 no npm publish and no NPM_TOKEN', () => {
  const t = yml();
  assert.ok(!/npm publish/.test(t), 'no npm publish');
  assert.ok(!/NPM_TOKEN/.test(t), 'no NPM_TOKEN');
});
