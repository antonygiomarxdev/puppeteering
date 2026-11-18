# office-app

Phaser 3 map + React HUD + Vite + TypeScript (strict). The production build is one self-contained HTML file.

## Commands

```
npm run dev     # vite dev server
npm run build   # typecheck, then write ../mods/puppet-monitor/office/index.html
npm test        # vitest
```

## Contract

The mod writes `state-<key>.js` next to `index.html` every second, as `window.office({...})`.
The page reads `?s=<key>` (no key: `state.js`) and polls by re-adding a `<script src="state-<key>.js?ts">` tag, because file:// cannot fetch.
The header shows `script running, loading <file>...` or `cannot load <file> from <href> (failed N times)`.
State types live in `src/types.ts`, copied from `office()` in `mods/puppet-monitor/hooks/theatre.ts`; update both together.
`src/state.ts` emits each state on the EventBus (`src/EventBus.ts`) for the scene and the HUD.

Sprites go in `public/assets/sprites/` (owned by the artist).
