#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')

const MANUAL_INSTRUCTIONS = `
Manually remove from ~/.claude/settings.json any hook entry whose
"command" field contains "localhost:23456". The entries look like:

  {
    "matcher": ".*",
    "hooks": [{ "type": "command", "command": "curl ... localhost:23456 ..." }]
  }

Remove the entire object from the PreToolUse and PostToolUse arrays.
`

try {
  if (!existsSync(SETTINGS_PATH)) {
    console.log('✓ No ~/.claude/settings.json found. Nothing to remove.')
    process.exit(0)
  }

  const raw = readFileSync(SETTINGS_PATH, 'utf-8')
  const config = JSON.parse(raw)

  if (!config.hooks) {
    console.log('✓ No hooks configured. Nothing to remove.')
    process.exit(0)
  }

  const PORT = '23456'
  const filter = arr =>
    Array.isArray(arr)
      ? arr.filter(entry => !entry?.hooks?.some(h => h?.command?.includes(`localhost:${PORT}`)))
      : []

  // Leave empty arrays — do not delete keys
  config.hooks.PreToolUse  = filter(config.hooks.PreToolUse)
  config.hooks.PostToolUse = filter(config.hooks.PostToolUse)

  writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2))
  console.log('✓ Coding Kitty hooks removed.')
  console.log('  Restart Claude Code for the change to take effect.')
} catch (err) {
  console.error(`\nCould not auto-edit ${SETTINGS_PATH}: ${err.message}`)
  console.error('Remove the hooks manually instead:')
  console.error(MANUAL_INSTRUCTIONS)
  process.exit(1)
}
