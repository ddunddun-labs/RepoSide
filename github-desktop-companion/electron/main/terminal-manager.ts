import type { BrowserWindow } from 'electron'
import os from 'node:os'
import type { IPty } from 'node-pty'
import * as pty from 'node-pty'
import type { RepositoryState, TerminalAttachment } from '../../src/shared/types'

const maximumBufferLength = 2 * 1024 * 1024

interface TerminalSession {
  repository: RepositoryState
  process: IPty
  shellName: string
  buffer: string
  outputOffset: number
}

function environment() {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) result[key] = value
  }
  result.TERM = 'xterm-256color'
  result.COLORTERM = 'truecolor'
  return result
}

function hostPath(repositoryPath: string) {
  if (process.platform === 'win32') return repositoryPath
  const match = /^([A-Za-z]):\\(.*)$/.exec(repositoryPath)
  if (!match) return repositoryPath
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

export class TerminalManager {
  private readonly sessions = new Map<number, TerminalSession>()

  constructor(private readonly getWindow: () => BrowserWindow | undefined) {}

  attach(repository: RepositoryState, columns: number, rows: number): TerminalAttachment {
    let session = this.sessions.get(repository.id)
    if (!session) session = this.createSession(repository, columns, rows)
    else this.resize(repository.id, columns, rows)

    return {
      repositoryId: repository.id,
      shellName: session.shellName,
      bufferedOutput: session.buffer,
      outputOffset: session.outputOffset,
    }
  }

  write(repositoryId: number, data: string) {
    this.sessions.get(repositoryId)?.process.write(data)
  }

  resize(repositoryId: number, columns: number, rows: number) {
    if (columns < 2 || rows < 1) return
    this.sessions.get(repositoryId)?.process.resize(columns, rows)
  }

  dispose() {
    for (const session of this.sessions.values()) session.process.kill()
    this.sessions.clear()
  }

  private createSession(repository: RepositoryState, columns: number, rows: number) {
    const isWindows = process.platform === 'win32'
    const shell = isWindows ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
    const shellName = isWindows ? 'PowerShell' : os.platform() === 'linux' ? 'WSL Bash' : shell
    const terminalProcess = pty.spawn(shell, isWindows ? ['-NoLogo'] : ['--login'], {
      name: 'xterm-256color',
      cols: Math.max(2, columns),
      rows: Math.max(1, rows),
      cwd: hostPath(repository.path),
      env: environment(),
    })
    const session: TerminalSession = {
      repository,
      process: terminalProcess,
      shellName,
      buffer: '',
      outputOffset: 0,
    }
    this.sessions.set(repository.id, session)

    terminalProcess.onData(data => {
      const offset = session.outputOffset
      session.buffer = (session.buffer + data).slice(-maximumBufferLength)
      session.outputOffset += data.length
      this.getWindow()?.webContents.send('terminal:data', {
        repositoryId: repository.id,
        data,
        offset,
      })
    })
    terminalProcess.onExit(({ exitCode }) => {
      const message = `\r\n\x1b[90m[${shellName} exited with code ${exitCode}]\x1b[0m\r\n`
      const offset = session.outputOffset
      session.buffer = (session.buffer + message).slice(-maximumBufferLength)
      session.outputOffset += message.length
      this.getWindow()?.webContents.send('terminal:data', {
        repositoryId: repository.id,
        data: message,
        offset,
      })
      this.sessions.delete(repository.id)
    })

    return session
  }
}
