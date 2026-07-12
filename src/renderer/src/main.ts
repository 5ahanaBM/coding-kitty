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

catEl.addEventListener('mouseenter', () => {
  window.kitty.setIgnoreMouse(false)
})

catEl.addEventListener('mouseleave', () => {
  if (!dragging) window.kitty.setIgnoreMouse(true, { forward: true })
})

catEl.addEventListener('mousedown', (e) => {
  dragging = true
  lastScreenX = e.screenX
  lastScreenY = e.screenY
  fsm.onDragStart()
  e.preventDefault()
})

window.addEventListener('mousemove', (e) => {
  if (!dragging) return
  const dx = e.screenX - lastScreenX
  const dy = e.screenY - lastScreenY
  window.kitty.moveWindow(dx, dy)
  lastScreenX = e.screenX
  lastScreenY = e.screenY
})

window.addEventListener('mouseup', () => {
  if (!dragging) return
  dragging = false
  fsm.onDragEnd()
  window.kitty.setIgnoreMouse(true, { forward: true })
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
renderer.start(() => fsm.state)
