import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('kitty', {
  setIgnoreMouse: (ignore: boolean, opts?: { forward: boolean }) =>
    ipcRenderer.send('set-ignore-mouse', ignore, opts),
  moveWindow: (dx: number, dy: number) =>
    ipcRenderer.send('move-window', dx, dy),
  onCursorPos: (cb: (pos: { x: number; y: number; relX: number; relY: number }) => void) => {
    ipcRenderer.on('cursor-pos', (_e, pos) => cb(pos))
  },
  onActivityEvent: (cb: (event: { type: string; agent?: string; app?: string }) => void) => {
    ipcRenderer.on('activity-event', (_e, event) => cb(event))
  }
})
