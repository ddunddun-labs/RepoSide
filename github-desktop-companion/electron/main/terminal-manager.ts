import type { BrowserWindow } from 'electron'
import os from 'node:os'
import type { IPty } from 'node-pty'
import * as pty from 'node-pty'
import type { RepositoryState, TerminalAttachment, TerminalTab } from '../../src/shared/types'

const maximumBufferLength = 2 * 1024 * 1024

interface TerminalSession {
  id: number
  repository: RepositoryState
  process: IPty
  shellName: string
  buffer: string
  outputOffset: number
  exited: boolean
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
  private readonly sessions = new Map<number, Map<number, TerminalSession>>()
  private readonly activeTerminals = new Map<number, number>()
  private nextTerminalId = 1

  constructor(private readonly getWindow: () => BrowserWindow | undefined) {}

  attach(
    repository: RepositoryState,
    terminalId: number | undefined,
    columns: number,
    rows: number
  ): TerminalAttachment {
    const repositorySessions = this.repositorySessions(repository.id)
    let session = terminalId === undefined ? undefined : repositorySessions.get(terminalId)
    if (!session) {
      const activeId = this.activeTerminals.get(repository.id)
      session = activeId === undefined ? undefined : repositorySessions.get(activeId)
    }
    if (!session) session = this.createSession(repository, columns, rows)
    else this.resize(session.id, columns, rows)
    this.activeTerminals.set(repository.id, session.id)
    return this.attachment(repository.id, session)
  }

  create(repository: RepositoryState, columns: number, rows: number): TerminalAttachment {
    const session = this.createSession(repository, columns, rows)
    this.activeTerminals.set(repository.id, session.id)
    return this.attachment(repository.id, session)
  }

  close(
    repository: RepositoryState,
    terminalId: number,
    columns: number,
    rows: number
  ): TerminalAttachment {
    const repositorySessions = this.repositorySessions(repository.id)
    const session = repositorySessions.get(terminalId)
    if (session) {
      repositorySessions.delete(terminalId)
      if (!session.exited) session.process.kill()
    }

    const activeId = this.activeTerminals.get(repository.id)
    let nextSession = activeId === undefined ? undefined : repositorySessions.get(activeId)
    if (!nextSession) {
      nextSession = repositorySessions.values().next().value as TerminalSession | undefined
    }
    if (!nextSession) nextSession = this.createSession(repository, columns, rows)
    this.activeTerminals.set(repository.id, nextSession.id)
    this.resize(nextSession.id, columns, rows)
    return this.attachment(repository.id, nextSession)
  }

  write(terminalId: number, data: string) {
    const session = this.findSession(terminalId)
    if (session && !session.exited) session.process.write(data)
  }

  resize(terminalId: number, columns: number, rows: number) {
    if (columns < 2 || rows < 1) return
    const session = this.findSession(terminalId)
    if (session && !session.exited) session.process.resize(columns, rows)
  }

  dispose() {
    for (const repositorySessions of this.sessions.values()) {
      for (const session of repositorySessions.values()) {
        if (!session.exited) session.process.kill()
      }
    }
    this.sessions.clear()
    this.activeTerminals.clear()
  }

  private repositorySessions(repositoryId: number) {
    let repositorySessions = this.sessions.get(repositoryId)
    if (!repositorySessions) {
      repositorySessions = new Map()
      this.sessions.set(repositoryId, repositorySessions)
    }
    return repositorySessions
  }

  private findSession(terminalId: number) {
    for (const repositorySessions of this.sessions.values()) {
      const session = repositorySessions.get(terminalId)
      if (session) return session
    }
    return undefined
  }

  private tabs(repositoryId: number): TerminalTab[] {
    return [...this.repositorySessions(repositoryId).values()].map(session => ({
      id: session.id,
      shellName: session.shellName,
    }))
  }

  private attachment(repositoryId: number, session: TerminalSession): TerminalAttachment {
    return {
      repositoryId,
      terminalId: session.id,
      shellName: session.shellName,
      bufferedOutput: session.buffer,
      outputOffset: session.outputOffset,
      terminals: this.tabs(repositoryId),
    }
  }

  private createSession(repository: RepositoryState, columns: number, rows: number) {
    const id = this.nextTerminalId++
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
      id,
      repository,
      process: terminalProcess,
      shellName,
      buffer: '',
      outputOffset: 0,
      exited: false,
    }
    this.repositorySessions(repository.id).set(id, session)

    terminalProcess.onData(data => {
      const offset = session.outputOffset
      session.buffer = (session.buffer + data).slice(-maximumBufferLength)
      session.outputOffset += data.length
      this.getWindow()?.webContents.send('terminal:data', {
        repositoryId: repository.id,
        terminalId: id,
        data,
        offset,
      })
    })
    terminalProcess.onExit(({ exitCode }) => {
      session.exited = true
      const message = `\r\n\x1b[90m[${shellName} exited with code ${exitCode}]\x1b[0m\r\n`
      const offset = session.outputOffset
      session.buffer = (session.buffer + message).slice(-maximumBufferLength)
      session.outputOffset += message.length
      this.getWindow()?.webContents.send('terminal:data', {
        repositoryId: repository.id,
        terminalId: id,
        data: message,
        offset,
      })
    })

    return session
  }
}
