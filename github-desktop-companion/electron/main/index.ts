import { app, BrowserWindow, clipboard, ipcMain, shell } from 'electron'
import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getStoragePaths,
  resolveGitHubDesktopDataDirectory,
} from './detector/github-desktop-storage.mjs'
import { readLastSelectedRepositoryId } from './detector/local-storage-wal.mjs'
import {
  getRepositoryName,
  inspectIndexedDbRepositories,
} from './detector/indexeddb-inspector.mjs'
import type { DetectorState, FileEntry, RepositoryState } from '../../src/shared/types'
import { TerminalManager } from './terminal-manager'
import { GitHubDesktopUiWatcher, type UiWatcherEvent } from './github-desktop-ui-watcher'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const windowsAppId = 'io.github.sysscalper.githubdesktopcompanion'
const ignoredDirectories = new Set(['.git', 'node_modules'])
let mainWindow: BrowserWindow | undefined
let detectorTimer: NodeJS.Timeout | undefined
let detectorState: DetectorState = { status: 'connecting' }
let activeRepository: RepositoryState | undefined
let lastStorageSignature = ''
let repositoryCache: Awaited<ReturnType<typeof inspectIndexedDbRepositories>> = []
let lastUiRepositoryName = ''
const terminalManager = new TerminalManager(() => mainWindow)
let uiWatcher: GitHubDesktopUiWatcher | undefined
let repositoryWatcher: FSWatcher | undefined
let repositoryWatcherPath = ''
let fileChangeTimer: NodeJS.Timeout | undefined
let repositoryWatcherRetryTimer: NodeJS.Timeout | undefined

if (process.platform === 'win32') {
  app.setAppUserModelId(windowsAppId)
}

function getRuntimeResourcePath(relativePath: string) {
  if (app.isPackaged) return path.join(process.resourcesPath, relativePath)
  return path.join(app.getAppPath(), 'resources', relativePath)
}

function getRuntimeScriptPath(fileName: string) {
  if (app.isPackaged) return path.join(process.resourcesPath, 'scripts', fileName)
  return path.join(app.getAppPath(), 'scripts', fileName)
}

async function getStorageSignature(directory: string) {
  const files = (await readdir(directory))
    .filter(file => /^\d+\.(?:log|ldb)$/.test(file))
    .sort()
  const signatures = await Promise.all(
    files.map(async file => {
      const metadata = await stat(path.join(directory, file))
      return `${file}:${metadata.size}:${metadata.mtimeMs}`
    })
  )
  return signatures.join('|')
}

function stopRepositoryWatcher() {
  repositoryWatcher?.close()
  repositoryWatcher = undefined
  repositoryWatcherPath = ''
  if (fileChangeTimer) clearTimeout(fileChangeTimer)
  fileChangeTimer = undefined
  if (repositoryWatcherRetryTimer) clearTimeout(repositoryWatcherRetryTimer)
  repositoryWatcherRetryTimer = undefined
}

function isIgnoredFileChange(fileName: string) {
  return fileName.split(/[\\/]+/).some(segment => ignoredDirectories.has(segment))
}

function retryRepositoryWatcher(repository: RepositoryState) {
  stopRepositoryWatcher()
  repositoryWatcherRetryTimer = setTimeout(() => {
    repositoryWatcherRetryTimer = undefined
    if (
      activeRepository?.id === repository.id &&
      activeRepository.path === repository.path
    ) watchRepository(repository)
  }, 1000)
}

function watchRepository(repository?: RepositoryState) {
  const repositoryPath = repository ? toHostFileSystemPath(repository.path) : ''
  if (repositoryPath === repositoryWatcherPath) return
  stopRepositoryWatcher()
  if (!repository || !repositoryPath) return

  try {
    repositoryWatcher = watch(repositoryPath, { recursive: true }, (_event, fileName) => {
      if (fileName && isIgnoredFileChange(fileName)) return
      if (fileChangeTimer) clearTimeout(fileChangeTimer)
      fileChangeTimer = setTimeout(() => {
        fileChangeTimer = undefined
        mainWindow?.webContents.send('files:changed')
      }, 200)
    })
    repositoryWatcher.on('error', error => {
      console.warn('[files:watcher]', error)
      retryRepositoryWatcher(repository)
    })
    repositoryWatcherPath = repositoryPath
  } catch (error) {
    console.warn('[files:watcher]', error)
    retryRepositoryWatcher(repository)
  }
}

function publishDetectorState(nextState: DetectorState) {
  detectorState = nextState
  activeRepository = nextState.repository
  watchRepository(activeRepository)
  mainWindow?.webContents.send('detector:state', nextState)
}

function handleUiWatcherEvent(event: UiWatcherEvent) {
  if (event.type === 'mode') {
    if (event.mode === 'not-running') {
      publishDetectorState({
        status: 'connecting',
        linkMode: 'delayed',
        githubDesktopRunning: false,
        message: 'GitHub Desktop이 실행되지 않았어.',
      })
    } else {
      publishDetectorState({
        ...detectorState,
        linkMode: event.mode,
        githubDesktopRunning: true,
      })
    }
    return
  }

  lastUiRepositoryName = event.name
  const normalized = event.name.toLocaleLowerCase()
  const matches = repositoryCache.filter(repository =>
    getRepositoryName(repository).toLocaleLowerCase() === normalized
  )
  if (matches.length !== 1) {
    console.warn(`[ui-watcher] Repository name matched ${matches.length} entries: ${event.name}`)
    return
  }

  const repository = matches[0]
  if (activeRepository?.id === repository.id && detectorState.linkMode === 'fast') return
  publishDetectorState({
    status: 'linked',
    linkMode: 'fast',
    githubDesktopRunning: true,
    repository: {
      id: repository.id,
      name: getRepositoryName(repository),
      path: repository.path,
      missing: repository.missing ?? false,
      sequence: detectorState.repository?.sequence ?? 0,
    },
  })
  console.log(`[ui-watcher] Repository changed immediately: ${repository.id} ${event.name}`)
}

async function refreshDetector(force = false) {
  const startedAt = performance.now()
  const dataDirectory = await resolveGitHubDesktopDataDirectory()
  const storage = getStoragePaths(dataDirectory)
  const signature = await getStorageSignature(storage.localStorageDirectory)
  if (!force && signature === lastStorageSignature) return

  const selected = await readLastSelectedRepositoryId(storage.localStorageDirectory)
  if (force || repositoryCache.length === 0) {
    repositoryCache = await inspectIndexedDbRepositories(storage.indexedDbDirectory)
  }
  let repository = repositoryCache.find(candidate => candidate.id === selected.id)
  if (!repository) {
    repositoryCache = await inspectIndexedDbRepositories(storage.indexedDbDirectory)
    repository = repositoryCache.find(candidate => candidate.id === selected.id)
  }

  if (!repository) {
    publishDetectorState({
      status: 'error',
      message: `Repository ID ${selected.id} was not found in GitHub Desktop IndexedDB.`,
    })
    return
  }

  publishDetectorState({
    status: 'linked',
    linkMode: detectorState.linkMode ?? 'delayed',
    githubDesktopRunning: true,
    repository: {
      id: repository.id,
      name: getRepositoryName(repository),
      path: repository.path,
      missing: repository.missing ?? false,
      sequence: selected.sequence,
    },
  })
  lastStorageSignature = signature
  console.log(`[detector] Repository ${repository.id} resolved in ${Math.round(performance.now() - startedAt)}ms`)
  if (lastUiRepositoryName) {
    handleUiWatcherEvent({ type: 'repository', name: lastUiRepositoryName })
  }
}

function startDetector() {
  let running = false
  const poll = async (force = false) => {
    if (running) return
    running = true
    try {
      await refreshDetector(force)
    } catch (error) {
      publishDetectorState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      running = false
    }
  }

  void poll(true)
  detectorTimer = setInterval(() => void poll(), 250)
}

function toHostFileSystemPath(windowsPath: string) {
  if (process.platform === 'win32') return windowsPath
  const match = /^([A-Za-z]):\\(.*)$/.exec(windowsPath)
  if (!match) return windowsPath
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

function resolveRepositoryPath(relativePath = '') {
  if (!activeRepository) throw new Error('No linked Repository.')
  if (path.isAbsolute(relativePath)) throw new Error('Absolute paths are not allowed.')

  const root = path.resolve(toHostFileSystemPath(activeRepository.path))
  const target = path.resolve(root, relativePath)
  const relation = path.relative(root, target)
  if (relation.startsWith('..') || path.isAbsolute(relation)) {
    throw new Error('The requested path is outside the linked Repository.')
  }
  return target
}

function registerIpcHandlers() {
  ipcMain.handle('detector:get-state', () => detectorState)
  ipcMain.handle('files:read-directory', async (_event, relativePath: string) => {
    const directory = resolveRepositoryPath(relativePath)
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter(entry => !entry.isDirectory() || !ignoredDirectories.has(entry.name))
      .filter(entry => entry.isDirectory() || entry.isFile())
      .map<FileEntry>(entry => ({
        name: entry.name,
        relativePath: path.relative(
          toHostFileSystemPath(activeRepository!.path),
          path.join(directory, entry.name)
        ),
        kind: entry.isDirectory() ? 'directory' : 'file',
      }))
      .sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      })
  })
  ipcMain.handle('files:open', async (_event, relativePath: string) => {
    const error = await shell.openPath(resolveRepositoryPath(relativePath))
    return error
  })
  ipcMain.handle('files:show-in-explorer', (_event, relativePath: string) => {
    shell.showItemInFolder(resolveRepositoryPath(relativePath))
  })
  ipcMain.handle('files:open-repository', async () => {
    const error = await shell.openPath(resolveRepositoryPath())
    if (error) throw new Error(error)
  })
  ipcMain.handle('terminal:attach', (
    _event,
    terminalId: number | undefined,
    columns: number,
    rows: number
  ) => {
    if (!activeRepository) throw new Error('No linked Repository.')
    return terminalManager.attach(activeRepository, terminalId, columns, rows)
  })
  ipcMain.handle('terminal:create', (_event, columns: number, rows: number) => {
    if (!activeRepository) throw new Error('No linked Repository.')
    return terminalManager.create(activeRepository, columns, rows)
  })
  ipcMain.handle('terminal:close', (
    _event,
    terminalId: number,
    columns: number,
    rows: number
  ) => {
    if (!activeRepository) throw new Error('No linked Repository.')
    return terminalManager.close(activeRepository, terminalId, columns, rows)
  })
  ipcMain.on('terminal:write', (_event, terminalId: number, data: string) => {
    if (typeof data !== 'string' || data.length > 64 * 1024) return
    terminalManager.write(terminalId, data)
  })
  ipcMain.on('terminal:resize', (_event, terminalId: number, columns: number, rows: number) => {
    if (!Number.isInteger(columns) || !Number.isInteger(rows)) return
    terminalManager.resize(terminalId, columns, rows)
  })
  ipcMain.handle('clipboard:read-text', () => clipboard.readText())
  ipcMain.on('clipboard:write-text', (_event, text: string) => {
    if (typeof text === 'string' && text.length <= 2 * 1024 * 1024) clipboard.writeText(text)
  })
  ipcMain.handle('github-desktop:launch-fast', () => {
    const localAppData = process.env.LOCALAPPDATA
    if (!localAppData) throw new Error('LOCALAPPDATA is unavailable.')
    const installationRoot = path.join(localAppData, 'GitHubDesktop')
    return readdir(installationRoot, { withFileTypes: true }).then(entries => {
      const versions = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('app-'))
        .map(entry => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
      if (versions.length === 0) throw new Error('GitHub Desktop installation not found.')
      const executable = path.join(installationRoot, versions[0], 'GitHubDesktop.exe')
      spawn(executable, ['--force-renderer-accessibility'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      }).unref()
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: getRuntimeResourcePath('icon.ico'),
    width: 1180,
    height: 900,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: '#0d1117',
    title: 'GitHub Desktop Companion',
    webPreferences: {
      preload: path.join(currentDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.removeMenu()
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error('[renderer:did-fail-load]', { errorCode, errorDescription, validatedUrl })
  })
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[renderer:preload-error]', preloadPath, error)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[renderer] loading', process.env.ELECTRON_RENDERER_URL)
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const rendererPath = path.join(currentDirectory, '../renderer/index.html')
    console.log('[renderer] loading', rendererPath)
    void mainWindow.loadFile(rendererPath)
  }
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  startDetector()
  uiWatcher = new GitHubDesktopUiWatcher(
    getRuntimeScriptPath('watch-github-desktop-repository.ps1'),
    handleUiWatcherEvent
  )
  uiWatcher.start()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (detectorTimer) clearInterval(detectorTimer)
  terminalManager.dispose()
  stopRepositoryWatcher()
  uiWatcher?.dispose()
})
