# HANDOFF-2026-07-13-gif-recording-and-character-design.md
_Generated: 2026-07-13_
_Prior handoff: `handoffs/HANDOFF-2026-07-12-coding-kitty-base.md` (Phases 1-4 complete)_

---

## ORIGINAL GOAL

Two-part session on the Coding Kitty project (Electron + TypeScript desktop pixel-art cat companion for macOS):

1. **GIF Recording System** -- Build a Playwright-based pipeline to capture each of the 8 cat states as animated GIFs from inside Electron. No screen capture allowed (corporate macOS constraint -- no Accessibility permission). The GIFs serve as reference assets, README illustrations, and regression baselines.

2. **Character Design Research & Competitive Analysis** -- Investigate why the current cat looks "robotic and lifeless" (user's words: "looks freaking robotic, lifeless cat"), research the science of cuteness and desktop pet animation, analyze competitors, and produce a character design bible with actionable improvement priorities.

**Repository:** https://github.com/5ahanaBM/coding-kitty
**Working directory:** `/Users/sahana.manjunath/Side Quests/coding kitty`

---

## CURRENT STATUS
**Overall status:** PARTIALLY COMPLETE -- TWO DELIVERABLES DONE, UNCOMMITTED

**Summary:** Both deliverables are functionally complete. The GIF recording pipeline (`scripts/record-gifs.mjs`) works end-to-end and produces 8 visually distinct animated GIFs. The character design bible (`docs/CHARACTER-PROFILE.md`) is a comprehensive 370-line document with research-backed proportion guides, animation architecture, state storyboards, and artist brief. All changes are UNCOMMITTED. The immediate next step is implementing the behavioral "alive" fixes (breathing, catchlights, async channels) in `cat-renderer.ts` -- these are the highest-leverage improvements identified by the research, requiring zero art assets.

---

## FILE STATE REGISTRY

### Modified Files

| File | Status | Description | Known Issues |
|------|--------|-------------|--------------|
| `src/renderer/src/main.ts` | MODIFIED | Added 5-line recording bridge at bottom (lines 133-137): exposes `window.__kittyFsm`, `window.__kittyRenderer`, `window.__kittyCanvas` when URL has `?record=1` query param | None -- gated behind `?record=1`, zero impact on normal operation |
| `src/main/index.ts` | MODIFIED | Two changes: (1) Lines 122-127: appends `?record=1` to renderer URL when `KITTY_RECORD=1` env var set, using `loadFile({ search: 'record=1' })` for file: and URL concatenation for dev server. (2) Lines 190-193: skips `startCursorTracking()` and `startActivityWatcher()` in record mode. | None |
| `package.json` | MODIFIED | Added `gifenc` as devDependency (`^1.0.3`). Added `"record": "electron-vite build && node scripts/record-gifs.mjs"` script. | None |
| `package-lock.json` | MODIFIED | Updated with gifenc resolution | None |

### Created Files

| File | Status | Description | Known Issues |
|------|--------|-------------|--------------|
| `scripts/record-gifs.mjs` | CREATED | 272-line Playwright-based GIF recording orchestration script. Launches Electron with `KITTY_RECORD=1`, iterates 8 states, captures canvas frames via `ctx.getImageData()`, encodes to GIF with `gifenc` library using magenta (#FF00FF) chroma key for transparency. | `gifenc` is CJS -- requires `import pkg from 'gifenc'; const { GIFEncoder, quantize, applyPalette } = pkg` pattern. Electron binary path hardcoded for macOS: `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`. |
| `assets/recordings/idle.gif` | CREATED | 45 frames, 25KB | None |
| `assets/recordings/looking.gif` | CREATED | 45 frames, 25KB | None |
| `assets/recordings/kneading.gif` | CREATED | 30 frames, 17KB | None |
| `assets/recordings/stretching.gif` | CREATED | 53 frames, 32KB | None |
| `assets/recordings/agent-thinking.gif` | CREATED | 60 frames, 33KB | None |
| `assets/recordings/agent-done.gif` | CREATED | 42 frames, 33KB | None |
| `assets/recordings/sleeping.gif` | CREATED | 75 frames, 24KB | None |
| `assets/recordings/waking.gif` | CREATED | 23 frames, 12KB | None |
| `docs/CHARACTER-PROFILE.md` | CREATED | 370-line character design bible. Contains: identity/personality, research-backed proportions, 10-color palette, layered channel animation architecture, state storyboards for all 8 states, sprite sheet architecture (34 frames, 288x528px), implementation priority (8-tier), artist brief ($400-1000), killed assumptions. | Untested against real desktop backgrounds. Proportion changes not yet implemented. Budget estimates from web research, not actual artist quotes. |

### Key Existing Files (not changed, but relevant to next steps)

| File | Relevance |
|------|-----------|
| `src/renderer/src/cat-renderer.ts` | **Primary target for next session's work.** 379 lines. Procedural pixel-art renderer using `fillRect`. Contains `draw()` method, spring physics, Z-particle system. Line 1: "Placeholder until real sprites land." The behavioral fixes (breathing, catchlights, async channels) will all be added here. Key points: SCALE=3, anchor at (48,96), 7 color constants, existing blink system uses frame counter (not time-based). |
| `src/renderer/src/state-machine.ts` | FSM with 8 states. Key constants: `KNEADING_TIMEOUT=800` (CHARACTER-PROFILE.md says extend to 1600-2000ms), waking duration 200ms (profile says extend to 450ms). `sleepDepth` ramps 0-1 over 30s. All timers: `keyTimer`, `mouseTimer`, `sleepTimer`, `wakeTimer`. |
| `handoffs/HANDOFF-2026-07-12-coding-kitty-base.md` | Prior handoff covering Phases 1-4. Contains complete attempt history, all established facts, environment setup, gotchas table. Still fully valid -- nothing from that handoff was contradicted this session. |

---

## COMPLETE ATTEMPT HISTORY

### Work Area 1: GIF Recording System

#### Attempt 1: Initial Recording Script (First Run)
- **Approach:** Build a Playwright script that launches Electron, iterates through states using FSM methods (`fsm.onFileSaved()`, `fsm.onMouseActivity()`, etc.), captures canvas frames via `ctx.getImageData()`, and encodes GIFs with `gifenc`.
- **Implementation:** Created `scripts/record-gifs.mjs` with state configurations specifying duration, setup function (calling FSM methods), and frame capture loop at 15fps.
- **Result:** FAILED -- 8 GIFs produced, but 7 of 8 looked identical to idle.
- **Outcome:** FAILED
- **Why it failed:** Multiple interacting bugs (see bugs 1-6 below).
- **What we learned:** Recording requires complete isolation from the normal runtime -- cursor tracking, activity watching, and FSM timers all interfere.

#### Attempt 2: Fix All Recording Bugs (Second Run)
- **Approach:** Systematically diagnose why 7/8 GIFs showed idle, fix root causes in both main process and recording script.
- **Implementation:** Six distinct fixes applied:

**Bug 1 (CRITICAL): Cursor tracking never disabled in record mode.**
- Root cause: Main process `startCursorTracking()` fires every 16ms, sending `cursor-pos` to renderer. Renderer calls `fsm.onMouseActivity()` on every tick, which immediately wakes the sleeping cat, overwrites eye offsets, and competes with kneading state.
- Fix: In `src/main/index.ts`, wrapped `startCursorTracking()` and `startActivityWatcher()` in `if (!process.env['KITTY_RECORD'])` guard (lines 190-193).

**Bug 2 (CRITICAL): Activity watcher never disabled.**
- Root cause: File saves in watched directories during recording fire `onFileSaved()`, clobbering whatever state was being recorded.
- Fix: Same guard as Bug 1.

**Bug 3 (HIGH): First frame captured stale canvas.**
- Root cause: `page.evaluate(getImageData)` runs as a microtask before rAF paints the new state on canvas.
- Fix: Added `await sleep(FRAME_MS)` after state setup and before first frame capture (line 174 in record-gifs.mjs).

**Bug 4 (HIGH): Timer leaks between state recordings.**
- Root cause: Previous state's `keyTimer`/`sleepTimer`/`wakeTimer` would fire during next recording, stomping state.
- Fix: Added `resetFsm()` function (lines 116-144) that clears ALL timers (`clearTimeout` on all four), resets `_state='idle'`, `_inCodeApp=false`, `sleepStart=0`, `lastActivity=Date.now()`, and resets renderer state (`sx=1`, `sy=1`, `springActive=false`, `zParticles=[]`, `lastZSpawn=0`, `lastTickTime=0`, `prevState='idle'`, `setStretch(1,1)`, `setEyeOffset(0,0)`).

**Bug 5 (MEDIUM): Stretching setup consumed visual stretch before recording.**
- Root cause: 500ms `sleep()` in setup meant the spring had already decayed before capture started.
- Fix: Implemented `captureEarly` callback pattern (lines 162-169) that lets setup functions capture frames mid-sequence. Stretching now captures 8 frames of the stretch hold phase, THEN releases and records the spring.

**Bug 6 (MEDIUM): agent-done recording exceeded linger time.**
- Root cause: `agent-done` recording duration was 4000ms but `AGENT_DONE_LINGER` is 3000ms. Last 1000ms showed idle.
- Fix: Reduced agent-done recording duration to 2800ms.

**Bug 7 (Approach change): Switched from FSM methods to direct `_state` assignment.**
- Root cause: FSM methods like `onFileSaved()` set competing timers that fire during recording.
- Fix: Recording script now assigns `window.__kittyFsm._state = 'kneading'` directly instead of calling `fsm.onFileSaved()`. Since cursor tracking and activity watcher are disabled, no external events can stomp the state.

- **Result:** All 8 GIFs visually distinct and correct.
- **Outcome:** SUCCESS
- **What we learned:** Recording is fundamentally a "controlled experiment" -- all external inputs must be silenced, and state must be force-set without triggering timers.

### Work Area 2: Character Design Research

#### Research Phase: Competitive Analysis
- **Approach:** Multi-agent deep research into competing desktop pet apps.
- **Apps analyzed:** Comnyang, Shimeji, Desktop Goose, VPet-Simulator, Neko (1988 original).
- **Key finding:** Our cat rates 2/10 on "alive" scale. Comnyang rates 9/10.
- **Comnyang's secret:** 5 async ambient loops running at prime-ish intervals (3.5s, 4s, 8s, 11s, 13s). These never sync, producing infinite organic variation. NOT more frames -- independent channels.
- **Outcome:** SUCCESS -- competitive landscape fully mapped.

#### Research Phase: Cuteness Science (First Principles)
- **Approach:** Academic literature search on what makes faces cute (Kindchenschema, baby schema).
- **Sources:** Sato et al. 2022, Glocker et al. 2009, Borgi et al. 2014, Kawaguchi et al. 2024, Humphrey et al. 2020.
- **Key findings:**
  - Lower eye position = cuter (NOT big forehead) -- Sato 2022
  - Eye-to-face width ratio ~21% matters, not absolute eye size -- Glocker 2009
  - Kittens have 17% wider faces than adult cats -- Borgi 2014
  - Small nose + mouth = cuter -- Glocker 2009
  - Deterministic loops detected in 2-3 cycles by human perception
  - Ears outperform tail for emotional signaling (p < 0.0001)
  - Slow blink = feline affection signal -- Humphrey 2020
  - Tail-up = greeting (97.8% of approaches) -- observational study
  - 1px white eye catchlight = biggest "alive" signal per pixel
- **Outcome:** SUCCESS -- all findings codified into CHARACTER-PROFILE.md.

#### Killed Assumptions
| Assumption | Reality | Evidence |
|-----------|---------|----------|
| "More realistic = better" | Realism and cuteness are OPPOSED at 32x32 | Kindchenschema ratios vs anatomical ratios |
| "Big forehead = cute" | Forehead height doesn't drive cuteness; lower eye position does | Sato et al. 2022 |
| "Big eyes = cute" | It's eye-to-face WIDTH RATIO, not absolute size | Kawaguchi et al. 2024 |
| "More animation frames = more alive" | Independent layered channels > scripted sequences | PF Magic Petz docs, Comnyang analysis |
| "Need to beat comnyang's art" | Context-awareness (coding hooks) is the moat; art needs good-enough | No competitor integrates with coding tools |
| "Tail is main expressive feature" | Ears outperform tail statistically (p < 0.0001) | 254-interaction observational study |

#### Deliverable: Character Design Bible
- Created `docs/CHARACTER-PROFILE.md` (370 lines).
- **Outcome:** SUCCESS

---

## TESTS RUN & RESULTS

### Test: GIF Recording Pipeline (First Run)
- **Command:** `pkill -f "electron.*coding" 2>/dev/null; npm run record`
- **Result:** FAILED -- 7/8 GIFs looked identical to idle
- **Output:** 8 GIF files produced, correct sizes, but only idle.gif was visually correct
- **Interpretation:** Multiple runtime interference bugs (cursor tracking, activity watcher, timer leaks, stale canvas)

### Test: GIF Recording Pipeline (After Fixes)
- **Command:** `pkill -f "electron.*coding" 2>/dev/null; npm run record`
- **Result:** PASSED
- **Output:**
  ```
  Recording 8 states at 15fps...

    idle (3000ms)... 45 frames, 25.1 KB
    looking (3000ms)... 45 frames, 25.0 KB
    kneading (2000ms)... 30 frames, 17.2 KB
    stretching (3500ms)... 53 frames, 31.9 KB
    agent-thinking (4000ms)... 60 frames, 33.0 KB
    agent-done (2800ms)... 42 frames, 33.0 KB
    sleeping (5000ms)... 75 frames, 24.2 KB
    waking (1500ms)... 23 frames, 11.6 KB

  Done! GIFs in /Users/sahana.manjunath/Side Quests/coding kitty/assets/recordings
  ```
- **Interpretation:** All 8 GIFs visually distinct and showing correct animations. Verified by visual inspection of each file.

### Test: electron-vite Build (Part of Recording)
- **Command:** `electron-vite build` (runs as first step of `npm run record`)
- **Result:** PASSED
- **Interpretation:** All source changes (recording bridge, record mode guards) compile without errors.

### No Automated Test Suite
- Same as prior session: no unit tests, integration tests, or E2E tests exist.
- `scripts/drive.mjs` remains stale and nonfunctional.

---

## RESEARCH & INVESTIGATIONS

### Research: Desktop Pet Competitive Landscape
- **Question:** What makes other desktop pets feel alive and why does ours feel dead?
- **Sources:** Comnyang (Mac App Store, $3.90), Shimeji (open source), Desktop Goose, VPet-Simulator, Neko (1988)
- **Findings:**

| App | Size | Art Style | Idle Behavior | Alive Rating |
|-----|------|-----------|---------------|-------------|
| Comnyang | 100px (60-240 configurable) | SVG vector | 5 async ambient loops at prime intervals (3.5s, 4s, 8s, 11s, 13s) | 9/10 |
| Shimeji | 128x128 | Chibi digital | 57 weighted-random behaviors | 8/10 |
| Desktop Goose | ~70x90 | Procedural | Never rests -- escalating chaos | 9/10 |
| VPet-Simulator | ~500x500 | Anime chibi | Full Tamagotchi stats | 8/10 |
| Neko (1988) | 32x32 | 1-bit pixel | Narrative idle: sit-scratch-wash-yawn-sleep | 7/10 |
| **Our Coding Kitty** | 42x51 drawn | Procedural rectangles | Tail sine + blink only | **2/10** |

- **How it affected our approach:** Confirmed that the fix is behavioral, not artistic. Comnyang's "alive" secret is 5 independent oscillators, not better art. This means we can go from 2/10 to 7/10 without touching art assets.

### Research: Cuteness Science (Kindchenschema / Baby Schema)
- **Question:** What proportions and features make a face cute at pixel-art scale?
- **Sources:** Sato et al. 2022, Glocker et al. 2009, Borgi et al. 2014, Kawaguchi et al. 2024, Humphrey et al. 2020, PF Magic/MIT Petz documentation
- **Findings:** See "Cuteness Science" table in the user request above -- 9 findings with academic citations.
- **How it affected our approach:** Drove the proportion guide (head wider than tall, eyes below center, 3px eyes on 14px head), color palette (green iris instead of solid dark), and animation architecture (independent channels, slow blink cycle).

### Research: Feline Behavioral Ethology
- **Question:** What behavioral patterns distinguish a cat from a dog or generic mascot?
- **Sources:** Humphrey et al. 2020 (slow blink study), observational studies on cat approach behavior
- **Findings:**
  - Slow blink = affection signal (proven to work on stranger cats)
  - Tail-up = greeting (97.8% of cat-human approaches)
  - Ears = primary expressive channel (p < 0.0001 vs tail)
  - Selective attention: 100-350ms perception delay before reaction, 10% chance of ignoring minor events
- **How it affected our approach:** Added selective attention delay to design spec, slow blink cycle, tail-up reserved for celebration only, ears promoted to primary animation channel.

### Research: GIF Encoding with Transparency
- **Question:** How to produce transparent-background GIFs from canvas pixel data?
- **Sources:** gifenc npm package documentation
- **Findings:**
  - `gifenc` is a CJS module despite being on npm -- requires default import pattern
  - Transparency via chroma key: replace transparent pixels with magenta (#FF00FF), quantize palette, find closest palette entry to magenta, set as `transparentIndex`
  - `dispose: 2` (restore to background) required per frame for transparent GIFs
  - Per-frame palette quantization (256 colors) handles the small color count well

---

## DISCOVERIES & SURPRISES

1. **Cursor tracking fires every 16ms and wakes sleeping cat instantly.** The main process `startCursorTracking()` sends `cursor-pos` IPC messages at 60fps. The renderer's `onCursorPos` handler calls `fsm.onMouseActivity()` on every single message. This means a sleeping cat wakes within 16ms of entering the sleep state -- the state is essentially unreachable during normal cursor movement. This is a design issue (not just a recording bug): users who leave their mouse still for 5 minutes to trigger sleep will see it wake the instant they touch the mouse, which is correct behavior, but the recording context revealed how aggressive the interaction is.

2. **FSM timer leaks are invisible during normal operation.** When transitioning between states, timers from the previous state (`keyTimer`, `sleepTimer`, `wakeTimer`) continue running. In normal use, these produce brief visual glitches. In recording (rapid state switching with no cleanup), they produce total corruption. The `resetFsm()` function created for recording is also useful as a debugging aid.

3. **Comnyang's entire "alive" technique is 5 oscillators with prime intervals.** Not more frames, not better art, not complex state machines. Five sine waves with non-harmonically-related periods (3.5s, 4s, 8s, 11s, 13s) produce infinite organic variation because they never sync. This is the single most actionable insight from the competitive analysis.

4. **Eye catchlight (1px white dot) is the highest impact-per-pixel change possible.** A single white pixel in each eye transforms a dead rectangle into something that reads as "alive." This takes 2 lines of code to add to `drawFace()`.

5. **Kneading duration (800ms) is too short to register visually.** At 800ms, the kneading animation barely completes one cycle before returning to idle. The research recommends 1600-2000ms. This is a single constant change in `state-machine.ts`.

6. **Three states are visually identical to idle.** `looking`, `stretching`, and `waking` all render the same as `idle` (with minor differences in eye offset for looking and spring physics for stretching/waking). 37.5% of the state space is wasted on visual duplicates. The storyboards in CHARACTER-PROFILE.md spec distinct poses for each.

7. **The current cat is literally rectangles.** `rect(ctx, 8, 10, 12, 12, BODY)` -- the body is a perfect 12x12 square. The sleeping pose is a featureless tan rectangle. Between blinks, the cat is a STATIC SCREENSHOT. This is why it rates 2/10.

8. **`page.evaluate()` runs as a microtask before rAF.** When you call `page.evaluate(() => canvas.getImageData(...))` in Playwright against an Electron renderer, the evaluation runs synchronously before the next requestAnimationFrame callback paints. This means the first frame after a state change captures stale content. Solution: sleep one frame interval before first capture.

---

## DECISIONS LOG

### Decision: Playwright + In-Process Capture Over Screen Recording
- **Decision made:** Capture canvas frames via `ctx.getImageData()` inside the Electron process using Playwright automation, rather than using macOS screen recording or screenshot tools.
- **Alternatives considered:** (a) macOS `screencapture` command, (b) Playwright `page.screenshot()`, (c) manual screen recording
- **Reasoning:** Screen capture requires Accessibility permission (blocked on corporate macOS). `page.screenshot()` captures the full window including transparent areas, making transparency extraction unreliable. `getImageData()` gives exact pixel data with alpha channel intact.
- **Trade-offs:** More complex script. Jitter from IPC overhead (imperceptible at 15fps pixel art). Requires building before recording (`electron-vite build`).
- **Reversibility:** Easy -- the recording script is standalone. Any recording approach can replace it.

### Decision: Magenta Chroma Key for GIF Transparency
- **Decision made:** Replace transparent pixels (alpha < 128) with magenta (#FF00FF) before GIF encoding, then set the nearest palette entry as the transparent index.
- **Alternatives considered:** (a) Use alpha channel directly (GIF doesn't support partial transparency), (b) use a different key color
- **Reasoning:** GIF supports only 1-bit transparency (fully transparent or fully opaque). Magenta is maximally distant from the cat's orange-brown palette, minimizing false matches during quantization.
- **Trade-offs:** If the cat ever uses magenta, the recording will have holes. Acceptable for pixel art.
- **Reversibility:** Change `KEY_R`, `KEY_G`, `KEY_B` constants.

### Decision: Direct `_state` Assignment Over FSM Methods for Recording
- **Decision made:** Set `window.__kittyFsm._state = 'kneading'` directly instead of calling `fsm.onFileSaved()` in the recording script.
- **Alternatives considered:** (a) Call FSM methods and manage competing timers, (b) add a "recording mode" to the FSM itself
- **Reasoning:** FSM methods start timers that interfere with recording. Direct assignment is simpler and fully sufficient when all external inputs (cursor tracking, activity watcher) are disabled.
- **Trade-offs:** Bypasses FSM validation logic. If FSM internals change (e.g., new fields that need initialization), the recording script must be updated manually.
- **Reversibility:** Can switch back to FSM methods if a recording mode is added to StateMachine.

### Decision: Behavioral Fixes Before Art (Items 1-7 Before Item 8)
- **Decision made:** Implement breathing, catchlights, async channels, random idles, eye redesign, proportions, and transitions on the existing procedural renderer BEFORE commissioning sprite art.
- **Alternatives considered:** (a) Commission artist first and rebuild renderer, (b) do both simultaneously
- **Reasoning:** Behavioral fixes work on existing code, need zero art assets, and can bring the cat from 2/10 to 7-8/10. Sprites should match the proven behavior, not drive it. Shipping behavior first also lets us test what "feels right" before locking down sprites.
- **Trade-offs:** More rework if proportions change significantly between procedural and sprite versions.
- **Reversibility:** All behavioral changes (oscillators, channels) transfer directly to a sprite-based renderer.

### Decision: 10-Color Palette (Replacing 7-Color)
- **Decision made:** Expand from 7 to 10 colors: add Fur Deep Shadow (#9a6228), Fur Highlight (#ffe4a8), Eye Iris (#3a6e3a green), Eye Highlight (#ffffff). Replace Pupil/Line (#3a2a1a -> #2a1a0a) and Whisker (#bbb -> #a08060).
- **Reasoning:** Green iris adds character. White catchlight is the biggest "alive" signal. Shadow/highlight pair enables sel-out outlining (soft edges without hard black outlines). Current dark-brown eyes are dead rectangles.
- **Trade-offs:** More complex palette management. White (#ffffff) used ONLY for eye catchlights.
- **Reversibility:** Color constants are defined at top of `cat-renderer.ts`.

### Decision: 32x32 Cat in 48x48 Bounding Box for Sprite Sheet
- **Decision made:** Keep cat at 32x32 logical pixels, but use 48x48 cells in the sprite sheet (8px margin all around).
- **Reasoning:** 8px margin accommodates particle overflow, tail swing, ear perk, and celebration effects without clipping. The charm comes from constraint -- going bigger (e.g., 64x64) would require fundamentally different art.
- **Reversibility:** Sheet layout is documented in CHARACTER-PROFILE.md. Can redesign.

---

## ENVIRONMENT & SETUP

- **Working directory:** `/Users/sahana.manjunath/Side Quests/coding kitty`
- **Node.js:** v24.13.0
- **npm:** 11.6.2
- **Electron:** v38.8.6 (package.json: `^38.2.0`)
- **electron-vite:** v3.x
- **electron-builder:** v25.x
- **TypeScript:** v5.x
- **Playwright-core:** v1.61.1
- **gifenc:** v1.0.3 (CJS module -- devDependency)
- **Python:** 3.x (system Python, for gen-icon.py only)
- **macOS:** Darwin 25.5.0 (macOS Tahoe)
- **Git:** main branch, tracking origin/main
- **GitHub:** https://github.com/5ahanaBM/coding-kitty (SSH: `git@github.com:5ahanaBM/coding-kitty.git`)
- **Key constraint:** Corporate managed macOS -- no admin access, no Accessibility permission

### How to Run
```bash
# Normal operation
pkill -f "electron.*coding" 2>/dev/null
cd "/Users/sahana.manjunath/Side Quests/coding kitty"
npm run dev

# GIF recording
pkill -f "electron.*coding" 2>/dev/null  # MUST kill existing instance (port 23456 conflict)
npm run record  # builds + records all 8 GIFs to assets/recordings/
```

---

## IN-PROGRESS / INCOMPLETE WORK

1. **All changes are UNCOMMITTED.** `git status` shows 4 modified files (package.json, package-lock.json, src/main/index.ts, src/renderer/src/main.ts) and 3 untracked paths (assets/, docs/CHARACTER-PROFILE.md, scripts/record-gifs.mjs). Need to stage and commit before proceeding.

2. **Behavioral "alive" fixes not yet implemented.** The CHARACTER-PROFILE.md specifies 7 tiers of procedural improvements. None have been coded yet. The design is complete; implementation is the next session's work.

3. **GIFs need re-recording after behavioral fixes.** Once breathing, catchlights, and async channels are added, re-run `npm run record` to capture improved animations.

---

## OPEN QUESTIONS & BLOCKERS

### Blockers (must resolve before proceeding)
None. All work is unblocked.

### Open Questions (need answers but not blocking)

1. **Selective attention delay (100-350ms) might feel laggy.** The design calls for a perception delay before the cat reacts to events. This could feel broken rather than organic. Needs playtesting before committing to the approach.

2. **10-color palette untested against real backgrounds.** The palette in CHARACTER-PROFILE.md was designed theoretically. The silhouette test (solid fill against white, dark theme, wallpaper, black) hasn't been performed.

3. **Proportion rebalance (wider head, lower eyes) is a significant change.** Current head is a 10x10 square. Profile calls for 14x10 (wider than tall). This changes the entire face layout. Worth prototyping before committing.

4. **Kneading duration extension (800ms to 1600-2000ms) needs FSM change.** The `KNEADING_TIMEOUT` constant in `state-machine.ts` must be updated. This is a 1-line change but affects the feel of the interaction -- may need tuning.

5. **Artist budget ($400-1000) is from web research, not quotes.** Actual quotes may differ significantly based on complexity and revision rounds.

6. **Should the recording script be more robust?** Currently hardcodes the macOS Electron binary path. Won't work on other platforms. Not a blocker since the project is macOS-only, but noted.

---

## NEXT STEPS (PRIORITIZED)

### Immediate (do first)

1. **Commit all uncommitted changes.** Stage the 4 modified files and 3 new paths. Two logical commits: (a) `feat: add GIF recording pipeline for all 8 cat states` covering package.json, package-lock.json, src/main/index.ts, src/renderer/src/main.ts, scripts/record-gifs.mjs, assets/recordings/. (b) `docs: add character design bible with cuteness research and animation architecture` covering docs/CHARACTER-PROFILE.md. No Co-Authored-By in commit messages.

2. **Implement Tier 1: Breathing oscillator.** In `cat-renderer.ts`, add a time-based sine oscillator to the `draw()` method that bobs the body 0.5px vertically on a 3-5s cycle (period randomized +/-20% per cycle). Apply via `ctx.translate(0, breathOffset * P)` inside the transform block. This is the highest-leverage "alive" signal -- takes 30 minutes. Location: inside `draw()`, after `ctx.translate(-48, -96)` (line 121), before the state dispatch.

3. **Implement Tier 2: Eye catchlights.** In `drawFace()`, after drawing each eye rectangle, add `px(ctx, 11 + eo.x, eyeY + eo.y, '#ffffff')` and `px(ctx, 16 + eo.x, eyeY + eo.y, '#ffffff')` for 1px white highlight in upper-right of each eye. Takes 15 minutes.

4. **Implement Tier 3: Async ambient channels.** Add 4 independent oscillators as class fields on CatRenderer, each with its own timer and randomized period:
   - Breath: 3-5s, body y +/-0.5px (already done in step 2)
   - Ear twitch: 8-20s, one random ear shifts 1px for 300ms
   - Weight shift: 12-25s, body x +/-1px
   - Blink: Convert existing frame-counter blink to time-based, add 30-60s slow blink when cursor nearby
   All channels run in ALL states. Takes 2 hours.

### After that

5. **Implement Tier 4: Random idle micro-behaviors.** Add a behavior queue system that fires randomly during idle: yawn (head tilt back, mouth open 1px, 800ms), ear scratch, weight shift. 10% chance of ignoring minor events (selective attention). Takes 4 hours.

6. **Implement Tier 5: Real eye tracking.** Replace solid dark-brown eye blocks with sclera + movable 1px pupil. Sclera is the new Fur Base color, pupil is the new Pupil/Line color, iris is the new green. Cursor distance modulates pupil position within the 3x3 eye area. Takes 2 hours.

7. **Re-record GIFs.** After behavioral fixes, run `npm run record` to capture improved animations. Compare side-by-side with originals.

8. **Extend kneading and waking durations.** In `state-machine.ts`, change `KNEADING_TIMEOUT` from 800 to 1600-2000ms. In `enterWaking()`, change the timeout from 200 to 450ms.

### Eventually (lower priority)

9. **Proportion rebalance.** Wider head (14px), lower eyes (below center), narrow jaw. This is the biggest visual change and may require adjusting all draw methods.

10. **Commission pixel artist.** Use the artist brief in CHARACTER-PROFILE.md. Source from itch.io, Fiverr, Lospec Discord, r/PixelArt. Budget $400-1000.

11. **Implement sprite-based renderer.** Hybrid approach: sprites for body, keep procedural particles/physics. Use `animations.json` schema from CHARACTER-PROFILE.md.

12. **Phase 5 features** (from prior handoff): Coding DNA, Struggle Detector, Flow State Guardian, Context Preserver, Emotional State Machine.

---

## APPENDIX: WHY OUR CAT LOOKS ROBOTIC (7 Specific Failures)

The competitive analysis rated our cat 2/10 on an "alive" scale. Here is exactly WHY, point by point:

1. **It is literally rectangles.** `rect(ctx, 8, 10, 12, 12, BODY)` draws a perfect 12x12 square for the body. The sleeping pose (`drawSleeping()` at line 311) is a featureless tan rectangle. No roundness, no organic shape, no contour.

2. **Zero idle life.** Between blinks, the cat is a STATIC SCREENSHOT. The only continuous motion is `this.tailAngle = Math.sin(this.frame * 0.05) * 3` (line 107) -- a single sine wave on the tail. Comnyang runs 5 simultaneous independent loops. We run 1.

3. **Dead eyes.** Eyes are 3x3 dark-brown squares (`rect(ctx, 10 + eo.x, eyeY + eo.y, 3, 3, EYE_OPEN)` at line 197). No sclera, no iris, no catchlight. The `#6a5a4a` highlight pixel (line 199) is too close in value to `#3a2a1a` to register visually. Eye tracking shifts a flat-color block imperceptibly because the eye is a single solid color with no internal structure.

4. **Three fake states.** `looking`, `stretching`, and `waking` are visual duplicates of idle. Looking only shifts eye offset by 1px (invisible against dark-brown eyes). Stretching uses idle pose with spring physics. Waking uses idle pose with spring physics. 37.5% of the 8-state space is wasted.

5. **Teleportation.** Sleeping to waking is one frame: sleeping (curled rectangle) -> next frame upright (idle pose with spring bounce). Zero anticipation, zero follow-through. The waking animation in CHARACTER-PROFILE.md specs a 4-frame 450ms sequence (eyes still closed -> eyes half-open + big stretch -> eyes full open + ears pop -> head shake).

6. **No personality.** Cat NEVER initiates behavior. It sits motionless until an external event forces a state change. No random yawns, no weight shifts, no ear twitches, no curiosity. It's a reactive display, not a character.

7. **Flat color.** 7 shades of orange-brown (`BODY=#f5c27a`, `DARK=#c8853a`, `EYE_OPEN=#3a2a1a`, `EYE_CLOSED=#3a2a1a`, `NOSE=#e88a9a`, `WHISKER=#bbb`, `STRIPE=#d4a45a`). No outlines. No highlights. No shadows. No sel-out technique. The cat has no visual depth.

---

## APPENDIX: THE FIX PATH (Detailed Implementation Plan)

This is the concrete plan for going from 2/10 to 8.5/10. Items 1-7 work on the EXISTING procedural renderer in `cat-renderer.ts`. No art assets needed.

### Tier 1: Breathing Oscillator (30 min, 2->4)
- **What:** Add body y +-0.5px sine oscillator to `draw()`. Period 3-5s, randomized +-20% per cycle.
- **Where:** `cat-renderer.ts`, new field `breathPeriod`, applied in `draw()` after anchor translation (line 121).
- **Technical:** `const breathY = Math.sin(now * 2*PI / breathPeriod) * 0.5; ctx.translate(0, breathY * P)`
- **Why it works:** A still body = dead. A breathing body = alive. Single biggest leverage point.

### Tier 2: Eye Catchlights (15 min, 4->4.5)
- **What:** Add 1px white (#ffffff) highlight in upper-right of each 3x3 eye.
- **Where:** `cat-renderer.ts`, `drawFace()` method, after each eye rect (lines 197-201).
- **Technical:** `px(ctx, 11 + eo.x, eyeY + eo.y, '#ffffff')` for left eye, `px(ctx, 16 + eo.x, eyeY + eo.y, '#ffffff')` for right eye.
- **Why it works:** A single bright pixel reads as "light reflecting in a wet eye." Biggest alive signal per pixel in all of pixel art.

### Tier 3: Async Ambient Channels (2 hrs, 4.5->6)
- **What:** 4 independent time-based oscillators running in ALL states simultaneously:
  - Ear twitch: 8-20s random interval, one ear shifts 1px up for 300ms, which ear is random
  - Weight shift: 12-25s random interval, body x +-1px, direction random
  - Blink: Convert from frame counter to time-based, add 30-60s slow blink cycle when cursor nearby
  - Tail speed/amplitude: Varies by state (faster in kneading, slower in sleeping)
- **Where:** `cat-renderer.ts`, new class fields for each channel timer, applied in `draw()`.
- **Why it works:** Independent channels with non-harmonic periods never sync = infinite organic variation. This is Comnyang's entire secret.
- **Key detail:** Use prime-ish intervals (like 3.5/4/8/11/13) so channels drift relative to each other. Never use exact multiples.

### Tier 4: Random Idle Micro-Behaviors (4 hrs, 6->7)
- **What:** Behavior queue that fires during idle state:
  - Yawn: head tilts back 1px, mouth opens 1px, 800ms duration, every 45-90s
  - Weight redistribution: body leans 1px left or right, holds 2-5s, returns
  - Head tilt: 1px toward last activity direction, holds 1-3s
  - Ear scratch: one paw reaches up, 3-frame cycle, 600ms, every 2-5 minutes
- **Where:** `cat-renderer.ts`, new `idleBehaviorQueue` system.
- **Why it works:** Breaks the "nothing is happening" dead time that makes up 80% of screen time.

### Tier 5: Real Eye Tracking (2 hrs, 7->7.5)
- **What:** Replace solid dark eyes with structured eyes: sclera (Fur Base), iris (green #3a6e3a), pupil (1px dark #2a1a0a), catchlight (1px white). Pupil moves within 3x3 area based on cursor position.
- **Where:** `cat-renderer.ts`, rewrite `drawFace()` eye section.
- **Why it works:** Movable pupil within a visible iris makes eye tracking visible. Current solid-color eyes make tracking invisible.

### Tier 6: Proportion Rebalance (1 day, 7.5->8)
- **What:** Head wider than tall (14x10 instead of 10x10). Eyes at row 6-7 (below center, not at center). Jaw narrows below cheeks. Nose 2x1px. No visible neck. Legs 3-4px thick (kitten proportions).
- **Where:** `cat-renderer.ts`, rewrite `drawBody()`, `drawEars()`, `drawFace()`, `drawSleeping()`, all draw methods.
- **Why it works:** Kindchenschema compliance. Current square head violates every cuteness research finding.

### Tier 7: Transition Animations (1 day, 8->8.5)
- **What:** Multi-frame transitions between states:
  - Wake: 4 frames over 450ms (eyes closed + uncurl -> eyes half-open + stretch -> eyes full + ears up -> head shake)
  - Sleep entry: gradual curl over 2s (not instant)
  - Agent-done: anticipation-peak-squash hop cycle (100ms crouch, 80ms launch, 200ms peak HOLD, 80ms descend, 150ms land+squash)
  - Kneading: 4-frame paw cycle at 150ms/frame, 1600-2000ms total duration
- **Where:** `cat-renderer.ts` + `state-machine.ts` (duration constants).
- **Why it works:** Removes teleportation. Anticipation + follow-through = Disney's 12 principles.

### Tier 8: Sprite Sheet (1 week+, 8.5->9+)
- **What:** Commission pixel artist for hand-drawn 32x32 sprites. Replace procedural fillRect with sprite blitting.
- **Where:** New sprite renderer, sprite sheet PNG, `animations.json`.
- **Why it works:** Professional art replaces programmer rectangles.
- **Prerequisite:** Tiers 1-7 should be done first so the artist can see the proven behavior.

---

## APPENDIX: RECORDING SCRIPT ARCHITECTURE

### `scripts/record-gifs.mjs` Key Functions

- **`main()`** (line 228): Launches Electron with `KITTY_RECORD=1`, waits 3s for window, verifies recording bridge exists (`window.__kittyFsm`), iterates `STATES` array.
- **`captureFrames(page, state)`** (line 154): Calls `resetFsm()`, sleeps 100ms for clean idle, runs `state.setup(page, captureEarly)`, waits one frame, captures remaining frames at `FRAME_MS` intervals.
- **`resetFsm(page)`** (line 116): Full FSM + renderer reset via `page.evaluate()`. Clears all 4 timers, resets state to idle, resets renderer stretch/spring/particles.
- **`grabFrame(page)`** (line 146): Gets `ctx.getImageData(0, 0, 96, 96).data` as `Array.from()` for serialization across Playwright IPC.
- **`encodeGif(frames)`** (line 185): Per-frame: replace transparent pixels with magenta, `quantize()` to 256 colors, find magenta palette index, `writeFrame()` with `transparent: true, transparentIndex, dispose: 2`.
- **`captureEarly` callback** (line 162): Passed to `state.setup()`. Allows setup to capture N frames mid-sequence (used by stretching for hold phase, waking for sleeping-before-wake frames).

### State Configurations (lines 24-113)

| State | Duration | Setup | Special |
|-------|----------|-------|---------|
| idle | 3000ms | Reset eye offset to (0,0) | -- |
| looking | 3000ms | Force `_state='looking'`, set eye offset (1,0) | -- |
| kneading | 2000ms | Force `_state='kneading'` | -- |
| stretching | 3500ms | Force `_state='stretching'`, `setStretch(1.15, 0.88)`, captureEarly(8), then release + triggerSpring(0.55) | Two-phase: hold then spring |
| agent-thinking | 4000ms | Force `_state='agent-thinking'` | -- |
| agent-done | 2800ms | Force `_state='agent-done'` | 200ms shorter than linger to avoid idle tail |
| sleeping | 5000ms | Force `_state='sleeping'`, `sleepStart = Date.now() - 5000` (pre-aged for visible depth) | -- |
| waking | 1500ms | Force sleeping with `sleepStart = Date.now() - 25000`, captureEarly(6) sleeping frames, then force `_state='waking'` | Two-phase: sleeping then wake |

---

## APPENDIX: CHARACTER-PROFILE.MD STRUCTURE

Full document at `docs/CHARACTER-PROFILE.md` (370 lines). Sections:
1. **Identity** -- Name, species, personality axes (Curious Observer / Industrious Mimic / Smug Satisfaction), anti-traits, behavioral identity (selective attention, slow blink, tail-up, ear independence, liquid weight shifts)
2. **Proportions** -- Research-backed numbers with citations. Head 10x14, eyes 3x3 at row 6-7, nose 2x1, body 12x12, legs 3-4px, ears 3x4. Silhouette test requirement.
3. **Color Palette** -- 10-color table with hex values, roles, usage rules. Sel-out outlining technique.
4. **Animation Architecture** -- Layered independent channels: Breath (3-5s), Blink (2-5s normal / 30-60s slow), Ear (8-20s), Tail (state-driven), Weight (12-25s). Implementation note: continuous oscillators, not frame-based.
5. **State Storyboards** -- All 8 states with frame counts, timing, key poses, secondary motion, particle effects.
6. **Sprite Sheet Architecture** -- 32x32 in 48x48 box, 34 frames across 11 rows, blink as overlay row, `animations.json` schema.
7. **Implementation Priority** -- 8-tier table: breathing -> blink -> ears -> selective attention -> tail -> proportions -> idle behaviors -> sprites.
8. **Artist Brief** -- 7 deliverables, requirements, sourcing, budget ($400-1000).
9. **Killed Assumptions** -- 7 assumptions overturned with evidence.

---

## APPENDIX: SPECIFIC CODE LOCATIONS FOR NEXT SESSION

These are the exact insertion points for the behavioral fixes:

### Breathing oscillator
- **File:** `src/renderer/src/cat-renderer.ts`
- **Add field:** `private breathPhase = 0` and `private breathPeriod = 4` (seconds, randomized +/-20%) after line 48
- **Add in `draw()`:** After line 121 (`ctx.translate(-48, -96)`), before the state dispatch (line 123):
  ```typescript
  const now = performance.now() / 1000
  const breathY = Math.sin(now * (2 * Math.PI / this.breathPeriod)) * 0.5
  ctx.translate(0, breathY * P)
  ```
- **Randomize period:** At each zero-crossing, set `this.breathPeriod = 3.5 + Math.random() * 1.5`

### Eye catchlights
- **File:** `src/renderer/src/cat-renderer.ts`
- **In `drawFace()` at line 198** (after drawing left eye `rect`):
  ```typescript
  px(ctx, 11 + eo.x, eyeY + eo.y, '#ffffff')
  ```
- **After line 201** (after drawing right eye `rect`):
  ```typescript
  px(ctx, 16 + eo.x, eyeY + eo.y, '#ffffff')
  ```

### Ear twitch channel
- **File:** `src/renderer/src/cat-renderer.ts`
- **Add fields:** `private earTwitchTimer = 0`, `private earTwitchSide: 'left' | 'right' = 'left'`, `private earTwitching = false`
- **In `drawEars()`:** When `earTwitching`, shift the selected ear 1px up. Hold for 300ms, then release.

---

## APPENDIX: GOTCHAS TABLE (CUMULATIVE)

All gotchas from prior handoff (`HANDOFF-2026-07-12-coding-kitty-base.md`) remain valid. New ones added:

| Gotcha | Detail |
|--------|--------|
| gifenc CJS import | `import pkg from 'gifenc'; const { GIFEncoder, quantize, applyPalette } = pkg` -- not ESM |
| Kill existing instance before recording | Port 23456 conflict. `pkill -f "electron.*coding" 2>/dev/null` before `npm run record` |
| `resetFsm()` must clear ALL timers | keyTimer, mouseTimer, sleepTimer, wakeTimer -- missing any causes state corruption in recording |
| First frame after state change needs 1 rAF delay | `page.evaluate(getImageData)` runs before rAF paints. Sleep `FRAME_MS` before first capture. |
| Electron binary path (macOS) | `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron` -- Playwright needs this for launch |
| No Co-Authored-By in commits | NEVER add Co-Authored-By or any attribution to git commit messages |
| electron-vite output dir | Outputs to `out/`, NOT `dist/`. `package.json` main: `"out/main/index.js"` |
| macOS transparency | `resizable: true` BREAKS transparency. Always `resizable: false`. |
| Always-on-top level | `setAlwaysOnTop(true, 'floating')` -- just `true` is insufficient |
| Click-through | `setIgnoreMouseEvents(true, { forward: true })` -- `forward` param critical |
| Spring zeta | Must clamp < 1 before `Math.sqrt(1 - zeta*zeta)` or NaN |
| Waking state guards | Event handlers must check `this._state !== 'waking'` before state assignment |
| BSD grep | macOS has no `-P` flag. Use POSIX-compatible flags only. |
| Port 23456 | Shared with comnyang format. EADDRINUSE silently ignored. Hooks + activity-watcher.ts must change together. |

---

## APPENDIX: IMPLEMENTATION PRIORITY TABLE (from research)

| Priority | Fix | Effort | Alive Rating Gain | Art Needed? |
|----------|-----|--------|-------------------|-------------|
| 1 | Breathing (1px body bob) | 30 min | 2 -> 4 | No |
| 2 | Eye catchlights (1px white dot) | 15 min | 4 -> 4.5 | No |
| 3 | Async ambient loops (4 oscillators) | 2 hrs | 4.5 -> 6 | No |
| 4 | Random idle micro-behaviors | 4 hrs | 6 -> 7 | No |
| 5 | Real eye tracking (sclera + movable pupil) | 2 hrs | 7 -> 7.5 | No |
| 6 | Proportion rebalance (wider head, lower eyes) | 1 day | 7.5 -> 8 | No |
| 7 | Transition animations (wake/sleep sequences) | 1 day | 8 -> 8.5 | No |
| 8 | Full sprite sheet (hand-drawn art) | 1 week+ | 8.5 -> 9+ | YES |

**Key insight: Breathing + catchlights + async loops + random idles = 2 -> 7 in under a day of code, zero art.**

---

## APPENDIX: CUTENESS SCIENCE RESEARCH TABLE (Full Findings)

| # | Finding | Source | Design Impact |
|---|---------|--------|--------------|
| 1 | Lower eye position = cuter (NOT big forehead) | Sato et al. 2022 Gaussian Process study | Eyes sit below center of head (row 6-7 of 10px head) |
| 2 | Eye-to-face width ratio ~21% matters, not absolute size | Glocker et al. 2009 (infant mean 18.5%) | 3px eyes on 14px-wide head = 21.4% |
| 3 | Kittens have 17% wider faces than adult cats | Borgi et al. 2014 | Head wider than body (14px vs 12px) |
| 4 | Small nose + mouth = cuter | Glocker 2009 parametric manipulation | Nose 2x1px, mouth 1-2px |
| 5 | Deterministic loops detected in 2-3 cycles | Perceptual psychology | Need async oscillators with randomized periods |
| 6 | Ears outperform tail for emotional signaling (p < 0.0001) | 254-interaction observational study | Ears = primary expressive channel, not tail |
| 7 | Slow blink = feline affection signal | Humphrey et al. 2020 | Add 30-60s slow blink cycle when cursor nearby |
| 8 | Tail-up = greeting (97.8% of approaches) | Cat behavioral observational study | Reserve tail-up for celebration (agent-done) only |
| 9 | 1px white eye catchlight = biggest "alive" signal per pixel | Pixel art community consensus + analysis | Add to both eyes -- only use of pure white |

---

## APPENDIX: PROPOSED 10-COLOR PALETTE

| # | Role | Hex | Current? | Usage |
|---|------|-----|----------|-------|
| 1 | Fur Base | `#f5c27a` | Keep | Main body fill |
| 2 | Fur Shadow | `#c8853a` | Keep | Under-body, shadow side |
| 3 | Fur Deep Shadow | `#9a6228` | NEW | Deepest creases, sel-out outline |
| 4 | Fur Highlight | `#ffe4a8` | NEW | Top of head, ear tips, light-facing edges |
| 5 | Stripe | `#d4a45a` | Keep | Tabby markings |
| 6 | Skin/Inner | `#e88a9a` | Keep | Nose, inner ear, paw pads |
| 7 | Eye (Iris) | `#3a6e3a` | NEW (green) | Green iris -- replaces solid dark eye |
| 8 | Pupil/Line | `#2a1a0a` | Replaces `#3a2a1a` | Pupil, outlines, closed-eye lines |
| 9 | Eye Highlight | `#ffffff` | NEW | 1px sparkle in each eye -- ONLY white use |
| 10 | Whisker/Detail | `#a08060` | Replaces `#bbb` | Whiskers, fine detail lines |

**Sel-out outlining rules:**
- Outer edge: darkened version of adjacent fill (#9a6228 for fur), NOT hard black
- Inner detail: shadow tone or omitted
- Top/light edges: NO outline -- fill meets transparent background directly (makes cat feel soft)
- Bottom/ground edges: strongest outline (grounds visually)
- This is how Stardew Valley and modern pixel art achieve "soft" vs NES-era "hard" characters

---

## APPENDIX: LAYERED CHANNEL ANIMATION SYSTEM (Comnyang's Secret)

Comnyang (the highest-rated competitor at 9/10) runs 5 independent oscillators simultaneously in ALL states. The intervals are chosen to be non-harmonically related (close to primes) so they never sync:

| Channel | Period | Effect | Randomization |
|---------|--------|--------|---------------|
| Breath | 3-5s | Body y +-0.5px sine | Period randomized +-20% per cycle |
| Blink | 2-5s normal, 30-60s slow | Eyes close/open | Interval randomized. Slow blink only when cursor nearby |
| Ear | 8-20s | One ear shifts 1px, holds 300ms | Which ear is random |
| Tail | State-driven | Speed/amplitude varies by state | Phase offset randomized on state enter |
| Weight | 12-25s | Body x +-1px | Direction, hold duration random |

**Why this works:** 5 channels x random periods = combinatorial explosion of unique moments. A viewer watching for 10 minutes never sees the exact same combination repeat. Current code runs ONE channel (tail sine). Adding 4 more with random phases = the entire "alive" upgrade.

**Implementation note:** These are NOT frame-based animations. Each is a continuous oscillator with its own clock (using `performance.now()`). The renderer composites all channels every frame. This works with BOTH the current procedural renderer and a future sprite-based one. The current blink system uses frame counting (`this.blinkTimer++` at line 98 of cat-renderer.ts) -- this must be converted to time-based for consistent behavior across frame rates.

---

## APPENDIX: PROPORTION GUIDE (32x32 Grid)

```
Total canvas: 32x32 logical pixels (rendered at SCALE=3 -> 96x96 physical)

     +-- ears: 3x4px triangular, top corners
     |
  +--+------------------+
  |    HEAD              |  10px tall x 14px wide (WIDER than tall)
  |   o    o             |  Eyes: 3x3px at row 6-7 (below center)
  |     .                |  Nose: 2x1px (small)
  |    ___               |  Jaw narrows below cheeks
  +----------------------+  NO visible neck
  |    BODY              |  12px tall x 12px wide
  |    ~~~~              |  Tabby stripes
  |                      |
  +--+------------+------+
  |  | LEGS       |      |  3-4px tall, THICK (kitten, not adult)
  +--+------------+------+
   Tail curves 6-8px from body

Head:body ratio = 1:1.2 (head almost as big as body -- kitten, not adult)
Total height: ~28px of 32px used (2px margins top/bottom)
Bounding box: 48x48 (8px margin all around for overflow: particles, tail swing, ear perk)
```

**Critical rule:** Head is WIDER than tall. Round, not square. Widest at eye level, narrowing toward chin. This is the single biggest proportion change from the current design (current head is a 10x10 square at line 186: `rect(ctx, 9, 10, 10, 8, BODY)`).

---

## APPENDIX: SELECTIVE ATTENTION SYSTEM (Cat vs Dog)

What makes a digital cat feel like a cat, not a dog or generic mascot:

- **Perception delay:** 100-350ms between event and state change. Ears orient immediately (0ms), but body/eyes respond after the "decision" delay.
- **Ignore probability:** 10% chance of ignoring minor events (file-saved, cursor movement). Cat evaluates, then decides to care or not.
- **Slow blink:** Every 30-60s when cursor is nearby. 200ms close, 300ms hold, 200ms open. Real feline affection signal (Humphrey 2020).
- **Tail-up greeting:** Tail goes vertical ONLY for agent-done (celebration) and initial cursor approach. NOT default idle position.

**WARNING:** The 100-350ms perception delay might feel laggy rather than organic. This needs playtesting before committing to the approach. Consider implementing it behind a feature flag.

---

## APPENDIX: SPRITE SHEET ARCHITECTURE (Future, for Artist Brief)

```
Cell: 48x48 pixels (32x32 cat centered, 8px margin)
Format: PNG, indexed color (10 colors max), transparent background

Row 0:  Idle            [F0] [F1]                     = 2 frames
Row 1:  Looking-Left    [F0] [F1]                     = 2 frames
Row 2:  Looking-Right   [F0] [F1]                     = 2 frames
Row 3:  Looking-Up      [F0] [F1]                     = 2 frames
Row 4:  Kneading        [F0] [F1] [F2] [F3]           = 4 frames
Row 5:  Sleeping        [F0] [F1]                     = 2 frames
Row 6:  Waking          [F0] [F1] [F2] [F3]           = 4 frames
Row 7:  Stretching      [F0] [F1] [F2]                = 3 frames
Row 8:  Agent-Thinking  [F0] [F1] [F2]                = 3 frames
Row 9:  Agent-Done      [F0] [F1] [F2] [F3] [F4] [F5] = 6 frames
Row 10: Blink Overlay   [open] [half] [closed] [half] = 4 frames

Total: 34 unique frames, sheet 288x528 px
```

Blink as overlay row = 4 frames handle ALL states (no need to double every row with blink variants).

Per-frame timing in `animations.json` (not uniform FPS):
```json
{
  "frameSize": { "w": 48, "h": 48 },
  "spriteSize": { "w": 32, "h": 32 },
  "spriteOffset": { "x": 8, "y": 8 },
  "animations": {
    "idle":            { "row": 0,  "frames": 2, "durations": [500, 333], "loop": true },
    "looking-left":    { "row": 1,  "frames": 2, "durations": [500, 333], "loop": true },
    "looking-right":   { "row": 2,  "frames": 2, "durations": [500, 333], "loop": true },
    "looking-up":      { "row": 3,  "frames": 2, "durations": [500, 333], "loop": true },
    "kneading":        { "row": 4,  "frames": 4, "durations": [150, 150, 150, 150], "loop": true },
    "sleeping":        { "row": 5,  "frames": 2, "durations": [800, 600], "loop": true },
    "waking":          { "row": 6,  "frames": 4, "durations": [100, 150, 100, 100], "loop": false },
    "stretching":      { "row": 7,  "frames": 3, "durations": [100, 200, 150], "loop": false },
    "agent-thinking":  { "row": 8,  "frames": 3, "durations": [400, 400, 400], "loop": true },
    "agent-done":      { "row": 9,  "frames": 6, "durations": [100, 100, 80, 200, 80, 150], "loop": true },
    "blink":           { "row": 10, "frames": 4, "durations": [50, 50, 50, 50], "loop": false, "overlay": true }
  }
}
```

---

## APPENDIX: ARTIST BRIEF (for Future Commissioning)

**Budget:** $400-1000 total
- Character design (model sheet + expressions + palette): $200-400
- Full sprite sheet (34 frames): $200-600

**Deliverables:**
1. Character Model Sheet -- PNG 4x scale (128x128 per pose). Front, side, 3/4. Annotated pixel-level color placement.
2. Expression Sheet -- PNG 8x scale closeup. All 8 expressions with exact pixel placement.
3. Color Palette -- .ase palette file + PNG swatch. 10 colors, named, usage-annotated.
4. Sprite Sheet -- `coding-kitty-sheet.png` 288x528px. 34 frames, indexed color, transparent background.
5. Aseprite Source -- .ase per state. Tagged frames, onion-skinning, layered (body/face/ears/tail).
6. Preview GIFs -- GIF per state at 4x scale. For review before integration.
7. `animations.json` -- Per schema above.

**Artist Requirements:**
- Demonstrated 32x32 or smaller character work (large-scale skill doesn't transfer down)
- Animation experience (frame timing, anticipation/follow-through at pixel scale)
- Kawaii/cute aesthetic (not dark/gritty pixel art)
- Aseprite proficiency (non-negotiable)

**Where to Find:**
- itch.io marketplace (filter "cat" + "32x32")
- Fiverr/Upwork ("pixel art animator")
- Lospec Discord, Pixel Art Academy Discord
- r/PixelArt commissions

---

## APPENDIX: ESTABLISHED FACTS (Proven This Session)

1. GIF recording pipeline works end-to-end: `npm run record` produces 8 valid GIFs with correct transparency.
2. Cursor tracking MUST be disabled during recording or sleeping state breaks within 16ms.
3. Activity watcher MUST be disabled during recording or file saves clobber state.
4. Direct `_state` assignment works for recording (bypasses timer setup in FSM methods).
5. `gifenc` is CJS -- needs default import pattern in ESM context.
6. Magenta chroma key (#FF00FF) works for GIF transparency with pixel art palette.
7. All 8 GIFs are visually distinct after fixes (verified by visual inspection).
8. `page.evaluate()` runs as microtask before rAF -- first frame after state change captures stale content.
9. `resetFsm()` must clear ALL four timers or state corruption occurs.
10. Comnyang uses 5 async ambient loops at prime intervals (3.5/4/8/11/13s) -- that is its entire "alive" secret.
11. Eye catchlight (1px white) is highest impact-per-pixel improvement available.
12. Breathing oscillator is highest impact-per-line-of-code improvement available.
13. Current cat rates 2/10 on alive scale. Competitors rate 6-9/10.
14. Items 1-7 of the improvement priority work on EXISTING procedural renderer. No art needed.

## ASSUMPTIONS (Unverified)

1. The 10-color palette in CHARACTER-PROFILE.md will look good against real desktop backgrounds. **Not yet tested -- silhouette test not performed.**
2. The proportion changes (wider head 14px, lower eyes) will fit within the 32x32 grid. **Designed on paper, not prototyped in code.**
3. Budget estimates for artist ($400-1000) are accurate. **Based on web research, no actual quotes obtained.**
4. Selective attention delay (100-350ms) will feel organic, not laggy. **Needs playtesting before committing.**
5. The breathing oscillator period randomization (+/-20%) will prevent detection of the loop. **Based on Comnyang analysis, not tested on our cat.**
6. `KNEADING_TIMEOUT` extension from 800ms to 1600-2000ms will feel better. **Based on research, not playtested.**
