# REQ-5: peer to peer claim gate concord

Status: Open

## Summary

A vendor offered a peer-to-peer claim gate (Concord MCP) for the collisions in REQ-1. The owner does not adopt it now: one coordinator per goal, each in its own worktree (D-5).

Last change: 2026-11-20, written from the source named below

## Who asked and when
The Concord MCP vendor, on issue #5; the owner answered on 2026-11-18 (comment at 15:09 UTC).

## What they said
> I'll star it and try it in the future. For now I'll stay with puppeteering ... one coordinator per goal, in its own worktree.

## The problem behind it
Claims can collide when several agents take work. A gate in front of the claim is one way to stop it; the method answers with one coordinator that owns assignment.

## Evidence
No run with Concord. The owner starred the vendor's repository. Not measured.

## Decision
Not adopted now (D-5, PRODUCT section 6). Revisit when the owner says.
