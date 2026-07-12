# Shippability Design
_2026-07-12_

## Goal

Make the project usable by any developer who clones the repo. Target: working cat with Claude Code integration in under 5 minutes.

---

## Deliverables

### 1. `scripts/setup.mjs`

Node ESM script. Invoked via `npm run setup`.

**Flow:**

1. Resolve `~/.claude/settings.json`. Read + parse if it exists; start from `{}` if missing.
2. **Idempotency check:** if both PreToolUse and PostToolUse arrays already contain an entry whose command includes `localhost:23456`, print "hooks already installed" and exit 0.
3. **Try auto-merge:**
   - Ensure `hooks.PreToolUse` and `hooks.PostToolUse` are arrays (create if absent).
   - **Array-append only** — push new hook objects onto existing arrays. Never replace or shallow-merge at the `hooks` key level. Existing user hooks must survive.
   - Write file back with 2-space indent.
   - Print: `✓ Hooks installed. Restart Claude Code for them to take effect.`
4. **On any failure** (JSON parse error, EACCES, ENOENT on write, etc.): catch, print the exact JSON snippet to add manually, with line-by-line instruction of where it goes. Print: `Could not auto-edit settings.json: <error>. Add this manually instead:` followed by the formatted snippet.

**Hook shape to insert:**

```json
{
  "matcher": ".*",
  "hooks": [
    {
      "type": "command",
      "command": "curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{\"type\":\"thinking\",\"agent\":\"claude-code\"}' || true"
    }
  ]
}
```
(PreToolUse gets `"thinking"`, PostToolUse gets `"done"`.)

---

### 2. `scripts/teardown.mjs`

Node ESM script. Invoked via `npm run teardown`.

**Flow:**

1. Read `~/.claude/settings.json`. If missing, print "nothing to remove" and exit 0.
2. Filter out from `hooks.PreToolUse[]` and `hooks.PostToolUse[]` any entry whose command includes `localhost:23456`.
3. Write file back. Print: `✓ Hooks removed.`
4. On failure: print manual removal instructions.

---

### 3. `README.md`

~30–40 lines. No badges, no contribution section, no license boilerplate.

**Sections:**

1. **Title + one-line description**
2. **Quick Start** — three commands: `git clone`, `npm install`, `npm run dev`
3. **Claude Code Integration** — `npm run setup`, what it does, manual JSON fallback block, `npm run teardown` to undo
4. **Configuration** — config.json path (`~/Library/Application Support/coding-kitty/config.json`), `watchDirs` array, how to add custom paths
5. **Build the DMG** — `npm run dist`, `xattr -cr "Coding Kitty.app"` for Gatekeeper, arm64 note
6. **Cat states** — bullet list: kneading (file save), eye-tracking, sleeping (5min idle), waking (spring animation), drag + spring rebound, agent-thinking (thought bubbles), agent-done (celebration hop)

---

### 4. Package hygiene

| Change | File | Detail |
|--------|------|--------|
| Add `engines` field | `package.json` | `"engines": {"node": ">=18"}` |
| Add `.nvmrc` | project root | `18` |
| Add `setup` script | `package.json` scripts | `"node scripts/setup.mjs"` |
| Add `teardown` script | `package.json` scripts | `"node scripts/teardown.mjs"` |
| Untrack `out/` artifacts | git | `git rm --cached -r out/` — already gitignored, just untracked |

---

## Non-Goals (explicitly out of scope)

- Gatekeeper signing / notarization
- Universal binary (x86)
- Tests / CI
- First-run onboarding UI in Electron
- Auto-update

---

## Success Criterion

A developer who has never seen this project can go from `git clone` to a working Coding Kitty with Claude Code integration in under 5 minutes, following only the README.
