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
| `critter` | 15 frames of 44x30, pivot at the feet (0.5, 0.933): `type-0/1`, `walk-left-0/1`, `walk-down-0/1`, `walk-up-0/1`, `idle`, `wink`, `asleep`, `talk-0..3`. Walk-right is `flipX`. |
| `critter-gold` | The same frames in the shiny palette: face `#f5c542`, side `#c99a1e`, far legs `#b0861a`. |
| `marks` | `crown`, `z`, `bang-red`, `bang-amber`. |
| `furniture` | Trimmed pieces; each pivot is the painter's own `(x, y)` call point, so a sprite placed at the old coordinates sits where the old page drew it. Desks, chairs, bookcase, 4 plants, lamp, sofas, armchair, tables, whiteboard, water cooler, coffee machine, vending machine, TV stand, ping-pong, bamboo, trees, 4 windows, and the repeating floors `floor-planks`, `floor-tile`, `carpet-stripes`, `carpet-lilac`. |
| `tileset` | 16x16 tiles in 8 columns for Tiled; `tileset.json` maps names to indexes: planks, grey tile, carpets, wall pieces, grass. |

## Notes

- Lamp, water cooler, coffee machine and vending machine are not in the old page, so `exporter.js` draws them (light palette). The cactus is drawn there too.
- `export.mjs` fails loudly if `critter()` changes shape, because the gold variant is made by swapping exact lines of it.
- `floor-planks` repeats seamlessly horizontally only.
