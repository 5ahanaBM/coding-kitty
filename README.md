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

**Manual setup** (if `npm run setup` fails): add these entries to `~/.claude/settings.json`.

If you already have a `hooks` key, append each object into the existing `PreToolUse` and `PostToolUse` arrays. If you don't have a `hooks` key yet, add the full block:

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
