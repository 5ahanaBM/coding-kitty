import { CatRenderer } from './cat-renderer'
import { StateMachine } from './state-machine'

declare global {
  interface Window {
    kitty: {
      setIgnoreMouse: (ignore: boolean, opts?: { forward: boolean }) => void
      moveWindow: (dx: number, dy: number) => void
      onCursorPos: (cb: (pos: { x: number; y: number; relX: number; relY: number }) => void) => void
      onActivityEvent: (cb: (event: { type: string; agent?: string; app?: string }) => void) => void
    }
  }
}

const canvas = document.getElementById('cat-canvas') as HTMLCanvasElement
const catEl = document.getElementById('cat') as HTMLDivElement

const renderer = new CatRenderer(canvas)
const fsm = new StateMachine()

// ── Cursor tracking → eye tracking ─────────────────────────────────────────
window.kitty.onCursorPos(({ relX, relY }) => {
  fsm.onMouseActivity()
  // Map cursor position relative to cat center to eye offset (-1..1)
  const catCx = 48 // canvas center
  const catCy = 48
  const dx = relX - catCx
  const dy = relY - catCy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > 20) {
    renderer.setEyeOffset(dx / dist, dy / dist)
  } else {
    renderer.setEyeOffset(0, 0)
  }
})

// ── Drag handling ───────────────────────────────────────────────────────────
let dragging = false
let lastScreenX = 0
let lastScreenY = 0
let totalDragPx = 0  // cumulative movement for 5px threshold
const velHistory: { x: number; y: number; t: number }[] = []

catEl.addEventListener('mouseenter', () => {
  window.kitty.setIgnoreMouse(false)
})

catEl.addEventListener('mouseleave', () => {
  if (!dragging) window.kitty.setIgnoreMouse(true, { forward: true })
})

catEl.addEventListener('mousedown', (e) => {
  dragging = true
  totalDragPx = 0
  velHistory.length = 0
  lastScreenX = e.screenX
  lastScreenY = e.screenY
  velHistory.push({ x: e.screenX, y: e.screenY, t: performance.now() })
  fsm.onDragStart()
  e.preventDefault()
})

window.addEventListener('mousemove', (e) => {
  if (!dragging) return
  const dx = e.screenX - lastScreenX
  const dy = e.screenY - lastScreenY
  window.kitty.moveWindow(dx, dy)

  totalDragPx += Math.sqrt(dx * dx + dy * dy)

  if (totalDragPx >= 5) {
    // Stretch along motion direction (taffy model)
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      const nx = dx / dist  // normalized direction
      const ny = dy / dist
      const amount = Math.min(totalDragPx / 80, 0.18)  // max 0.18 stretch
      renderer.setStretch(
        1 + Math.abs(nx) * amount,   // stretch along X if moving horizontally
        1 + Math.abs(ny) * amount    // stretch along Y if moving vertically
      )
    }
  }

  // Rolling velocity window — keep last 3 events
  velHistory.push({ x: e.screenX, y: e.screenY, t: performance.now() })
  if (velHistory.length > 3) velHistory.shift()

  lastScreenX = e.screenX
  lastScreenY = e.screenY
})

window.addEventListener('mouseup', () => {
  if (!dragging) return
  dragging = false
  fsm.onDragEnd()
  window.kitty.setIgnoreMouse(true, { forward: true })

  // Compute release velocity from rolling window
  let zeta = 0.65  // default: full jelly
  if (velHistory.length >= 2) {
    const first = velHistory[0]
    const last = velHistory[velHistory.length - 1]
    const dt = (last.t - first.t) / 1000  // seconds
    if (dt > 0) {
      const ddx = last.x - first.x
      const ddy = last.y - first.y
      const velocityPx = Math.sqrt(ddx * ddx + ddy * ddy) / dt
      // Lerp zeta: 200px/s → 0.65, 600px/s → 0.90
      const t = Math.max(0, Math.min(1, (velocityPx - 200) / 400))
      zeta = 0.65 + t * (0.90 - 0.65)
    }
  }

  renderer.triggerSpring(zeta)
})

// ── Activity events from main process (FSEvents, agent server, app detection) ─
window.kitty.onActivityEvent(({ type, agent: _agent, app: _app }) => {
  switch (type) {
    case 'file-saved':      fsm.onFileSaved();       break
    case 'agent-thinking':  fsm.onAgentThinking();   break
    case 'agent-done':      fsm.onAgentDone();        break
    case 'agent-error':     fsm.onAgentError();       break
    case 'in-code-app':     fsm.onEnteredCodeApp();   break
    case 'left-code-app':   fsm.onLeftCodeApp();      break
  }
})

// ── Start render loop ───────────────────────────────────────────────────────
renderer.start(() => ({ state: fsm.state, sleepDepth: fsm.sleepDepth }))
