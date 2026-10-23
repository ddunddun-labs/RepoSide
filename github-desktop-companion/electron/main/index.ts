import { app, BrowserWindow, clipboard, ipcMain, safeStorage, shell } from 'electron'
import { watch, type FSWatcher } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
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
import type { AiCommitDraft, AiCommitSettings, DetectorState, FileEntry, RepositoryState } from '../../src/shared/types'
import {
  defaultAiInstruction,
  defaultGeminiModel,
  hashCommitState,
  maximumDiffBytes,
  requestCommitDraft,
  requestGeminiModels,
} from './ai-commit'
import { resolveDesktopCommitScope, type DesktopCommitSnapshot } from './commit-scope'
import { TerminalManager } from './terminal-manager'
import { GitHubDesktopUiWatcher, type UiWatcherEvent } from './github-desktop-ui-watcher'
import {
  minimumWindowHeight,
  minimumWindowWidth,
  resolveInitialWindowBounds,
  saveWindowBounds,
} from './window-bounds'

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
const execFileAsync = promisify(execFile)

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

interface StoredAiCommitSettings {
  encryptedApiKey?: string
  model?: string
  instruction?: string
}

function aiCommitSettingsPath() {
  return path.join(app.getPath('userData'), 'ai-commit-settings.json')
}

function canStoreApiKeySecurely() {
  if (!safeStorage.isEncryptionAvailable()) return false
  if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') return false
  return true
}

async function readAiCommitSettings(): Promise<StoredAiCommitSettings> {
  try {
    return JSON.parse(await readFile(aiCommitSettingsPath(), 'utf8')) as StoredAiCommitSettings
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw new Error('AI Commit 설정을 읽지 못했어.')
  }
}

async function readGeminiApiKey() {
  const settings = await readAiCommitSettings()
  if (!settings.encryptedApiKey) return ''
  if (!canStoreApiKeySecurely()) throw new Error('운영체제 보안 저장소를 사용할 수 없어 API 키를 읽지 않았어.')
  try {
    return safeStorage.decryptString(Buffer.from(settings.encryptedApiKey, 'base64'))
  } catch {
    throw new Error('저장된 Gemini API 키를 복호화하지 못했어. 설정에서 다시 입력해줘.')
  }
}

async function getPublicAiCommitSettings(): Promise<AiCommitSettings> {
  const settings = await readAiCommitSettings()
  return {
    configured: Boolean(settings.encryptedApiKey),
    model: settings.model || defaultGeminiModel,
    instruction: settings.instruction || defaultAiInstruction,
  }
}

async function runGit(repository: RepositoryState, args: string[]) {
  const cwd = toHostFileSystemPath(repository.path)
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    maxBuffer: maximumDiffBytes * 4,
    windowsHide: true,
  })
  return stdout
}

async function readCommitScope(repository: RepositoryState, desktop: DesktopCommitSnapshot) {
  const changedFiles = desktop.selectedFiles ?? []
  if (changedFiles.length === 0) throw new Error('GitHub Desktop에 커밋 대상으로 체크된 파일이 없어. 선택 상태를 확인해줘.')
  if (desktop.commitFileCount !== changedFiles.length) {
    throw new Error(`GitHub Desktop은 ${desktop.commitFileCount ?? '알 수 없는 수'}개 파일을 커밋 대상으로 표시하지만 ${changedFiles.length}개 경로만 읽었어. 목록이 가상화되었거나 선택 범위를 확인할 수 없어 생성을 중단했어.`)
  }
  if ((desktop.partialFiles ?? []).length > 0) throw new Error(`GitHub Desktop에서 일부 라인만 선택한 파일이 있어 (${(desktop.partialFiles ?? []).join(', ')}). 선택한 부분 diff를 확정할 수 없어 메시지 생성을 중단했어.`)
  const relativePaths = changedFiles.map(file => file.replaceAll('\\', '/'))
  if (relativePaths.some(relativePath => !relativePath || relativePath.startsWith('/') || /^[A-Za-z]:/.test(relativePath) || relativePath.split('/').includes('..'))) {
    throw new Error('GitHub Desktop에서 안전한 상대 파일 경로를 확인하지 못했어.')
  }

  const [root, branch, status, diff, numstat] = await Promise.all([
    runGit(repository, ['rev-parse', '--show-toplevel']),
    runGit(repository, ['branch', '--show-current']),
    runGit(repository, ['status', '--porcelain=v1', '-z']),
    runGit(repository, ['--literal-pathspecs', 'diff', 'HEAD', '--binary', '--no-ext-diff', '--no-textconv', '--no-renames', '--', ...relativePaths]),
    runGit(repository, ['--literal-pathspecs', 'diff', 'HEAD', '--numstat', '--no-renames', '--', ...relativePaths]),
  ])
  return resolveDesktopCommitScope({
    repositoryId: repository.id,
    expectedRoot: path.resolve(toHostFileSystemPath(repository.path)),
    actualRoot: path.resolve(root.trim()),
    windows: process.platform === 'win32',
    branch, status, diff, numstat, desktop,
  })
}

async function readGitIndexFallbackScope(repository: RepositoryState) {
  const [root, branch, status, diff, changedFiles] = await Promise.all([
    runGit(repository, ['rev-parse', '--show-toplevel']),
    runGit(repository, ['branch', '--show-current']),
    runGit(repository, ['status', '--porcelain=v1', '-z']),
    runGit(repository, ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', '--no-renames']),
    runGit(repository, ['diff', '--cached', '--name-only', '-z', '--no-renames']),
  ])
  const expectedRoot = path.resolve(toHostFileSystemPath(repository.path))
  const normalizedRoot = path.resolve(root.trim())
  if (process.platform === 'win32'
    ? normalizedRoot.toLocaleLowerCase() !== expectedRoot.toLocaleLowerCase()
    : normalizedRoot !== expectedRoot) {
    throw new Error('Git index 저장소 경로가 GitHub Desktop에서 선택한 저장소와 일치하지 않아.')
  }
  if (!branch.trim()) throw new Error('브랜치 정보를 확인할 수 없어 커밋 메시지를 만들지 않았어.')
  if (!diff.trim()) {
    throw new Error('GitHub Desktop 선택 범위를 읽지 못했고 Git index에도 staged 변경이 없어. 전체 작업 파일을 대신 분석하지 않았어.')
  }
  if (Buffer.byteLength(diff, 'utf8') > maximumDiffBytes) throw new Error('Git index diff가 256KB를 넘어 Gemini에 보내지 않았어.')
  const files = changedFiles.split('\0').filter(Boolean)
  return {
    branch: branch.trim(),
    diff,
    changedFiles: files,
    selectionMode: 'git-index-fallback' as const,
    fingerprint: hashCommitState([repository.id.toString(), expectedRoot, branch, status, diff]),
  }
}

async function callDesktopBridge(operation: 'inspect' | 'apply', repositoryName: string, draft?: AiCommitDraft, expectedSelection?: DesktopCommitSnapshot) {
  const scriptPath = getRuntimeScriptPath('github-desktop-commit-bridge.ps1')
  let command = 'powershell.exe'
  let resolvedScriptPath = scriptPath
  if (process.platform !== 'win32') {
    if (!process.env.WSL_DISTRO_NAME) throw new Error('GitHub Desktop 입력 연동은 Windows에서만 사용할 수 있어.')
    const { stdout } = await execFileAsync('wslpath', ['-w', scriptPath], { encoding: 'utf8', windowsHide: true })
    resolvedScriptPath = stdout.trim()
  }
  const args = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', resolvedScriptPath, '-Operation', operation, '-RepositoryName', repositoryName,
  ]
  if (draft) args.push(
    '-SummaryBase64', Buffer.from(draft.summary, 'utf8').toString('base64'),
    '-DescriptionBase64', Buffer.from(draft.description, 'utf8').toString('base64'),
  )
  if (expectedSelection) args.push(
    '-ExpectedSelectionBase64',
    Buffer.from(JSON.stringify({
      selectedFiles: expectedSelection.selectedFiles ?? [],
      partialFiles: expectedSelection.partialFiles ?? [],
      commitFileCount: expectedSelection.commitFileCount ?? null,
    }), 'utf8').toString('base64'),
  )
  let result: { stdout: string; stderr: string }
  const parseBridgeOutput = (output: string) => JSON.parse(
    Buffer.from(output.trim(), 'base64').toString('utf8')
  ) as DesktopCommitSnapshot
  try {
    result = await execFileAsync(command, args, {
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
    })
  } catch (error) {
    const output = (error as NodeJS.ErrnoException & { stdout?: string }).stdout
    if (output) {
      try { return parseBridgeOutput(output) } catch { /* use safe generic message below */ }
    }
    throw new Error('GitHub Desktop 상태를 확인하거나 입력하지 못했어. 앱이 실행 중인지 확인해줘.')
  }
  try {
    return parseBridgeOutput(result.stdout)
  } catch {
    throw new Error('GitHub Desktop 접근성 결과를 읽지 못했어. 접근성 창으로 실행한 뒤 다시 시도해줘.')
  }
}

function registerIpcHandlers() {
  ipcMain.handle('detector:get-state', () => detectorState)
  ipcMain.handle('ai-commit:get-settings', getPublicAiCommitSettings)
  ipcMain.handle('ai-commit:save-settings', async (
    _event,
    input: { apiKey?: string; model: string; instruction: string }
  ) => {
    const current = await readAiCommitSettings()
    const next: StoredAiCommitSettings = {
      ...current,
      model: typeof input.model === 'string' && input.model.trim()
        ? input.model.trim().slice(0, 120)
        : defaultGeminiModel,
      instruction: typeof input.instruction === 'string'
        ? input.instruction.trim().slice(0, 8000) || defaultAiInstruction
        : defaultAiInstruction,
    }
    if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
      if (!canStoreApiKeySecurely()) throw new Error('운영체제 보안 저장소를 사용할 수 없어 API 키를 저장하지 않았어.')
      next.encryptedApiKey = safeStorage.encryptString(input.apiKey.trim()).toString('base64')
    }
    await writeFile(aiCommitSettingsPath(), JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 })
    return getPublicAiCommitSettings()
  })
  ipcMain.handle('ai-commit:list-models', async () => {
    const apiKey = await readGeminiApiKey()
    if (!apiKey) throw new Error('먼저 Gemini API 키를 설정하고 저장해줘.')
    return requestGeminiModels(apiKey)
  })
  ipcMain.handle('ai-commit:generate', async () => {
    await refreshDetector(true)
    const repository = activeRepository
    if (!repository || detectorState.status !== 'linked') throw new Error('GitHub Desktop에서 선택된 저장소를 아직 확인하지 못했어.')
    const settings = await readAiCommitSettings()
    if (!settings.encryptedApiKey) throw new Error('먼저 AI Commit 설정에서 Gemini API 키를 저장해줘.')
    const apiKey = await readGeminiApiKey()
    let desktop: DesktopCommitSnapshot | undefined
    let scope: Awaited<ReturnType<typeof readCommitScope>> | Awaited<ReturnType<typeof readGitIndexFallbackScope>>
    let desktopUnavailableMessage = ''
    try {
      desktop = await callDesktopBridge('inspect', repository.name)
      if (desktop.success && desktop.repositoryName !== repository.name) {
        throw new Error('GitHub Desktop과 RepoSide의 저장소가 달라. 다시 선택한 뒤 시도해줘.')
      }
      if (desktop.success) scope = await readCommitScope(repository, desktop)
      else {
        desktopUnavailableMessage = desktop.message
        scope = await readGitIndexFallbackScope(repository)
      }
    } catch (error) {
      if (desktop?.success) throw error
      desktopUnavailableMessage = error instanceof Error ? error.message : 'GitHub Desktop 창을 확인하지 못했어.'
      scope = await readGitIndexFallbackScope(repository)
    }
    if (desktop?.success && (!desktop.summaryEmpty || !desktop.descriptionEmpty)) {
      throw new Error('GitHub Desktop 커밋 입력창에 기존 메시지가 있어. 덮어쓰지 않도록 생성을 중단했어.')
    }

    const draft = await requestCommitDraft(
      apiKey,
      settings.model || defaultGeminiModel,
      settings.instruction || defaultAiInstruction,
      repository.name,
      scope.branch,
      scope.diff,
    )
    try {
      await refreshDetector(true)
    } catch (error) {
      return {
        draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length,
        scope: scope.selectionMode,
        input: { success: false, message: `${error instanceof Error ? error.message : 'GitHub Desktop 저장소 재확인 실패'} 생성 결과는 보관했고 입력은 건너뛰었어.` },
      }
    }
    if (scope.selectionMode === 'git-index-fallback') {
      const currentRepository = activeRepository
      if (!currentRepository || currentRepository.id !== repository.id || currentRepository.path !== repository.path) {
        return {
          draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length,
          scope: scope.selectionMode,
          input: { success: false, message: 'AI 생성 중 RepoSide의 저장소가 바뀌었어. 생성 결과는 보관했어.' },
        }
      }
      try {
        const currentScope = await readGitIndexFallbackScope(repository)
        if (currentScope.fingerprint !== scope.fingerprint) {
          return {
            draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length,
            scope: scope.selectionMode,
            input: { success: false, message: 'AI 생성 중 Git index가 바뀌었어. 생성 결과는 보관했고 입력은 건너뛰었어.' },
          }
        }
      } catch (error) {
        return {
          draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length,
          scope: scope.selectionMode,
          input: { success: false, message: `${error instanceof Error ? error.message : 'Git index 확인 실패'} 생성 결과는 보관했고 입력은 건너뛰었어.` },
        }
      }
      return {
        draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length,
        scope: scope.selectionMode,
        input: {
          success: false,
          message: `GitHub Desktop의 현재 선택 범위를 확인하지 못해 Git index의 staged 변경만 분석했어 (${desktopUnavailableMessage}). 결과를 검토하고 직접 복사해줘.`,
        },
      }
    }
    const currentRepository = activeRepository
    if (!currentRepository || currentRepository.id !== repository.id || currentRepository.path !== repository.path) {
      return {
        draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode,
        input: { success: false, message: 'AI 생성 중 RepoSide의 저장소가 바뀌었어. 생성 결과를 아래에 보관했고 입력은 건너뛰었어.' },
      }
    }
    let verifiedDesktop: DesktopCommitSnapshot | undefined
    try {
      const currentDesktop = await callDesktopBridge('inspect', repository.name)
      const currentScope = await readCommitScope(repository, currentDesktop)
      if (currentScope.fingerprint !== scope.fingerprint) {
        return {
          draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode,
          input: { success: false, message: 'AI 생성 중 브랜치 또는 선택된 변경 범위가 바뀌었어. 생성 결과를 아래에 보관했고 안전을 위해 입력은 건너뛰었어.' },
        }
      }
      if (!currentDesktop.success || currentDesktop.repositoryName !== repository.name) {
        return {
          draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode,
          input: { success: false, message: currentDesktop.message || 'AI 생성 중 GitHub Desktop 저장소가 바뀌었어. 생성 결과를 아래에 보관했고 입력은 건너뛰었어.' },
        }
      }
      if (!currentDesktop.summaryEmpty || !currentDesktop.descriptionEmpty) {
        return {
          draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode,
          input: { success: false, message: 'AI 생성 중 GitHub Desktop 입력창에 내용이 생겼어. 생성 결과를 아래에 보관했고 덮어쓰지 않았어.' },
        }
      }
      verifiedDesktop = currentDesktop
    } catch (error) {
      return {
        draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode,
        input: { success: false, message: `${error instanceof Error ? error.message : '상태 확인 실패'} 생성 결과는 아래에 보관했고 입력은 건너뛰었어.` },
      }
    }

    let inputResult: { success: boolean; message: string }
    try {
      inputResult = await callDesktopBridge('apply', repository.name, draft, verifiedDesktop)
    } catch (error) {
      inputResult = { success: false, message: error instanceof Error ? error.message : 'GitHub Desktop 입력에 실패했어.' }
    }
    return { draft, changedFiles: scope.changedFiles, stagedFileCount: scope.changedFiles.length, scope: scope.selectionMode, input: inputResult }
  })
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
  const initialBounds = resolveInitialWindowBounds()

  mainWindow = new BrowserWindow({
    icon: getRuntimeResourcePath('icon.ico'),
    ...(initialBounds.x !== undefined && initialBounds.y !== undefined
      ? { x: initialBounds.x, y: initialBounds.y }
      : {}),
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: minimumWindowWidth,
    minHeight: minimumWindowHeight,
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
  mainWindow.on('close', () => {
    if (!mainWindow) return
    saveWindowBounds(mainWindow.getBounds())
  })
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
