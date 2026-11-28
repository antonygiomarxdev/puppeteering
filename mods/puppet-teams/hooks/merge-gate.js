#!/usr/bin/env node
// puppet-teams: PreToolUse hook (REQ-18, docs/merge/specs/SPEC-01-1-merge-gate-hook.md).
// Under the project's merge setting "owner" (the default), the calls that merge are denied: the owner merges.
// Under "auto" they are allowed. Every other call, and input it cannot parse, is allowed.
const fs = require('fs');
const path = require('path');

const REASON = "This project's merge setting is owner (.puppeteering/config.json): the owner merges. "
  + 'Give the owner the review and a merge recommendation (Merge: recommend or Merge: do not merge), and wait.';

// 'auto' only when .puppeteering/config.json says so; anything else, a missing or unreadable file included, is 'owner'.
function mergeSetting(root) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(String(root || '.'), '.puppeteering', 'config.json'), 'utf8').replace(/^﻿/, ''));
    return cfg && cfg.merge === 'auto' ? 'auto' : 'owner';
  } catch (e) {
    return 'owner';
  }
}

const MERGE_TOOL = /(merge_pull_request|enable_pr_auto_merge)$/;
const PROTECTED = /^(?:\+?(?:refs\/heads\/)?(main|master)|.*:(?:refs\/heads\/)?(main|master))$/;

// Shell text to plain words: comments dropped, then every separator, subshell, quote and redirection made a break,
// so `bash -c "git push origin main"`, `(git push origin main)` and `git push origin main>/dev/null` read as plain commands.
function segments(command) {
  return command
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, '$1'))
    .join('\n')
    .replace(/\d*[<>]+&?\d*\S*/g, ' ')
    .split(/[\n;&|()`]|\$\(/)
    .map((seg) => seg.replace(/["']/g, ' ').trim().split(/\s+/).filter(Boolean));
}

// git's own options before the subcommand; these take a value.
const GIT_VALUE_OPTS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

// A git push whose refspecs after the remote name main or master as the target.
function pushesToMain(command) {
  for (const words of segments(command)) {
    for (let i = words.indexOf('git'); i >= 0; i = words.indexOf('git', i + 1)) {
      let k = i + 1;
      while (k < words.length && words[k].startsWith('-')) k += GIT_VALUE_OPTS.has(words[k]) && !words[k].includes('=') ? 2 : 1;
      if (words[k] !== 'push') continue;
      const args = words.slice(k + 1).filter((w) => !w.startsWith('-'));
      if (args.slice(1).some((ref) => PROTECTED.test(ref))) return true;
    }
  }
  return false;
}

// null to allow, { reason } to deny.
function decide(input, setting) {
  if (setting === 'auto' || !input || typeof input !== 'object') return null;
  const tool = String(input.tool_name || '');
  if (MERGE_TOOL.test(tool)) return { reason: REASON };
  if (tool !== 'Bash') return null;
  const command = String((input.tool_input && input.tool_input.command) || '');
  if (/\bgh\s+pr\s+merge\b/.test(command) || pushesToMain(command)) return { reason: REASON };
  return null;
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
