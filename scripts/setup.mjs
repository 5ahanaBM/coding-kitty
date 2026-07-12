#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')

const PRE_HOOK = {
  matcher: '.*',
  hooks: [{
    type: 'command',
    command: `curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"thinking","agent":"claude-code"}' || true`
  }]
}

const POST_HOOK = {
  matcher: '.*',
  hooks: [{
    type: 'command',
    command: `curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"done","agent":"claude-code"}' || true`
  }]
}

const MANUAL_INSTRUCTIONS = `
Add the following to ~/.claude/settings.json under the "hooks" key.
If the file doesn't exist, create it with this content:

{
  "hooks": {
    "PreToolUse": [
      ${JSON.stringify(PRE_HOOK, null, 6).split('\n').join('\n      ')}
    ],
    "PostToolUse": [
      ${JSON.stringify(POST_HOOK, null, 6).split('\n').join('\n      ')}
    ]
  }
}

If you already have hooks configured, append each entry to the existing array.
Then restart Claude Code for the hooks to take effect.
`

function hasEntry(arr, port) {
  return Array.isArray(arr) && arr.some(
    entry => entry?.hooks?.some(h => h?.command?.includes(`localhost:${port}`))
  )
}

try {
  // Ensure ~/.claude/ exists (fresh machine without Claude Code installed)
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true })

  // Read existing config or start fresh
  let config = {}
  if (existsSync(SETTINGS_PATH)) {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    config = JSON.parse(raw)
  }

  // Ensure hooks structure exists
  if (!config.hooks) config.hooks = {}
  if (!Array.isArray(config.hooks.PreToolUse))  config.hooks.PreToolUse  = []
  if (!Array.isArray(config.hooks.PostToolUse)) config.hooks.PostToolUse = []

  // Per-array idempotency — only append what's missing
  const preExists  = hasEntry(config.hooks.PreToolUse,  23456)
  const postExists = hasEntry(config.hooks.PostToolUse, 23456)

  if (preExists && postExists) {
    console.log('✓ Coding Kitty hooks already installed. Nothing to do.')
    process.exit(0)
  }

  if (!preExists)  config.hooks.PreToolUse.push(PRE_HOOK)
  if (!postExists) config.hooks.PostToolUse.push(POST_HOOK)

  writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2))
  console.log('✓ Coding Kitty hooks installed.')
  console.log('  Restart Claude Code for the hooks to take effect.')
} catch (err) {
  console.error(`\nCould not auto-edit ${SETTINGS_PATH}: ${err.message}`)
  console.error('Add the hooks manually instead:')
  console.error(MANUAL_INSTRUCTIONS)
  process.exit(1)
}
