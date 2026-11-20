import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

// Paths from office-app/, where vitest runs.
const text = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const version = (path: string) => JSON.parse(text(path)).version

test('office-app and the plugin share one version, listed in the changelog', () => {
  const plugin = version('../mods/puppet-monitor/.claude-plugin/plugin.json')
  expect(version('package.json')).toBe(plugin)
  expect(text('../mods/puppet-monitor/CHANGELOG.md')).toContain(`## ${plugin}`)
})
