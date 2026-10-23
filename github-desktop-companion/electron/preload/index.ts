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
  onFilesChanged: listener => {
    const handler = () => listener()
    ipcRenderer.on('files:changed', handler)
    return () => ipcRenderer.removeListener('files:changed', handler)
  },
  openFile: relativePath => ipcRenderer.invoke('files:open', relativePath),
  showInExplorer: relativePath => ipcRenderer.invoke('files:show-in-explorer', relativePath),
  openRepositoryInExplorer: () => ipcRenderer.invoke('files:open-repository'),
  attachTerminal: (terminalId, columns, rows) => {
    return ipcRenderer.invoke('terminal:attach', terminalId, columns, rows)
  },
  createTerminal: (columns, rows) => ipcRenderer.invoke('terminal:create', columns, rows),
  closeTerminal: (terminalId, columns, rows) => {
    return ipcRenderer.invoke('terminal:close', terminalId, columns, rows)
  },
  writeTerminal: (terminalId, data) => ipcRenderer.send('terminal:write', terminalId, data),
  resizeTerminal: (terminalId, columns, rows) => {
    ipcRenderer.send('terminal:resize', terminalId, columns, rows)
  },
  onTerminalData: listener => {
    const handler = (_event: Electron.IpcRendererEvent, data: TerminalData) => listener(data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeClipboardText: text => ipcRenderer.send('clipboard:write-text', text),
  launchGitHubDesktopFast: () => ipcRenderer.invoke('github-desktop:launch-fast'),
  getAiCommitSettings: () => ipcRenderer.invoke('ai-commit:get-settings'),
  saveAiCommitSettings: settings => ipcRenderer.invoke('ai-commit:save-settings', settings),
  listGeminiModels: () => ipcRenderer.invoke('ai-commit:list-models'),
  generateAiCommit: () => ipcRenderer.invoke('ai-commit:generate'),
}

contextBridge.exposeInMainWorld('companion', api)
