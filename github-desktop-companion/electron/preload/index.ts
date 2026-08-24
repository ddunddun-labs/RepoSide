import { contextBridge, ipcRenderer } from 'electron'
import type { CompanionApi, DetectorState, TerminalData } from '../../src/shared/types'

const api: CompanionApi = {
  getDetectorState: () => ipcRenderer.invoke('detector:get-state'),
  onDetectorState: listener => {
    const handler = (_event: Electron.IpcRendererEvent, state: DetectorState) => listener(state)
    ipcRenderer.on('detector:state', handler)
    return () => ipcRenderer.removeListener('detector:state', handler)
  },
  readDirectory: relativePath => ipcRenderer.invoke('files:read-directory', relativePath),
  openFile: relativePath => ipcRenderer.invoke('files:open', relativePath),
  showInExplorer: relativePath => ipcRenderer.invoke('files:show-in-explorer', relativePath),
  openRepositoryInExplorer: () => ipcRenderer.invoke('files:open-repository'),
  attachTerminal: (columns, rows) => ipcRenderer.invoke('terminal:attach', columns, rows),
  writeTerminal: (repositoryId, data) => ipcRenderer.send('terminal:write', repositoryId, data),
  resizeTerminal: (repositoryId, columns, rows) => {
    ipcRenderer.send('terminal:resize', repositoryId, columns, rows)
  },
  onTerminalData: listener => {
    const handler = (_event: Electron.IpcRendererEvent, data: TerminalData) => listener(data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  launchGitHubDesktopFast: () => ipcRenderer.invoke('github-desktop:launch-fast'),
}

contextBridge.exposeInMainWorld('companion', api)
