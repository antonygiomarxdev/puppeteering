#!/usr/bin/env node
// puppet-teams: SessionStart hook that injects the agent-teams rules into every session.
// Any failure exits 0 with no output: a session must never fail because of this hook.
const fs = require('fs');
const path = require('path');

try {
  const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
  const rules = fs.readFileSync(path.join(root, 'RULES.md'), 'utf8');
  // The plugin sits at <repo>/mods/puppet-teams, so the repo is two levels up.
  const repo = path.resolve(root, '..', '..');
  const docs = fs.existsSync(path.join(repo, 'ONBOARDING.md'))
    ? repo.split(path.sep).join('/')
    : 'https://github.com/antonygiomarxdev/puppeteering/blob/main';
  const text = rules.replace(/\{DOCS\}/g, () => docs);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
  }));
} catch (e) {
  // Silent on purpose: a broken rules file must not fail the session.
}
