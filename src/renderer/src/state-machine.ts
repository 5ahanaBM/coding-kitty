import type { CatState } from './cat-renderer'

const KNEADING_TIMEOUT  = 800
const LOOKING_TIMEOUT   = 2000
const SCROLL_TIMEOUT    = 800
const SLEEP_TIMEOUT     = 5 * 60 * 1000
const AGENT_DONE_LINGER = 3000  // celebrate for 3s after agent finishes

export class StateMachine {
  private _state: CatState = 'idle'
  private _inCodeApp = false
  private keyTimer    = 0
  private mouseTimer  = 0
  private scrollTimer = 0
  private sleepTimer  = 0
  private lastActivity = Date.now()
  private sleepStart = 0
  private wakeTimer = 0

  get state(): CatState { return this._state }

  get sleepDepth(): number {
    if (this._state !== 'sleeping') return 0
    return Math.min(1, (Date.now() - this.sleepStart) / 30000)
  }

  // File saved anywhere in project dirs
  onFileSaved() {
    this.lastActivity = Date.now()
    clearTimeout(this.keyTimer)
    clearTimeout(this.sleepTimer)
    if (this._state === 'sleeping') this.enterWaking()
    if (this._state !== 'stretching' && this._state !== 'scrolling' && this._state !== 'agent-thinking') {
      this._state = 'kneading'
    }
    this.keyTimer = window.setTimeout(() => {
      if (this._state === 'kneading') this._state = 'idle'
      this.schedSleep()
    }, KNEADING_TIMEOUT)
  }

  // AI agent started working
  onAgentThinking() {
    this.lastActivity = Date.now()
    clearTimeout(this.sleepTimer)
    if (this._state === 'sleeping') this.enterWaking()
    this._state = 'agent-thinking'
  }

  // AI agent finished
  onAgentDone() {
    this.lastActivity = Date.now()
    this._state = 'agent-done'
    window.setTimeout(() => {
      if (this._state === 'agent-done') this._state = 'idle'
      this.schedSleep()
    }, AGENT_DONE_LINGER)
  }

  onAgentError() {
    this.lastActivity = Date.now()
    this._state = 'idle'
    this.schedSleep()
  }

  onMouseActivity() {
    this.lastActivity = Date.now()
    clearTimeout(this.mouseTimer)
    clearTimeout(this.sleepTimer)
    if (this._state === 'sleeping') this.enterWaking()
    if (this._state === 'idle') this._state = 'looking'
    this.mouseTimer = window.setTimeout(() => {
      if (this._state === 'looking') this._state = 'idle'
      this.schedSleep()
    }, LOOKING_TIMEOUT)
  }

  onScrollActivity() {
    this.lastActivity = Date.now()
    clearTimeout(this.scrollTimer)
    clearTimeout(this.sleepTimer)
    if (this._state === 'sleeping') this.enterWaking()
    if (this._state !== 'stretching' && this._state !== 'agent-thinking') this._state = 'scrolling'
    this.scrollTimer = window.setTimeout(() => {
      if (this._state === 'scrolling') this._state = 'idle'
      this.schedSleep()
    }, SCROLL_TIMEOUT)
  }

  onEnteredCodeApp() {
    this._inCodeApp = true
    clearTimeout(this.sleepTimer)  // Don't sleep while in an IDE
  }

  onLeftCodeApp() {
    this._inCodeApp = false
    this.schedSleep()
  }

  onDragStart() { this._state = 'stretching' }
  onDragEnd()   { this._state = 'idle' }

  private enterWaking() {
    clearTimeout(this.wakeTimer)
    this._state = 'waking'
    this.wakeTimer = window.setTimeout(() => {
      if (this._state === 'waking') this._state = 'idle'
      this.schedSleep()
    }, 200)
  }

  private schedSleep() {
    clearTimeout(this.sleepTimer)
    // Don't schedule sleep if currently in a code app (user is reading/thinking)
    if (this._inCodeApp) return
    this.sleepTimer = window.setTimeout(() => {
      if (Date.now() - this.lastActivity >= SLEEP_TIMEOUT - 100) {
        this._state = 'sleeping'
        this.sleepStart = Date.now()
      }
    }, SLEEP_TIMEOUT)
  }
}
