import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { ActivityWatcher } from './activity-watcher'

let win: BrowserWindow
let tray: Tray
let cursorInterval: ReturnType<typeof setInterval>
let watcher: ActivityWatcher

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

  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  win.setPosition(width - 220, height - 220)

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
  win.setPosition(x + dx, y + dy)
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  startCursorTracking()
  startActivityWatcher()
})

app.on('before-quit', () => {
  watcher?.stop()
  clearInterval(cursorInterval)
})

app.on('window-all-closed', () => app.quit())
