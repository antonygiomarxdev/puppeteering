import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, Event, Loop, Task } from '../types'
import { HISTORY_KEPT, LEAD, alerts, deliver, departures, dropScripts, endCall, endScripts, endThought, errorOf, historyOf, kindOf, loopKey, moveTask, office, push, startCall, touch, remember, sentences, shellEnd, signature, startThought, streamThought, summarize } from './theatre'

const TICK_MS = 1_000
const STREAM_MS = 1_000
// Agents rarely write between steps unless asked, and this is what the office shows of them.
const NARRATE = '\n\nBefore each tool call, write one short sentence saying what you are about to do and why. A monitor shows it to the person running this team.'

const EMPTY: Board = { loops: {}, reports: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0 }

// Change the tag when a field changes: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'puppet-monitor', key: 'board' } as const, EMPTY, { shape: 'board-7' })

const loopOf = (state: Board, id: string, now: number): Loop => state.loops[id] ?? { running: [], lastAt: now, said: [] }


// An agent walks to whoever it writes to, and to the lead when its turn ends with its final answer.
async function report($: EngineInterface, id: string, text: string, to?: string, log = false) {
  const at = await $.clock.now()
  await update($, board, state => {
    const moved = { ...state, reports: { ...state.reports, [id]: { at, text, to } } }
    return log ? push(moved, id, { type: 'report', at, text }) : moved
  })
}

// The office page polls its session's file, so it needs no server. Each session has its own, so two sessions do not share one.
const STATE = (key: string) => `office/state-${key}.js`

// The session id where the engine gives one, else a hash of its directory; the key is filename-safe.
async function keyOf($: EngineInterface, cwd: string): Promise<string> {
  try {
    const id = (await $.session.id()).replace(/[^A-Za-z0-9-]/g, '')
    if (id) return id
  } catch {
    // session.id is not on every surface, so the directory names the session instead.
  }
  let hash = 2166136261
  for (const c of cwd) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(36)
}

// The page the Office button opens. Windows drops the query and hash of a file: URL it hands to the browser, so the page that opens carries no `?s=`: this one redirects with it.
const LAUNCHER = (key: string) => `office/open-${key}.html`
const launcherPage = (key: string) =>
  `<!doctype html><meta charset="utf-8"><title>Office</title><script>location.replace('index.html?s=${key}'+location.hash)</script><a href="index.html?s=${key}">Open the office</a>\n`

// Writes the per-session launcher (idempotent) and returns the key and the page the Office button opens.
// The key is set at session.start; after /reload-plugins that may not fire again, so an open with no key sets it here.
async function prepare($: EngineInterface, known: string, cwd: string): Promise<{ key: string; page: string }> {
  const key = known || (await keyOf($, cwd))
  const page = `${$.plugin.root}/${LAUNCHER(key)}`
  await $.fs.write(page, launcherPage(key))
  return { key, page }
}

// Opens the office page in the browser; undefined when it opened, else why it did not.
async function openOffice($: EngineInterface, page: string): Promise<string | undefined> {
  try {
    const root = $.plugin.root
    // The desktop app has no session.info, so a Windows root is recognised from its path instead.
    const windows = /^[A-Za-z]:[\\/]/.test(root) || root.startsWith('\\\\')
    // The engine rejects a bare `$.session` read, so the call itself is the check: where it is missing, it throws.
    let platform: string | undefined
    if (!windows) {
      try {
        platform = (await $.session.info()).platform
      } catch {
        platform = undefined
      }
    }
    if (windows) page = page.replace(/\//g, '\\')
    const openers = windows ? [['cmd', '/c', 'start', '', page]] : platform === 'macos' ? [['open', page]] : platform ? [['xdg-open', page]] : [['open', page], ['xdg-open', page]]
    let why: string | undefined = 'no opener'
    for (const argv of openers) {
      // process.run is CLI only, so on the desktop app it may reject: that is a failed opener, and the next is tried.
      try {
        const { exitCode, stderr } = await $.process.run(argv)
        why = exitCode === 0 ? undefined : `exit ${exitCode}${stderr.trim() ? `: ${stderr.trim()}` : ''}`
      } catch (err) {
        why = String(err)
      }
      if (why === undefined) return undefined
    }
    return why
  } catch (err) {
    return String(err)
  }
}

// The office page as a file: link. encodeURI handles spaces and '%'; parentheses end a Markdown link, and '#' and '?' start a fragment or query, so they are encoded by hand.
// The key comes after the encoded path, so a '?' in the root stays %3F and the query is the session's.
export function officeUrl(root: string, key?: string): string {
  const path = root.replace(/\\/g, '/')
  const url = encodeURI(`file://${path.startsWith('/') ? '' : '/'}${path}/office/index.html`).replace(/[()#?]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return key ? `${url}?s=${key}` : url
}

// The launcher as a file: link, which redirects with the key: the page a remote surface's link opens, since a bare index.html has no session.
export const launcherUrl = (root: string, key: string): string => officeUrl(root).replace(/index\.html$/, `open-${key}.html`)

export const register: Register = on => {
  let written = ''
  // This session's key, set at session.start and read again each tick: it names the state file and the office URL. /clear fires no session.start, so the tick is what sees a new session.
  let key = ''
  // The directory the session runs in: the office page names the project from it.
  let cwd = ''
  // Calls each agent made since its last turn ended: a turn with none (an acknowledgement, a shutdown) does not walk.
  const worked: Record<string, number> = {}

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    key = await keyOf($, cwd)
    await prepare($, key, cwd).catch(() => undefined)
    await $.command.register({ name: 'office', description: 'Open the office: each agent at its desk, in the browser' })
    $.clock.every(TICK_MS, async () => {
      const now = await $.clock.now()
      const fresh = await keyOf($, cwd)
      if (fresh !== key) {
        key = fresh
        written = ''
        await prepare($, key, cwd).catch(() => undefined)
      }
      const agents = (await $.agent.list()).map(agent => ({
        id: agent.id,
        name: agent.name ?? agent.description ?? agent.type,
        description: agent.description ?? agent.type,
        status: agent.status,
        type: agent.type,
      }))
      await update($, board, state => ({
        ...state,
        now,
        agents,
        departed: departures(state, agents, now),
      }))
      const state = await read($, board)
      const up = alerts(state)
      $.ui.status(up.length > 0 ? `puppets: ${up.join(', ')}` : undefined)
      const text = `window.office(${JSON.stringify(office(state, cwd))})\n`
      if (text !== written) {
        written = text
        await $.fs.write(`${$.plugin.root}/${STATE(key)}`, text)
      }
    })

    return next(e)
  })

  on('command.run', { command: 'office' }, async $ => {
    const why = await prepare($, key, cwd).then(opened => ((key = opened.key), openOffice($, opened.page)), String)
    if (why !== undefined) await update($, board, state => ({ ...state, officeFailed: true }))
    return { text: why === undefined ? 'Office opened in the browser.' : `Open this in a browser: ${launcherUrl($.plugin.root, key)}` }
  })

  // A row above the prompt: who is working, any alert, and the Office button.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Other mods share this slot: draw theirs below ours instead of replacing it.
    const below = await next(e).catch(() => undefined)
    const state = await read($, board)
    const working = state.agents.filter(agent => agent.status === 'running' || agent.status === 'pending').length
    const up = alerts(state)
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const width = e.surface === 'terminal' ? e.props.bodyColumns : undefined
    const office = async () => {
      const why = await prepare($, key, cwd).then(opened => ((key = opened.key), openOffice($, opened.page)), String)
      if (why !== undefined) {
        $.ui.toast(`puppets: office failed: ${why}`)
        await update($, board, state => ({ ...state, officeFailed: true }))
      }
    }
    const mine = (
      <Box flexDirection="row" alignItems="center" gap={2} width={width}>
        <Text color="#d97757">● puppets</Text>
        <Text dimColor>
          {state.agents.length} agents, {working} working
        </Text>
        {up.length > 0 && <Text color="error">! {up.join(', ')}</Text>}
        <Box flexGrow={1} />
        <Button key="office" plain label="Office" onPress={office} />
        {e.surface !== 'terminal' && state.officeFailed === true && (
          // A remote surface draws a file: link as text unless it can open it. It is offered only after an open failed, since the button opens the page.
          <Markdown text={`[open file](${key ? launcherUrl($.plugin.root, key) : officeUrl($.plugin.root)})`} />
        )}
      </Box>
    )
    return below ? (
      <Box flexDirection="column">
        {mine}
        {below}
      </Box>
    ) : (
      mine
    )
  }).catch(($, e, next) => next(e))

  on('session.send', async ($, e, next) => {
    if (e.agentId) await report($, e.agentId, e.text.split('\n')[0] ?? '', e.to)
    return next(e)
  }).catch(($, e, next) => next(e))

  // A resumed agent keeps its first prompt: the engine ignores a rewrite there.
  on('agent.spawn', ($, e, next) => next(e.resume ? e : { ...e, prompt: e.prompt + NARRATE })).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, board, state => ({
      ...state,
      isLeadBusy: true,
      loops: { ...state.loops, [LEAD]: { ...loopOf(state, LEAD, now), lastAt: now } },
    }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // Backstop: a script whose result never came back must not stay "Running code".
    const closedAt = await $.clock.now()
    await update($, board, state => dropScripts(state, e.agentId ?? LEAD, closedAt))
    if (!e.agentId) await update($, board, state => ({ ...state, isLeadBusy: false }))
    else if (worked[e.agentId]) {
      worked[e.agentId] = 0
      // The final answer's first sentence is what the coordinator hears.
      const final = sentences(e.answer)[0]
      await report($, e.agentId, final ?? (await read($, board)).loops[e.agentId]?.said.at(-1) ?? 'Done.', undefined, true)
    }
    return next(e)
  })

  // What each agent writes, kept by block so a stream does not redraw per word.
  on('turn.step', async function* ($, e, next) {
    const id = e.agentId ?? LEAD
    const save = async (text: string) => {
      if (!text.trim()) return
      const now = await $.clock.now()
      await update($, board, state => {
        const loop = loopOf(state, id, now)
        const moved = { ...state, now, loops: { ...state.loops, [id]: { ...loop, lastAt: now, said: remember(loop.said, text) } } }
        return push(moved, id, { type: 'said', at: now, text: text.trim() })
      })
    }
    // Thinking is kept apart from what the agent says: its start is saved at once, so the page counts it live, and its text when the block closes.
    let thought: string | undefined
    let seen = 0
    const closeThought = async () => {
      if (thought === undefined) return
      const done = thought
      thought = undefined
      const now = await $.clock.now()
      await update($, board, state => endThought({ ...state, now }, id, done, now))
    }
    const stream = next(e)
    let text = ''
    while (true) {
      const { value, done } = await stream.next()
      if (done) {
        await closeThought()
        await save(text)
        return value
      }
      if (value.kind === 'thinking') {
        const now = await $.clock.now()
        if (thought === undefined) {
          thought = ''
          seen = now
          await update($, board, state => startThought({ ...state, now }, id, now))
        } else if (now - seen >= STREAM_MS) {
          // At most once a second: a block cut short then reads as lasting until here.
          seen = now
          await update($, board, state => streamThought(state, id, now))
        }
        thought += value.text
      } else if (value.kind !== 'engine') await closeThought()
      if (value.kind === 'text') text += value.text
      if (value.kind === 'tool') {
        await save(text)
        text = ''
      }
      // A REPL call is one entry for the script; the calls it makes are nested under it until its result comes back (session.append).
      if (value.kind === 'tool' && value.name === 'REPL') {
        const now = await $.clock.now()
        const scriptId = value.id
        await update($, board, state => (state.loops[id]?.running.some(call => call.id === scriptId) ? state : startCall({ ...state, now }, id, { id: scriptId, tool: 'REPL', doing: 'Code: script', startedAt: now, kind: 'code' })))
      }
      yield value
    }
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? LEAD
    if (e.agentId && e.tool !== 'SendMessage') worked[e.agentId] = (worked[e.agentId] ?? 0) + 1
    const fields = e as unknown as Record<string, unknown>
    const doing = summarize(fields)
    const sig = signature(fields)
    const startedAt = await $.clock.now()
    await update($, board, state => {
      const loop = loopOf(state, id, startedAt)
      return startCall(
        { ...state, now: startedAt, loops: { ...state.loops, [id]: { ...loop, lastAt: startedAt, repeat: { sig, count: loop.repeat?.sig === sig ? loop.repeat.count + 1 : 1 } } } },
        id,
        { id: e.tool_use_id, tool: e.tool, doing, startedAt, kind: kindOf(e.tool) },
      )
    })
    // A call is ok only if it returned without an error: a throw leaves it false.
    let ok = false

    try {
      const ran = await next(e)
      const result = (ran as { result?: Record<string, any> }).result
      const at = await $.clock.now()
      await update($, board, state => {
        const who = id === LEAD ? LEAD : (state.agents.find(agent => agent.id === id)?.name ?? id.slice(0, 8))
        let { tasks, shells } = state
        const events: Event[] = []
        if (e.tool === 'TaskCreate' && result?.task) {
          const { id: taskId, subject } = result.task
          tasks = [...tasks, { id: taskId, subject, status: 'pending', blockedBy: [] }]
          events.push({ at, id: taskId, subject, kind: 'created', who: id })
        }
        if (e.tool === 'TaskUpdate') tasks = moveTask(tasks, fields, id)
        if (e.tool === 'TaskList' && result?.tasks) {
          tasks = result.tasks.map((task: Task) => ({
            id: task.id,
            subject: task.subject,
            status: task.status,
            blockedBy: task.blockedBy ?? [],
            owner: task.owner,
            by: tasks.find(known => known.id === task.id)?.by,
          }))
        }
        // A TaskList names who moved a task only by its owner: the caller did not move it.
        events.push(...historyOf(state.tasks, tasks, at, e.tool === 'TaskList' ? undefined : id))
        const history = events.length > 0 ? [...state.history, ...events].slice(-HISTORY_KEPT) : state.history
        if (e.tool === 'Bash' && result?.backgroundTaskId) {
          shells = [...shells, { id: result.backgroundTaskId, doing, who, startedAt, loop: id }].slice(-20)
        }
        if (e.tool === 'TaskStop' && result?.task_id) {
          shells = shells.map(shell => (shell.id === result.task_id ? { ...shell, ended: 'stopped' } : shell))
        }
        // A failed call sets the error; the next call that works clears it.
        const failed = errorOf(ran as { isError?: boolean; text?: string; deny?: string })
        const loop = loopOf(state, id, at)
        const loops = { ...state.loops, [id]: { ...loop, lastError: failed === undefined ? undefined : { at, text: failed } } }
        ok = failed === undefined
        let moved: Board = { ...state, tasks, shells, history, loops }
        for (const event of events) {
          if (event.kind !== 'created' && event.who) moved = push(moved, loopKey(state, event.who), { type: 'task', at, id: event.id, subject: event.subject, kind: event.kind })
        }
        const path = fields.file_path ?? fields.notebook_path
        if (ok && kindOf(e.tool) === 'write' && typeof path === 'string') moved = touch(moved, id, path)
        return e.tool === 'SendMessage' ? deliver(moved, id, fields, at) : moved
      })
      return ran
    } finally {
      const doneAt = await $.clock.now()
      await update($, board, state => {
        const loop = loopOf(state, id, doneAt)
        return endCall({
          ...state,
          now: doneAt,
          loops: {
            ...state.loops,
            [id]: { ...loop, running: loop.running.filter(call => call.id !== e.tool_use_id), last: doing, lastAt: doneAt },
          },
        }, id, e.tool_use_id, doneAt, ok)
      })
    }
    // A monitor must never cost anyone a tool call.
  }).catch(($, e, next) => next(e))

  on('session.append', async ($, e, next) => {
    const ended = shellEnd(e.message?.content)
    if (ended) {
      const at = await $.clock.now()
      await update($, board, state => {
        const shell = state.shells.find(known => known.id === ended.id)
        // A shell that failed sets its starter's error, as a failed call would.
        const loops = shell?.loop && ended.status === 'failed'
          ? { ...state.loops, [shell.loop]: { ...loopOf(state, shell.loop, at), lastError: { at, text: `${shell.doing} failed` } } }
          : state.loops
        return {
          ...state,
          loops,
          shells: state.shells.map(known => (known.id === ended.id ? { ...known, ended: ended.status } : known)),
        }
      })
    }
    const content = e.message?.content
    if (Array.isArray(content) && content.some(block => (block as { type?: unknown })?.type === 'tool_result')) {
      const at = await $.clock.now()
      await update($, board, state => endScripts(state, content, at))
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
