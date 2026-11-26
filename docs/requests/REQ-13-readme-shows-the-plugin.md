# REQ-13: The README shows what the plugins show

Status: Accepted

## Summary

The README opened with an ASCII banner and an ASCII animation, and did not show what the plugins look like, how a run flows, or how puppeteering pairs with Scriptorium. Replace them with a recording of the real office from puppet-monitor, and add diagrams: what you get, how a team run works, one task as a sequence, and the pairing with Scriptorium. List all three mods and their install.

Last change: 2026-11-26, accepted and answered in the README

## Who asked and when
The owner, 2026-11-26, in a session that reviewed puppeteering and scriptorium together.

## What they said
> I want more diagrams, so the process and what is done is more visual; improve the READMEs; and for puppeteering remove that version and put what is seen in the plugin, it looks better. (Translated from Spanish.)

## The problem behind it
The banner and the animation are drawn in terminal characters; the plugin shows pixel-art critters in a browser office. A reader saw a metaphor before the product. The README said "two mods" while three exist (puppet-herdr was missing), showed no `/plugin install`, and never named Scriptorium, which this repo uses for its own documents.

## Evidence
One owner. README.md had no Mermaid diagram; `.claude-plugin/marketplace.json` lists two plugins; `mods/` has three.

## Decision
Small change, answered in README.md. `assets/office.gif` and `assets/office-stuck.png` are recorded from the built office (`mods/puppet-monitor/office/index.html`) playing the demo story in `office-app/tools/demo-video/story.mjs`. The ASCII assets stay in `assets/` for the video script that renders them; the README no longer shows them. Scriptorium's README gets the same pairing section (its REQ-20).

Short path: `README.md`
Short path: `assets/office.gif`
Short path: `assets/office-stuck.png`
