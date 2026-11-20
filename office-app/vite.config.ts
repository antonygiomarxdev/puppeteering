import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

// The build is ONE html file, written into the plugin: the mod serves it from there.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: resolve(import.meta.dirname, '../mods/puppet-monitor/office'),
    // The plugin folder also holds state*.js and .gitignore: never wipe it.
    emptyOutDir: false,
    // Assets are imported and inlined; the artist's public/ folder must not leak into the plugin.
    copyPublicDir: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    chunkSizeWarningLimit: 4000,
  },
  test: { environment: 'jsdom' },
})
