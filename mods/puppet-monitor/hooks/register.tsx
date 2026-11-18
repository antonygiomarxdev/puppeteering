import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, Event, Loop, Task } from '../types'
import { HISTORY_KEPT, LEAD, alerts, draw, historyOf, moveTask, office, remember, sentences, shellEnd, signature, summarize } from './theatre'
import type { Tone } from './theatre'

const PANE = 'puppet-monitor'
const TICK_MS = 1_000
// Agents rarely write between steps unless asked, and this is what the pane shows of them.
const NARRATE = '\n\nBefore each tool call, write one short sentence saying what you are about to do and why. A monitor shows it to the person running this team.'

const EMPTY: Board = { loops: {}, reports: {}, tasks: [], history: [], shells: [], agents: [], isLeadBusy: false, now: 0 }

// Change the tag when a field changes: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'puppet-monitor', key: 'board' } as const, EMPTY, { shape: 'board-4' })

const loopOf = (state: Board, id: string, now: number): Loop => state.loops[id] ?? { running: [], lastAt: now, said: [] }

const COLORS: Partial<Record<Tone, string>> = { alert: '#ff5a5a', ok: '#6bf0a0', lead: '#ffb000' }


// An agent walks to whoever it writes to, and to the lead when its turn ends with its final answer.
async function report($: EngineInterface, id: string, text: string, to?: string) {
  const at = await $.clock.now()
  await update($, board, state => ({ ...state, reports: { ...state.reports, [id]: { at, text, to } } }))
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

export const register: Register = on => {
  let written = ''
  // This session's key, set at session.start: it names the state file and the office URL.
  let key = ''
  // The directory the session runs in: the office page names the project from it.
  let cwd = ''
  // Calls each agent made since its last turn ended: a turn with none (an acknowledgement, a shutdown) does not walk.
  const worked: Record<string, number> = {}

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    key = await keyOf($, cwd)
    await $.command.register({ name: 'puppets', description: 'Show the lead and its agents at work, in a pane' })
    await $.command.register({ name: 'office', description: 'Open the office: each agent at its desk, in the browser' })
    $.clock.every(TICK_MS, async () => {
      const now = await $.clock.now()
      const agents = await $.agent.list()
      await update($, board, state => ({
        ...state,
        now,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name ?? agent.description ?? agent.type,
          description: agent.description ?? agent.type,
          status: agent.status,
        })),
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

  on('command.run', { command: 'puppets' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Puppets' })
    return { text: 'Puppets pane opened.' }
  })

  on('command.run', { command: 'office' }, async $ => {
    const url = officeUrl($.plugin.root, key)
    return { text: (await openOffice($, url)) === undefined ? 'Office opened in the browser.' : `Open this in a browser: ${url}` }
  })

  // A row above the prompt: who is working, any alert, and the two ways to look.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Other mods share this slot: draw theirs below ours instead of replacing it.
    const below = await next(e).catch(() => undefined)
    const state = await read($, board)
    const working = state.agents.filter(agent => agent.status === 'running' || agent.status === 'pending').length
    const up = alerts(state)
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const width = e.surface === 'terminal' ? e.props.bodyColumns : undefined
    const office = async () => {
      const why = await openOffice($, officeUrl($.plugin.root, key))
      if (why !== undefined) $.ui.toast(`puppets: office failed: ${why}`)
    }
    // Ask the engine rather than keep a flag: the person may have closed the pane by hand.
    const pane = async () => {
      if ((await $.ui.panes()).some(open => open.id === PANE)) return $.ui.close({ id: PANE })
      await $.ui.open({ id: PANE, title: 'Puppets' })
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
        {e.surface !== 'terminal' && (
          // A remote surface draws a file: link as text unless it can open it, so the link is offered beside the button.
          <Markdown text={`[open file](${officeUrl($.plugin.root, key)})`} />
        )}
        <Button key="pane" plain label="Pane" onPress={pane} />
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
    if (!e.agentId) await update($, board, state => ({ ...state, isLeadBusy: false }))
    else if (worked[e.agentId]) {
      worked[e.agentId] = 0
      // The final answer's first sentence is what the coordinator hears.
      const final = sentences(e.answer)[0]
      await report($, e.agentId, final ?? (await read($, board)).loops[e.agentId]?.said.at(-1) ?? 'Done.')
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
        return { ...state, now, loops: { ...state.loops, [id]: { ...loop, lastAt: now, said: remember(loop.said, text) } } }
      })
    }
    const stream = next(e)
    let text = ''
    while (true) {
      const { value, done } = await stream.next()
      if (done) {
        await save(text)
        return value
      }
      if (value.kind === 'text' || value.kind === 'thinking') text += value.text
      if (value.kind === 'tool') {
        await save(text)
        text = ''
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
      return {
        ...state,
        now: startedAt,
        loops: {
          ...state.loops,
          [id]: {
            ...loop,
            lastAt: startedAt,
            running: [...loop.running, { id: e.tool_use_id, doing, startedAt }],
            repeat: { sig, count: loop.repeat?.sig === sig ? loop.repeat.count + 1 : 1 },
          },
        },
      }
    })

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
          shells = [...shells, { id: result.backgroundTaskId, doing, who, startedAt }].slice(-20)
        }
        if (e.tool === 'TaskStop' && result?.task_id) {
          shells = shells.map(shell => (shell.id === result.task_id ? { ...shell, ended: 'stopped' } : shell))
        }
        return { ...state, tasks, shells, history }
      })
      return ran
    } finally {
      const doneAt = await $.clock.now()
      await update($, board, state => {
        const loop = loopOf(state, id, doneAt)
        return {
          ...state,
          now: doneAt,
          loops: {
            ...state.loops,
            [id]: { ...loop, running: loop.running.filter(call => call.id !== e.tool_use_id), last: doing, lastAt: doneAt },
          },
        }
      })
    }
    // A monitor must never cost anyone a tool call.
  }).catch(($, e, next) => next(e))

  on('session.append', async ($, e, next) => {
    const ended = shellEnd(e.message?.content)
    if (ended) {
      await update($, board, state => ({
        ...state,
        shells: state.shells.map(shell => (shell.id === ended.id ? { ...shell, ended: ended.status } : shell)),
      }))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const state = await read($, board)
    const cols = e.props.bodyColumns ?? 60
    const rows = e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 30
    const openable = state.agents.filter(agent => !agent.id.includes('@')).slice(0, 9)

    return (
      <Box flexDirection="column">
        {draw(state, cols, rows - (openable.length > 0 ? 2 : 0)).map(line => (
          <Text wrap="truncate-end">
            {line.map(seg => (
              <Text color={COLORS[seg.tone]} dimColor={seg.tone === 'dim'} bold={seg.tone === 'bold'}>
                {seg.text}
              </Text>
            ))}
          </Text>
        ))}
        {openable.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            <Text dimColor>open:</Text>
            {openable.map((agent, i) => (
              <Button key={agent.id} hotkey={String(i + 1)} onPress={() => void $.ui.view({ agentId: agent.id })}>
                {i + 1} {agent.name.slice(0, 14)}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}

