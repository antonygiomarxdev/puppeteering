# REQ-16: Rules load when they apply, not at every start

Status: Accepted

## Summary

Every coordinator session gets RULES.md at start and is told to read ONBOARDING.md and GUIDE.md: about 39 KB that grows with every lesson and is paid for on every turn, whether the run needs a given rule or not. Move situational rules into skills with a trigger, keep a short always-on core with a size budget, and when a rule is added to the core, cut one.

Last change: 2026-11-27, accepted by the owner after reading Harness2's code with the lead

## Who asked and when
The owner, 2026-11-27, after the lead read google-research/harness2.

## What they said
> Yes, it would be excellent, it is just what is missing and how we can lower rework. (Translated from Spanish.)

## The problem behind it
A rule buried in a long always-on text is read less reliably than a short one (LESSONS: "sessions got the rules but did not start a team"). The text only grows: rules are added and never removed. A teammate gets none of it, and the coordinator gets all of it.

## Evidence
- `mods/puppet-teams/hooks/inject.js` injects RULES.md (2.3 KB) at SessionStart; RULES.md points to ONBOARDING.md (12.3 KB) and GUIDE.md (24.8 KB).
- Harness2 (harness2/core/prompts.py, DOM template): a skill with a trigger "costs nothing until that situation arises"; always-on memory "is paid for on every run -- so if you add some, cut some". GENERALIZE: "A named component usually beats prose."
- Uber's software factory (Scriptorium research note of 2026-11-27): preloaded context paid on every turn was a main cost driver.
- Unknown: whether a skill's trigger fires reliably for each situation; the spec needs a probe per skill.

## Decision
Accepted. To specify, after REQ-15 so each move has evidence:
- A core RULES.md with a budget in bytes, checked by a test.
- One skill per situation with its trigger: pausing a team, several teammates of one role, a resumed coordinator, reviews and mutants, the desktop app.
- Each move gets a probe: the same prompt with the rule in the core and in the skill, and a verdict as in REQ-15.
