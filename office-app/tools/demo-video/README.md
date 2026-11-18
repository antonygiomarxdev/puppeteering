# Demo video

A scripted 31 s story of the office, recorded headless, for posting on X.

    node office-app/tools/demo-video/record.mjs [--theme=<name>] [--seconds=<n>] [--size=landscape|square] [--zoom-map[=off]]

Run it from the repo root. It writes to `office-app/dist/video/` (gitignored):

- `office-demo-landscape-1920x1080.mp4`
- `office-demo-square-1080x1080.mp4`

Both are H.264, yuv420p, 30 fps, `+faststart`. A run takes about 2 minutes (it records in real time, once per size).

Options:

- `--theme=<name>`: passed to the page as `?theme=<name>` (`christmas`, `halloween`, `easter`, `newyear`, `none`). Default: no theme.
- `--seconds=<n>`: length of the take. The story is 31 s: a shorter value cuts it, a longer one holds the last state. Default: 31.
- `--size=landscape|square`: record one size only. Default: both sizes.
- `--zoom-map[=off]`: in the stuck beat (16 to 20 s), zoom the page about 2x on `builder-2`, then zoom back. Default: on for the square, off for the landscape. `--zoom-map` turns it on for both sizes; `--zoom-map=off` turns it off for both.

Needs Chrome or Edge (set `CHROME` to a path to pick one) and `ffmpeg` on the PATH. If `mods/puppet-monitor/office/index.html` is missing, it runs `npx vite build` first. It copies the build to `dist/video/site/`, so a rebuild during the take changes nothing.

## How it works

- Framing: each take is exactly 1920x1080 or 1080x1080 CSS px at device scale 1, so nothing is resampled. The recorder reads the scene (`window.__game`) and zooms it by a whole number z (6 down to 1): the biggest one that shows at least 90% of the map's width and all of its height. The square puts the map on top and the team in three columns under it.
- `story.mjs`: the script. `stateAt(t, t0)` returns the `OfficeState` for story second `t`; edit the `TASKS`, `CAST` and `CLICKS` tables to change the story. Beats: asleep (0-3), tasks created and taken (3-8), work with a message and a peer visit (8-16), builder-2 stuck (16-24), its drawer opened at 20 and closed at 23.5, reports and tasks done (24-28), all done (28-31).
- `record.mjs`: rewrites `state-demo.js` four times a second (an IIFE, because the page re-adds the script every second), clicks the Team card through CDP, captures with `Page.startScreencast` and encodes with ffmpeg. Screencast frames have timestamps and arrive only on change, so ffmpeg resamples them to a fixed 30 fps.

## Known limits

- Capture speed depends on machine load. A busy machine gave 11 fps in one take; a quiet one gives 30 to 50. Check the "frames captured" line, and rerun if it is under 25 per second.
- The zoom is a whole number, so the map can leave a margin of page colour at the stage's edges, or lose up to 10% of its width at the sides.
- The state polls once a second, so a beat can show up to a second late.
