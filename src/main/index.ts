import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { ActivityWatcher } from './activity-watcher'

let win: BrowserWindow
let tray: Tray
let cursorInterval: ReturnType<typeof setInterval>
let watcher: ActivityWatcher

const POS_FILE = () => join(app.getPath('userData'), 'position.json')

let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSaveX = 0
let pendingSaveY = 0

function savePosition(x: number, y: number) {
  pendingSaveX = x
  pendingSaveY = y
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer)
  pendingSaveTimer = setTimeout(() => {
    try {
      writeFileSync(POS_FILE(), JSON.stringify({ x: pendingSaveX, y: pendingSaveY }))
    } catch { /* ignore write errors */ }
    pendingSaveTimer = null
  }, 500)
}

function flushPosition() {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
    try {
      writeFileSync(POS_FILE(), JSON.stringify({ x: pendingSaveX, y: pendingSaveY }))
    } catch { /* ignore */ }
  }
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = readFileSync(POS_FILE(), 'utf-8')
    const pos = JSON.parse(raw)
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') throw new Error()

    // Verify position is within bounds of a connected display
    const display = screen.getDisplayMatching({ x: pos.x, y: pos.y, width: 200, height: 200 })
    const wa = display.workArea
    if (pos.x >= wa.x && pos.y >= wa.y &&
        pos.x + 200 <= wa.x + wa.width &&
        pos.y + 200 <= wa.y + wa.height) {
      return pos
    }
    // Off all displays — fall through to null
    return null
  } catch {
    try { unlinkSync(POS_FILE()) } catch { /* ignore */ }
    return null
  }
}

function sendToRenderer(channel: string, data: unknown) {
  if (win && !win.isDestroyed() && win.webContents) {
    win.webContents.send(channel, data)
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 200,
    height: 200,
    show: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })

  const saved = loadPosition()
  if (saved) {
    win.setPosition(saved.x, saved.y)
  } else {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    win.setPosition(width - 220, height - 220)
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Coding Kitty')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Coding Kitty', enabled: false },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
}

function startCursorTracking() {
  cursorInterval = setInterval(() => {
    const pos = screen.getCursorScreenPoint()
    const winBounds = win.getBounds()
    const relX = pos.x - winBounds.x
    const relY = pos.y - winBounds.y
    sendToRenderer('cursor-pos', { x: pos.x, y: pos.y, relX, relY })
  }, 16)
}

function startActivityWatcher() {
  watcher = new ActivityWatcher((event) => {
    sendToRenderer('activity-event', event)
  })
  watcher.start()
}

// IPC: renderer toggles click-through
ipcMain.on('set-ignore-mouse', (_e, ignore: boolean, opts?: { forward: boolean }) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(ignore, opts ?? {})
})

// IPC: renderer moves window (drag)
ipcMain.on('move-window', (_e, dx: number, dy: number) => {
  if (!win || win.isDestroyed()) return
  const [x, y] = win.getPosition()
  const nx = x + dx
  const ny = y + dy
  win.setPosition(nx, ny)
  savePosition(nx, ny)
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  startCursorTracking()
  startActivityWatcher()
})

app.on('before-quit', () => {
  flushPosition()
  watcher?.stop()
  clearInterval(cursorInterval)
})

app.on('window-all-closed', () => app.quit())
