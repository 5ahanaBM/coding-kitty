import { _electron as electron } from 'playwright-core'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOT_DIR = '/tmp/kitty-shots'
mkdirSync(SHOT_DIR, { recursive: true })

const electronBin = join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')

console.log('Launching coding kitty...')
const app = await electron.launch({
  executablePath: electronBin,
  args: [APP_DIR],
  timeout: 30_000,
})

await new Promise(r => setTimeout(r, 4000))

const page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow()
console.log('Window URL:', page.url())

async function shot(name) {
  const f = join(SHOT_DIR, name + '.png')
  await page.screenshot({ path: f, omitBackground: true })
  console.log('screenshot:', f)
}

// Force state via JS eval — simulate input events
async function setState(state) {
  await page.evaluate((s) => {
    // Directly manipulate the FSM by dispatching synthetic events
    window.__testState = s
  }, state)
}

// Inject test helper into page to force render states
await page.evaluate(() => {
  window.__forceState = (s) => {
    const event = new CustomEvent('force-state', { detail: s })
    window.dispatchEvent(event)
  }
})

// Screenshot idle state
await shot('01-idle')
console.log('idle state captured')

// Simulate keydown → kneading
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
})
await new Promise(r => setTimeout(r, 200))
await shot('02-kneading-sim')

await new Promise(r => setTimeout(r, 2000))

// Check canvas pixel count
const pixels = await page.evaluate(() => {
  const canvas = document.getElementById('cat-canvas')
  const ctx = canvas.getContext('2d')
  const data = ctx.getImageData(0, 0, 96, 96).data
  return data.filter((_, i) => i % 4 === 3 && data[i] > 10).length
})
console.log('Non-transparent pixels:', pixels)

await app.close()
console.log('Done.')
