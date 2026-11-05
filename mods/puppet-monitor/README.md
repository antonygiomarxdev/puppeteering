# puppet-monitor

A pane beside the chat that stages your team as a puppet theatre. The lead sits at the top, and threads drop to each agent that is working. At a glance you see each agent's task, what it says, what it is running, and whether it is stuck or looping.

```
                .-"""""""-.    LEAD working
               /  \\\ ///  \
              |   (@) (@)   |  "Review of #1 failed. I send it back to
               \  vVvVvVv  /   builder-1 and carry on with the docs."
                '-._____.-'    > Agent: fix the login 3s
                     |
   +-----------------+----------------+-----------------------+
   |                                  |                       |
( o o ) builder-1                ( - - ) builder-2       ( x x ) reviewer
running                          ! STUCK 6m40s           ! LOOPING 6x
#1 Fix the login                 #3 Write the docs       #2 Review the PR
"The test fails because the      "I am installing the    "Checking the auth
token expires first."            docs tooling first."    file again."
> Bash: npm test 12s             > Bash: npm install     was Read: auth.ts
```

## Try it

```
claude --plugin-dir ~/dev/puppeteering/mods/puppet-monitor
```

The pane opens beside the chat if the terminal is wide enough. `/puppets` opens it at any width.

You read it; you do not have to operate it. With the pane focused, the number keys open an agent's whole conversation.

## What the signs mean

| Sign | Means |
| --- | --- |
| `( o o )` | Working |
| `( x x )` `! LOOPING` | The same call, with the same arguments, 3 times or more in a row |
| `( - - )` `! STUCK` | One call has run for 5 minutes |
| `( - - )` `! QUIET` | Working, with no activity for 2 minutes |
| `waiting:` | Not working: these agents sit off the stage, in one line |
| `[bg]` | A shell in the background, in red after 5 minutes |

Alerts also appear in the status line. With too many agents to stage, each gets one row, alerts first.

## What it changes

It adds one sentence to the prompt of every agent spawned while it is loaded, asking the agent to say what it is about to do before each tool call. That is where the quotes come from, and it costs some tokens. The quotes are what an agent says it is doing, not its reasoning.

## What it cannot show

- **Thinking.** In our runs the thinking blocks reached the mod with no text, even with `showThinkingSummaries: true`. That was in a running session and in a new `claude -p` process; a new interactive session is not tested. If text arrives, the pane shows it with the rest.
- **Progress as a percentage.** No event reports it. You see elapsed time, not time left.
- **Teammates in a terminal pane of their own.** Going by the API types, only their status reaches this session.
- **Proof.** `STUCK` can be a slow, healthy command, and `LOOPING` can be a poll. An alert says where to look.

## How it was checked

Live, with in-process teammates: a real loop raised `LOOPING`, narration arrived, and a render raised `STUCK` with the threshold lowered to 60 seconds for the test. The 5 minute threshold itself is in unit tests only, as is `QUIET`. Reading the end of a background shell relies on the text of an engine notice, which is not a documented format. Not run: teammates in terminal panes.
