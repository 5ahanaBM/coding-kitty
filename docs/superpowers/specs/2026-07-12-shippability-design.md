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
2. **Ensure parent dir exists:** `mkdirSync(~/.claude/, { recursive: true })` before any write attempt, so fresh machines (Claude Code not yet installed) work correctly.
3. **Idempotency check — per array, not all-or-nothing:**
   - Check PreToolUse independently: does it already have an entry whose `command` includes `localhost:23456`?
   - Check PostToolUse independently: same.
   - Only skip appending to arrays that already have the entry. This prevents duplicates from partial previous runs.
   - If both already present: print "hooks already installed" and exit 0.
4. **Try auto-merge:**
   - Ensure `hooks.PreToolUse` and `hooks.PostToolUse` are arrays (create if absent).
   - **Array-append only** — push missing hook objects onto existing arrays. Never replace or shallow-merge at the `hooks` key level. Existing user hooks must survive.
   - Write file back with 2-space indent.
   - Print: `✓ Hooks installed. Restart Claude Code for them to take effect.`
5. **On any failure** (JSON parse error, EACCES, ENOENT on write, etc.): catch, print the exact JSON snippet to add manually, with line-by-line instruction of where it goes. Print: `Could not auto-edit settings.json: <error>. Add this manually instead:` followed by the formatted snippet.

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

1. Read `~/.claude/settings.json`. If missing, or if `hooks` key absent, print "nothing to remove" and exit 0.
2. Guard: if `hooks.PreToolUse` or `hooks.PostToolUse` are not arrays, treat as empty — nothing to remove.
3. Filter out from each array any entry whose `command` includes `localhost:23456`. Leave empty arrays as `[]` — do not delete the keys.
4. Write file back. Print: `✓ Hooks removed.`
5. On failure: print manual removal instructions (grep for `localhost:23456` in `~/.claude/settings.json` and delete the surrounding hook object).

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
| Add `setup` script | `package.json` scripts | `"node scripts/setup.mjs"` |
| Add `teardown` script | `package.json` scripts | `"node scripts/teardown.mjs"` |

Note: `.nvmrc` deliberately omitted — `engines` covers the minimum version floor. A `.nvmrc` pin to `18` would downgrade users already on Node 20+ with nvm auto-switching, which is more harmful than helpful. `out/` is already not tracked in git (`git ls-files out/` returns empty) — no action needed.

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
