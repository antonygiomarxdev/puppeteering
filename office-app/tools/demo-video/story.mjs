// The demo's script: keyframes in story seconds, turned into the OfficeState the page reads (see src/types.ts).
// stateAt(t, t0) is pure: t is story seconds, t0 the wall-clock ms at which t = 0, so every `at` is absolute.
export const DURATION = 31

// The stuck beat: with --zoom-map the recording zooms in on this agent from `from` to `to` (story seconds).
export const ZOOM = { from: 16, to: 20, who: 'builder-2' }

// Click the Team card of an agent / close its drawer at these story times.
export const CLICKS = [
  { t: 20, select: 'builder-2' },
  { t: 23.5, close: true },
]

const CREATED = [3.0, 3.7, 4.4, 5.1, 5.8]
const TASKS = [
  { n: '1', subject: 'Add a dark mode toggle to the settings page', who: 'builder-1', taken: 4.6, done: 24.6, report: 24.0, say: 'Toggle and theme tokens are in, tests green.' },
  { n: '2', subject: 'Fix the flaky checkout test', who: 'builder-2', taken: 5.4, done: 28.0, report: 27.4, say: 'Race in the cart mock. Fixed, 20 runs green.' },
  { n: '3', subject: 'Review the auth middleware diff', who: 'reviewer', taken: 6.2, done: 25.6, report: 25.0, say: 'One real bug: token expiry uses < not <=.' },
  { n: '4', subject: 'Compare rate-limit libraries for the API', who: 'researcher', taken: 7.0, done: 26.4, report: 25.8, say: 'Use rate-limiter-flexible. Notes are in notes.md.' },
  { n: '5', subject: 'Design the empty state for the inbox', who: 'designer', taken: 7.8, done: 27.2, report: 26.6, say: 'Empty inbox SVG ready, two variants.' },
]

// A call: s..e in story seconds. ok is the result once it ends.
const call = (s, e, tool, kind, what, ok) => ({ s, e, tool, kind, what, ok })

const CAST = {
  'builder-1': {
    type: 'builder', description: 'writes the code',
    calls: [
      call(8, 10.5, 'Read', 'read', 'SettingsPage.tsx'),
      call(10.5, 13, 'Edit', 'write', 'Toggle.tsx'),
      call(13, 14, 'Edit', 'write', 'theme.css'),
      call(14, 16.5, 'Bash', 'shell', 'npm test', true),
      call(16.5, 20, 'Edit', 'write', 'SettingsPage.tsx'),
      call(20, 23, 'Bash', 'shell', 'npm test', true),
    ],
    extra: [
      { at: 9, type: 'said', text: 'Toggle goes next to the language picker.' },
      { at: 13.2, type: 'received', from: 'designer', text: 'Toggle needs the moon icon, 16px.' },
    ],
  },
  'builder-2': {
    type: 'builder', description: 'writes the code',
    calls: [
      call(8, 10, 'Read', 'read', 'checkout.spec.ts'),
      call(10, 12.5, 'Bash', 'shell', 'npx vitest checkout', false),
      call(12.5, 14, 'Edit', 'write', 'checkout.spec.ts'),
      call(14, 16, 'Bash', 'shell', 'npx vitest checkout', false),
      call(16, 19, 'Bash', 'shell', 'npx vitest checkout', false),
      call(19, 24, 'Bash', 'shell', 'npx vitest checkout', false),
      call(24, 25.5, 'Edit', 'write', 'cart.mock.ts'),
      call(25.5, 27, 'Bash', 'shell', 'npx vitest checkout', true),
    ],
    extra: [{ at: 15, type: 'said', text: 'Same timeout again. Trying a longer wait.' }],
    stuck: [16, 24],
    error: { from: 12.5, to: 24, text: 'checkout.spec.ts: timeout of 5000ms exceeded' },
  },
  reviewer: {
    type: 'reviewer', description: 'reviews the work',
    calls: [
      call(8, 10.5, 'Read', 'read', 'auth/middleware.ts'),
      call(10.5, 12, 'Grep', 'read', 'verifyToken'),
      call(12, 15, 'Read', 'read', 'auth/session.ts'),
      call(15, 20, 'Edit', 'write', 'REVIEW.md'),
    ],
    extra: [{ at: 14, type: 'said', text: 'Token expiry check uses < not <=.' }],
  },
  researcher: {
    type: 'researcher', description: 'finds out how things work',
    calls: [
      call(8, 11, 'WebSearch', 'web', 'express rate limit libraries'),
      call(11, 14, 'WebFetch', 'web', 'npmjs.com/package/rate-limiter-flexible'),
      call(14, 16, 'Read', 'read', 'package.json'),
      call(16, 22, 'Edit', 'write', 'notes.md'),
    ],
    extra: [{ at: 11.2, type: 'said', text: 'Three candidates. One is unmaintained.' }],
  },
  designer: {
    type: 'designer', description: 'draws the interface',
    calls: [
      call(8, 12, 'Edit', 'write', 'inbox-empty.svg'),
      call(12, 13, 'SendMessage', 'message', 'builder-1'),
      call(13, 20, 'Edit', 'write', 'inbox-empty.svg'),
    ],
    extra: [{ at: 12.5, type: 'sent', to: 'builder-1', text: 'Toggle needs the moon icon, 16px.' }],
    visit: { at: 13, to: 'builder-1', text: 'Sent builder-1 the toggle icon spec.' },
  },
}

const seconds = x => Math.round(x * 1000)

function desk(name, spec, t, t0) {
  const A = s => t0 + seconds(s)
  const job = TASKS.find(k => k.who === name)
  const taken = t >= job.taken
  const done = t >= job.done
  const calls = spec.calls.filter(c => c.s <= t)
  const cur = spec.calls.find(c => c.s <= t && t < c.e)
  const last = calls[calls.length - 1]

  const timeline = [
    ...calls.map(c => ({ type: 'call', at: A(c.s), id: `${name}-${c.s}`, ...(t >= c.e ? { end: A(c.e) } : {}), tool: c.tool, kind: c.kind, what: c.what, ...(t >= c.e && c.ok !== undefined ? { ok: c.ok } : {}) })),
    ...spec.extra.filter(e => e.at <= t).map(e => ({ ...e, at: A(e.at) })),
    ...(taken ? [{ type: 'task', at: A(job.taken), id: job.n, subject: job.subject, kind: 'taken' }] : []),
    ...(done ? [{ type: 'task', at: A(job.done), id: job.n, subject: job.subject, kind: 'done' }] : []),
    ...(t >= job.report ? [{ type: 'report', at: A(job.report), text: job.say }] : []),
  ].sort((a, b) => b.at - a.at).slice(0, 40)

  const files = {}
  for (const c of calls) if (c.kind === 'write') files[c.what] = (files[c.what] ?? 0) + 1
  const stuck = spec.stuck && t >= spec.stuck[0] && t < spec.stuck[1]
  const err = spec.error && t >= spec.error.from && t < spec.error.to

  // Reports in order: the peer visit first (designer), then the one to the lead.
  let report
  if (spec.visit && t >= spec.visit.at) report = { at: A(spec.visit.at), text: spec.visit.text, to: spec.visit.to }
  if (t >= job.report) report = { at: A(job.report), text: job.say }

  const said = [...spec.extra].filter(e => e.type === 'said' && e.at <= t).pop()
  return {
    id: `a${name}-${name.length}c0ffee`,
    name,
    type: spec.type,
    description: spec.description,
    status: 'running',
    working: taken && !done,
    sleeping: !taken,
    ...(taken ? { task: `#${job.n} ${job.subject}` } : {}),
    ...(said ? { said: said.text } : {}),
    doing: cur ? `> ${cur.tool}: ${cur.what} ${Math.max(0, Math.floor(t - cur.s))}s` : last && taken && !done ? `was ${last.tool}: ${last.what}` : '',
    ...(cur ? { kind: cur.kind, since: A(cur.s) } : {}),
    ...(stuck ? { alert: { kind: 'stuck', text: 'the same test failed 4 times in a row' } } : {}),
    ...(err ? { lastError: { at: A(spec.error.from + 1.5), text: spec.error.text } } : {}),
    ...(report ? { report } : {}),
    timeline,
    files: Object.entries(files).map(([path, count]) => ({ path, count })).reverse(),
  }
}

export function stateAt(t, t0) {
  t = Math.max(0, t)
  const A = s => t0 + seconds(s)
  const made = CREATED.map((s, i) => ({ k: TASKS[i], s })).filter(x => t >= x.s)
  const history = [
    ...made.map(x => ({ at: A(x.s), id: x.k.n, subject: x.k.subject, kind: 'created' })),
    ...TASKS.filter(k => t >= k.taken).map(k => ({ at: A(k.taken), id: k.n, subject: k.subject, kind: 'taken', who: k.who })),
    ...TASKS.filter(k => t >= k.done).map(k => ({ at: A(k.done), id: k.n, subject: k.subject, kind: 'done', who: k.who })),
  ].sort((a, b) => b.at - a.at)

  const creating = t >= 3 && t < 6.6
  const board = made.map(x => ({
    id: x.k.n, subject: x.k.subject, owner: t >= x.k.taken ? x.k.who : undefined, blocked: false,
    status: t >= x.k.done ? 'completed' : t >= x.k.taken ? 'in_progress' : 'pending',
  }))
  const closing = t >= 24 && t < 29
  return {
    project: { name: 'storefront', cwd: 'C:\\Users\\dev\\storefront' },
    lead: {
      busy: creating || closing,
      doing: creating ? `> TaskCreate: ${TASKS[Math.min(4, made.length - 1)]?.subject ?? ''} 1s` : closing ? '> TaskList 1s' : '',
      ...(creating || closing ? { kind: 'board' } : {}),
      ...(t >= 4 && t < 12 ? { said: 'Five tasks, one per agent. Go.' } : t >= 28 ? { said: 'All five done. Nice work, team.' } : {}),
      timeline: [], files: [],
    },
    agents: Object.entries(CAST).map(([name, spec]) => desk(name, spec, t, t0)),
    tasks: { done: TASKS.filter(k => t >= k.done).length, total: made.length },
    board,
    history,
  }
}

// The file the page loads: an IIFE, because the loader re-adds the script tag every second and a top-level const would throw on the second run.
export const stateScript = (t, t0) => `;(function(){window.office(${JSON.stringify(stateAt(t, t0))})})()\n`
