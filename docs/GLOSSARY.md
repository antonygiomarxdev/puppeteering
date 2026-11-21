# Glossary

One word per thing. A check fails when an `Avoid` word appears in a document under `docs/`.

| Term | Meaning | Avoid |
|---|---|---|
| Coordinator | The session that splits one goal, writes the tasks, assigns, verifies and commits. The platform calls it the team lead (D-15); the root documents keep "lead" for now (D-23) | manager, boss |
| Teammate | A session with a role (builder, reviewer, researcher, ops) that takes the next free task for its role and reports with evidence | worker, minion |
| Owner | The person who gives one goal to a coordinator and reads what the team did | customer |
| Pile | The shared list of tasks, each with an owner, a role and its dependencies | backlog, queue |
| Report | What a teammate says it did. A claim until someone reruns the check | status update |
| Add-on | One of the two packages of the product: the rules (puppet-teams) or the monitor (puppet-monitor) | extension |
