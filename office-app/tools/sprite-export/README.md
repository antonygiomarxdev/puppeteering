# sprite-export

Renders the office pixel art to PNG spritesheets for Phaser. The art is code: the painters in the hand-written page (`critter()`, `desk()`, the furniture and floor functions) are sliced out of it and run in headless Chrome, so the sheets are the real drawings at 1x art pixels.

## Re-export

From the repo root:

```
node office-app/tools/sprite-export/export.mjs [legacy-page.html]
```

- With no argument it reads the page from git: `git show 88dec64:mods/puppet-monitor/office/index.html`. Pass a path to export from another copy.
- It needs Node 18+ and Chrome or Edge. It finds a common install; set `CHROME` to an executable to override.
- It writes to `office-app/public/assets/sprites/`. 8x previews go to `<os tmp>/sprite-export-previews/`.
- Output is deterministic: re-running on the same page changes no byte.

## What is in `public/assets/sprites/`

Each PNG has a Phaser hash-atlas JSON beside it (`frames[name].frame` and a `pivot`).

| Sheet | Contents |
| --- | --- |
| `critter` | 31 frames of 44x30, pivot at the feet (0.5, 0.933): `type-0/1`, `walk-left-0/1`, `walk-down-0/1`, `walk-up-0/1`, `idle`, `wink`, `asleep`, `talk-0..3`; the same typing and talking frames without the pen, `bare-type-0/1` and `bare-talk-0..3`; and the poses `read`, `think`, `wait` (arms crossed), `arms-up`, `hand-up`, `sweat`, `wave-0/1`, `hop`, `sip`. Walk-right is `flipX`. |
| `critter-gold` | The same 31 frames in the shiny palette: face `#f5c542`, side `#c99a1e`, far legs `#b0861a`. |
| `marks` | `crown`, `z`, `bang-red`, `bang-amber`, and the icons `question`, `lock`, `prompt` (`>_`), `globe`, `page`, `card`, `clock`, `spiral`, `note`, `star`, `confetti`, `sparkle`, `cup`. Pivot is bottom centre. |
| `costumes` | 32 frames of 44x30 with the critter's own origin and pivot: for each archetype (`conductor`, `builder`, `designer`, `reviewer`, `researcher`, `planner`, `ops`, `helper`) `-head-front`, `-head-side`, `-prop-front`, `-prop-side`. Draw one at the critter's position, over the front-view frames (`-front`) or the three-quarter ones (`-side`); `flipX` both. Every variant-coloured pixel is the key colour `#ff00ff` (`meta.accentKey`); the game swaps it per variant (`meta.accents` lists three per archetype). Props are drawn in the pen's rest pose over the `bare-*` frames; `meta.grip` is the grip point in cell pixels, to rotate a prop for the talk gesture. |
| `furniture` | Trimmed pieces; each pivot is the painter's own `(x, y)` call point, so a sprite placed at the old coordinates sits where the old page drew it. Desks, chairs, bookcase, 4 plants, lamp, sofas, armchair, tables, whiteboard, water cooler, coffee machine, vending machine, TV stand, ping-pong, bamboo, trees, 4 windows, and the repeating floors `floor-planks`, `floor-tile`, `carpet-stripes`, `carpet-lilac`. |
| `tileset` | 16x16 tiles in 8 columns for Tiled; `tileset.json` maps names to indexes: planks, grey tile, carpets, wall pieces, grass. |

## Files

`export.mjs` builds the page and drives Chrome; the page runs `exporter.js` (helpers, furniture, tiles), `characters.js` (poses, costumes, marks) and `main.js` (packs and posts the sheets). `DUMP_HTML=<file>` saves the generated page for debugging. The costume preview, all 8 archetypes in the front and three-quarter view, lands in the previews folder as `preview-costumes-all.png`.

## Notes

- Lamp, water cooler, coffee machine and vending machine are not in the old page, so `exporter.js` draws them (light palette). The cactus is drawn there too.
- `export.mjs` fails loudly if `critter()` changes shape, because the gold variant is made by swapping exact lines of it.
- `floor-planks` repeats seamlessly horizontally only.
