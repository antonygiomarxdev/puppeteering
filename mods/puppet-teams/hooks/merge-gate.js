#!/usr/bin/env node
// puppet-teams: PreToolUse hook (REQ-18, docs/merge/specs/SPEC-01-1-merge-gate-hook.md).
// Under the project's merge setting "owner" (the default), the calls that merge are denied: the owner merges.
// Under "auto" they are allowed. Every other call, and input it cannot parse, is allowed.
const fs = require('fs');
const path = require('path');

const REASON = "This project's merge setting is owner (.puppeteering/config.json): the owner merges. "
  + 'Give the owner the review and a merge recommendation (Merge: recommend or Merge: do not merge), and wait. '
  + 'This hook reads words, not shell: if the command only mentions push and main, or gh and merge (a commit message, a note), rewrite it without them.';

// 'auto' only when .puppeteering/config.json says so; anything else, a missing or unreadable file included, is 'owner'.
function mergeSetting(root) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(String(root || '.'), '.puppeteering', 'config.json'), 'utf8').replace(/^\uFEFF/, ''));
    return cfg && cfg.merge === 'auto' ? 'auto' : 'owner';
  } catch (e) {
    return 'owner';
  }
}

const MERGE_TOOL = /(merge_pull_request|enable_pr_auto_merge)$/;

// MG-2: a coarse word rule, not a shell parser. Four reviews found a new bypass after each parser fix, so the hook
// reads no shell syntax: it lowercases the text, reads ${IFS} and $IFS as spaces, drops quotes, backslashes, braces,
// commas and $, and looks at words (runs of letters, digits, _, - and .). A command that only mentions the words is
// denied too, and the reason asks for it to be rewritten. GitHub branch protection is the real gate.
function words(command) {
  const text = command.toLowerCase().replace(/\$\{ifs\}|\$ifs/g, ' ').replace(/["'\\{},$]/g, '');
  return new Set(text.split(/[^a-z0-9_.-]+/).filter(Boolean));
}

function merges(command) {
  const w = words(command);
  return (w.has('push') && (w.has('main') || w.has('master'))) || (w.has('merge') && (w.has('gh') || w.has('pulls')));
}

// null to allow, { reason } to deny.
function decide(input, setting) {
  if (setting === 'auto' || !input || typeof input !== 'object') return null;
  const tool = String(input.tool_name || '');
  if (MERGE_TOOL.test(tool)) return { reason: REASON };
  if (tool !== 'Bash') return null;
  return merges(String((input.tool_input && input.tool_input.command) || '')) ? { reason: REASON } : null;
}

// Read the PreToolUse JSON from stdin and print a deny, or nothing. hooks.json calls run(); a direct `node merge-gate.js` does too.
function run() {
  setTimeout(() => process.exit(0), 1000).unref();
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('error', () => process.exit(0));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const d = decide(input, mergeSetting(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()));
      if (d) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: d.reason } }));
    } catch (e) {
      // Not parseable: not a call this hook judges.
    }
    process.exit(0);
  });
}

module.exports = { mergeSetting, decide, run };

if (require.main === module) run();
