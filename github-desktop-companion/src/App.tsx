import { useEffect, useRef, useState } from 'react'
import { FileTree } from './components/FileTree'
import { ExplorerIcon } from './components/icons'
import { TerminalPanel } from './components/TerminalPanel'
import { useDetector } from './hooks/useDetector'

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
  const detector = useDetector()
  const repository = detector.repository
  const workspaceRef = useRef<HTMLDivElement>(null)
  const autoLaunchAttempted = useRef(false)
  const [workspaceStates, setWorkspaceStates] = useState(loadWorkspaceStates)
  const [autoLaunch, setAutoLaunch] = useState(() => localStorage.getItem('auto-launch-github-desktop') === 'true')
  const [launching, setLaunching] = useState(false)
  const workspace = repository ? workspaceStates[repository.id] ?? defaultWorkspace : defaultWorkspace

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

  const launchGitHubDesktop = async () => {
    setLaunching(true)
    try {
      await window.companion.launchGitHubDesktopFast()
    } finally {
      setTimeout(() => setLaunching(false), 1500)
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

  return <main className="app-shell">
    <header className="app-header">
      <div className="repository-identity">
        <div className="repository-title-row">
          <h1>{repository?.name ?? 'GitHub Desktop Companion'}</h1>
          <span className={`status-chip ${detector.status}`}>
            <span className="status-dot" />{detector.status}{detector.status === 'linked' && detector.linkMode ? ` · ${detector.linkMode}` : ''}
          </span>
        </div>
        <div className="repository-path" title={repository?.path}>
          {repository?.path ?? detector.message ?? 'GitHub Desktop 연결을 확인하고 있어.'}
        </div>
      </div>
      <button
        className="header-action"
        disabled={!repository}
        onClick={() => void window.companion.openRepositoryInExplorer()}
      >
        <ExplorerIcon /><span>Explorer에서 열기</span>
      </button>
    </header>

    {detector.status === 'error' && <div className="connection-error">{detector.message}</div>}
    {detector.githubDesktopRunning && detector.linkMode === 'delayed' && <div className="connection-notice">
      <span>지연 연결 중이야. GitHub Desktop을 완전히 종료하면 빠른 모드로 다시 실행할 수 있어.</span>
    </div>}
    {detector.githubDesktopRunning === false && <div className="connection-notice action-notice">
      <span>GitHub Desktop이 실행되지 않았어.</span>
      <label><input type="checkbox" checked={autoLaunch} onChange={event => setAutoLaunch(event.target.checked)} /> 다음부터 함께 실행</label>
      <button onClick={() => void launchGitHubDesktop()} disabled={launching}>{launching ? '실행 중...' : '빠른 모드로 실행'}</button>
    </div>}

    <section className="workspace" ref={workspaceRef}>
      <aside
        className={`files-panel ${workspace.filesCollapsed ? 'collapsed' : ''}`}
        style={{ width: workspace.filesCollapsed ? 44 : workspace.filesWidth }}
      >
        <div className="panel-header">
          {!workspace.filesCollapsed && <><span>FILES</span><span className="panel-subtitle">{repository?.name}</span></>}
          <button
            className="collapse-button"
            title={workspace.filesCollapsed ? 'Files 펼치기' : 'Files 접기'}
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
