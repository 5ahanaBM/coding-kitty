# HANDOFF-2026-07-12-coding-kitty-base.md
_Generated: 2026-07-12_
_Covers: All work through Phase 2 completion_

---

## ORIGINAL GOAL

Build "Coding Kitty" -- a desktop pixel-art cat companion that lives on-screen while the developer codes. macOS only. Electron + TypeScript. The cat reacts to coding activity: file saves trigger kneading, Claude Code tool calls trigger thought bubbles and celebration hops, the cat's eyes follow the cursor, it sleeps after 5 minutes of inactivity, and it can be dragged around the screen.

The app must work on managed corporate macOS (no admin access, no Accessibility permission grants), which ruled out global keyboard hooks and forced a pivot to FSEvents + HTTP + lsappinfo for activity detection.

---

## CURRENT STATUS
**Overall status:** PHASE 2 COMPLETE -- READY FOR PHASE 3

The app is fully functional through Phase 2. The Electron window renders a procedural pixel-art cat that tracks the cursor, responds to file saves in project directories, responds to Claude Code tool calls via HTTP hooks, detects frontmost IDE apps, sleeps after inactivity, and can be dragged. The project builds cleanly with `npm run dev` and `electron-vite build`. No git repo has been initialized -- all files exist as working copy only.

---

## FILE STATE REGISTRY

### All Project Files (Current State)

| File | Status | Description | Known Issues |
|------|--------|-------------|--------------|
| `package.json` | STABLE | name: coding-kitty, main: `out/main/index.js`, electron@38.2.0, electron-vite@3, electron-builder@25, playwright-core@1.61.1 for testing, @mukea/uiohook-napi@2.0.1 as dep (unused -- see notes) | `@mukea/uiohook-napi` is listed but NOT USED anywhere in code (keyboard hooks were abandoned). Should be removed from deps. |
| `electron.vite.config.ts` | STABLE | Standard electron-vite config with `externalizeDepsPlugin()` for main and preload | None |
| `electron-builder.yml` | **HAS BUG** | Build config: LSUIElement:true, target DMG, hardened runtime | `files: dist/**/*` is WRONG -- must be `files: out/**/*` because electron-vite outputs to `out/`, not `dist/`. Will cause empty/broken DMG builds. |
| `tsconfig.json` | STABLE | Project references pointing to tsconfig.node.json and tsconfig.web.json | None |
| `tsconfig.node.json` | STABLE | Main/preload TS config: ESNext target, CommonJS module, bundler resolution | None |
| `tsconfig.web.json` | STABLE | Renderer TS config: ESNext target/module, DOM lib | None |
| `build/entitlements.mac.plist` | STABLE | JIT entitlement only (`com.apple.security.cs.allow-jit`) | None |
| `scripts/drive.mjs` | FUNCTIONAL BUT LIMITED | Playwright headless test driver -- launches Electron, takes screenshots of idle state, simulates keydown. Saves to `/tmp/kitty-shots/` | The `__forceState` / `__testState` injection does nothing because renderer code doesn't listen for `force-state` custom events. The keydown simulation may not trigger kneading since keyboard hooks are gone -- kneading is now triggered by FSEvents file-saved. Test script needs updating to match current architecture. |
| `src/main/index.ts` | STABLE | Main process: creates transparent frameless window (200x200), positions bottom-right of screen, cursor polling at 16ms via `screen.getCursorScreenPoint()`, tray menu (Quit only), IPC for `set-ignore-mouse` and `move-window`, starts ActivityWatcher | Window size in code is 200x200, user spec says 220x220 -- minor discrepancy in positioning math (uses `width - 220, height - 220`). |
| `src/main/activity-watcher.ts` | STABLE | Three signal sources: (1) `fs.watch` recursive on 8 candidate dirs with debounce, (2) HTTP server on 127.0.0.1:23456 for agent hooks, (3) `lsappinfo` polling every 3s for frontmost app | Port 23456 conflict possible if comnyang also runs. EADDRINUSE silently skipped. |
| `src/preload/index.ts` | STABLE | contextBridge exposes `window.kitty` with: setIgnoreMouse, moveWindow, onCursorPos, onActivityEvent | None |
| `src/renderer/index.html` | STABLE | Minimal HTML: cat-container div > cat div > canvas 96x96, loads style.css and main.ts | None |
| `src/renderer/src/main.ts` | STABLE | Renderer entry: wires cursor tracking to eye offset, drag handling (mouseenter/leave/down/move/up), activity events to FSM, starts render loop | None |
| `src/renderer/src/cat-renderer.ts` | STABLE | Procedural pixel art: 8 states rendered. Uses 3x scale (each logical pixel = 3x3 screen pixels). Body color #f5c27a (warm orange tabby). Thought bubbles animate during agent-thinking, hop + gold sparkles during agent-done. | All art is procedural -- no sprite sheets. Sleeping Zzz uses `ctx.fillText` with monospace font. |
| `src/renderer/src/state-machine.ts` | STABLE | FSM with 8 states, timeout-based transitions. Kneading: 800ms, Looking: 2s, Scrolling: 800ms, Sleep: 5min, Agent-done linger: 3s. Suppresses sleep while in code app. | `onScrollActivity()` method exists but NOTHING calls it -- orphaned since keyboard hooks were dropped. The `scrolling` state and its renderer art are dead code. |
| `src/renderer/src/style.css` | STABLE | Transparent background, cat container 200x200 flexbox, cat element 96x96 with grab cursor, `image-rendering: pixelated` | None |
| `assets/sprites/` | EMPTY | Directory exists but contains no files | Placeholder for future sprite assets if procedural art is replaced |
| `resources/` | EMPTY | Directory exists but contains no files | Expected by electron-builder `buildResources: resources` -- app icon and tray icon should go here |
| `.claude/settings.local.json` | STABLE | Local permissions: firecrawl-scrape, context7, Skill(run) | None |
| `out/` | BUILD OUTPUT | Contains compiled JS from last `electron-vite build`. main/index.js (7.3KB), preload/index.js (0.5KB), renderer with index.html + CSS + JS bundle | Rebuilt successfully on 2026-07-12 17:29 |

### External Files (Not In Project Dir)

| File | Description |
|------|-------------|
| `~/.claude/settings.json` (hooks section) | Global Claude Code hooks: PreToolUse POSTs `{"type":"thinking","agent":"claude-code"}` to localhost:23456, PostToolUse POSTs `{"type":"done","agent":"claude-code"}`. Both `|| true` for fault tolerance. Matcher: `.*` (all tool calls). |

---

## COMPLETE ATTEMPT HISTORY

### Attempt 1: Global Keyboard Hooks via uiohook-napi
- **Approach:** Use `@mukea/uiohook-napi` (native Node addon wrapping libuiohook) to capture global keydown/keyup events for triggering kneading on typing and scroll events for the scrolling state.
- **Result:** FAILED
- **Why it failed:** macOS requires Accessibility permission (`AXIsProcessTrustedWithOptions`) for global input monitoring. This requires admin rights to grant via System Settings > Privacy > Accessibility. User is on managed corporate macOS -- cannot grant admin access. `isTrustedAccessibilityClient(false)` returns false, and calling `uiohook.start()` without the permission crashes the process.
- **What we learned:** Any approach requiring Accessibility permission is off the table. The package `@mukea/uiohook-napi` remains in `package.json` dependencies but is NOT imported or used anywhere in the source code.

### Attempt 2: Activity Detection via FSEvents + HTTP + lsappinfo (Pivot)
- **Approach:** Three zero-permission signal sources: (1) `fs.watch` with `recursive: true` on known project directories to detect file saves, (2) HTTP server on localhost for AI agent integration, (3) `lsappinfo` shell command for frontmost app detection.
- **Result:** SUCCESS
- **Implementation details:**
  - FSEvents watches 8 candidate dirs (`~/Developer`, `~/Projects`, `~/Code`, `~/code`, `~/workspace`, `~/src`, `~/Side Quests`, `~/Documents`). Dirs that don't exist are silently skipped via try/catch.
  - File events are filtered by `CODE_EXTENSIONS` regex and `NOISE_PATHS` regex, then debounced at 100ms.
  - HTTP server listens on `127.0.0.1:23456`, accepts POST with JSON body `{type, agent, status}`. Normalizes across formats: "thinking"/"start"/"running" maps to agent-thinking; "done"/"stop"/"finish" maps to agent-done; "error"/"fail" maps to agent-error.
  - `lsappinfo info -only name $(lsappinfo front)` polled every 3s. Output parsed with BSD-compatible grep: `grep -o '"[^"]*"' | tail -1 | tr -d '"'`.
  - 22 code apps recognized: VS Code, Cursor, Zed, Xcode, Terminal, iTerm2, Warp, Alacritty, kitty, Ghostty, JetBrains suite, Sublime, Nova, BBEdit.

### Attempt 3: GNU grep `-P` Flag Fix
- **Approach:** Original `lsappinfo` output parsing used `grep -oP '"([^"]*)"'` to extract quoted strings.
- **Result:** FAILED on macOS -- BSD grep does not support `-P` (Perl regex) flag.
- **Fix:** Replaced with `grep -o '"[^"]*"' | tail -1 | tr -d '"'` which is BSD-compatible.
- **Location:** `src/main/activity-watcher.ts` line 137.

### Attempt 4: electron-builder Files Path
- **Approach:** Initial electron-builder.yml used `files: dist/**/*`.
- **Result:** IDENTIFIED AS BUG -- electron-vite outputs to `out/`, not `dist/`. This would cause the DMG build to miss all compiled files.
- **Status:** Bug was IDENTIFIED but NOT YET FIXED in the file. `electron-builder.yml` line 7 still reads `dist/**/*`.

### Attempt 5: "Object has been destroyed" Crash
- **Approach:** `dialog.showMessageBox(win)` was called after hot-reload destroyed the old `BrowserWindow` reference.
- **Result:** Fixed by removing `win` as parent argument to `dialog.showMessageBox`.
- **Status:** Fix is in place -- current code has no dialog calls.

---

## TESTS RUN AND RESULTS

### Test: Playwright Headless Driver (`scripts/drive.mjs`)
- **Command:** `node scripts/drive.mjs`
- **Purpose:** Launches Electron via Playwright, waits 4s, screenshots idle state, simulates keydown, screenshots kneading, counts non-transparent pixels.
- **Known limitations:** The `__forceState`/`__testState` window injection is nonfunctional -- the renderer doesn't listen for `force-state` events. The keydown simulation may not trigger kneading because kneading is now driven by FSEvents file-saved, not keyboard hooks. This test needs to be updated to POST to localhost:23456 or touch a file to trigger states.
- **Screenshots saved to:** `/tmp/kitty-shots/`

### Test: Production Build
- **Command:** `cd "/Users/sahana.manjunath/Side Quests/coding kitty" && npx electron-vite build`
- **Result:** SUCCESS (2026-07-12 17:29)
- **Output:**
  - `out/main/index.js` -- 7.31 KB
  - `out/preload/index.js` -- 0.48 KB
  - `out/renderer/index.html` -- 0.52 KB
  - `out/renderer/assets/index-BOBu_uCe.css` -- 0.61 KB
  - `out/renderer/assets/index-CjyMp156.js` -- 11.55 KB
- **Interpretation:** All three electron-vite targets (main, preload, renderer) build without errors.

---

## RESEARCH AND INVESTIGATIONS

### Research: macOS Permission-Free Activity Detection
- **Question:** How to detect developer activity on macOS without Accessibility permission?
- **Findings:**
  - `fs.watch` with `recursive: true` works on macOS via FSEvents -- no special permissions needed. Can watch entire directory trees.
  - `lsappinfo` is a built-in macOS command that returns frontmost app info without any permissions.
  - `screen.getCursorScreenPoint()` in Electron works without Accessibility permission (it's a system API, not a global event hook).
  - `IOHIDManager`-based global input hooks (what uiohook-napi uses internally) require Accessibility permission -- no workaround exists.

### Research: Electron Transparency on macOS
- **Findings:**
  - `transparent: true` + `frame: false` works on macOS.
  - `resizable: true` BREAKS transparency -- window gets opaque background. Must use `resizable: false`.
  - `setAlwaysOnTop(true, 'floating')` is needed (not just `true`) to float above other windows properly.
  - `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` needed for fullscreen app overlay.
  - `hasShadow: false` removes the system shadow that would otherwise surround the transparent window.
  - `LSUIElement: true` in the app's Info.plist (via electron-builder `extendInfo`) hides the app from the Dock.

### Research: Competing Desktop Pet Apps
- **Products examined:** comnyang ($3.90 on Mac App Store), Shimeji, Desktop Goose, RunCat
- **Key differentiator identified:** None of the existing apps integrate with AI coding tools or learn developer behavior over time. "Coding DNA" personalization (Phase 5) would be a novel feature.

---

## DISCOVERIES AND SURPRISES

1. **`resizable: true` breaks macOS transparency:** This is undocumented in Electron's API docs. Setting `resizable: false` is mandatory for transparent frameless windows on macOS. There is no workaround.

2. **BSD vs GNU grep:** macOS ships BSD grep which lacks `-P` (Perl regex) and `-oP`. Any shell commands in activity-watcher.ts must use POSIX-compatible grep flags only. The fix `grep -o '"[^"]*"' | tail -1 | tr -d '"'` works on both BSD and GNU.

3. **electron-vite outputs to `out/` not `dist/`:** The electron-builder.yml was written with `dist/**/*` which is incorrect. electron-vite uses `out/main/`, `out/preload/`, `out/renderer/` as output directories.

4. **Electron 38.x GPU issue:** Older Electron versions (pre-38.2.0) cause system-wide GPU lag on macOS Tahoe (macOS 26). The project pins `^38.2.0` to avoid this.

5. **`@mukea/uiohook-napi` crashes without permission:** Unlike many native addons that gracefully degrade, uiohook-napi hard-crashes if `start()` is called without Accessibility permission. Must check `isTrustedAccessibilityClient(false)` BEFORE calling `start()`. In this project's case, the entire package was abandoned.

6. **`setIgnoreMouseEvents` with `{ forward: true }` is essential:** Without `forward: true`, the transparent window becomes a permanent click sink. The `forward` option lets mouse events pass through to apps underneath while still allowing the renderer to detect mouseenter/mouseleave on the cat element itself.

---

## DECISIONS LOG

### Decision: Procedural Pixel Art Over Sprites
- **Decision made:** Draw the cat entirely with canvas `fillRect` calls rather than using sprite sheets.
- **Alternatives considered:** Aseprite sprite sheets, AI-generated sprite art, CSS-only art.
- **Reasoning:** Fastest path to a visible, animated cat with no external asset dependencies. Every state can be tweaked in code. No asset pipeline needed.
- **Trade-offs accepted:** The art is basic (blocky rectangles, not detailed pixel art). Will need replacement for a polished release.
- **Reversibility:** Easy -- `CatRenderer.draw()` can be refactored to blit from a sprite sheet instead of calling `fillRect`. The FSM and state machine are decoupled from rendering.

### Decision: Abandon Keyboard Hooks, Use FSEvents
- **Decision made:** Drop global keyboard/scroll monitoring entirely. Use file system events as the primary activity signal.
- **Alternatives considered:** (1) Request Accessibility permission (blocked by corporate IT policy), (2) CGEvent taps (also requires Accessibility), (3) AppleScript `keystroke` monitoring (doesn't exist), (4) IOKit HID (requires Accessibility for keyboard).
- **Reasoning:** No macOS API can capture global keyboard input without Accessibility permission. FSEvents gives us the signal we actually care about (the developer saved code) without any permissions.
- **Trade-offs accepted:** Lost real-time typing feedback (cat would knead AS you type). Now cat only kneads AFTER a file save. Lost scroll detection entirely (scrolling state is orphaned). The UX difference is acceptable -- file saves are the meaningful coding signal anyway.
- **Reversibility:** If the user gains admin access later, `@mukea/uiohook-napi` is already in deps. Would need to: (1) import it in activity-watcher.ts, (2) check `isTrustedAccessibilityClient(false)` before `start()`, (3) wire keydown to FSM's `onFileSaved` (or add a new `onKeypress` method), (4) wire scroll to `onScrollActivity`.

### Decision: HTTP Server on Port 23456
- **Decision made:** Run an HTTP server on `127.0.0.1:23456` to receive agent status updates.
- **Reasoning:** Compatible with comnyang's hook format (same port/protocol). Claude Code hooks can POST to it directly. Any AI tool can integrate by POSTing JSON.
- **Trade-offs accepted:** Port conflict if comnyang runs simultaneously. EADDRINUSE is silently ignored -- the second process to bind just doesn't get agent events.
- **Reversibility:** Port number is hardcoded in two places: `activity-watcher.ts` line 127 and `~/.claude/settings.json` hooks. Both must change together.

### Decision: 8 Candidate Directories for File Watching
- **Decision made:** Hardcode 8 directory paths (`~/Developer`, `~/Projects`, `~/Code`, `~/code`, `~/workspace`, `~/src`, `~/Side Quests`, `~/Documents`) rather than making them configurable.
- **Reasoning:** Ship fast. These cover the most common project directory conventions plus the user's own `~/Side Quests`.
- **Trade-offs accepted:** Users with non-standard project locations won't get file-save detection. No tray menu to configure watched dirs yet.

---

## ENVIRONMENT AND SETUP

- **Working directory:** `/Users/sahana.manjunath/Side Quests/coding kitty`
- **Node.js:** v24.13.0
- **npm:** 11.6.2
- **Electron (installed):** v38.8.6 (package.json says `^38.2.0`)
- **electron-vite:** v3.x
- **electron-builder:** v25.x
- **TypeScript:** v5.x
- **Playwright:** v1.61.1 (devDependency for test driver)
- **macOS:** Darwin 25.5.0 (macOS Tahoe)
- **Git:** NOT INITIALIZED -- no `.git` directory exists
- **Global Claude Code hooks:** Configured in `~/.claude/settings.json` -- PreToolUse and PostToolUse both POST to localhost:23456
- **Key constraint:** Corporate managed macOS -- no admin access, no Accessibility permission

### How to Run
```bash
pkill -f "electron.*coding" 2>/dev/null
cd "/Users/sahana.manjunath/Side Quests/coding kitty"
npm run dev
```
Cat appears bottom-right of screen. To trigger states:
- **Kneading:** Save any code file in `~/Side Quests/` (or other watched dirs)
- **Agent-thinking + agent-done:** Have Claude Code make any tool call (hooks auto-POST)
- **Looking:** Move mouse near the cat
- **Sleeping:** Wait 5 minutes with no activity while not in a code app
- **Stretching:** Click and drag the cat
- **Scrolling:** Currently untriggerable (orphaned state)

### Manual HTTP Test
```bash
# Trigger thinking state
curl -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"thinking","agent":"test"}'

# Trigger done state (cat hops + sparkles for 3s)
curl -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"done","agent":"test"}'
```

---

## IN-PROGRESS / INCOMPLETE WORK

1. **electron-builder.yml `files` path bug:** Line 7 reads `files: dist/**/*` but MUST be `files: out/**/*`. This was identified but intentionally left unfixed (packaging is Phase 4 work). The fix is a one-line change.

2. **`@mukea/uiohook-napi` in dependencies:** Listed in `package.json` dependencies but not imported anywhere. Should be removed to avoid installing an unused native addon. One-line removal from package.json + `npm install`.

3. **`scrolling` state is orphaned:** `StateMachine.onScrollActivity()` exists, `CatRenderer.drawScrolling()` exists (cat batting a paper roll), but nothing calls `onScrollActivity()`. Either needs a new trigger mechanism or should be removed as dead code.

4. **`scripts/drive.mjs` test driver is stale:** Simulates keydown events to trigger kneading, but kneading is now triggered by FSEvents file-saved, not keyboard input. The `__forceState`/`__testState` window injection is nonfunctional. Needs rewrite to POST to localhost:23456 or touch files in watched dirs.

5. **No git repo:** All work exists as untracked files on disk only. Should `git init` + initial commit before any more work is done.

6. **Empty `resources/` directory:** electron-builder expects `buildResources: resources` to contain app icon. No icon files exist yet. The tray icon is currently `nativeImage.createEmpty()` (invisible).

7. **Empty `assets/sprites/` directory:** Placeholder for sprite art. Currently unused since all rendering is procedural.

---

## OPEN QUESTIONS AND BLOCKERS

### Blockers (must resolve before Phase 4 packaging)
1. **electron-builder.yml `files: dist/**/*`:** Must change to `out/**/*` or DMG will be empty. One-line fix but must be done before `npm run dist`.
2. **App icon needed:** `resources/` dir is empty. Need at minimum a 512x512 `.icns` or `.png` for the app icon and a 22x22 tray icon (or template image for macOS dark mode tray).

### Open Questions
1. **Watched directory configuration:** Currently hardcoded to 8 dirs. Should there be a tray menu or config file to customize? Deferred to Phase 4.
2. **Port 23456 conflict:** If both coding-kitty and comnyang run, one silently fails to bind. Options: (a) use a different port, (b) try 23456 then fallback to 23457, (c) write a small port-negotiation protocol.
3. **Sprite art direction:** Stick with procedural canvas? Use Aseprite for hand-drawn sprites? Use AI-generated pixel art? This affects the visual identity of the app.
4. **Scrolling state trigger:** Now that keyboard hooks are gone, what triggers scrolling? Options: (a) drop the state entirely, (b) detect scroll via Accessibility API (blocked), (c) use window title changes as proxy for browsing, (d) leave orphaned for now.
5. **Monetization:** comnyang charges $3.90. Free vs paid? In-app purchases for cosmetics?
6. **Window size discrepancy:** `BrowserWindow` is created at 200x200 but positioning uses `width - 220, height - 220`. The user spec mentions 220x220. Should the window be 220x220?

---

## NEXT STEPS (PRIORITIZED)

### Immediate (Before Phase 3)
1. **Initialize git repo:** `cd "/Users/sahana.manjunath/Side Quests/coding kitty" && git init && git add -A && git commit -m "Initial commit: Phase 1+2 complete"`. Add a `.gitignore` for `node_modules/`, `out/`, `release/`, `.DS_Store`.
2. **Fix electron-builder.yml:** Change line 7 from `files: dist/**/*` to `files: out/**/*`.
3. **Remove unused dependency:** Remove `@mukea/uiohook-napi` from `package.json` dependencies, run `npm install`.

### Phase 3: Drag Physics + Persistence
1. **Mochi stretch physics on drag:** During mousedown+mousemove, apply CSS `transform: scale()` or canvas skew to stretch the cat body in the drag direction. On mouseup, spring-rebound animation (ease-out oscillation returning to normal scale). Implementation in `src/renderer/src/main.ts` drag handlers + `CatRenderer`.
2. **Position persistence:** On every `move-window` IPC, save `{x, y}` to `~/.coding-kitty/position.json`. On app launch in `src/main/index.ts`, read position file and use it instead of bottom-right default. Create `~/.coding-kitty/` dir if missing.
3. **Sleep animation polish:** Enhance `drawSleeping()` in `cat-renderer.ts` -- cat curls into tighter ball over time, Zzz letters float upward and fade, any activity event triggers a wake-up stretch animation before returning to idle.

### Phase 4: Packaging
1. **Create app icon:** Design or generate a 512x512 pixel-art cat icon. Export as `.icns` for macOS. Place in `resources/icon.icns`.
2. **Create tray icon:** 22x22 `Template` image (black silhouette on transparent) for macOS menu bar. Place in `resources/tray-icon-Template.png`.
3. **Fix electron-builder.yml** (if not done in Immediate step 2).
4. **Test DMG build:** `npm run dist` and verify the `.dmg` in `release/` mounts and launches correctly.
5. **First-launch experience:** Welcome dialog or subtle animation on first run.

### Phase 5: Novelty Features (Benched, High Priority Later)
1. **Coding DNA:** SQLite-backed session tracker. Records: timestamp, language, file path (hashed), duration, error signals. After 3 months of data, the cat develops "personality" based on your coding patterns (night owl vs early bird, polyglot vs specialist, etc.). This creates irreplaceable personalization -- the longer you use it, the more it knows you.
2. **Flow State Guardian:** Detect sustained focus (consistent file saves, single window, no app switching for 15+ min) and auto-mute notifications. Requires notification center integration (may need Accessibility permission -- investigate alternatives).
3. **Struggle Detector:** Watch for thrashing patterns (same 3 files cycling in FSEvents, rapid file changes without commits). After 25 minutes of detected thrashing, cat offers rubber-duck debugging prompt.
4. **Context Preserver:** On `before-quit`, snapshot cognitive state (open files via IDE extension? recent git diff?). On next launch, morning briefing: "Yesterday you were working on X in file Y."
5. **Emotional State Machine:** 4-layer PAD (Pleasure-Arousal-Dominance) model. Layer 1: instant reaction (0-3s). Layer 2: mood (minutes). Layer 3: temperament (hours/days). Layer 4: character traits (weeks/months). Emotional memory persists across sessions.
6. **Anti-burnout:** Cat leaves screen after 6 hours of continuous coding. Message: "I went home. You should too." Returns after 30 minutes or next calendar day.
7. **Git Garden:** Commits = plants sprouting, PRs = flowers blooming, releases = trees growing. Visible as a small garden scene the cat sits in.
8. **Coding Leagues:** Weekly rankings with demotion mechanics (a la Duolingo). Opt-in anonymous leaderboard.
9. **Cosmetics Shop:** Earn coins from coding sessions. Buy cat accessories (hats, glasses, scarves). Purely cosmetic. Potential monetization path.

---

## KEY TECHNICAL GOTCHAS (Reference)

These are non-obvious facts that will bite anyone working on this codebase:

| Gotcha | Detail |
|--------|--------|
| electron-vite output dir | Outputs to `out/`, NOT `dist/`. package.json `main` must be `"out/main/index.js"`. |
| macOS transparency | `resizable: true` BREAKS transparency. Always `resizable: false`. |
| Always-on-top level | Must use `setAlwaysOnTop(true, 'floating')` -- just `true` is insufficient for overlay. |
| Fullscreen overlay | Requires `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`. |
| LSUIElement | Set via electron-builder `extendInfo.LSUIElement: true` to hide from Dock. |
| Electron version floor | Electron 38.2.0+ required. Older versions cause GPU lag on macOS Tahoe. |
| uiohook-napi crash | Crashes process if `start()` called without Accessibility permission. Check `isTrustedAccessibilityClient(false)` first. |
| BSD grep | macOS grep has no `-P` flag. Use `grep -o` with bracket expressions, not Perl regex. |
| Click-through | `setIgnoreMouseEvents(true, { forward: true })` -- the `forward` param is critical. Without it, events don't pass through to underlying windows. |
| Cursor tracking | `screen.getCursorScreenPoint()` does NOT require Accessibility permission. Safe to poll. |
| Port 23456 | Shared with comnyang format. `EADDRINUSE` silently ignored -- second process won't get agent events. |

---

## APPENDIX: GLOBAL CLAUDE CODE HOOKS CONFIG

These hooks in `~/.claude/settings.json` make the cat react to Claude Code tool calls. They must remain in place for the integration to work:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{\"type\":\"thinking\",\"agent\":\"claude-code\"}' || true"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{\"type\":\"done\",\"agent\":\"claude-code\"}' || true"
          }
        ]
      }
    ]
  }
}
```

**Important:** The `|| true` at the end of each curl command is intentional -- it prevents hook failures from blocking Claude Code when coding-kitty isn't running.

---

## APPENDIX: ACTIVITY EVENT FLOW

```
[Developer saves file]
  --> fs.watch callback in activity-watcher.ts
    --> filters by CODE_EXTENSIONS and NOISE_PATHS
    --> debounces 100ms
    --> emits ActivityEvent { type: 'file-saved' }
      --> IPC 'activity-event' to renderer
        --> main.ts switch routes to fsm.onFileSaved()
          --> state = 'kneading' for 800ms
            --> CatRenderer.draw('kneading') -- paws alternate up/down

[Claude Code makes a tool call]
  --> ~/.claude/settings.json PreToolUse hook fires
    --> curl POST to localhost:23456 { type: 'thinking' }
      --> activity-watcher HTTP server receives
        --> emits ActivityEvent { type: 'agent-thinking' }
          --> fsm.onAgentThinking() --> state = 'agent-thinking'
            --> CatRenderer.drawAgentThinking() -- wide eyes + thought bubbles

  --> tool completes, PostToolUse hook fires
    --> curl POST to localhost:23456 { type: 'done' }
      --> activity-watcher HTTP server receives
        --> emits ActivityEvent { type: 'agent-done' }
          --> fsm.onAgentDone() --> state = 'agent-done' for 3s
            --> CatRenderer.drawAgentDone() -- hop animation + gold sparkles
```

---

## APPENDIX: FSM STATE TRANSITION TABLE

| Current State | Trigger | New State | Duration | Notes |
|---------------|---------|-----------|----------|-------|
| any | file-saved | kneading | 800ms | Wakes from sleep. Blocked by stretching, scrolling, agent-thinking. |
| any | agent-thinking | agent-thinking | until done/error | Wakes from sleep. Overrides everything. |
| agent-thinking | agent-done | agent-done | 3000ms | Then auto-returns to idle. |
| agent-thinking | agent-error | idle | immediate | Schedules sleep timer. |
| idle | mouse near cat | looking | 2000ms | Cursor tracking updates eye offset. |
| idle | drag start | stretching | until drag end | |
| stretching | drag end | idle | immediate | |
| idle | 5min no activity | sleeping | until any event | Suppressed while in code app. |
| any | entered code app | (no change) | -- | Clears sleep timer. |
| any | left code app | (no change) | -- | Schedules sleep timer. |
| idle | scroll event | scrolling | 800ms | ORPHANED -- nothing calls onScrollActivity(). |
