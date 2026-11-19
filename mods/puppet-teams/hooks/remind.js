#!/usr/bin/env node
// puppet-teams: UserPromptSubmit hook that reminds the main session to load the puppet-teams:agent-teams skill.
// Any failure exits 0 with no output: a prompt must never fail because of this hook.
const TEXT = 'puppet-teams: if this prompt starts new multi-step work (more than one file, one command, or one question), your first action is TaskList, then TaskCreate the whole pile, then spawn a standing team by role (skill: puppet-teams:agent-teams). Do not start the work yourself. Otherwise, a follow-up, a question or a one-line fix, ignore this. Teammates: ignore this.';

// Windows may leave stdin open without end: exit quietly after 1 s.
setTimeout(() => process.exit(0), 1000).unref();

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw.replace(/^\uFEFF/, ''));
    if (input.agent_id) return; // a teammate or subagent
    const p = String(input.prompt || '').trim();
    if (p.startsWith('/') || p.length <= 15) return; // slash command or short reply
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: TEXT },
    }));
  } catch (e) {
    // Silent on purpose.
  }
});
