#!/usr/bin/env node
// puppet-teams: TeammateIdle hook. An idle teammate whose task file says it has work gets exit 2 and a stderr line, so a crossed message cannot leave it idle.
// Reads ~/.claude/tasks/session-<sid8>, then team_name, and follows a .session-list in either; never writes tasks. Any failure exits 0 silently.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Windows may leave stdin open without end: exit quietly after 1 s.
setTimeout(() => process.exit(0), 1000).unref();

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw.replace(/^\uFEFF/, ''));
    const name = String(input.teammate_name || '');
    if (!name) return;
    const role = name.split('-')[0].toLowerCase();
    const cfg = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const sid8 = String(input.session_id || '').slice(0, 8);
    const dirs = [sid8 && 'session-' + sid8, input.team_name].filter(Boolean).map((n) => path.join(cfg, 'tasks', String(n)));
    // A resumed session keeps its tasks in an older dir: the new dir holds only a .session-list naming it.
    const has = (p) => { try { return fs.readdirSync(p).some((x) => x.endsWith('.json')); } catch (e) { return false; } };
    for (const p of [...dirs]) {
      try { dirs.push(path.join(cfg, 'tasks', fs.readFileSync(path.join(p, '.session-list'), 'utf8').trim())); } catch (e) { /* none */ }
    }
    const dir = dirs.find(has);
    if (!dir) return;
    const tasks = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      try { tasks.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, ''))); } catch (e) { /* skip */ }
    }
    const done = new Set(tasks.filter((t) => t.status === 'completed').map((t) => String(t.id)));
    const open = tasks.filter((t) => t.status !== 'completed' && !(t.blockedBy || []).some((b) => !done.has(String(b))));
    const byId = (a, b) => Number(a.id) - Number(b.id);
    const mine = open.filter((t) => t.owner === name).sort(byId)[0];
    const free = open.filter((t) => !t.owner && t.status === 'pending' && String(t.subject || '').split('.')[0].trim().toLowerCase() === role).sort(byId)[0];
    // A task its owner set to in_progress while a blocker is still open (issue #13): ask for pending, name the lowest open blocker.
    const openBlocker = (x) => (x.blockedBy || []).map(String).filter((b) => !done.has(b)).sort((a, b) => Number(a) - Number(b))[0];
    const blocked = tasks.filter((x) => x.owner === name && x.status === 'in_progress' && openBlocker(x)).sort(byId)[0];
    const t = mine || blocked || free;
    if (!t) return;
    // Loop guard: a teammate that cannot do the task would be sent back forever. Nudge twice per task, then let it idle.
    const guard = path.join(process.env.PUPPET_TEAMS_TMP || os.tmpdir(), 'puppet-teams-idle-' + (sid8 || 'x') + '.json');
    let seen = {};
    try { seen = JSON.parse(fs.readFileSync(guard, 'utf8')); } catch (e) { /* first run */ }
    const key = name + ':' + t.id;
    if ((seen[key] || 0) >= 2) return;
    seen[key] = (seen[key] || 0) + 1;
    fs.writeFileSync(guard, JSON.stringify(seen));
    const prev = tasks.filter((x) => x.owner === name && x.status === 'completed').sort(byId).pop();
    const again = prev ? ', not task ' + prev.id + ' again' : '';
    // An owner may be unable to close its task (a spawn prompt can forbid TaskUpdate): the notice lets it say so once instead of looping.
    const msg = t === blocked ? 'task ' + t.id + ' is blocked by ' + openBlocker(t) + ': set it back to pending'
      : t.status === 'in_progress' ? 'task ' + t.id + ': ' + t.subject + ' is still in_progress. If it is done, mark it completed with TaskUpdate, or, if you may not, tell team-lead once and stop. If not, keep going.'
      : 'new task ' + t.id + ': ' + t.subject + again;
    process.stderr.write(msg + '\n');
    process.exitCode = 2;
  } catch (e) {
    // Silent on purpose.
  }
});
