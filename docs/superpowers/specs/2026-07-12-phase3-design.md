# Phase 3 Design: Drag Physics + Position Persistence + Sleep Polish

_2026-07-12_

---

## Overview

Three features:
1. Drag stretch physics — squash/stretch on drag with spring rebound
2. Position persistence — remember cat position across launches
3. Sleep animation polish — progressive curl, floating Zzz, wake-up stretch

---

## Section 1: Drag Stretch Physics

### Approach
`ctx.save() / ctx.translate(48, 96) / ctx.scale(sx, sy) / ctx.translate(-48, -96)` wraps all drawing in `CatRenderer.draw()`. Anchors squash to center-bottom of canvas. `ctx.scale` over CSS transform avoids pixel shimmer on pixel-art at non-integer scales.

### API
`CatRenderer.setStretch(sx: number, sy: number)` — called by `main.ts` on drag events, sets internal `sx/sy` fields consumed each frame by the draw loop.

### During Drag
- 5px minimum movement before squash engages
- **Stretch along motion direction, squash perpendicular** (inertia/taffy model): drag right → scaleX > 1 (wider), scaleY < 1 (shorter). Body trails behind drag point.
- Diagonal drags: decompose velocity into X/Y components, apply proportionally to scaleX/scaleY. No dominant-axis snapping.
- Range clamped to 0.82–1.18 on each axis independently

### On Release (Spring)
Damped harmonic oscillator animating `sx` and `sy` back to 1.0:

```
scale(t) = 1 + A * e^(-decay_rate * t) * cos(omega_d * t)
```

Where:
- `A` = displacement at release (squash amount)
- `t` = seconds since release
- `decay_rate = zeta * omega_0` (omega_0 = 18 rad/s fixed)
- `omega_d = omega_0 * sqrt(1 - zeta^2)`

**Velocity measurement:** rolling window of last 3 `mousemove` events, each stored as `{x, y, t}`. At `mouseup`, release velocity = `distance(history[0], history[last]) / (history[last].t - history[0].t)` in px/s. 2D magnitude. Avoids single-event noise from a slow final event before release.

Velocity-scaled damping (zeta):
- Release velocity < 200px/s → zeta = 0.65 (full jelly, ~280ms settle, 2-3 oscillations)
- Release velocity > 600px/s → zeta = 0.90 (near-critical, minimal wobble — user relocating)
- Linear interpolation between

Hard convergence: when `|sx - 1.0| < 0.02 && |sy - 1.0| < 0.02` → snap sx/sy to 1.0, mark spring inactive (`springActive = false`). Main rAF loop continues uninterrupted — only spring physics computation stops.

### Remove Stretching Draw Path
`drawBody()` special case for `'stretching'` state (lines 98–101 in cat-renderer.ts) is removed. FSM keeps `'stretching'` state for transition guards. All deformation now owned by `ctx.scale` spring.

### Sparkle Fix
`drawAgentDone()` draws sparkles after its inner `ctx.restore()` (line 234). Move sparkle drawing inside the inner `ctx.save/restore` block so sparkles squash with body during spring animation.

---

## Section 2: Position Persistence

### Config Path
`app.getPath('userData')` → `~/Library/Application Support/coding-kitty/position.json`. Electron creates the directory. No manual `mkdirSync` needed.

### Save
`savePosition(x, y)` — debounced 500ms, writes `{x, y}` JSON. Hooks into `ipcMain.on('move-window', ...)` after `win.setPosition()`.

### Load
`loadPosition()` on app startup:
1. Read file; if missing or unparseable → delete file, use bottom-right default
2. If parsed: `screen.getDisplayMatching({x, y, width: 200, height: 200})` → verify position is within that display's `workArea` bounds
3. If off all displays (monitor disconnected) → clamp to primary display work area

### Flush on Quit
`app.on('before-quit', ...)` must flush pending debounced save before `watcher.stop()` and `clearInterval(cursorInterval)`. Prevents position loss on Cmd+Q mid-debounce.

---

## Section 3: Sleep Animation Polish

### Progressive Curl
- FSM: `sleepStart` timestamp set when `_state` enters `'sleeping'`
- `get sleepDepth(): number` = `clamp((Date.now() - sleepStart) / 30000, 0, 1)` — 0→1 over 30 seconds
- `renderer.start()` callback return type expanded: `() => { state: CatState, sleepDepth: number }`
- `draw()` signature: `draw(info: { state: CatState, sleepDepth: number })`
- `drawSleeping(depth: number)` lerps body rect from current curled shape to tighter ball as depth → 1

### Floating Zzz Particles
- `CatRenderer` owns `zParticles: { y: number, opacity: number, phase: number }[]`
- While in `'sleeping'` state: new Z spawned every 700ms, floats upward ~8 logical pixels, fades over 2s
- Staggered initial phases so Zs don't all appear simultaneously on first sleep entry
- Particle removed when `opacity <= 0`
- Max ~3 alive at once (700ms spawn / 2000ms lifetime)
- Renderer manages lifecycle entirely — no FSM involvement

### Wake-Up Stretch
`'waking'` state added to `CatState` union and FSM:
- 200ms transient — auto-transitions to `'idle'`
- During `'waking'`: renderer draws idle pose. `CatRenderer` tracks `prevState`; when `state === 'waking' && prevState !== 'waking'`, fires `setStretch(0.85, 1.1)` once (vertical pop). Section 1 spring settles naturally past the state transition to idle.

**Sleeping → waking transitions** (all previously sleeping → idle):
- `onFileSaved`
- `onAgentThinking`
- `onMouseActivity`
- `onScrollActivity`

**Exempt — sleeping → stretching directly:**
- `onDragStart` — sleeping → stretching directly (no waking state). Drag spring is the wake animation; a separate waking stretch would conflict. `onDragEnd` always transitions to `'idle'` — cat stays awake after drag regardless of prior sleep state.

---

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/src/cat-renderer.ts` | `setStretch()`, spring rAF, `ctx.scale` wrap in `draw()`, remove stretching path, `drawSleeping(depth)`, Z particles, `prevState` wake detection, `'waking'` state, sparkle fix |
| `src/renderer/src/state-machine.ts` | `sleepStart`, `sleepDepth` getter, `'waking'` state + 200ms timer, transition updates, `onScrollActivity` waking path |
| `src/renderer/src/main.ts` | Drag velocity measurement, `setStretch` calls on mousemove/mouseup, spring trigger on release, callback return type expanded |
| `src/main/index.ts` | `loadPosition()` on startup, `savePosition()` debounced + hooked to move-window IPC, flush in before-quit |

---

## Non-Goals (Phase 3)

- Sprite art replacement (Phase 4+)
- Scrolling state trigger (orphaned, deferred)
- App icon / tray icon (Phase 4)
- Watched directory configuration UI (Phase 4)
