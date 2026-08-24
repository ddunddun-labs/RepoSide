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
  shellName: string
  bufferedOutput: string
  outputOffset: number
}

export interface TerminalData {
  repositoryId: number
  data: string
  offset: number
}

export interface CompanionApi {
  getDetectorState(): Promise<DetectorState>
  onDetectorState(listener: (state: DetectorState) => void): () => void
  readDirectory(relativePath: string): Promise<FileEntry[]>
  openFile(relativePath: string): Promise<string>
  showInExplorer(relativePath: string): Promise<void>
  openRepositoryInExplorer(): Promise<void>
  attachTerminal(columns: number, rows: number): Promise<TerminalAttachment>
  writeTerminal(repositoryId: number, data: string): void
  resizeTerminal(repositoryId: number, columns: number, rows: number): void
  onTerminalData(listener: (event: TerminalData) => void): () => void
  readClipboardText(): Promise<string>
  launchGitHubDesktopFast(): Promise<void>
}
