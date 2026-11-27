# REQ-14: The monitor shows what each agent costs

Status: Open

## Summary

puppet-monitor shows what each agent does and what is stuck, but not what it costs. Uber put a live cost counter in the status line and found that cost always in view, with nudges, changes how people run agents. Show cost per agent and per task in the band and the office, if the harness gives the hooks the numbers.

Last change: 2026-11-27, opened from the Uber research

## Who asked and when
The owner, 2026-11-27, after reading Uber's post with the lead: "Dale" to registering the gaps it showed.

## What they said
> Look at this post, it is interesting because in part it is the process I follow. (Translated from Spanish.) Then, on the proposal to record it: go ahead. (Translated from Spanish.)

## The problem behind it
A team of five agents can spend for minutes on a loop before the LOOPING alert fires, and the owner sees no cost at all. The guide gives models per role to save cost, and nothing measures whether it does.

## Evidence
Scriptorium's [research note of 2026-11-27](https://github.com/antonygiomarxdev/scriptorium/blob/main/docs/research/2026-11-27-uber-factory-and-harness2.md): Uber's status-line counter, spend nudges at 50/80/100%, and a session analyzer that flags 16 anti-patterns with their cost. Unknown: which hook events carry token usage or cost; to be checked before a spec.

## Decision
Open: for the owner. First step proposed: a researcher checks which hook payloads carry usage, and the monitor's UX document gets a row for cost.
