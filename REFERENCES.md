# References

Read these first. This guide adds to them, and if it disagrees with the official docs on what a tool does, the docs win: please open an issue.

## Official Claude Code docs

| Topic | Page |
| --- | --- |
| Agent teams | [agent-teams](https://code.claude.com/docs/en/agent-teams) |
| Which approach to use | [agents](https://code.claude.com/docs/en/agents) |
| Subagents and role definitions | [sub-agents](https://code.claude.com/docs/en/sub-agents) |
| Git worktrees | [worktrees](https://code.claude.com/docs/en/worktrees) |
| Messaging between your sessions | [cross-session-messaging](https://code.claude.com/docs/en/cross-session-messaging) |
| Task tools, and which models have them | [tools-reference](https://code.claude.com/docs/en/tools-reference#task-tool-availability) |
| Best practices | [best-practices](https://code.claude.com/docs/en/best-practices) |
| Common workflows | [common-workflows](https://code.claude.com/docs/en/common-workflows) |
| Hooks | [hooks-guide](https://code.claude.com/docs/en/hooks-guide), [hooks](https://code.claude.com/docs/en/hooks) |
| Costs and tokens | [costs](https://code.claude.com/docs/en/costs) |
| Permissions | [permission-modes](https://code.claude.com/docs/en/permission-modes), [permissions](https://code.claude.com/docs/en/permissions) |
| `CLAUDE.md` and memory | [memory](https://code.claude.com/docs/en/memory) |
| Skills | [skills](https://code.claude.com/docs/en/skills) |
| Index of all pages | [llms.txt](https://code.claude.com/docs/llms.txt) |

## Further reading

By Addy Osmani, who works on Claude Code at Anthropic. His own views, on the human side of all this:

- [Critical thinking during the age of AI](https://addyo.substack.com/p/critical-thinking-during-the-age): treat output as a hypothesis to test
- [The orchestration tax](https://addyosmani.com/blog/orchestration-tax/): your attention is the serial part
- [Agentic verification](https://addyo.substack.com/p/agentic-verification): feedback loops the agent can run itself
- [Cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/): from checking output to accepting it

## From another project of the same author

Field notes from mill, a sibling project, in the same style as [`LESSONS.md`](LESSONS.md). Not official docs, and read in a local clone: none of it was re-run here.

- [mill LESSONS](https://github.com/antonygiomarxdev/mill/blob/main/LESSONS.md): a gate that exits non-zero beats a MUST in prose (lesson 10), cheap delegates claim "verified by inspection" (13), verify by execution (17)
- [How should mill remember what it learns?](https://github.com/antonygiomarxdev/mill/blob/main/docs/research/memory-and-lessons.md): its lessons file was written and never read by a worker; compares memory-file patterns and says to promote a lesson into the rule that enforces it
- [Harness engineering and evals](https://github.com/antonygiomarxdev/mill/blob/main/docs/research/harness-engineering-and-evals.md): what the field calls a harness, harness debt, and how agent work is evaluated
- [Skills vs scripts](https://github.com/antonygiomarxdev/mill/blob/main/docs/research/skills-vs-scripts.md): which steps of a procedure are prose and which should be a script

Know a good source? [Suggest it](CONTRIBUTING.md).
