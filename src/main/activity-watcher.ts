import { watch, FSWatcher } from 'fs'
import { createServer, Server } from 'http'
import { exec } from 'child_process'

export type ActivityEvent =
  | { type: 'file-saved' }
  | { type: 'agent-thinking'; agent?: string }
  | { type: 'agent-done';     agent?: string }
  | { type: 'agent-error';    agent?: string }
  | { type: 'in-code-app';    app: string }
  | { type: 'left-code-app' }

const CODE_EXTENSIONS = /\.(js|ts|tsx|jsx|py|rs|go|rb|java|swift|kt|cpp|c|h|css|html|json|yaml|yml|toml|md|vue|svelte|sh|bash|zsh)$/

const CODE_APPS = new Set([
  'Code', 'Code - Insiders', 'Cursor', 'Zed', 'Xcode',
  'Terminal', 'iTerm2', 'Warp', 'Alacritty', 'kitty', 'Ghostty',
  'IntelliJ IDEA', 'WebStorm', 'PyCharm', 'RubyMine', 'CLion',
  'Sublime Text', 'Nova', 'BBEdit',
])

const NOISE_PATHS = /node_modules|\.git\/objects|\.git\/index|__pycache__|\.next\/cache|dist\/|build\//

export class ActivityWatcher {
  private watchers: FSWatcher[] = []
  private agentServer: Server | null = null
  private appPollInterval: ReturnType<typeof setInterval> | null = null
  private onEvent: (e: ActivityEvent) => void
  private watchDirs: string[]

  constructor(onEvent: (e: ActivityEvent) => void, watchDirs: string[]) {
    this.onEvent = onEvent
    this.watchDirs = watchDirs
  }

  start() {
    this.startFileWatcher()
    this.startAgentServer()
    this.startAppDetection()
  }

  stop() {
    this.watchers.forEach(w => w.close())
    this.agentServer?.close()
    if (this.appPollInterval) clearInterval(this.appPollInterval)
  }

  // ── 1. FSEvents: file saves in project dirs ─────────────────────────────
  private startFileWatcher() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    for (const dir of this.watchDirs) {
      try {
        const w = watch(dir, { recursive: true }, (_event, filename) => {
          if (!filename) return
          if (NOISE_PATHS.test(filename)) return
          if (!CODE_EXTENSIONS.test(filename)) return

          // Debounce bursts of file events (e.g. formatter saving multiple files)
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            this.onEvent({ type: 'file-saved' })
          }, 100)
        })
        this.watchers.push(w)
      } catch {
        // Dir doesn't exist — silently skip
      }
    }
  }

  // ── 2. HTTP server: AI agent hooks ─────────────────────────────────────
  // Accepts POST /status with JSON body { type, agent }
  // Compatible with comnyang hook format (port 23456)
  private startAgentServer() {
    const server = createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end()
        return
      }

      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const data = JSON.parse(body) as { type?: string; agent?: string; status?: string }
          const agent = data.agent ?? 'unknown'

          // Normalize across different hook formats
          const status = (data.type ?? data.status ?? '').toLowerCase()

          if (status === 'thinking' || status === 'start' || status === 'running') {
            this.onEvent({ type: 'agent-thinking', agent })
          } else if (status === 'done' || status === 'stop' || status === 'finish') {
            this.onEvent({ type: 'agent-done', agent })
          } else if (status === 'error' || status === 'fail') {
            this.onEvent({ type: 'agent-error', agent })
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch {
          res.writeHead(400).end('bad json')
        }
      })
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EADDRINUSE') {
        console.error('Agent server error:', err.message)
      }
      // Port in use (another instance or comnyang) — silently skip
    })

    server.listen(23456, '127.0.0.1')
    this.agentServer = server
  }

  // ── 3. Frontmost app detection ──────────────────────────────────────────
  private startAppDetection() {
    let lastWasCodeApp = false

    const check = () => {
      exec(
        `lsappinfo info -only name $(lsappinfo front) 2>/dev/null | grep -o '"[^"]*"' | tail -1 | tr -d '"'`,
        { timeout: 1000 },
        (_err, stdout) => {
          const appName = stdout.trim()
          if (!appName) return
          const isCode = CODE_APPS.has(appName)
          if (isCode && !lastWasCodeApp) {
            this.onEvent({ type: 'in-code-app', app: appName })
          } else if (!isCode && lastWasCodeApp) {
            this.onEvent({ type: 'left-code-app' })
          }
          lastWasCodeApp = isCode
        }
      )
    }

    check()
    this.appPollInterval = setInterval(check, 3000)
  }
}
