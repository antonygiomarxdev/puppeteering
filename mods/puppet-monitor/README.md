# puppet-monitor

A pane beside the chat that shows who is working on what. It lists each agent and what it is running now, the shells left in the background, and the tasks with their owners. It flags work that has gone quiet.

Claude Code's task list says what is planned. This says who is on it and for how long.

## Try it

```
claude --plugin-dir ~/dev/puppeteering/mods/puppet-monitor
```

The pane opens beside the chat if the terminal is wide enough. `/puppets` opens it at any width.

## What it shows

- **Agents:** the lead, subagents and teammates, with status, the current call and how long it has run.
- **Background:** who started each shell and when, until the engine reports its end.
- **Tasks:** status, owner, and what blocks them. Tasks made before the mod loaded appear after the next `TaskList`.
- **Flags, in red and in the status line:** `quiet` when a working agent has made no tool call for 2 minutes, and `long` when one call has run for 5.

## What it cannot show

- **Progress as a percentage.** No event reports it. You see elapsed time, not time left.
- **Teammates in a terminal pane of their own.** Their tool calls do not reach this session, only their status.
- **Whether something is stuck.** `quiet` can mean an agent is thinking, and a long shell can be healthy. A flag says where to look.

Checked in one live session: tool calls attributed to a subagent, a background shell and its end, and tasks with owners. In unit tests only: the flags. Not run: a real team of teammates.
