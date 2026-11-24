// node install.js [dest]: copies the mod into the Herdr app's mods folder. A copy, not a link: a symlink needs rights on Windows, and Herdr hot-reloads a saved copy.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FILES = ['main.js', 'match.js', 'mod.json']

// The mod's folder: under HERDR_APP_HOME when set and not empty, else ~/.config/herdr-app.
export const target = (env, home) => path.join(env.HERDR_APP_HOME || path.join(home, '.config', 'herdr-app'), 'mods', 'puppet-herdr')

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dest = process.argv[2] ?? target(process.env, os.homedir())
  const missing = FILES.filter(name => !fs.existsSync(path.join(here, name)))
  if (missing.length > 0) {
    console.error(`install: missing source file: ${missing.join(', ')}`)
    process.exit(1)
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const name of FILES) fs.copyFileSync(path.join(here, name), path.join(dest, name))
  console.log(`installed ${FILES.join(', ')} into ${dest}`)
}
