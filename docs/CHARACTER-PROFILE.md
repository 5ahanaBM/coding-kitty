# Coding Kitty — Character Design Bible

## 1. Identity

**Name:** Coding Kitty (no personal name yet — let the community name her)
**Species:** Orange tabby kitten (not adult cat — kitten proportions are 17% wider face, stubbier limbs)
**One-liner:** A tiny orange tabby who wandered into your terminal one day and decided your code was the most interesting thing she'd ever seen.

### Personality Axes

| Axis | Position | How it shows |
|------|----------|-------------|
| **Curious Observer** (primary) | Watches your work with genuine interest | Eyes track cursor, ears orient toward activity, perks up on file saves |
| **Industrious Mimic** (secondary) | When you code, she "codes" too | Kneads on file saves (she's "typing"), thinks along during AI calls |
| **Smug Satisfaction** (tertiary) | Takes credit for agent completions | Celebration hop + head tilt on agent-done = "I did that" |

### Anti-Traits (what she is NOT)
- Not anxious or needy (no guilt, no sad faces when ignored)
- Not chaotic (no Desktop Goose disruption — she's a productivity companion)
- Not aloof (she cares, she just decides WHEN to care — she's a cat)

### Behavioral Identity: The Cat Tax

What makes a cat feel like a cat, not a dog or a generic mascot:

- **Selective attention.** Events trigger a 100-350ms perception delay before reaction. Ears orient immediately, but the cat "decides whether to care" before changing state. 10% chance she ignores minor events entirely. Dogs react instantly. Cats evaluate.
- **Slow blink.** Every 30-60s when cursor is nearby, she slow-blinks (200ms close, 300ms hold, 200ms open). This is a real feline affection signal — proven to work even on stranger cats (Humphrey et al. 2020).
- **Tail-up = greeting.** Tail goes vertical only for agent-done (celebration) and initial cursor approach. NOT default idle. 97.8% of cat-human approaches involve tail-up — it's a deliberate social signal, not a resting position.
- **Ear independence.** Each ear moves independently. Ears outperform tail for emotional signaling (Chi-squared = 22.1, p < 0.0001). 32 muscles per ear, 180° rotation range. Primary expressive channel.
- **Liquid weight shifts.** Random micro-shifts (body x ±1px, 12-25s interval) in idle. Cats redistribute weight constantly.

---

## 2. Proportions (research-backed)

All measurements in logical pixels (32x32 grid, rendered at SCALE=3 → 96x96 canvas).

### Why these numbers

| Principle | Evidence | Design consequence |
|-----------|----------|-------------------|
| Lower eye position = cuter | Sato et al. 2022 Gaussian Process study | Eyes sit below center of head |
| Eye width / face width ~21% | Glocker et al. 2009 (infant mean 18.5%, pushed up for pixel grid) | 3px eyes on 14px-wide head |
| Head wider than body | Borgi 2014: kittens have 17% wider faces than adults | Head 14px wide, body 12px |
| Small nose + mouth = cuter | Glocker 2009 parametric manipulation | Nose 2x1px, mouth 1-2px |
| 1:1.2 head-to-body ratio | Gould's Mickey neotenization (head grew 13% over 50 years) | Head 10px, body 12px |

### Proportion Map

```
     ┌─ ears: 3x4px triangular, top corners
     │
  ┌──┴──────────────┐
  │    HEAD          │  10px tall × 14px wide
  │   ◉    ◉        │  Eyes: 3x3px at row 6-7 (below center)
  │     ·            │  Nose: 2x1px (small)
  │    ___           │  Jaw narrows below cheeks (Sato 2022)
  ├──────────────────┤  NO visible neck
  │    BODY          │  12px tall × 12px wide
  │    ~~~~          │  Tabby stripes
  │                  │
  ├──┬──────────┬────┤
  │  │ LEGS     │    │  3-4px tall, THICK (kitten, not adult)
  └──┴──────────┴────┘
   Tail curves 6-8px from body
```

**Critical rule:** Head is WIDER than tall. Round, not oval. Widest at eye level, narrowing toward chin. This is the single biggest proportion change from the current design (current head is a square).

### Silhouette Test

Before any detail work, the cat silhouette (solid black fill) must read as "cat" against:
- Pure white background
- VS Code dark theme (#1e1e1e)
- macOS Sequoia default wallpaper
- Pure black background

If the silhouette fails, no amount of detail saves it. Gate, not suggestion.

---

## 3. Color Palette (10 colors)

Constraints: no pure black (#000), no pure white (#fff) on body. Shadows hue-shift cool (toward brown/umber), highlights shift warm (toward cream/yellow). Never just adjust brightness.

| # | Role | Hex | Usage |
|---|------|-----|-------|
| 1 | Fur Base | `#f5c27a` | Main body fill |
| 2 | Fur Shadow | `#c8853a` | Under-body, shadow side |
| 3 | Fur Deep Shadow | `#9a6228` | Deepest creases, sel-out outline |
| 4 | Fur Highlight | `#ffe4a8` | Top of head, ear tips, light-facing edges |
| 5 | Stripe | `#d4a45a` | Tabby markings |
| 6 | Skin/Inner | `#e88a9a` | Nose, inner ear, paw pads |
| 7 | Eye (Iris) | `#3a6e3a` | Green iris — more characterful than solid dark |
| 8 | Pupil/Line | `#2a1a0a` | Pupil, outlines, closed-eye lines |
| 9 | Eye Highlight | `#ffffff` | 1px sparkle in each eye — ONLY use of white |
| 10 | Whisker/Detail | `#a08060` | Whiskers, fine detail lines |

### Sel-Out Outlining (no hard black outlines)

- **Outer edge:** darkened version of adjacent fill (`#9a6228` for fur)
- **Inner detail:** shadow tone or omitted
- **Top/light edges:** NO outline — fill meets transparent background directly (makes cat feel soft)
- **Bottom/ground edges:** strongest outline (grounds visually)

This is how Stardew Valley and modern pixel art achieve "soft" vs NES-era "hard" characters.

---

## 4. Animation Architecture: Layered Independent Channels

**Core insight (from PF Magic/MIT Petz research + first-principles analysis):**
Deterministic loops are detected by the brain in 2-3 cycles. The solution is NOT more frames — it's independent oscillators that combine into unpredictable patterns.

### Channel System (all run simultaneously, all states)

| Channel | Period | Effect | Randomization |
|---------|--------|--------|---------------|
| **Breath** | 3-5s | Body y ±0.5px sine | Period randomized ±20% per cycle |
| **Blink** | 2-5s normal, 30-60s slow | Eyes close/open | Interval randomized. Slow blink only when cursor nearby |
| **Ear** | 8-20s twitch | One ear shifts 1px, holds 300ms | Which ear, timing, both random |
| **Tail** | State-driven speed | Oscillation amplitude/frequency | Phase offset randomized on state enter |
| **Weight** | 12-25s | Body x ±1px | Direction, hold duration random |

5 independent channels with random phase → combinatorial variety that never repeats perceptibly. Current code runs ONE animation per state — this is the single biggest "alive" upgrade.

**Implementation note:** These are NOT frame-based animations. Each is a continuous oscillator with its own clock. The renderer composites all channels every frame. This works with BOTH the current procedural renderer and a future sprite-based one.

---

## 5. State Storyboards

### Global Rules
- Breath channel active in ALL states except agent-done (hop overrides)
- Blink active in ALL awake states
- Ear channel always running (state sets base position, twitches overlay)

### IDLE (80% of screen time — most important state)

```
Pose:       Sitting upright, tail low curve right
Eyes:       Open 3x3, green iris, 1px white highlight
Ears:       Upright, occasional 1px twitch (8-20s)
Tail:       Slow sinusoidal wag, 3px amplitude, ~3s period
Breath:     Body bobs 0.5px vertical, 3-5s cycle
Extras:     Weight shift ±1px every 12-25s
            Occasional yawn (head tilts back, mouth opens 1px, 800ms)
Duration:   Indefinite until event
```

### LOOKING (cursor tracking)

```
Pose:       Same sitting, head tilts 1px toward cursor
Eyes:       Pupils shift 1px toward cursor direction
            If cursor far: eyes widen to 2x3 (surprise/interest)
Ears:       Both rotate 1px toward cursor
Tail:       Slightly faster wag (alertness)
Transition: Head tilt + ear rotate happen together (100ms ease)
Duration:   2000ms after last cursor movement → idle
```

### KNEADING (file save)

```
Pose:       Slight forward lean (1px), body compresses 1px on paw-down
Paws:       Alternate up/down, 2-3px vertical travel, 150ms per frame
            4-frame cycle: L-down/R-up → both level → R-down/L-up → both level
Eyes:       Content half-lid (happy squint) — top pixel row darker
Ears:       Flatten 1px lower, 1px wider (cats do this when kneading)
Tail:       Elevated, faster wag (happy tail)
Duration:   1600-2000ms (current 800ms too short to register)
Frames:     4 per cycle, loop
```

### SLEEPING (progressive curl)

```
Pose:       Body curls tighter over sleepDepth (0→1 over 30s)
            Width 16→12, height 10→8 (current implementation good)
Eyes:       Closed: 2px horizontal line each
Ears:       Flat/relaxed
Tail:       Wrapped around body, static or near-static
Breath:     SLOWER than awake: 800ms exhale, 600ms inhale (1.4s cycle)
Z-particles: Spawn every 700ms from nose area
            Grow as they rise (8px → 12px font)
            Horizontal drift: sine wave, 2px amplitude
            Fade: 0.7 → 0 opacity over 2s
Extras:     At full depth: occasional ear flick (15-20s, dreaming)
```

### WAKING (transition, not looped)

```
Sequence (450ms total, extend from current 200ms):
  Frame 1 (100ms): Eyes still closed, body uncurls 50%
  Frame 2 (150ms): Eyes half-open (sleepy), body 75%, big stretch
  Frame 3 (100ms): Eyes full open, sitting height, ears pop up
  Frame 4 (100ms): Quick head shake (1px left-right-center)
Spring:     Current squash-stretch spring fires on frame 2 (keep)
Z-particles: Remaining Z's scatter/pop on frame 2 (break, don't fade)
```

### STRETCHING (drag + spring)

```
During drag:
  Body:     Taffy deformation proportional to velocity (current physics: keep)
  Eyes:     At stretch >1.1x: eyes go wide (surprised)
            At stretch >1.15x: squint (>_< uncomfortable but funny)
  Tail:     Goes rigid/straight (cats tense tail when held)
On release:
  Spring:   Current spring bounce (keep)
  Settle:   1-frame head shake after spring settles
  Tail:     Resumes wag
```

### AGENT-THINKING

```
Pose:       Sitting taller (puffed up with importance)
Eyes:       Wide 2x3, 1px highlight
Ears:       Alert, forward-tilted 1px
Tail:       Slow deliberate wag (0.03 frequency)
Bubbles:    Three dots, diagonal trail from right ear
            Cycle through sizes every 400ms (3-frame cycle)
            Color: rgba(220, 220, 235, 0.5) — lighter than current
Extras:     Occasional head tilt (2-3s, 1px) — "considering"
```

### AGENT-DONE (celebration — the shareable moment)

```
Hop cycle (710ms per hop, 3-4 hops over 3s):
  Frame 1-2 (100ms each): Crouch 2px
  Frame 3 (80ms): Launch
  Frame 4 (200ms HOLD): Peak — money frame, cat airborne -4px
  Frame 5 (80ms): Descend
  Frame 6 (150ms): Land, squash 1px below baseline
Eyes:       Arc eyes (^_^) — add 1px sparkle inside arcs at peak frame
Ears:       Maximum perk
Tail:       STRAIGHT UP (tail-up greeting signal). Vibrating 1px left-right
Stars:      Burst on each hop peak: 3-5 stars emit outward
            3x3px cross shape (+), gold #ffd700
            Slight gravity arc as they fade (500ms)
Final hop:  Cat lands + smug head-tilt (1px, holds 500ms → idle)
            This is the personality moment. She's saying "you're welcome."
```

---

## 6. Sprite Sheet Architecture

### Dimensions: 32x32 cat in 48x48 bounding box

Stay at 32x32 logical. The charm comes from constraint, not resolution. 48x48 bounding box gives 8px margin for particle overflow, tail swing, ear perk.

### Sheet Layout

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

Total: 34 unique frames, sheet 288×528 px
```

Blink as overlay row = 4 frames handle ALL states instead of doubling every row.

### animations.json (per-frame timing)

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

## 7. Implementation Priority

**Critical insight from first-principles:** Items 1-5 can be done on the EXISTING procedural renderer. No art assets needed. These behavior changes will do more for perceived quality than sprites.

| Priority | Change | Impact | Needs art? |
|----------|--------|--------|-----------|
| **1** | Breath cycle (body y oscillator) | Highest leverage "alive" signal | No |
| **2** | Layered blink (+ slow blink near cursor) | Feline identity, affection signal | No |
| **3** | Ear independence (twitch + state-driven base position) | Primary expressive channel per research | No |
| **4** | Selective attention delay (100-350ms before state change) | Makes cat feel like a CAT, not a dog | No |
| **5** | Tail speed variation by state + tail-up for celebration | State readability | No |
| **6** | Proportion rebalance (wider head, lower eyes, narrow jaw) | Cuteness science compliance | No (procedural) |
| **7** | Idle micro-behaviors (weight shift, yawn, head tilt) | Anti-loop, unpredictability | No |
| **8** | Sprite sheet (hand-drawn art replacing fillRect) | Visual polish | YES — needs artist |

**Ship 1-7 first. Then commission sprites that match the proven behavior.**

---

## 8. Artist Brief (when ready for sprites)

### Deliverables

| # | What | Format | Specs |
|---|------|--------|-------|
| 1 | Character Model Sheet | PNG 4x scale (128x128 per pose) | Front, side, 3/4. Annotated pixel-level color placement |
| 2 | Expression Sheet | PNG 8x scale closeup | All 8 expressions with exact pixel placement |
| 3 | Color Palette | .ase palette + PNG swatch | 10 colors, named, usage-annotated |
| 4 | Sprite Sheet | `coding-kitty-sheet.png` 288×528px | 34 frames, indexed color, transparent background |
| 5 | Aseprite Source | .ase per state | Tagged frames, onion-skinning, layered (body/face/ears/tail) |
| 6 | Preview GIFs | GIF per state at 4x scale | For review before integration |
| 7 | animations.json | JSON | Per above schema |

### Artist Requirements
- Demonstrated 32x32 or smaller character work (large-scale skill doesn't transfer down)
- Animation experience (frame timing, anticipation/follow-through at pixel scale)
- Kawaii/cute aesthetic (not dark/gritty pixel art)
- Aseprite proficiency (non-negotiable)

### Where to Find
- itch.io marketplace (filter "cat" + "32x32")
- Fiverr/Upwork ("pixel art animator")
- Lospec Discord, Pixel Art Academy Discord
- r/PixelArt commissions

### Budget
- Character design (model + expressions + palette): $200-400
- Full sprite sheet (34 frames): $200-600
- Total: $400-1000 depending on artist tier

---

## 9. Killed Assumptions

| Assumption | What it was hiding | Evidence |
|------------|-------------------|----------|
| "More realistic = better" | Realism and cuteness are mathematically opposed at 32x32 | Kindchenschema ratios vs anatomical ratios |
| "Big forehead = cute" | Forehead height doesn't drive cuteness; LOWER eye position does | Sato et al. 2022 |
| "Big eyes = cute" | It's eye-to-face WIDTH RATIO, not absolute size | Kawaguchi et al. 2024 |
| "More animation frames = more alive" | Independent layered channels > scripted sequences | PF Magic Petz docs |
| "Cat identity = pointy ears + whiskers" | Behavioral pattern (selective attention, slow blink) is stronger | Ethology studies |
| "Need to beat comnyang's art" | Context-awareness is the moat. Art needs good-enough, not best | No competitor integrates with coding tools |
| "Tail is the main expressive feature" | Ears outperform tail statistically (p < 0.0001) | 254-interaction observational study |
