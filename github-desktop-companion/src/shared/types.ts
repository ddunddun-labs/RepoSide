export type ConnectionStatus = 'connecting' | 'linked' | 'error'
export type LinkMode = 'fast' | 'delayed'

export interface RepositoryState {
  id: number
  name: string
  path: string
  missing: boolean
  sequence: number
}

export interface DetectorState {
  status: ConnectionStatus
  repository?: RepositoryState
  message?: string
  linkMode?: LinkMode
  githubDesktopRunning?: boolean
}

export interface FileEntry {
  name: string
  relativePath: string
  kind: 'directory' | 'file'
}

export interface TerminalAttachment {
  repositoryId: number
  terminalId: number
  shellName: string
  bufferedOutput: string
  outputOffset: number
  terminals: TerminalTab[]
}

export interface TerminalTab {
  id: number
  shellName: string
}

export interface TerminalData {
  repositoryId: number
  terminalId: number
  data: string
  offset: number
}

export interface CompanionApi {
  getDetectorState(): Promise<DetectorState>
  onDetectorState(listener: (state: DetectorState) => void): () => void
  readDirectory(relativePath: string): Promise<FileEntry[]>
  onFilesChanged(listener: () => void): () => void
  openFile(relativePath: string): Promise<string>
  showInExplorer(relativePath: string): Promise<void>
  openRepositoryInExplorer(): Promise<void>
  attachTerminal(terminalId: number | undefined, columns: number, rows: number): Promise<TerminalAttachment>
  createTerminal(columns: number, rows: number): Promise<TerminalAttachment>
  closeTerminal(terminalId: number, columns: number, rows: number): Promise<TerminalAttachment>
  writeTerminal(terminalId: number, data: string): void
  resizeTerminal(terminalId: number, columns: number, rows: number): void
  onTerminalData(listener: (event: TerminalData) => void): () => void
  readClipboardText(): Promise<string>
  writeClipboardText(text: string): void
  launchGitHubDesktopFast(): Promise<void>
}
