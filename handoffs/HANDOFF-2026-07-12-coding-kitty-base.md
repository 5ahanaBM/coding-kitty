# HANDOFF-2026-07-12-coding-kitty-base.md
_Generated: 2026-07-12_
_Covers: All work through Phase 4 completion + shippability_

---

## ORIGINAL GOAL

Build "Coding Kitty" -- a desktop pixel-art cat companion that lives on-screen while the developer codes. macOS only. Electron + TypeScript. The cat reacts to coding activity: file saves trigger kneading, Claude Code tool calls trigger thought bubbles and celebration hops, the cat's eyes follow the cursor, it sleeps after 5 minutes of inactivity, and it can be dragged around the screen.

The app must work on managed corporate macOS (no admin access, no Accessibility permission grants), which ruled out global keyboard hooks and forced a pivot to FSEvents + HTTP + lsappinfo for activity detection.

---

## CURRENT STATUS
**Overall status:** PHASE 4 COMPLETE -- SHIPPABLE

Phases 1 through 4 are fully implemented, reviewed, bug-fixed, and pushed to GitHub. The app builds to a working DMG (`release/Coding Kitty-0.1.0-arm64.dmg`, 104MB, arm64, unsigned). `npm run setup` installs Claude Code hooks and `npm run teardown` removes them. README documents quick start, hook setup (with manual JSON fallback), config, build, and cat states. The working tree is clean with no uncommitted changes. All commits are on `main`, tracking `origin/main`, up to date with the remote.

**Repository:** https://github.com/5ahanaBM/coding-kitty
**Remote (SSH):** `git@github.com:5ahanaBM/coding-kitty.git`

---

## FILE STATE REGISTRY

### All Project Files (Current State)

| File | Status | Description | Known Issues |
|------|--------|-------------|--------------|
| `package.json` | MODIFIED (Phase 4) | name: coding-kitty, main: `out/main/index.js`, electron@^38.2.0, electron-vite@3, electron-builder@25, playwright-core@1.61.1. **Phase 4 additions:** `"engines": {"node": ">=18"}`, scripts `"setup"` and `"teardown"`. | No production dependencies (empty `dependencies` object). |
| `electron.vite.config.ts` | STABLE | Standard electron-vite config with `externalizeDepsPlugin()` for main and preload | None |
| `electron-builder.yml` | STABLE | Build config: LSUIElement:true, target DMG, hardened runtime, `files: out/**/*` | None |
| `tsconfig.json` | STABLE | Project references pointing to tsconfig.node.json and tsconfig.web.json | None |
| `tsconfig.node.json` | STABLE | Main/preload TS config: ESNext target, CommonJS module, bundler resolution | None |
| `tsconfig.web.json` | STABLE | Renderer TS config: ESNext target/module, DOM lib | None |
| `build/entitlements.mac.plist` | STABLE | JIT entitlement only (`com.apple.security.cs.allow-jit`) | None |
| `README.md` | CREATED (Phase 4) | Quick start, Claude Code hook setup (automated + manual fallback with merge guidance), npm run teardown, config.json watchDirs, DMG build + xattr workaround, cat states table (7 behaviors) | xattr command uses `/path/to` placeholder instead of actual DMG location |
| `scripts/drive.mjs` | STALE | Playwright headless test driver -- launches Electron, takes screenshots. Saves to `/tmp/kitty-shots/` | Uses dead keyboard simulation. `__forceState`/`__testState` injection nonfunctional. Needs rewrite to match current architecture. Leave as-is. |
| `scripts/gen-icon.py` | CREATED (Phase 4) | Python script generating pixel-art cat icon (512x512 .icns). No external deps -- uses struct/zlib only. Run through macOS `iconutil` to produce `.icns`. | One-shot generator, not part of build pipeline |
| `scripts/setup.mjs` | CREATED (Phase 4) | `npm run setup` -- installs PreToolUse + PostToolUse hooks into `~/.claude/settings.json`. Per-array idempotency (checks each array independently). `mkdirSync({ recursive: true })` before write. Hooks array guard: `if (!config.hooks \|\| typeof config.hooks !== 'object' \|\| Array.isArray(config.hooks)) config.hooks = {}`. Manual fallback on failure. | Non-atomic write (no temp file + rename). Corrupt JSON gives generic error message. |
| `scripts/teardown.mjs` | CREATED (Phase 4) | `npm run teardown` -- removes Coding Kitty hooks from `~/.claude/settings.json`. Filters by `localhost:23456` substring. Guards: missing file -> exit 0; missing hooks key -> exit 0; non-array -> treat as empty. | Always prints "hooks removed" even when nothing was removed. `filter(undefined)` writes `PreToolUse: []` for keys that never existed. |
| `resources/icon.icns` | CREATED (Phase 4) | 512x512 pixel-art cat app icon, all macOS sizes via iconutil. 46KB. | None |
| `resources/tray-icon-Template.png` | CREATED (Phase 4) | 22x22 macOS template tray icon (black silhouette on transparent). 103 bytes. | None |
| `resources/tray-icon-Template@2x.png` | CREATED (Phase 4) | 44x44 Retina tray icon. 124 bytes. | None |
| `src/main/index.ts` | MODIFIED (Phase 4) | Main process. **Phase 3:** position persistence to userData. **Phase 4:** `loadConfig()` / `CONFIG_FILE()` reads/writes `~/Library/Application Support/coding-kitty/config.json` for watchDirs. `createTray()` loads real tray icon from `resources/tray-icon-Template.png` with `nativeImage.createEmpty()` fallback. Tray menu gains "Open Config..." item. ActivityWatcher constructed with `config.watchDirs`. | None |
| `src/main/activity-watcher.ts` | MODIFIED (Phase 4) | Constructor now accepts `watchDirs: string[]` parameter instead of hardcoding directories. Three signal sources unchanged: fs.watch, HTTP on 127.0.0.1:23456, lsappinfo polling. | Port 23456 conflict possible if comnyang also runs. EADDRINUSE silently skipped. |
| `src/preload/index.ts` | STABLE | contextBridge exposes `window.kitty` with: setIgnoreMouse, moveWindow, onCursorPos, onActivityEvent | None |
| `src/renderer/index.html` | STABLE | Minimal HTML: cat-container div > cat div > canvas 96x96 | None |
| `src/renderer/src/main.ts` | STABLE (since Phase 3) | Renderer entry: cursor tracking, drag handling, activity events to FSM, render loop. Velocity tracking, spring rebound, sleepDepth passing. | None |
| `src/renderer/src/cat-renderer.ts` | MODIFIED (Phase 4) | Procedural pixel art renderer. **Phase 3:** spring oscillation, sleep curl, Z particles, wake stretch. **Phase 4:** `'scrolling'` removed from CatState union type. `drawScrolling()` method removed. | Line 1 says "Placeholder until real sprites land." All rendering is procedural fillRect. |
| `src/renderer/src/state-machine.ts` | MODIFIED (Phase 4) | FSM. **Phase 3:** waking state, sleepDepth getter. **Phase 4:** `onScrollActivity()` method removed. `'scrolling'` removed from CatState union. | None |
| `src/renderer/src/style.css` | STABLE | Transparent background, cat container 200x200 flexbox, cat element 96x96, `image-rendering: pixelated` | None |
| `docs/superpowers/specs/2026-07-12-phase3-design.md` | STABLE | Phase 3 design spec | None |
| `docs/superpowers/specs/2026-07-12-shippability-design.md` | CREATED (Phase 4) | Shippability design spec: setup.mjs, teardown.mjs, README requirements | None |
| `docs/superpowers/plans/2026-07-12-phase3.md` | STABLE | Phase 3 implementation plan | None |
| `docs/superpowers/plans/2026-07-12-shippability.md` | CREATED (Phase 4) | Shippability implementation plan | None |
| `assets/sprites/` | EMPTY | Placeholder for future sprite assets | Currently unused -- all rendering is procedural |
| `release/Coding Kitty-0.1.0-arm64.dmg` | BUILD OUTPUT | 104MB arm64 unsigned DMG. Verified: mounts and launches. | Unsigned -- requires `xattr -cr` on other machines. In `.gitignore`. |
| `out/` | BUILD OUTPUT | Compiled JS from last `electron-vite build` | Built successfully |
| `.claude/settings.local.json` | STABLE | Local permissions for this project | None |

### External Files (Not In Project Dir)

| File | Description |
|------|-------------|
| `~/.claude/settings.json` (hooks section) | Global Claude Code hooks: PreToolUse POSTs `{"type":"thinking","agent":"claude-code"}` to localhost:23456, PostToolUse POSTs `{"type":"done","agent":"claude-code"}`. Both `\|\| true` for fault tolerance. Matcher: `.*` (all tool calls). Managed by `npm run setup` / `npm run teardown`. |
| `~/Library/Application Support/coding-kitty/config.json` | watchDirs array. Default: 8 dirs (Developer, Projects, Code, code, workspace, src, Side Quests, Documents). Created on first launch if missing. Editable via tray menu "Open Config...". |
| `~/Library/Application Support/coding-kitty/position.json` | Cat window position `{x, y}`. Written on every move, read on launch with display-bounds validation. |

---

## COMPLETE ATTEMPT HISTORY

### Phase 1+2 (Prior Sessions)

#### Attempt 1: Global Keyboard Hooks via uiohook-napi
- **Approach:** Use `@mukea/uiohook-napi` (native Node addon wrapping libuiohook) to capture global keydown/keyup events for triggering kneading on typing and scroll events for the scrolling state.
- **Result:** FAILED
- **Why it failed:** macOS requires Accessibility permission (`AXIsProcessTrustedWithOptions`) for global input monitoring. This requires admin rights to grant via System Settings > Privacy > Accessibility. User is on managed corporate macOS -- cannot grant admin access. `isTrustedAccessibilityClient(false)` returns false, and calling `uiohook.start()` without the permission crashes the process.
- **What we learned:** Any approach requiring Accessibility permission is off the table. The package was later removed from `package.json` dependencies entirely.

#### Attempt 2: Activity Detection via FSEvents + HTTP + lsappinfo (Pivot)
- **Approach:** Three zero-permission signal sources: (1) `fs.watch` with `recursive: true` on known project directories to detect file saves, (2) HTTP server on localhost for AI agent integration, (3) `lsappinfo` shell command for frontmost app detection.
- **Result:** SUCCESS
- **Implementation details:**
  - FSEvents watches candidate dirs (now configurable via config.json, default 8: `~/Developer`, `~/Projects`, `~/Code`, `~/code`, `~/workspace`, `~/src`, `~/Side Quests`, `~/Documents`). Dirs that don't exist are silently skipped via try/catch.
  - File events filtered by `CODE_EXTENSIONS` regex and `NOISE_PATHS` regex, then debounced at 100ms.
  - HTTP server on `127.0.0.1:23456`, accepts POST with JSON body `{type, agent, status}`. Normalizes across formats.
  - `lsappinfo info -only name $(lsappinfo front)` polled every 3s. Output parsed with BSD-compatible grep.
  - 22 code apps recognized.

#### Attempt 3: GNU grep `-P` Flag Fix
- **Result:** Fixed -- replaced `grep -oP` with BSD-compatible `grep -o '"[^"]*"' | tail -1 | tr -d '"'`.

#### Attempt 4: electron-builder Files Path
- **Bug identified:** `files: dist/**/*` was wrong -- electron-vite outputs to `out/`.
- **Status:** Fixed to `files: out/**/*`.

#### Attempt 5: "Object has been destroyed" Crash
- **Fixed:** Removed `win` as parent argument to `dialog.showMessageBox`.

### Phase 3 (Prior Session)

#### Phase 3, Task 1: Drag Stretch Physics with Velocity-Scaled Spring Rebound
- **Approach:** Track drag velocity via last 5 cursor positions, compute velocity magnitude on drag end, map velocity to spring damping ratio (zeta), trigger spring oscillation on the canvas scale factor.
- **Implementation:**
  - `src/renderer/src/main.ts`: Added velocity tracking array (last 5 `{x, y, t}` samples), computed velocity on mouseup, mapped to zeta (0.4-0.8 range), called `renderer.triggerSpring(zeta)`.
  - `src/renderer/src/cat-renderer.ts`: Added spring oscillation fields (`springAmplitude`, `springDecay`, `springOmega`, `springT`), `triggerSpring(zeta)` method with zeta clamped to max 0.99. `draw()` applies `ctx.scale(1, 1 + springAmplitude * e^(-decay*t) * cos(omega*t))` for vertical squash-stretch.
- **Commit:** `a25b2c7`
- **Result:** SUCCESS

#### Phase 3, Task 2: Waking FSM State and sleepDepth Getter
- **Approach:** Add `'waking'` as a new FSM state with 400ms duration, plus `sleepDepth` getter that ramps 0-1 over 60 seconds of sleep.
- **Implementation:**
  - `src/renderer/src/state-machine.ts`: Added `'waking'` to `CatState` union. New `enterWaking()` method. `sleepDepth` getter computes `Math.min(1, elapsedSleepTime / 60000)`. Sleep entry records `_sleepStart = Date.now()`.
- **Commit:** `9d05688`
- **Result:** SUCCESS

#### Phase 3, Task 3: Sleep Animation Polish
- **Approach:** Progressive curl during sleep, floating Z particles, wake stretch animation.
- **Implementation:**
  - `src/renderer/src/cat-renderer.ts`: `drawSleeping(sleepDepth)` scales body and lowers ears as sleepDepth increases. Z particle system: spawned every 90 frames, drift upward/right with fade. `drawWaking()` plays stretch-up animation over 400ms.
  - `src/renderer/src/main.ts`: Passes `sleepDepth` from FSM to renderer.
- **Commit:** `611ab8d`
- **Result:** SUCCESS

#### Phase 3, Task 3 Follow-up: Remove Unused lastSpawn Field
- **Commit:** `784367f`
- **Result:** SUCCESS

#### Phase 3, Task 4: Persist Cat Position Across Launches
- **Approach:** Save window position to `app.getPath('userData')/position.json` on every move, restore on launch with display-bounds validation.
- **Implementation:** `src/main/index.ts`: `POS_FILE` function, async fire-and-forget writes, display-bounds validation on read.
- **Commit:** `07b0b50`
- **Result:** SUCCESS
- **Config path:** `~/Library/Application Support/coding-kitty/position.json`

#### Phase 3 Final Review: Three Bug Fixes
- **Fixes:** (1) Waking state overwrite guards on event handlers, (2) zeta clamp to 0.99 preventing NaN, (3) delta-time Z particles replacing frame-count math.
- **Commit:** `b5954db`
- **Result:** SUCCESS

### Phase 4 (This Session)

#### Phase 4, Task 1: App Icon + Tray Icon
- **Approach:** Generate a pixel-art cat icon programmatically in Python (no external deps), convert to .icns via macOS `iconutil`, create macOS template tray icons.
- **Implementation:**
  - `scripts/gen-icon.py`: 154-line Python script using only `struct` and `zlib` to create a 512x512 PNG pixel-art cat. Generates an iconset folder with all required macOS sizes, runs `iconutil -c icns` to produce the final `.icns`.
  - `resources/icon.icns`: 46KB, all macOS icon sizes embedded.
  - `resources/tray-icon-Template.png`: 22x22 black silhouette on transparent (103 bytes). The `-Template` suffix tells macOS to auto-colorize for light/dark menu bar.
  - `resources/tray-icon-Template@2x.png`: 44x44 Retina version (124 bytes).
  - `src/main/index.ts`: `createTray()` updated to load `resources/tray-icon-Template.png` via `nativeImage.createFromPath()` with `nativeImage.createEmpty()` fallback if file missing.
- **Commit:** `ad95475`
- **Result:** SUCCESS
- **Outcome:** DMG build verified: `release/Coding Kitty-0.1.0-arm64.dmg` mounts and launches with real icon in Dock (hidden by LSUIElement) and menu bar.

#### Phase 4, Task 2: Scrolling Dead Code Removal + Watched-Dir Config
- **Approach:** Remove orphaned scrolling state (no trigger was ever possible -- Accessibility permission blocked), make watched directories configurable via JSON config file.
- **Implementation:**
  - **Scrolling removal:** Deleted `onScrollActivity()` from `state-machine.ts`. Deleted `drawScrolling()` from `cat-renderer.ts`. Removed `'scrolling'` from `CatState` union type. Removed `scrollTimer`, `SCROLL_TIMEOUT` from state machine.
  - **Config:** `ActivityWatcher` constructor now accepts `watchDirs: string[]` from caller. `src/main/index.ts` adds `loadConfig()` / `CONFIG_FILE()` -- reads/writes `~/Library/Application Support/coding-kitty/config.json`. Default dirs: same 8 as before. On first launch, writes default config to disk. Tray menu gains "Open Config..." item that opens `config.json` in default editor via `shell.openPath()`.
- **Commit:** `686762e`
- **Result:** SUCCESS
- **Outcome:** CatState is now: `'idle' | 'kneading' | 'looking' | 'sleeping' | 'waking' | 'stretching' | 'agent-thinking' | 'agent-done'` (7 states, scrolling removed).

### Shippability Work (This Session)

#### Shippability, Task 1: Design Spec
- **What:** Wrote `docs/superpowers/specs/2026-07-12-shippability-design.md` specifying requirements for setup.mjs, teardown.mjs, and README.
- **Commit:** `75d1af5`
- **Result:** SUCCESS
- **Follow-up:** Spec was refined in commit `8eac28b` (per-array idempotency requirement, mkdir guard, teardown fixes, dropped .nvmrc and dead git rm from scope).

#### Shippability, Task 2: Implementation Plan
- **What:** Wrote `docs/superpowers/plans/2026-07-12-shippability.md`.
- **Commit:** `e2fb5a7`
- **Result:** SUCCESS

#### Shippability, Task 3: `npm run setup`
- **Approach:** Script reads `~/.claude/settings.json`, merges PreToolUse and PostToolUse hook arrays (per-array idempotency -- checks each independently), writes back. Manual fallback on any failure.
- **Implementation:**
  - `scripts/setup.mjs`: 85 lines. Reads existing config. Hooks array guard prevents silent data loss when `hooks` is an unexpected type. Checks each array for existing `localhost:23456` entries. Appends only missing entries. `mkdirSync({ recursive: true })` before write for fresh machines. On failure, prints exact JSON to paste manually.
  - `package.json`: Added `"setup": "node scripts/setup.mjs"`.
- **Commit:** `7bfe5f7`
- **Result:** SUCCESS
- **Verified:** `npm run setup` on author's machine outputs `"Coding Kitty hooks already installed. Nothing to do."` (idempotency confirmed).

#### Shippability, Task 4: `npm run teardown`
- **Approach:** Script reads `~/.claude/settings.json`, filters out entries containing `localhost:23456` from PreToolUse and PostToolUse arrays, writes back.
- **Implementation:**
  - `scripts/teardown.mjs`: 52 lines. Guards: missing file -> exit 0; missing hooks key -> exit 0; non-array -> treat as empty. Filters by `localhost:23456` substring. Leaves empty arrays as `[]` (never deletes keys). Manual fallback on failure.
  - `package.json`: Added `"teardown": "node scripts/teardown.mjs"`.
- **Commit:** `0dd475d`
- **Result:** SUCCESS

#### Shippability, Task 5: README
- **Approach:** Comprehensive README covering quick start, Claude Code integration, configuration, DMG build, and cat behaviors.
- **Implementation:**
  - `README.md`: 2.7KB. Sections: Quick Start (git clone, npm install, npm run dev), Claude Code Integration (npm run setup, what it does, manual JSON fallback with merge guidance, npm run teardown), Configuration (exact config.json path, watchDirs), Build DMG (npm run dist, xattr -cr workaround, arm64 note), Cat States (table of 7 behaviors with triggers).
- **Commit:** `b41a953`
- **Result:** SUCCESS

#### Shippability, Task 6: Setup Bug Fix + README Clarification
- **Approach:** Code review found hooks array guard was insufficient and README manual merge instructions were unclear.
- **Implementation:**
  - `scripts/setup.mjs`: Added guard `if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) config.hooks = {}` -- prevents silent JSON.stringify drop when hooks is an unexpected type (array, null, etc.).
  - `README.md`: Clarified manual fallback section to explain JSON merge (not replace) for users with existing hooks.
- **Commit:** `579aefd`
- **Result:** SUCCESS

---

## TESTS RUN AND RESULTS

### Test: Production Build (Phase 3 Final)
- **Command:** `npx electron-vite build`
- **Result:** PASSED
- **Output:** All three targets (main, preload, renderer) compiled without errors.

### Test: DMG Build (Phase 4)
- **Command:** `npm run dist`
- **Result:** PASSED
- **Output:** `release/Coding Kitty-0.1.0-arm64.dmg` (104MB, arm64, unsigned)
- **Interpretation:** DMG mounts and launches successfully on author's machine.

### Test: Setup Idempotency (Shippability)
- **Command:** `npm run setup`
- **Result:** PASSED
- **Output:** `"Coding Kitty hooks already installed. Nothing to do."`
- **Interpretation:** Per-array idempotency works -- hooks were already present, script detected and skipped.

### Test: Git Push
- **Command:** `git push origin main`
- **Result:** PASSED
- **Interpretation:** All commits through `579aefd` pushed to `origin/main`.

### No Automated Test Suite
- The project has no unit tests, integration tests, or E2E tests.
- `scripts/drive.mjs` (Playwright driver) exists but is stale.
- Build passing (`npx electron-vite build`) is the only automated verification.

---

## RESEARCH AND INVESTIGATIONS

### Research: macOS Permission-Free Activity Detection (Phase 1)
- **Findings:**
  - `fs.watch` with `recursive: true` works on macOS via FSEvents -- no special permissions needed.
  - `lsappinfo` is a built-in macOS command that returns frontmost app info without permissions.
  - `screen.getCursorScreenPoint()` works without Accessibility permission.
  - `IOHIDManager`-based global input hooks (what uiohook-napi uses) require Accessibility permission -- no workaround.

### Research: Electron Transparency on macOS (Phase 1)
- **Findings:**
  - `transparent: true` + `frame: false` works on macOS.
  - `resizable: true` BREAKS transparency -- must use `resizable: false`.
  - `setAlwaysOnTop(true, 'floating')` needed (not just `true`).
  - `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` for fullscreen overlay.
  - `hasShadow: false` removes system shadow around transparent window.
  - `LSUIElement: true` hides from Dock.

### Research: Competing Desktop Pet Apps (Phase 1)
- **Products examined:** comnyang ($3.90 on Mac App Store), Shimeji, Desktop Goose, RunCat.
- **Key differentiator:** None integrate with AI coding tools. "Coding DNA" personalization (Phase 5) would be novel.

### Research: macOS Template Tray Icons (Phase 4)
- **Findings:**
  - Naming a tray icon file with `-Template` suffix (e.g., `tray-icon-Template.png`) tells macOS to automatically colorize it for light/dark menu bar modes.
  - Standard size: 22x22 @1x, 44x44 @2x.
  - Must be black silhouette on transparent background.
  - `nativeImage.createFromPath()` in Electron handles the template convention.

---

## DISCOVERIES AND SURPRISES

1. **`resizable: true` breaks macOS transparency:** Undocumented in Electron API docs. Must use `resizable: false`.

2. **BSD vs GNU grep:** macOS ships BSD grep -- no `-P` (Perl regex). Use POSIX-compatible flags only.

3. **electron-vite outputs to `out/` not `dist/`:** The electron-builder.yml was originally written with `dist/**/*` which was wrong. Fixed to `out/**/*`.

4. **Electron 38.x GPU issue:** Older Electron versions (pre-38.2.0) cause GPU lag on macOS Tahoe (macOS 26). Project pins `^38.2.0`.

5. **`@mukea/uiohook-napi` crashes without permission:** Hard-crashes on `start()` without Accessibility permission. Abandoned and removed from deps.

6. **`setIgnoreMouseEvents` with `{ forward: true }` is essential:** Without `forward`, the transparent window becomes a permanent click sink.

7. **Spring oscillation zeta must be < 1:** `Math.sqrt(1 - zeta*zeta)` produces NaN when zeta >= 1. Must clamp to underdamped range.

8. **FSM state transitions can race with waking animation:** `enterWaking()` sets state to `'waking'`, but the caller's next line can immediately overwrite it. Guards (`&& this._state !== 'waking'`) are necessary on all state assignments in event handlers.

9. **Claude Code hooks `hooks` key can be an array:** If `~/.claude/settings.json` has `"hooks": []` (invalid shape -- should be an object), `JSON.stringify` silently drops the key content. The setup script must guard against this with a type check before treating it as an object.

10. **macOS `-Template` tray icon convention:** Naming the file `*-Template.png` causes automatic light/dark mode colorization. No code needed beyond `createFromPath()`.

11. **Python can generate valid PNGs with zero external deps:** `struct` + `zlib` are sufficient to create IHDR/IDAT/IEND chunks. Used this to generate the app icon without requiring Pillow or any pip install.

---

## DECISIONS LOG

### Decision: Procedural Pixel Art Over Sprites
- **Decision made:** Draw the cat entirely with canvas `fillRect` calls rather than using sprite sheets.
- **Reasoning:** Fastest path to a visible, animated cat with no external asset dependencies.
- **Trade-offs:** The art is basic. Will need replacement for polished release.
- **Reversibility:** Easy -- `CatRenderer.draw()` can be refactored to blit from a sprite sheet. FSM and state machine are decoupled from rendering.
- **Status:** Explicitly deferred to v1.1. `cat-renderer.ts` line 1 says "Placeholder until real sprites land."

### Decision: Abandon Keyboard Hooks, Use FSEvents
- **Decision made:** Drop global keyboard/scroll monitoring entirely. Use file system events as primary activity signal.
- **Reasoning:** No macOS API can capture global keyboard input without Accessibility permission.
- **Trade-offs:** Lost real-time typing feedback (kneading on save only). Lost scroll detection.
- **Reversibility:** If user gains admin access, would need to add uiohook-napi back.

### Decision: HTTP Server on Port 23456
- **Decision made:** Run HTTP server on `127.0.0.1:23456` for agent status updates.
- **Reasoning:** Compatible with comnyang hook format. Claude Code hooks POST to it directly.
- **Trade-offs:** Port conflict if comnyang runs. EADDRINUSE silently ignored.
- **Reversibility:** Port hardcoded in `activity-watcher.ts` AND `~/.claude/settings.json` hooks. Both must change together.

### Decision: Remove Scrolling State Entirely (Phase 4)
- **Decision made:** Delete `onScrollActivity()`, `drawScrolling()`, `scrollTimer`, `SCROLL_TIMEOUT`, and `'scrolling'` from the CatState union.
- **Alternatives considered:** (a) Find an alternative scroll trigger (window title changes as proxy), (b) leave orphaned code.
- **Reasoning:** No trigger was ever possible on corporate macOS (Accessibility permission required). Dead code with no path to activation -- removing it reduces confusion.
- **Trade-offs:** If user ever gains admin access and wants scroll detection, the rendering code must be rewritten.
- **Reversibility:** Git history preserves the code at commit `b5954db` and earlier.

### Decision: Configurable Watch Directories via config.json (Phase 4)
- **Decision made:** Move hardcoded directory list to `~/Library/Application Support/coding-kitty/config.json` with default values matching the original 8 dirs. Tray menu "Open Config..." opens the file.
- **Alternatives considered:** (a) GUI config panel in tray, (b) keep hardcoded.
- **Reasoning:** Config file is the simplest approach that makes dirs user-editable without building UI.
- **Trade-offs:** User must know JSON. No validation of dir paths. No hot-reload (requires app restart).
- **Reversibility:** Simple -- the config loading is a single function.

### Decision: Programmatic Icon Generation (Phase 4)
- **Decision made:** Generate the app icon via a Python script (`scripts/gen-icon.py`) instead of using an image editor.
- **Reasoning:** No external tool dependencies. Reproducible. Can be tweaked in code.
- **Trade-offs:** The icon is crude pixel art, not polished design.
- **Reversibility:** Just replace `resources/icon.icns` with any properly formatted .icns file.

### Decision: Position Persistence via app.getPath('userData') (Phase 3)
- **Decision made:** Store position in `~/Library/Application Support/coding-kitty/position.json`.
- **Reasoning:** `app.getPath('userData')` is the Electron-standard location.
- **Reversibility:** One-line path change.

### Decision: Waking State as Distinct FSM State (Phase 3)
- **Decision made:** Added `'waking'` as a full FSM state (400ms duration).
- **Reasoning:** Allows wake-stretch animation and prevents event handlers from immediately overriding visual feedback.
- **Trade-offs:** Every event handler must guard against overwriting waking state.

### Decision: `npm run setup` / `npm run teardown` for Hook Management (Phase 4)
- **Decision made:** Provide scripts to install/remove Claude Code hooks rather than requiring manual JSON editing.
- **Alternatives considered:** (a) Auto-install on `npm install` via postinstall, (b) manual-only with README instructions.
- **Reasoning:** Scripts are opt-in (user runs them explicitly) and idempotent. Manual fallback provided on failure. postinstall would surprise users who just want to look at the code.
- **Trade-offs:** Non-atomic file writes. Limited error handling for corrupt JSON.

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
- **Python:** 3.x (for `scripts/gen-icon.py` -- system Python sufficient)
- **macOS:** Darwin 25.5.0 (macOS Tahoe)
- **Git:** Initialized, remote configured
- **GitHub:** https://github.com/5ahanaBM/coding-kitty (SSH: `git@github.com:5ahanaBM/coding-kitty.git`)
- **Global Claude Code hooks:** Configured in `~/.claude/settings.json` -- PreToolUse and PostToolUse both POST to localhost:23456. Managed by `npm run setup` / `npm run teardown`.
- **Key constraint:** Corporate managed macOS -- no admin access, no Accessibility permission
- **engines requirement:** Node >= 18 (declared in package.json)

### How to Run
```bash
pkill -f "electron.*coding" 2>/dev/null
cd "/Users/sahana.manjunath/Side Quests/coding kitty"
npm run dev
```
Cat appears bottom-right of screen (or last saved position). To trigger states:
- **Kneading:** Save any code file in a watched dir (default: `~/Side Quests/`, `~/Developer/`, etc.)
- **Agent-thinking + agent-done:** Have Claude Code make any tool call (hooks auto-POST)
- **Looking:** Move mouse near the cat
- **Sleeping:** Wait 5 minutes with no activity while not in a code app
- **Waking:** Any activity event while sleeping (400ms stretch animation before idle)
- **Stretching:** Click and drag the cat (spring rebound on release, velocity-scaled)

### Manual HTTP Test
```bash
# Trigger thinking state
curl -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"thinking","agent":"test"}'

# Trigger done state (cat hops + sparkles for 3s)
curl -X POST http://localhost:23456/status -H 'Content-Type: application/json' -d '{"type":"done","agent":"test"}'
```

### Hook Setup (For New Machines)
```bash
npm run setup      # installs Claude Code hooks (idempotent)
npm run teardown   # removes them
```

---

## ESTABLISHED FACTS (Proven With Evidence)

1. **Build passes:** `npx electron-vite build` compiles all three targets with zero errors. Verified after all Phase 4 commits.
2. **DMG builds and launches:** `npm run dist` produces `release/Coding Kitty-0.1.0-arm64.dmg` (104MB, arm64, unsigned). Verified: mounts and launches.
3. **Setup idempotency:** `npm run setup` on author's machine with hooks already present outputs `"Coding Kitty hooks already installed. Nothing to do."`.
4. **Git push succeeds:** All commits through `579aefd` pushed to `origin/main`.
5. **Working tree is clean:** `git status` shows "nothing to commit" (except this handoff file).
6. **No production dependencies:** `package.json` `dependencies` object is empty.
7. **Scrolling state fully removed:** `grep -c 'scrolling\|onScrollActivity\|drawScrolling'` returns 0 across all source files.
8. **CatState type:** Currently `'idle' | 'kneading' | 'looking' | 'sleeping' | 'waking' | 'stretching' | 'agent-thinking' | 'agent-done'` (7 visual states + agent-done).
9. **Config file path:** `~/Library/Application Support/coding-kitty/config.json` -- verified in `src/main/index.ts` line 13.
10. **Tray icon loads:** `createTray()` at line 131 loads `resources/tray-icon-Template.png` via `nativeImage.createFromPath()`.
11. **ActivityWatcher accepts watchDirs:** Constructor signature is `constructor(onEvent, watchDirs: string[])` -- verified at line 31 of `activity-watcher.ts`.
12. **Position persistence path:** `app.getPath('userData')` = `~/Library/Application Support/coding-kitty/`.
13. **Zeta clamp works:** `triggerSpring()` clamps zeta to 0.99. Verified in source.
14. **Waking guards work:** Event handlers check `this._state !== 'waking'`. Verified in source.
15. **Delta-time Z particles:** Particle motion uses `lastTickTime` and computed `dt`. Verified in source.

---

## ASSUMPTIONS

**None outstanding.** All assumptions from prior phases have been proven or resolved. Key proofs:
- Accessibility permission blocker (proven in Phase 1, attempt 1).
- `out/` vs `dist/` build output (proven and fixed).
- electron-builder.yml correctness (verified by successful DMG build).
- Spring math safety (proven by code review and fix).
- Setup idempotency (proven by running `npm run setup` with existing hooks).
- DMG launches (proven by mounting and opening).

---

## IN-PROGRESS / INCOMPLETE WORK

**None for Phases 1-4.** All phases are complete.

### Known Minor Issues (Not Fixed, Not Blocking)

1. **`scripts/setup.mjs` non-atomic write:** Writes directly to `~/.claude/settings.json` without temp file + rename. Risk: corruption if process killed mid-write. Low probability.
2. **`scripts/setup.mjs` corrupt JSON error:** If `~/.claude/settings.json` contains invalid JSON, the error message is generic. Could be more helpful.
3. **`scripts/teardown.mjs` always prints "hooks removed":** Even when nothing was actually removed. Cosmetic issue.
4. **`scripts/teardown.mjs` creates empty arrays for non-existent keys:** `filter(undefined)` on a key that was never in the config writes `PreToolUse: []`. Harmless but untidy.
5. **`README.md` xattr command uses placeholder:** `xattr -cr /path/to/Coding\ Kitty.app` -- should ideally reference the actual DMG extraction path.
6. **`scripts/drive.mjs` is stale:** Uses dead keyboard simulation, `__forceState` injection is nonfunctional. Left as-is deliberately.

---

## OPEN QUESTIONS AND BLOCKERS

### Blockers
None. The app is shippable as-is.

### Open Questions (Not Blocking)
1. **Sprite art direction:** Stick with procedural canvas? Aseprite hand-drawn sprites? AI-generated pixel art? This affects visual identity. The visual IS the product for a desktop pet. Deferred to v1.1.
2. **Port 23456 conflict:** If both coding-kitty and comnyang run, one silently fails to bind. Options: (a) use a different port, (b) try 23456 then fallback, (c) port negotiation.
3. **Monetization:** comnyang charges $3.90. Free vs paid? In-app cosmetics?
4. **Window size discrepancy:** `BrowserWindow` is 200x200 but positioning math uses `width - 220, height - 220`. The user spec mentions 220x220. Minor.
5. **Test strategy:** No tests exist. Should a future phase include setting up a proper test framework?
6. **Config hot-reload:** Currently requires app restart to pick up `config.json` changes. Could watch the config file.
7. **Universal binary:** Currently arm64 only. No Intel/universal build.
8. **Code signing:** DMG is unsigned. Requires `xattr -cr` on other machines. Would need Apple Developer account to sign.

---

## NEXT STEPS (PRIORITIZED)

### Immediate (v1.1 -- Visual Polish)
1. **Sprite art replacement:** Replace procedural `fillRect` rendering in `cat-renderer.ts` with proper pixel art sprites (Aseprite or similar). This is the biggest visual upgrade and the most impactful thing for the product.

### After That
2. **Test driver rewrite:** Rewrite `scripts/drive.mjs` to trigger states via HTTP POST to localhost:23456 instead of keyboard simulation.
3. **Fix minor setup/teardown issues:** Atomic writes, better error messages, accurate "removed" output.
4. **Config hot-reload:** Watch `config.json` for changes and restart file watchers without app restart.

### Phase 5: Novelty Features (Benched, High Priority Later)
1. **Coding DNA:** SQLite-backed session tracker. Records: timestamp, language, file path (hashed), duration, error signals. After 3 months, cat develops "personality" based on coding patterns.
2. **Flow State Guardian:** Detect sustained focus and auto-mute notifications.
3. **Struggle Detector:** Watch for thrashing patterns (same files cycling, rapid changes without commits). After 25 minutes, offer rubber-duck debugging.
4. **Context Preserver:** Snapshot cognitive state on quit, morning briefing on next launch.
5. **Emotional State Machine:** 4-layer PAD model with emotional memory persisting across sessions.
6. **Anti-burnout:** Cat leaves screen after 6 hours continuous coding.
7. **Git Garden:** Commits = plants, PRs = flowers, releases = trees.
8. **Coding Leagues:** Weekly rankings with demotion mechanics (Duolingo-style).
9. **Cosmetics Shop:** Earn coins from coding, buy cat accessories.

---

## GIT HISTORY (Complete)

```
579aefd fix: hooks array guard in setup, clarify README manual merge instructions
b41a953 docs: add README — quick start, hook setup, config, cat states
0dd475d feat: add npm run teardown to remove Claude Code hooks
7bfe5f7 feat: add npm run setup to install Claude Code hooks
e2fb5a7 docs: add shippability implementation plan
8eac28b docs: fix shippability spec — per-array idempotency, mkdir guard, teardown fixes, drop .nvmrc and dead git rm
75d1af5 docs: add shippability design spec
686762e feat: remove scrolling dead code, add watched-dir config
ad95475 feat: add app icon, tray icon, verify DMG build
b5954db fix: waking state overwrite, zeta guard, delta-time Z particles
07b0b50 feat: persist cat position across launches using userData path
784367f fix: remove unused lastSpawn field from Z particles
611ab8d feat: sleep animation polish — progressive curl, floating Zzz, wake stretch
9d05688 feat: add waking FSM state and sleepDepth getter
a25b2c7 feat: drag stretch physics with velocity-scaled spring rebound
7656d9d Add Phase 3 implementation plan
a873e90 Update Phase 3 spec
92ff41a Add Phase 3 design spec
008fada Initial commit: Phases 1+2 complete
```

All on `main`. All pushed to `origin/main`.

---

## KEY TECHNICAL GOTCHAS (Reference)

| Gotcha | Detail |
|--------|--------|
| electron-vite output dir | Outputs to `out/`, NOT `dist/`. package.json `main` must be `"out/main/index.js"`. |
| macOS transparency | `resizable: true` BREAKS transparency. Always `resizable: false`. |
| Always-on-top level | Must use `setAlwaysOnTop(true, 'floating')` -- just `true` is insufficient. |
| Fullscreen overlay | Requires `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`. |
| LSUIElement | Set via electron-builder `extendInfo.LSUIElement: true` to hide from Dock. |
| Electron version floor | Electron 38.2.0+ required. Older versions cause GPU lag on macOS Tahoe. |
| BSD grep | macOS grep has no `-P` flag. Use `grep -o` with bracket expressions. |
| Click-through | `setIgnoreMouseEvents(true, { forward: true })` -- `forward` param is critical. |
| Cursor tracking | `screen.getCursorScreenPoint()` does NOT require Accessibility permission. |
| Port 23456 | Shared with comnyang format. `EADDRINUSE` silently ignored. Both hooks and activity-watcher.ts must change together. |
| Canvas SCALE | SCALE=3 in cat-renderer.ts. Center-bottom anchor at (48, 96) for ctx.scale transforms. |
| Spring zeta | Must clamp zeta < 1 before `Math.sqrt(1 - zeta*zeta)` or get NaN. |
| Waking state guards | Event handlers must check `this._state !== 'waking'` before state assignment. |
| Position persistence | `app.getPath('userData')` = `~/Library/Application Support/coding-kitty/`. |
| Config file path | `~/Library/Application Support/coding-kitty/config.json` for watchDirs. |
| Tray icon template | File must be named `*-Template.png` for macOS auto light/dark colorization. |
| Hooks array guard | `~/.claude/settings.json` hooks key can be array (invalid) -- setup.mjs must type-check before using as object. |
| No Co-Authored-By | NEVER add Co-Authored-By or any attribution to git commit messages. |
| FSM states | `'idle' \| 'kneading' \| 'looking' \| 'sleeping' \| 'waking' \| 'stretching' \| 'agent-thinking' \| 'agent-done'` |

---

## APPENDIX: GLOBAL CLAUDE CODE HOOKS CONFIG

These hooks in `~/.claude/settings.json` make the cat react to Claude Code tool calls. Managed by `npm run setup` / `npm run teardown`:

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

The `|| true` prevents hook failures from blocking Claude Code when coding-kitty isn't running.

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
          --> state = 'kneading' for 800ms (unless waking)
            --> CatRenderer.draw('kneading') -- paws alternate up/down

[Claude Code makes a tool call]
  --> ~/.claude/settings.json PreToolUse hook fires
    --> curl POST to localhost:23456 { type: 'thinking' }
      --> activity-watcher HTTP server receives
        --> emits ActivityEvent { type: 'agent-thinking' }
          --> fsm.onAgentThinking() --> state = 'agent-thinking' (unless waking)
            --> CatRenderer.drawAgentThinking() -- wide eyes + thought bubbles

  --> tool completes, PostToolUse hook fires
    --> curl POST to localhost:23456 { type: 'done' }
      --> activity-watcher HTTP server receives
        --> emits ActivityEvent { type: 'agent-done' }
          --> fsm.onAgentDone() --> state = 'agent-done' for 3s
            --> CatRenderer.drawAgentDone() -- hop animation + gold sparkles

[Cat wakes from sleep]
  --> any activity event while state === 'sleeping'
    --> enterWaking() sets state = 'waking'
      --> CatRenderer.drawWaking() -- vertical stretch animation (400ms)
        --> setTimeout --> state = 'idle'
          --> original event handler checks state !== 'waking', skips overwrite
```

---

## APPENDIX: FSM STATE TRANSITION TABLE

| Current State | Trigger | New State | Duration | Notes |
|---------------|---------|-----------|----------|-------|
| any | file-saved | kneading | 800ms | Wakes from sleep (via waking). Blocked by stretching, agent-thinking, waking. |
| any | agent-thinking | agent-thinking | until done/error | Wakes from sleep (via waking). Blocked by waking. |
| agent-thinking | agent-done | agent-done | 3000ms | Then auto-returns to idle. |
| agent-thinking | agent-error | idle | immediate | Schedules sleep timer. |
| idle | mouse near cat | looking | 2000ms | Cursor tracking updates eye offset. |
| idle | drag start | stretching | until drag end | Spring rebound animation on release. |
| stretching | drag end | idle | immediate | triggerSpring(zeta) called with velocity-scaled zeta. |
| idle | 5min no activity | sleeping | until any event | Suppressed while in code app. sleepDepth ramps 0-1 over 60s. |
| sleeping | any activity | waking | 400ms | Wake-stretch animation, then idle. |
| waking | (timeout) | idle | 400ms | Guards prevent event handlers from overwriting. |
| any | entered code app | (no change) | -- | Clears sleep timer. |
| any | left code app | (no change) | -- | Schedules sleep timer. |
