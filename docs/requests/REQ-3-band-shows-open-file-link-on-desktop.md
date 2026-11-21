# REQ-3: band shows open file link on desktop

Status: Open

## Summary

The monitor band in the desktop app showed an [open file] link beside the Office button, which repeats the button once it works. The request: drop the link, or show it only after the opener fails.

Last change: 2026-11-20, written from the source named below

## Who asked and when
The owner, 2026-11-18, GitHub issue #9.

## What they said
> With the button working, the link repeats it and adds noise to the band.
> Decide whether the link goes away, or shows only after the opener fails (for example, after the "puppets: office failed" toast).

## The problem behind it
The link was added when a remote surface drew a file link as text. With the Office button opening the session page on Windows, it is noise.

## Evidence
One screen on Windows 11, desktop app. The README table "Where it runs" and the surface test still named the link.

## Decision
The issue is closed. Whether the band behaves as asked on every surface is not checked here.
