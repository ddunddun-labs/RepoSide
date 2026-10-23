import { useEffect, useRef, useState } from 'react'
import { FileTree } from './components/FileTree'
import { ExplorerIcon, RefreshIcon } from './components/icons'
import { TerminalPanel } from './components/TerminalPanel'
import { useDetector } from './hooks/useDetector'
import { useI18n } from './I18nProvider'
import { localizeRuntimeMessage } from './i18n'
import type { TranslationKey } from './i18n'
import type { AiCommitGeneration, AiCommitSettings } from './shared/types'

const defaultFilesWidth = 340
const minimumFilesWidth = 240
const minimumTerminalWidth = 520
const workspaceStorageKey = 'repository-workspace-state-v1'

interface WorkspaceViewState {
  expandedPaths: string[]
  scrollTop: number
  filesWidth: number
  filesCollapsed: boolean
}

const defaultWorkspace: WorkspaceViewState = {
  expandedPaths: [],
  scrollTop: 0,
  filesWidth: defaultFilesWidth,
  filesCollapsed: false,
}

function loadWorkspaceStates(): Record<number, WorkspaceViewState> {
  try {
    return JSON.parse(localStorage.getItem(workspaceStorageKey) ?? '{}')
  } catch {
    return {}
  }
}

export function App() {
  const { language, setLanguage, t } = useI18n()
  const detector = useDetector()
  const repository = detector.repository
  const workspaceRef = useRef<HTMLDivElement>(null)
  const autoLaunchAttempted = useRef(false)
  const [workspaceStates, setWorkspaceStates] = useState(loadWorkspaceStates)
  const [autoLaunch, setAutoLaunch] = useState(() => localStorage.getItem('auto-launch-github-desktop') === 'true')
  const [launching, setLaunching] = useState(false)
  const [filesRefreshVersion, setFilesRefreshVersion] = useState(0)
  const [aiSettings, setAiSettings] = useState<AiCommitSettings | null>(null)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [modelInput, setModelInput] = useState('gemini-flash-lite-latest')
  const [instructionInput, setInstructionInput] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiStatus, setAiStatus] = useState<{
    kind: 'info' | 'success' | 'error'
    key: TranslationKey
    params?: Record<string, string | number>
    detail?: string
  } | null>(null)
  const [aiResult, setAiResult] = useState<AiCommitGeneration | null>(null)
  const workspace = repository ? workspaceStates[repository.id] ?? defaultWorkspace : defaultWorkspace

  useEffect(() => {
    void window.companion.getAiCommitSettings().then(settings => {
      setAiSettings(settings)
      setModelInput(settings.model)
      setInstructionInput(settings.instruction)
    }).catch(error => {
      setAiStatus({ kind: 'error', key: 'ai.settingsLoadFailed', detail: error instanceof Error ? error.message : undefined })
    })
  }, [])

  const updateWorkspace = (change: Partial<WorkspaceViewState>) => {
    if (!repository) return
    setWorkspaceStates(states => ({
      ...states,
      [repository.id]: { ...(states[repository.id] ?? defaultWorkspace), ...change },
    }))
  }

  useEffect(() => {
    localStorage.setItem(workspaceStorageKey, JSON.stringify(workspaceStates))
  }, [workspaceStates])

  useEffect(() => window.companion.onFilesChanged(() => {
    setFilesRefreshVersion(version => version + 1)
  }), [])

  const launchGitHubDesktop = async () => {
    setLaunching(true)
    try {
      await window.companion.launchGitHubDesktopFast()
    } catch (error) {
      setAiStatus({ kind: 'error', key: 'errors.operationFailed', detail: error instanceof Error ? error.message : undefined })
    } finally {
      setTimeout(() => setLaunching(false), 1500)
    }
  }

  const openAiSettings = () => {
    setAiStatus(null)
    setShowAiSettings(true)
  }

  const saveAiSettings = async () => {
    setSettingsBusy(true)
    try {
      const settings = await window.companion.saveAiCommitSettings({
        apiKey: apiKeyInput,
        model: modelInput,
        instruction: instructionInput,
      })
      setAiSettings(settings)
      setApiKeyInput('')
      setInstructionInput(settings.instruction)
      setModelInput(settings.model)
      setAiStatus({ kind: 'success', key: 'ai.settingsSaved' })
      setShowAiSettings(false)
    } catch (error) {
      setAiStatus({ kind: 'error', key: 'ai.settingsSaveFailed', detail: error instanceof Error ? error.message : undefined })
    } finally {
      setSettingsBusy(false)
    }
  }

  const loadGeminiModels = async () => {
    setSettingsBusy(true)
    try {
      const models = await window.companion.listGeminiModels()
      setAvailableModels(models)
      if (!models.includes(modelInput) && models.length > 0) setModelInput(models[0])
      setAiStatus({ kind: 'success', key: 'ai.modelsLoaded', params: { count: models.length } })
    } catch (error) {
      setAiStatus({ kind: 'error', key: 'ai.modelsLoadFailed', detail: error instanceof Error ? error.message : undefined })
    } finally {
      setSettingsBusy(false)
    }
  }

  const generateAiCommit = async () => {
    if (!aiSettings?.configured) {
      setAiStatus({ kind: 'info', key: 'ai.configureFirst' })
      setShowAiSettings(true)
      return
    }
    setAiBusy(true)
    setAiResult(null)
    setAiStatus({ kind: 'info', key: 'ai.generating' })
    try {
      const result = await window.companion.generateAiCommit()
      setAiResult(result)
      setAiStatus(result.input.success
        ? { kind: 'success', key: 'ai.generatedAndVerified', params: { count: result.stagedFileCount } }
        : { kind: 'error', key: 'ai.inputNotVerified', params: { reason: result.input.message } })
    } catch (error) {
      setAiStatus({ kind: 'error', key: 'ai.generationFailed', detail: error instanceof Error ? error.message : undefined })
    } finally {
      setAiBusy(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('auto-launch-github-desktop', String(autoLaunch))
    if (autoLaunch && detector.githubDesktopRunning === false && !autoLaunchAttempted.current) {
      autoLaunchAttempted.current = true
      void launchGitHubDesktop()
    }
    if (detector.githubDesktopRunning) autoLaunchAttempted.current = false
  }, [autoLaunch, detector.githubDesktopRunning])

  useEffect(() => {
    const resize = () => {
      const width = workspaceRef.current?.clientWidth ?? 0
      if (width > 0 && repository && workspace.filesWidth > width - minimumTerminalWidth) {
        updateWorkspace({ filesWidth: Math.max(minimumFilesWidth, width - minimumTerminalWidth) })
      }
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [repository?.id, workspace.filesWidth])

  const beginResize = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = workspace.filesWidth

    const move = (moveEvent: PointerEvent) => {
      const workspaceWidth = workspaceRef.current?.clientWidth ?? 0
      const maximum = Math.max(minimumFilesWidth, workspaceWidth - minimumTerminalWidth)
      updateWorkspace({
        filesWidth: Math.min(maximum, Math.max(minimumFilesWidth, startWidth + moveEvent.clientX - startX)),
      })
    }
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  const getAiStatusMessage = () => {
    if (!aiStatus) return ''
    if (aiStatus.detail) return localizeRuntimeMessage(aiStatus.detail, language)
    if (aiStatus.key === 'ai.inputNotVerified') {
      return t(aiStatus.key, {
        ...aiStatus.params,
        reason: localizeRuntimeMessage(String(aiStatus.params?.reason ?? ''), language),
      })
    }
    return t(aiStatus.key, aiStatus.params)
  }

  return <main className="app-shell">
    <header className="app-header">
      <div className="repository-identity">
        <div className="repository-title-row">
          <h1>{repository?.name ?? 'GitHub Desktop Companion'}</h1>
          <span className={`status-chip ${detector.status}`}>
            <span className="status-dot" />{t(`status.${detector.status}`)}{detector.status === 'linked' && detector.linkMode ? ` · ${t(`linkMode.${detector.linkMode}`)}` : ''}
          </span>
        </div>
        <div className="repository-path" title={repository?.path}>
          {repository?.path ?? (detector.message ? localizeRuntimeMessage(detector.message, language) : t('app.connecting'))}
        </div>
      </div>
      <div className="header-actions">
        <button className="header-action ai-commit-action" aria-label={t('header.aiCommit')} title={t('header.aiCommit')} disabled={!repository || aiBusy} onClick={() => void generateAiCommit()}>
          {aiBusy ? <span className="spinner" /> : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 9.6 6.4 14.5 8l-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6L8 1.5Z" /></svg>}
          <span>{aiBusy ? t('header.generating') : t('header.aiCommit')}</span>
        </button>
        <button className="header-action ai-settings-action" aria-label={t('header.settingsTitle')} title={t('header.settingsTitle')} onClick={openAiSettings}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.7 1.5h2.6l.4 1.7 1.3.8 1.7-.5 1.3 2.2-1.2 1.2v1.5l1.2 1.2-1.3 2.2-1.7-.5-1.3.8-.4 1.7H6.7l-.4-1.7-1.3-.8-1.7.5L2 9.6l1.2-1.2V6.9L2 5.7l1.3-2.2 1.7.5 1.3-.8.4-1.7Z" /><circle cx="8" cy="7.7" r="2.1" /></svg>
          <span>{t('header.settings')}</span>
        </button>
        <button
          className="header-action"
          disabled={!repository}
          onClick={() => void window.companion.openRepositoryInExplorer()}
          aria-label={t('header.openExplorerTitle')}
          title={t('header.openExplorerTitle')}
        >
          <ExplorerIcon /><span>{t('header.openExplorer')}</span>
        </button>
      </div>
    </header>

    {aiStatus && <section className={`ai-status ${aiStatus.kind}`} role="status" aria-live="polite">
      <div className="ai-status-copy"><span className="ai-status-indicator" />{getAiStatusMessage()}</div>
      {aiResult && <div className="ai-draft">
        <div><span className="ai-draft-label">{t('ai.summary')}</span><strong>{aiResult.draft.summary}</strong></div>
        {aiResult.draft.description && <div><span className="ai-draft-label">{t('ai.description')}</span><p>{aiResult.draft.description}</p></div>}
        {!aiResult.input.success && <button className="copy-draft-button" onClick={() => {
          void window.companion.writeClipboardText(`${aiResult.draft.summary}${aiResult.draft.description ? `\n\n${aiResult.draft.description}` : ''}`)
          setAiStatus({ kind: 'info', key: 'ai.copiedMessage' })
        }}>{t('ai.copyMessage')}</button>}
      </div>}
    </section>}

    {showAiSettings && <div className="settings-backdrop" role="presentation" onKeyDown={event => {
      if (event.key === 'Escape' && !settingsBusy) setShowAiSettings(false)
    }} onMouseDown={event => {
      if (event.target === event.currentTarget && !settingsBusy) setShowAiSettings(false)
    }}>
      <section className="ai-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
        <div className="settings-heading"><h2 id="ai-settings-title">{t('ai.settingsTitle')}</h2><button aria-label={t('ai.settingsClose')} title={t('ai.settingsClose')} onClick={() => setShowAiSettings(false)}>×</button></div>
        <label className="settings-field"><span>{t('ai.language')}</span>
          <select value={language} onChange={event => setLanguage(event.target.value === 'ko' ? 'ko' : 'en')}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
          <small>{t('ai.languageHelp')}</small>
        </label>
        <h3 className="settings-section-title">{t('ai.aiCommitSection')}</h3>
        <label className="settings-field"><span>{t('ai.apiKey')}</span>
          <input type="password" autoComplete="new-password" value={apiKeyInput} onChange={event => setApiKeyInput(event.target.value)} placeholder={aiSettings?.configured ? t('ai.keepSavedKey') : t('ai.apiKeyPlaceholder')} />
          <small>{t('ai.apiKeyHelp')}</small>
        </label>
        <label className="settings-field"><span>{t('ai.model')}</span>
          <input list="gemini-model-options" value={modelInput} onChange={event => setModelInput(event.target.value)} placeholder={t('ai.modelPlaceholder')} />
          <datalist id="gemini-model-options">{availableModels.map(model => <option value={model} key={model} />)}</datalist>
        </label>
        <button className="settings-secondary-button" onClick={() => void loadGeminiModels()} disabled={settingsBusy || !aiSettings?.configured}>
          {settingsBusy ? t('ai.loading') : t('ai.loadModels')}
        </button>
        <label className="settings-field"><span>{t('ai.instructions')}</span>
          <textarea rows={6} value={instructionInput} onChange={event => setInstructionInput(event.target.value)} />
        </label>
        <div className="settings-footer">
          <span>{aiSettings?.configured ? t('ai.configured') : t('ai.notConfigured')}</span>
          <button className="settings-save-button" onClick={() => void saveAiSettings()} disabled={settingsBusy}>{settingsBusy ? t('ai.saving') : t('ai.save')}</button>
        </div>
      </section>
    </div>}

    {detector.status === 'error' && <div className="connection-error">{detector.message ? localizeRuntimeMessage(detector.message, language) : t('status.error')}</div>}
    {detector.githubDesktopRunning && detector.linkMode === 'delayed' && <div className="connection-notice">
      <span>{t('connection.delayed')}</span>
    </div>}
    {detector.githubDesktopRunning === false && <div className="connection-notice action-notice">
      <span>{t('connection.notRunning')}</span>
      <label><input type="checkbox" checked={autoLaunch} onChange={event => setAutoLaunch(event.target.checked)} /> {t('connection.autoLaunch')}</label>
      <button onClick={() => void launchGitHubDesktop()} disabled={launching}>{launching ? t('connection.launching') : t('connection.launchFast')}</button>
    </div>}

    <section className="workspace" ref={workspaceRef}>
      <aside
        className={`files-panel ${workspace.filesCollapsed ? 'collapsed' : ''}`}
        style={{ width: workspace.filesCollapsed ? 44 : workspace.filesWidth }}
      >
        <div className="panel-header">
          {!workspace.filesCollapsed && <><span>{t('files.heading')}</span><span className="panel-subtitle">{repository?.name}</span></>}
          {!workspace.filesCollapsed && <button
            className="refresh-button"
            title={t('files.refresh')}
            aria-label={t('files.refresh')}
            onClick={() => setFilesRefreshVersion(version => version + 1)}
          ><RefreshIcon /></button>}
          <button
            className="collapse-button"
            title={workspace.filesCollapsed ? t('files.expand') : t('files.collapse')}
            aria-label={workspace.filesCollapsed ? t('files.expand') : t('files.collapse')}
            onClick={() => updateWorkspace({ filesCollapsed: !workspace.filesCollapsed })}
          >
            {workspace.filesCollapsed ? '›' : '‹'}
          </button>
        </div>
        {!workspace.filesCollapsed && <FileTree
          key={repository?.id}
          repositoryKey={repository ? String(repository.id) : undefined}
          expandedPaths={workspace.expandedPaths}
          scrollTop={workspace.scrollTop}
          refreshVersion={filesRefreshVersion}
          onExpandedPathsChange={expandedPaths => updateWorkspace({ expandedPaths })}
          onScrollTopChange={scrollTop => updateWorkspace({ scrollTop })}
        />}
      </aside>

      {!workspace.filesCollapsed && <div className="splitter" onPointerDown={beginResize} />}

      <section className="terminal-panel">
        <TerminalPanel key={repository?.id} repository={repository} />
      </section>
    </section>
  </main>
}
