# Shippability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Coding Kitty usable by any developer who clones the repo — working cat with Claude Code integration in under 5 minutes.

**Architecture:** Three independent deliverables: a Node ESM setup script that auto-merges Claude Code hooks into `~/.claude/settings.json` (with manual fallback), a teardown script that removes them, and a README. Package.json gets `engines` field and two new script entries.

**Tech Stack:** Node.js ESM (no dependencies), `fs`, `os`, `path` built-ins only. Markdown for README.

## Global Constraints

- Node.js >= 18 required (ESM, `fs/promises`, optional chaining)
- macOS only project — scripts may assume macOS path conventions
- No new npm dependencies
- Hook commands must include `|| true` for fault tolerance
- Hook matcher must be `".*"`
- Port `23456` is hardcoded — never parameterize it in these scripts
- No Co-Authored-By in git commit messages

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/setup.mjs` | Create | Auto-merge Claude Code hooks, fallback to manual instructions |
| `scripts/teardown.mjs` | Create | Remove Coding Kitty hooks from settings.json |
| `README.md` | Create | Clone-to-running guide for new users |
| `package.json` | Modify | Add `engines` field, `setup` and `teardown` script entries |

---

### Task 1: `scripts/setup.mjs` — hook installer

**Files:**
- Create: `scripts/setup.mjs`
- Modify: `package.json` (add `setup` script entry + `engines`)

**Interfaces:**
- Produces: `npm run setup` command that exits 0 on success or fallback

- [ ] **Step 1: Create `scripts/setup.mjs`**

```js
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
```

- [ ] **Step 2: Add `engines` + `setup` to `package.json`**

Edit `package.json` — add `engines` field and `setup` entry:

```json
{
  "name": "coding-kitty",
  "version": "0.1.0",
  "description": "A pixel art cat that lives on your screen",
  "main": "out/main/index.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron .",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "setup": "node scripts/setup.mjs"
  },
  "devDependencies": {
    "electron": "^38.2.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^3.0.0",
    "playwright-core": "^1.61.1",
    "typescript": "^5.0.0"
  },
  "dependencies": {}
}
```

- [ ] **Step 3: Smoke-test the script (idempotent run)**

```bash
node scripts/setup.mjs
```

Expected output (hooks already installed on your machine):
```
✓ Coding Kitty hooks already installed. Nothing to do.
```

- [ ] **Step 4: Verify `~/.claude/settings.json` unchanged**

```bash
grep -c "localhost:23456" ~/.claude/settings.json
```

Expected: same count as before (2 — one pre, one post). No duplicates added.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup.mjs package.json
git commit -m "feat: add npm run setup to install Claude Code hooks"
```

---

### Task 2: `scripts/teardown.mjs` — hook remover

**Files:**
- Create: `scripts/teardown.mjs`
- Modify: `package.json` (add `teardown` script entry)

**Interfaces:**
- Consumes: `~/.claude/settings.json` written by setup.mjs
- Produces: `npm run teardown` command

- [ ] **Step 1: Create `scripts/teardown.mjs`**

```js
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
```

- [ ] **Step 2: Add `teardown` to `package.json` scripts**

Add `"teardown": "node scripts/teardown.mjs"` to the scripts object (alongside `setup`).

- [ ] **Step 3: Smoke-test teardown (dry run — don't actually remove on your machine)**

Instead of running it live (which would remove your working hooks), verify the filter logic in isolation:

```bash
node -e "
const filter = arr => Array.isArray(arr)
  ? arr.filter(e => !e?.hooks?.some(h => h?.command?.includes('localhost:23456')))
  : []
const input = [
  { matcher: '.*', hooks: [{ type: 'command', command: 'curl localhost:23456 || true' }] },
  { matcher: '.*', hooks: [{ type: 'command', command: 'echo keep-me' }] }
]
const result = filter(input)
console.assert(result.length === 1, 'should remove port-23456 entry')
console.assert(result[0].hooks[0].command === 'echo keep-me', 'should keep other entries')
console.log('filter logic OK, kept:', result.length, 'entry')
"
```

Expected:
```
filter logic OK, kept: 1 entry
```

- [ ] **Step 4: Commit**

```bash
git add scripts/teardown.mjs package.json
git commit -m "feat: add npm run teardown to remove Claude Code hooks"
```

---

### Task 3: `README.md`

**Files:**
- Create: `README.md`

**Interfaces:**
- None — standalone document

- [ ] **Step 1: Create `README.md`**

```markdown
# Coding Kitty

A pixel-art cat that lives on your screen while you code. Reacts to file saves, sleeps when you're idle, and celebrates when your AI agent finishes a task.

macOS only. Electron + TypeScript.

---

## Quick Start

```bash
git clone https://github.com/5ahanaBM/coding-kitty.git
cd coding-kitty
npm install
npm run dev
```

The cat appears in the bottom-right corner of your screen. Drag it anywhere.

---

## Claude Code Integration

The cat reacts to Claude Code tool calls — showing thought bubbles while Claude works and celebrating when it finishes. This requires a one-time hook setup:

```bash
npm run setup
```

This adds PreToolUse and PostToolUse hooks to `~/.claude/settings.json` that POST to the cat's local HTTP server on port 23456. **Restart Claude Code** after running setup.

To undo:
```bash
npm run teardown
```

**Manual setup** (if `npm run setup` fails): add these entries to `~/.claude/settings.json`:

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": ".*",
      "hooks": [{ "type": "command", "command": "curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{\"type\":\"thinking\",\"agent\":\"claude-code\"}' || true" }]
    }
  ],
  "PostToolUse": [
    {
      "matcher": ".*",
      "hooks": [{ "type": "command", "command": "curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{\"type\":\"done\",\"agent\":\"claude-code\"}' || true" }]
    }
  ]
}
```

---

## Configuration

Watched directories (for file-save detection) are stored in:

```
~/Library/Application Support/coding-kitty/config.json
```

Generated on first launch with common defaults (`~/Developer`, `~/Projects`, `~/Code`, `~/workspace`, `~/src`, `~/Side Quests`, `~/Documents`). Edit `watchDirs` to add your own paths, then restart the app.

---

## Cat States

| State | Trigger |
|-------|---------|
| Kneading | File saved in a watched directory |
| Eye-tracking | Mouse moves near the cat |
| Sleeping | 5 minutes of inactivity outside a code editor |
| Waking | Any activity while sleeping (spring stretch animation) |
| Drag | Click and drag — spring rebound on release, velocity-scaled |
| Thinking | Claude Code starts a tool call (`npm run setup` required) |
| Celebrating | Claude Code finishes a tool call — hop + sparkles |

---

## Building the DMG

```bash
npm run dist
```

Produces `release/Coding Kitty-0.1.0-arm64.dmg` (arm64 only).

On another Mac, Gatekeeper will block the unsigned app. To open it:
```bash
xattr -cr "/path/to/Coding Kitty.app"
```
```

- [ ] **Step 2: Verify README renders correctly**

```bash
cat README.md | wc -l
```

Expected: ~70 lines or fewer.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README — quick start, hook setup, config, cat states"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| setup.mjs: mkdir before write | Task 1 step 1 — `mkdirSync(dirname, { recursive: true })` |
| setup.mjs: per-array idempotency | Task 1 step 1 — `hasEntry()` per array |
| setup.mjs: array-append only | Task 1 step 1 — push only if not present |
| setup.mjs: manual fallback on failure | Task 1 step 1 — catch block prints instructions |
| teardown.mjs: missing hooks guard | Task 2 step 1 — `if (!config.hooks)` guard |
| teardown.mjs: leave empty arrays | Task 2 step 1 — `filter()` returns `[]` not deleted key |
| teardown.mjs: manual fallback | Task 2 step 1 — catch block |
| README: quick start | Task 3 step 1 |
| README: hook setup + manual fallback | Task 3 step 1 |
| README: config.json path | Task 3 step 1 — exact path stated |
| README: DMG + xattr workaround | Task 3 step 1 |
| README: cat states | Task 3 step 1 |
| package.json engines field | Task 1 step 2 |
| package.json setup script | Task 1 step 2 |
| package.json teardown script | Task 2 step 2 |
