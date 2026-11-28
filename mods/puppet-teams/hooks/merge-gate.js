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

// Shell text to commands of plain words, the way the shell splits them: quotes and backslashes join a word
// (`ma"in"` is main, `-C "my dir"` one value), a # starts a comment only at the start of a word outside quotes,
// and ; & | ( ) ` $( <( >( and newlines end a command outside quotes; $( ) and backticks inside double quotes
// are read as commands too. A redirection's target is dropped.
// Text a shell runs (bash -c "...", eval ...) is read again as commands; other quoted text, a commit message, is not.
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
// The text a command hands to a shell: the argument after -c of a shell, or what follows eval.
function shellText(words) {
  const found = [];
  for (let i = 0; i < words.length; i++) {
    const name = words[i].split('/').pop();
    if (name === 'eval') { found.push(words.slice(i + 1).join(' ')); break; }
    if (SHELLS.has(name)) {
      const c = words.findIndex((w, k) => k > i && /^-[a-z]*c[a-z]*$/.test(w));
      if (c > 0 && words[c + 1] !== undefined) found.push(words[c + 1]);
      break;
    }
  }
  return found;
}

// Past this, the gate denies instead of guessing: a command it cannot read in time must not slip through.
const MAX_LENGTH = 100000;
const MAX_DEPTH = 8;
class Unreadable extends Error {}

// The text between an opening $( at i (pointing at '(') and its closing ), parens nested; the index after it.
function closeParen(text, i) {
  let level = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '\\') { j++; continue; }
    if (text[j] === '(') level++;
    else if (text[j] === ')' && --level === 0) return [text.slice(i + 1, j), j];
  }
  return [text.slice(i + 1), text.length];
}

function segments(command, depth = 0) {
  if (depth > MAX_DEPTH) throw new Unreadable('nested too deep');
  const out = [];
  let words = [];
  let word = '';
  let quoted = false; // the current word holds a quoted part
  let redirect = false; // the next word is a redirection target
  const endWord = () => {
    if (word !== '' || quoted) {
      if (redirect) redirect = false;
      else {
        words.push(word);
      }
    }
    word = '';
    quoted = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) {
      out.push(words);
      for (const inner of shellText(words)) out.push(...segments(inner, depth + 1));
    }
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '\\') { if (i + 1 < command.length && command[i + 1] !== '\n') word += command[++i]; else i++; continue; }
    if (c === "'") { const j = command.indexOf("'", i + 1); word += command.slice(i + 1, j < 0 ? undefined : j); quoted = true; i = j < 0 ? command.length : j; continue; }
    if (c === '"') {
      let j = i + 1;
      for (; j < command.length && command[j] !== '"'; j++) {
        if (command[j] === '\\' && j + 1 < command.length && '"\\$`'.includes(command[j + 1])) j++;
        else if (command[j] === '$' && command[j + 1] === '(') {
          // Command substitution runs inside double quotes too: read its text as commands.
          const [inner, end] = closeParen(command, j + 1);
          out.push(...segments(inner, depth + 1));
          word += command.slice(j, end + 1);
          j = end;
          continue;
        } else if (command[j] === '`') {
          let end = j + 1;
          while (end < command.length && command[end] !== '`') end += command[end] === '\\' ? 2 : 1;
          out.push(...segments(command.slice(j + 1, end), depth + 1));
          word += command.slice(j, end + 1);
          j = end;
          continue;
        }
        word += command[j];
      }
      quoted = true; i = j; continue;
    }
    if (c === '#' && word === '' && !quoted) { const j = command.indexOf('\n', i); i = j < 0 ? command.length : j - 1; continue; }
    if ((c === '>' || c === '<') && command[i + 1] === '(') { endCommand(); i++; continue; } // <( ) and >( ) run a command
    if (c === '>' || c === '<') {
      if (/^\d*$/.test(word) && !quoted) word = '';
      endWord();
      while (command[i + 1] === '>' || command[i + 1] === '&') i++;
      if (/\d/.test(command[i + 1] || '') && command[i] === '&') { while (/\d/.test(command[i + 1] || '')) i++; continue; }
      redirect = true; continue;
    }
    if (c === '$' && command[i + 1] === '(') { endCommand(); i++; continue; }
    if (';&|()`\n'.includes(c)) { endCommand(); continue; }
    if (/\s/.test(c)) { endWord(); continue; }
    word += c;
  }
  endCommand();
  return out;
}

// git's own options before the subcommand; these take a value.
const GIT_VALUE_OPTS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

// A git push whose refspecs after the remote name main or master as the target.
function pushesToMain(command) {
  if (command.length > MAX_LENGTH) throw new Unreadable('too long');
  for (const words of segments(command)) {
    // One pass: each push's arguments run to the next git word, so the scan stays linear in the command's length.
    for (let i = words.indexOf('git'); i >= 0; ) {
      const next = words.indexOf('git', i + 1);
      const stop = next < 0 ? words.length : next;
      let k = i + 1;
      while (k < stop && words[k].startsWith('-')) k += GIT_VALUE_OPTS.has(words[k]) && !words[k].includes('=') ? 2 : 1;
      if (words[k] === 'push') {
        let remote = false;
        for (let a = k + 1; a < stop; a++) {
          if (words[a].startsWith('-')) continue;
          if (!remote) { remote = true; continue; }
          if (PROTECTED.test(words[a])) return true;
        }
      }
      i = next;
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
  try {
    if (/\bgh\s+pr\s+merge\b/.test(command) || pushesToMain(command)) return { reason: REASON };
  } catch (e) {
    if (e instanceof Unreadable) return { reason: 'The merge gate could not read this command (' + e.message + '), so it is denied. ' + REASON };
    throw e;
  }
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
