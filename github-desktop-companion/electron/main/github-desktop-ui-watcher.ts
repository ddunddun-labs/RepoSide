import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import readline from 'node:readline'

export type UiWatcherEvent =
  | { type: 'mode'; mode: 'fast' | 'delayed' | 'not-running' }
  | { type: 'repository'; name: string }

export class GitHubDesktopUiWatcher {
  private child?: ChildProcessWithoutNullStreams
  private disposed = false

  constructor(
    private readonly scriptPath: string,
    private readonly onEvent: (event: UiWatcherEvent) => void
  ) {}

  start() {
    if (process.platform !== 'win32' || this.child || this.disposed) return
    this.child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.scriptPath,
    ], { windowsHide: true })

    const lines = readline.createInterface({ input: this.child.stdout })
    lines.on('line', line => {
      try {
        this.onEvent(JSON.parse(line) as UiWatcherEvent)
      } catch {
        console.warn('[ui-watcher] Invalid output:', line)
      }
    })
    this.child.stderr.on('data', data => console.warn('[ui-watcher]', data.toString()))
    this.child.on('exit', () => {
      lines.close()
      this.child = undefined
      if (!this.disposed) setTimeout(() => this.start(), 1000)
    })
  }

  dispose() {
    this.disposed = true
    this.child?.kill()
    this.child = undefined
  }
}
