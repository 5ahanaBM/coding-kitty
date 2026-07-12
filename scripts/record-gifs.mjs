import { _electron as electron } from 'playwright-core'
import pkg from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = pkg
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(APP_DIR, 'assets', 'recordings')
mkdirSync(OUT_DIR, { recursive: true })

const electronBin = join(
  APP_DIR,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
)

const W = 96
const H = 96
const FPS = 15
const FRAME_MS = Math.round(1000 / FPS)

const KEY_R = 255, KEY_G = 0, KEY_B = 255

const STATES = [
  {
    name: 'idle',
    duration: 3000,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyRenderer.setEyeOffset(0, 0)
      })
    }
  },
  {
    name: 'looking',
    duration: 3000,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'looking'
        window.__kittyRenderer.setEyeOffset(1, 0)
      })
    }
  },
  {
    name: 'kneading',
    duration: 2000,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'kneading'
      })
    }
  },
  {
    name: 'stretching',
    duration: 3500,
    setup: async (page, captureEarly) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'stretching'
        window.__kittyRenderer.setStretch(1.15, 0.88)
      })
      // Capture the static stretch hold
      await captureEarly(8)
      // Release and spring
      await page.evaluate(() => {
        window.__kittyFsm._state = 'idle'
        window.__kittyRenderer.triggerSpring(0.55)
      })
    }
  },
  {
    name: 'agent-thinking',
    duration: 4000,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'agent-thinking'
      })
    }
  },
  {
    name: 'agent-done',
    duration: 2800,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'agent-done'
      })
    }
  },
  {
    name: 'sleeping',
    duration: 5000,
    setup: async (page) => {
      await page.evaluate(() => {
        window.__kittyFsm._state = 'sleeping'
        window.__kittyFsm.sleepStart = Date.now() - 5000
      })
    }
  },
  {
    name: 'waking',
    duration: 1500,
    setup: async (page, captureEarly) => {
      // Render a few sleeping frames first
      await page.evaluate(() => {
        window.__kittyFsm._state = 'sleeping'
        window.__kittyFsm.sleepStart = Date.now() - 25000
      })
      await captureEarly(6)
      // Trigger waking — draw() detects state='waking' && prevState!='waking' → spring
      await page.evaluate(() => {
        window.__kittyFsm._state = 'waking'
      })
    }
  }
]

function resetFsm(page) {
  return page.evaluate(() => {
    const fsm = window.__kittyFsm
    // Clear all pending timers
    clearTimeout(fsm.keyTimer)
    clearTimeout(fsm.mouseTimer)
    clearTimeout(fsm.sleepTimer)
    clearTimeout(fsm.wakeTimer)
    fsm.keyTimer = 0
    fsm.mouseTimer = 0
    fsm.sleepTimer = 0
    fsm.wakeTimer = 0
    fsm._state = 'idle'
    fsm._inCodeApp = false
    fsm.sleepStart = 0
    fsm.lastActivity = Date.now()

    const r = window.__kittyRenderer
    r.setStretch(1, 1)
    r.setEyeOffset(0, 0)
    r.springActive = false
    r.sx = 1
    r.sy = 1
    r.prevState = 'idle'
    r.zParticles = []
    r.lastZSpawn = 0
    r.lastTickTime = 0
  })
}

async function grabFrame(page) {
  const rgba = await page.evaluate(({ w, h }) => {
    const ctx = window.__kittyCanvas.getContext('2d')
    return Array.from(ctx.getImageData(0, 0, w, h).data)
  }, { w: W, h: H })
  return new Uint8Array(rgba)
}

async function captureFrames(page, state) {
  await resetFsm(page)
  // Let reset render one clean idle frame
  await sleep(100)

  const frames = []

  // captureEarly lets setup grab frames mid-sequence (for stretching hold, sleeping before wake)
  const captureEarly = async (n) => {
    // Wait one rAF so the new state paints
    await sleep(FRAME_MS)
    for (let i = 0; i < n; i++) {
      frames.push(await grabFrame(page))
      if (i < n - 1) await sleep(FRAME_MS)
    }
  }

  await state.setup(page, captureEarly)

  // Wait one rAF cycle so draw() paints the new state before first capture
  await sleep(FRAME_MS)

  const remainingFrames = Math.ceil(state.duration / FRAME_MS) - frames.length
  for (let i = 0; i < remainingFrames; i++) {
    frames.push(await grabFrame(page))
    if (i < remainingFrames - 1) await sleep(FRAME_MS)
  }

  return frames
}

function encodeGif(frames) {
  const gif = GIFEncoder()

  for (const rgba of frames) {
    for (let p = 0; p < rgba.length; p += 4) {
      if (rgba[p + 3] < 128) {
        rgba[p] = KEY_R
        rgba[p + 1] = KEY_G
        rgba[p + 2] = KEY_B
        rgba[p + 3] = 255
      } else {
        rgba[p + 3] = 255
      }
    }

    const palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)

    let transIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < palette.length; i++) {
      const [r, g, b] = palette[i]
      const dist = Math.abs(r - KEY_R) + Math.abs(g - KEY_G) + Math.abs(b - KEY_B)
      if (dist < bestDist) {
        bestDist = dist
        transIdx = i
      }
    }

    gif.writeFrame(index, W, H, {
      palette,
      delay: FRAME_MS,
      repeat: 0,
      transparent: true,
      transparentIndex: transIdx,
      dispose: 2
    })
  }

  gif.finish()
  return gif.bytes()
}

async function main() {
  console.log('Launching Coding Kitty for recording...')

  const app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR],
    env: { ...process.env, KITTY_RECORD: '1' }
  })

  await sleep(3000)

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
    ?? await app.firstWindow()

  const bridgeOk = await page.evaluate(() => !!window.__kittyFsm)
  if (!bridgeOk) {
    console.error('Recording bridge not found. Build first: npx electron-vite build')
    await app.close()
    process.exit(1)
  }

  console.log(`Recording ${STATES.length} states at ${FPS}fps...\n`)

  for (const state of STATES) {
    process.stdout.write(`  ${state.name} (${state.duration}ms)... `)
    const frames = await captureFrames(page, state)
    const gifBytes = encodeGif(frames)
    const outPath = join(OUT_DIR, `${state.name}.gif`)
    writeFileSync(outPath, Buffer.from(gifBytes))
    console.log(`${frames.length} frames, ${(gifBytes.length / 1024).toFixed(1)} KB`)
  }

  await app.close()
  console.log(`\nDone! GIFs in ${OUT_DIR}`)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
