// Draws a simple pixel-art cat on canvas. Placeholder until real sprites land.
// Each frame is drawn procedurally so we have something to look at immediately.

export type CatState = 'idle' | 'kneading' | 'looking' | 'sleeping' | 'stretching' | 'scrolling' | 'agent-thinking' | 'agent-done'

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

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    // Clear canvas to transparent
    this.ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  setEyeOffset(ox: number, oy: number) {
    this.eyeOffset = {
      x: Math.max(-1, Math.min(1, Math.round(ox))),
      y: Math.max(-1, Math.min(1, Math.round(oy)))
    }
  }

  draw(state: CatState) {
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

    if (state === 'sleeping') {
      this.drawSleeping()
    } else if (state === 'scrolling') {
      this.drawScrolling()
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

    if (state === 'stretching') {
      // Stretch the body wider
      rect(ctx, 4, 12, 20, 10, BODY)
    }
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
    ctx.restore()
    // Star sparkles
    ctx.fillStyle = '#ffd700'
    const t = this.frame * 0.15
    for (let i = 0; i < 3; i++) {
      const sx = (18 + Math.cos(t + i * 2.1) * 5) * P
      const sy = (8 + Math.sin(t + i * 2.1) * 4) * P
      ctx.fillRect(sx, sy, P, P)
    }
  }

  private drawScrolling() {
    const ctx = this.ctx
    // Cat batting a paper roll unspooling downward
    this.drawBody('idle')
    this.drawEars('idle')
    this.drawFace('idle', false)
    this.drawTail('idle')

    // Paper roll — cylinder at top-right of cat
    rect(ctx, 18, 8, 6, 5, '#f5f0e0')
    rect(ctx, 19, 8, 4, 1, '#d4c8a0') // shadow stripe
    rect(ctx, 18, 12, 6, 1, '#b0a070') // bottom edge

    // Unspooling paper strip, length pulses with frame
    const stripLen = 4 + Math.abs(Math.sin(this.frame * 0.3)) * 6
    rect(ctx, 20, 13, 2, Math.round(stripLen), '#f5f0e0')

    // Paw batting the paper
    const pawBob = Math.sin(this.frame * 0.5) * 2
    rect(ctx, 16, Math.round(18 + pawBob), 5, 3, BODY)
    rect(ctx, 16, Math.round(20 + pawBob), 5, 1, DARK)
  }

  private drawSleeping() {
    const ctx = this.ctx
    // Curled up sleeping cat
    rect(ctx, 6, 14, 16, 10, BODY)
    // Head tucked down
    rect(ctx, 9, 12, 8, 6, BODY)
    // Ears flat
    rect(ctx, 9, 10, 3, 3, BODY)
    rect(ctx, 16, 10, 3, 3, BODY)
    // Closed eyes
    rect(ctx, 10, 14, 3, 1, EYE_CLOSED)
    rect(ctx, 15, 14, 3, 1, EYE_CLOSED)
    // Zzz
    ctx.fillStyle = '#aaa'
    ctx.font = `${P * 2}px monospace`
    ctx.fillText('z', 20 * P, 10 * P)
    ctx.fillText('z', 22 * P, 7 * P)
  }

  start(getState: () => CatState) {
    const loop = () => {
      this.draw(getState())
      this.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }
}
