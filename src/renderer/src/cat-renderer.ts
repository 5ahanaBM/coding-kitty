// Draws a simple pixel-art cat on canvas. Placeholder until real sprites land.
// Each frame is drawn procedurally so we have something to look at immediately.

export type CatState = 'idle' | 'kneading' | 'looking' | 'sleeping' | 'waking' | 'stretching' | 'agent-thinking' | 'agent-done'

interface EyePos { x: number; y: number }

const SCALE = 3 // each "pixel" = 3x3 screen pixels
const P = SCALE  // alias

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x * P, y * P, P, P)
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x * P, y * P, w * P, h * P)
}

const BODY = '#f5c27a'
const DARK = '#c8853a'
const EYE_OPEN = '#3a2a1a'
const EYE_CLOSED = '#3a2a1a'
const NOSE = '#e88a9a'
const WHISKER = '#bbb'
const STRIPE = '#d4a45a'

export class CatRenderer {
  private ctx: CanvasRenderingContext2D
  private frame = 0
  private blinkTimer = 0
  private blinkInterval = 180 // frames
  private eyeOffset: EyePos = { x: 0, y: 0 }
  private tailAngle = 0
  private raf = 0
  private sx = 1
  private sy = 1
  private springActive = false
  private springStartTime = 0
  private springAx = 0   // initial displacement on x at release
  private springAy = 0   // initial displacement on y at release
  private springDecay = 11.7  // zeta * omega_0 = 0.65 * 18
  private springOmega = 13.7  // omega_d = 18 * sqrt(1 - 0.65^2)
  private prevState: CatState = 'idle'
  private zParticles: { y: number; opacity: number }[] = []
  private lastZSpawn = 0
  private lastTickTime = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    // Clear canvas to transparent
    this.ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  setStretch(sx: number, sy: number) {
    this.sx = Math.max(0.82, Math.min(1.18, sx))
    this.sy = Math.max(0.82, Math.min(1.18, sy))
  }

  triggerSpring(zeta: number) {
    zeta = Math.min(zeta, 0.99)
    const omega0 = 18
    this.springDecay = zeta * omega0
    this.springOmega = omega0 * Math.sqrt(1 - zeta * zeta)
    this.springAx = this.sx - 1
    this.springAy = this.sy - 1
    this.springStartTime = performance.now()
    this.springActive = true
  }

  private tickSpring() {
    if (!this.springActive) return
    const t = (performance.now() - this.springStartTime) / 1000
    const env = Math.exp(-this.springDecay * t)
    const osc = Math.cos(this.springOmega * t)
    this.sx = 1 + this.springAx * env * osc
    this.sy = 1 + this.springAy * env * osc
    if (Math.abs(this.sx - 1) < 0.02 && Math.abs(this.sy - 1) < 0.02) {
      this.sx = 1
      this.sy = 1
      this.springActive = false
    }
  }

  setEyeOffset(ox: number, oy: number) {
    this.eyeOffset = {
      x: Math.max(-1, Math.min(1, Math.round(ox))),
      y: Math.max(-1, Math.min(1, Math.round(oy)))
    }
  }

  draw({ state, sleepDepth }: { state: CatState; sleepDepth: number }) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.frame++
    this.blinkTimer++

    const blinking = this.blinkTimer > this.blinkInterval &&
                     this.blinkTimer < this.blinkInterval + 4
    if (this.blinkTimer > this.blinkInterval + 6) {
      this.blinkTimer = 0
      this.blinkInterval = 120 + Math.floor(Math.random() * 120)
    }

    this.tailAngle = Math.sin(this.frame * 0.05) * 3

    this.tickSpring()

    // Wake-up one-shot: detect first frame of 'waking' state
    if (state === 'waking' && this.prevState !== 'waking') {
      this.setStretch(0.85, 1.1)
      this.triggerSpring(0.65)
    }
    this.prevState = state

    ctx.save()
    ctx.translate(48, 96)   // anchor: canvas center-bottom
    ctx.scale(this.sx, this.sy)
    ctx.translate(-48, -96)

    if (state === 'sleeping') {
      this.drawSleeping(sleepDepth)
    } else if (state === 'waking') {
      // Draw idle pose — spring deformation handles the visual
      this.drawBody('idle')
      this.drawEars('idle')
      this.drawFace('idle', blinking)
      this.drawTail('idle')
    } else if (state === 'agent-thinking') {
      this.drawAgentThinking()
    } else if (state === 'agent-done') {
      this.drawAgentDone()
    } else {
      this.drawBody(state)
      this.drawEars(state)
      this.drawFace(state, blinking)
      this.drawTail(state)
      if (state === 'kneading') this.drawPaws()
    }

    ctx.restore()

    // Z particles drawn outside ctx.scale — they float in canvas space
    if (state === 'sleeping') {
      this.tickZParticles()
    } else {
      // Reset tick time so first frame back in sleep uses safe fallback dt
      this.lastTickTime = 0
    }
  }

  private drawBody(state: CatState) {
    const ctx = this.ctx
    // Main body blob (sitting cat ~12x14 px logical)
    rect(ctx, 8, 10, 12, 12, BODY)
    // Stripes
    rect(ctx, 10, 11, 2, 4, STRIPE)
    rect(ctx, 14, 11, 2, 4, STRIPE)
    // Sitting legs/paws
    rect(ctx, 7, 20, 4, 3, BODY)
    rect(ctx, 17, 20, 4, 3, BODY)
    // Paw details
    rect(ctx, 7, 22, 4, 1, DARK)
    rect(ctx, 17, 22, 4, 1, DARK)

  }

  private drawEars(state: CatState) {
    const ctx = this.ctx
    const bob = state === 'kneading' ? Math.sin(this.frame * 0.3) * 1 : 0
    // Left ear
    rect(ctx, 8, Math.round(6 + bob), 4, 4, BODY)
    px(ctx, 9, Math.round(7 + bob), DARK)
    // Right ear
    rect(ctx, 16, Math.round(6 - bob), 4, 4, BODY)
    px(ctx, 17, Math.round(7 - bob), DARK)
  }

  private drawFace(state: CatState, blinking: boolean) {
    const ctx = this.ctx
    const eo = this.eyeOffset

    // Head circle
    rect(ctx, 9, 10, 10, 8, BODY)

    if (state === 'sleeping') return

    // Eyes
    const eyeY = 13
    if (blinking || state === 'sleeping') {
      // Closed eyes (line)
      rect(ctx, 10 + eo.x, eyeY, 3, 1, EYE_CLOSED)
      rect(ctx, 15 + eo.x, eyeY, 3, 1, EYE_CLOSED)
    } else {
      rect(ctx, 10 + eo.x, eyeY + eo.y, 3, 3, EYE_OPEN)
      // Pupil highlight
      px(ctx, 10 + eo.x, eyeY + eo.y, '#6a5a4a')
      rect(ctx, 15 + eo.x, eyeY + eo.y, 3, 3, EYE_OPEN)
      px(ctx, 15 + eo.x, eyeY + eo.y, '#6a5a4a')
    }

    // Nose
    rect(ctx, 13, 16, 2, 1, NOSE)
    // Mouth
    px(ctx, 12, 17, DARK)
    px(ctx, 15, 17, DARK)

    // Whiskers
    ctx.strokeStyle = WHISKER
    ctx.lineWidth = 1
    ctx.beginPath()
    // Left whiskers
    ctx.moveTo(9 * P, 16 * P); ctx.lineTo(5 * P, 15 * P)
    ctx.moveTo(9 * P, 17 * P); ctx.lineTo(5 * P, 18 * P)
    // Right whiskers
    ctx.moveTo(19 * P, 16 * P); ctx.lineTo(23 * P, 15 * P)
    ctx.moveTo(19 * P, 17 * P); ctx.lineTo(23 * P, 18 * P)
    ctx.stroke()
  }

  private drawTail(state: CatState) {
    const ctx = this.ctx
    const ang = this.tailAngle
    // Tail curves from right side
    ctx.strokeStyle = BODY
    ctx.lineWidth = P * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(20 * P, 20 * P)
    ctx.quadraticCurveTo(
      (24 + ang) * P, 24 * P,
      (22 + ang * 0.5) * P, 27 * P
    )
    ctx.stroke()
    // Tail tip
    rect(ctx, Math.round(21 + ang * 0.3), 26, 3, 2, DARK)
  }

  private drawPaws() {
    const ctx = this.ctx
    const bob = Math.sin(this.frame * 0.4)
    // Front paws kneading motion
    rect(ctx, 8, Math.round(21 + bob), 4, 2, BODY)
    rect(ctx, 16, Math.round(21 - bob), 4, 2, BODY)
  }

  private drawAgentThinking() {
    const ctx = this.ctx
    // Cat watching intently — alert posture, wide eyes
    this.drawBody('idle')
    this.drawTail('idle')
    // Ears perked up
    rect(ctx, 8, 4, 4, 5, BODY)
    px(ctx, 9, 5, DARK)
    rect(ctx, 16, 4, 4, 5, BODY)
    px(ctx, 17, 5, DARK)
    // Face
    rect(ctx, 9, 10, 10, 8, BODY)
    // Wide alert eyes (bigger than normal)
    rect(ctx, 10, 12, 4, 4, EYE_OPEN)
    px(ctx, 10, 12, '#6a5a4a')
    rect(ctx, 15, 12, 4, 4, EYE_OPEN)
    px(ctx, 15, 12, '#6a5a4a')
    // Nose + mouth
    rect(ctx, 13, 16, 2, 1, NOSE)
    // Thought bubbles (animated)
    const bubbleFrame = Math.floor(this.frame / 20) % 3
    ctx.fillStyle = 'rgba(200,200,220,0.8)'
    for (let i = 0; i <= bubbleFrame; i++) {
      const r = (i + 1) * 1.5
      ctx.beginPath()
      ctx.arc((23 + i * 4) * P, (8 - i * 2) * P, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawAgentDone() {
    const ctx = this.ctx
    // Cat celebrating — little hop, happy face
    const hopY = Math.abs(Math.sin(this.frame * 0.3)) * -3
    ctx.save()
    ctx.translate(0, hopY * P)
    this.drawBody('idle')
    this.drawEars('idle')
    // Big happy eyes (^_^)
    rect(ctx, 9, 10, 10, 8, BODY)
    // Happy arc eyes
    ctx.strokeStyle = EYE_OPEN
    ctx.lineWidth = P
    ctx.beginPath()
    ctx.arc(12 * P, 14 * P, 2 * P, Math.PI, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(17 * P, 14 * P, 2 * P, Math.PI, 0)
    ctx.stroke()
    rect(ctx, 13, 16, 2, 1, NOSE)
    this.drawTail('idle')
    // Star sparkles — inside save/restore so they squash with body
    ctx.fillStyle = '#ffd700'
    const t = this.frame * 0.15
    for (let i = 0; i < 3; i++) {
      const sx = (18 + Math.cos(t + i * 2.1) * 5) * P
      const sy = (8 + Math.sin(t + i * 2.1) * 4) * P
      ctx.fillRect(sx, sy, P, P)
    }
    ctx.restore()
  }

  private drawSleeping(depth: number) {
    const ctx = this.ctx

    // Lerp body from sitting-curl to tight ball as depth → 1
    // depth=0: wide curled body (16×10), depth=1: tight ball (12×8)
    const bw = Math.round(16 - depth * 4)   // body width: 16 → 12
    const bh = Math.round(10 - depth * 2)   // body height: 10 → 8
    const bx = Math.round(6 + depth * 2)    // body x: 6 → 8 (center tighter)

    rect(ctx, bx, 14, bw, bh, BODY)

    // Head tucked — pulls in slightly at high depth
    const hx = Math.round(9 + depth * 1)
    rect(ctx, hx, 12, 8, 6, BODY)

    // Ears flatten more at high depth
    const earY = Math.round(10 + depth * 1)
    rect(ctx, hx, earY, 3, 3, BODY)
    rect(ctx, hx + 5, earY, 3, 3, BODY)

    // Closed eyes
    rect(ctx, 10, 14, 3, 1, EYE_CLOSED)
    rect(ctx, 15, 14, 3, 1, EYE_CLOSED)
    // No Zzz here — tickZParticles handles it
  }

  private tickZParticles() {
    const ctx = this.ctx
    const now = performance.now()
    const dt = this.lastTickTime ? Math.min((now - this.lastTickTime) / 1000, 0.05) : 1 / 60
    this.lastTickTime = now

    // Spawn new Z every 700ms while sleeping
    if (now - this.lastZSpawn > 700) {
      this.zParticles.push({ y: 10, opacity: 1 })
      this.lastZSpawn = now
    }

    // Update and draw each particle
    ctx.font = `${P * 2}px monospace`
    for (let i = this.zParticles.length - 1; i >= 0; i--) {
      const z = this.zParticles[i]
      // Float upward: 4 logical px/sec → 8px over 2s at any frame rate
      z.y -= 4 * dt
      // Fade to 0 over 2s at any frame rate
      z.opacity -= dt / 2
      if (z.opacity <= 0) {
        this.zParticles.splice(i, 1)
        continue
      }
      ctx.globalAlpha = Math.max(0, z.opacity)
      ctx.fillStyle = '#aaa'
      ctx.fillText('z', 20 * P, z.y * P)
    }
    ctx.globalAlpha = 1
  }

  start(getInfo: () => { state: CatState; sleepDepth: number }) {
    const loop = () => {
      this.draw(getInfo())
      this.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }
}
