import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useI18n } from '../I18nProvider'
import { localizeRuntimeMessage } from '../i18n'
import type { TranslationKey } from '../i18n'
import type { FileEntry } from '../shared/types'
import { ChevronIcon, FileIcon, FolderIcon } from './icons'

interface ContextMenuState {
  entry: FileEntry
  repositoryKey: string
  x: number
  y: number
}

interface TreeNodeProps {
  entry: FileEntry
  depth: number
  repositoryKey: string
  expandedPaths: Set<string>
  refreshVersion: number
  onExpandedChange(path: string, expanded: boolean): void
  onContextMenu(entry: FileEntry, x: number, y: number): void
}

function TreeNode({
  entry,
  depth,
  repositoryKey,
  expandedPaths,
  refreshVersion,
  onExpandedChange,
  onContextMenu,
}: TreeNodeProps) {
  const { language, t } = useI18n()
  const expanded = entry.kind === 'directory' && expandedPaths.has(entry.relativePath)
  const [children, setChildren] = useState<FileEntry[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    setError(undefined)
    void window.companion.readDirectory(entry.relativePath, repositoryKey).then(result => {
      if (!cancelled) setChildren(result)
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { cancelled = true }
  }, [entry.relativePath, expanded, refreshVersion, repositoryKey])

  const openFile = async () => {
    if (entry.kind !== 'file') return
    const openError = await window.companion.openFile(entry.relativePath, repositoryKey)
    if (openError) setError(openError)
  }

  return <>
    <button
      className="tree-row"
      style={{ paddingLeft: 12 + depth * 16 }}
      onDoubleClick={() => void openFile()}
      onClick={() => entry.kind === 'directory' && onExpandedChange(entry.relativePath, !expanded)}
      onContextMenu={event => {
        event.preventDefault()
        event.stopPropagation()
        onContextMenu(entry, event.clientX, event.clientY)
      }}
      title={error ? localizeRuntimeMessage(error, language) : entry.relativePath}
      aria-label={`${t(entry.kind === 'directory' ? 'files.folder' : 'files.file')} ${entry.name}`}
    >
      <span className={`tree-chevron ${expanded ? 'expanded' : ''} ${entry.kind === 'file' ? 'hidden' : ''}`}><ChevronIcon /></span>
      <span className={entry.kind === 'directory' ? 'folder-color' : 'file-color'}>
        {entry.kind === 'directory' ? <FolderIcon /> : <FileIcon />}
      </span>
      <span className="tree-name">{entry.name}</span>
    </button>
    {expanded && children?.map(child => <TreeNode
      key={child.relativePath}
      entry={child}
      depth={depth + 1}
      repositoryKey={repositoryKey}
      expandedPaths={expandedPaths}
      refreshVersion={refreshVersion}
      onExpandedChange={onExpandedChange}
      onContextMenu={onContextMenu}
    />)}
  </>
}

interface FileTreeProps {
  repositoryKey?: string
  expandedPaths: string[]
  scrollTop: number
  refreshVersion: number
  onExpandedPathsChange(paths: string[]): void
  onScrollTopChange(scrollTop: number): void
}

interface ContextMenuProps {
  state: ContextMenuState
  expanded: boolean
  onClose(): void
  onOpenFile(): void
  onShowInExplorer(): void
  onCopyPath(absolute: boolean): void
  onToggleFolder(): void
}

function TreeContextMenu({ state, expanded, onClose, onOpenFile, onShowInExplorer, onCopyPath, onToggleFolder }: ContextMenuProps) {
  const { t } = useI18n()
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>()
  const isDirectory = state.entry.kind === 'directory'

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const bounds = menu.getBoundingClientRect()
    setPosition({
      left: Math.max(8, Math.min(state.x, window.innerWidth - bounds.width - 8)),
      top: Math.max(8, Math.min(state.y, window.innerHeight - bounds.height - 8)),
    })
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [state])

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    const closeOnViewportChange = () => onClose()
    window.addEventListener('pointerdown', closeOnOutsidePointer, true)
    window.addEventListener('keydown', closeOnEscape, true)
    window.addEventListener('scroll', closeOnViewportChange, true)
    window.addEventListener('resize', closeOnViewportChange)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer, true)
      window.removeEventListener('keydown', closeOnEscape, true)
      window.removeEventListener('scroll', closeOnViewportChange, true)
      window.removeEventListener('resize', closeOnViewportChange)
    }
  }, [onClose])

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      onClose()
      return
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | undefined
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1
    if (nextIndex !== undefined) {
      event.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  const style: CSSProperties = {
    left: position?.left ?? state.x,
    top: position?.top ?? state.y,
    visibility: position ? 'visible' : 'hidden',
  }

  return createPortal(<div
    ref={menuRef}
    className="tree-context-menu"
    style={style}
    role="menu"
    aria-label={t('files.menu', { kind: t(isDirectory ? 'files.folder' : 'files.file'), name: state.entry.name })}
    onKeyDown={handleMenuKeyDown}
    onContextMenu={event => event.preventDefault()}
  >
    {isDirectory
      ? <button role="menuitem" type="button" onClick={onToggleFolder}>{expanded ? t('files.collapseFolder') : t('files.expandFolder')}</button>
      : <button role="menuitem" type="button" onClick={onOpenFile}>{t('files.open')}</button>}
    <button role="menuitem" type="button" onClick={onShowInExplorer}>{t('files.reveal')}</button>
    <button role="menuitem" type="button" onClick={() => onCopyPath(true)}>{t('files.copyAbsolute')}</button>
    <button role="menuitem" type="button" onClick={() => onCopyPath(false)}>{t('files.copyRelative')}</button>
  </div>, document.body)
}

export function FileTree({
  repositoryKey,
  expandedPaths,
  scrollTop,
  refreshVersion,
  onExpandedPathsChange,
  onScrollTopChange,
}: FileTreeProps) {
  const { language, t } = useI18n()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [contextMenu, setContextMenu] = useState<ContextMenuState>()
  const [actionNotice, setActionNotice] = useState<{ key?: TranslationKey; detail?: string }>()
  const treeRef = useRef<HTMLDivElement>(null)
  const loadedRepositoryKey = useRef<string | undefined>(undefined)
  const repositoryKeyRef = useRef(repositoryKey)
  const loadSequence = useRef(0)
  repositoryKeyRef.current = repositoryKey
  const expanded = new Set(expandedPaths)

  const closeContextMenu = useCallback(() => setContextMenu(undefined), [])

  const load = useCallback(async () => {
    const request = ++loadSequence.current
    if (!repositoryKey) return
    const initialLoad = loadedRepositoryKey.current !== repositoryKey
    if (initialLoad) {
      setLoading(true)
      setEntries([])
    }
    setError(undefined)
    try {
      const nextEntries = await window.companion.readDirectory('', repositoryKey)
      if (request !== loadSequence.current || repositoryKeyRef.current !== repositoryKey) return
      setEntries(nextEntries)
      loadedRepositoryKey.current = repositoryKey
    } catch (reason) {
      if (request !== loadSequence.current || repositoryKeyRef.current !== repositoryKey) return
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (request === loadSequence.current && repositoryKeyRef.current === repositoryKey) setLoading(false)
    }
  }, [refreshVersion, repositoryKey])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setContextMenu(undefined); setActionNotice(undefined) }, [repositoryKey])
  useEffect(() => {
    if (treeRef.current) treeRef.current.scrollTop = scrollTop
  }, [repositoryKey, loading, scrollTop])

  const changeExpanded = (relativePath: string, isExpanded: boolean) => {
    const next = new Set(expandedPaths)
    if (isExpanded) next.add(relativePath)
    else next.delete(relativePath)
    onExpandedPathsChange([...next])
  }

  const handleContextMenu = (entry: FileEntry, x: number, y: number) => {
    if (!repositoryKey) return
    setActionNotice(undefined)
    setContextMenu({ entry, repositoryKey, x, y })
  }

  const runAction = async (action: () => Promise<void>, successKey: TranslationKey) => {
    closeContextMenu()
    try {
      await action()
      setActionNotice({ key: successKey })
    } catch (reason) {
      setActionNotice({ detail: reason instanceof Error ? reason.message : String(reason) })
    }
  }

  if (!repositoryKey) return <div className="panel-empty">{t('files.waiting')}</div>
  if (error) return <div className="panel-empty error-text">{localizeRuntimeMessage(error, language)}</div>
  if (loading || loadedRepositoryKey.current !== repositoryKey) {
    return <div className="panel-empty"><span className="spinner" />{t('files.loading')}</div>
  }

  return <div
    className="file-tree"
    ref={treeRef}
    onScroll={event => onScrollTopChange(event.currentTarget.scrollTop)}
  >
    {entries.map(entry => <TreeNode
      key={entry.relativePath}
      entry={entry}
      depth={0}
      repositoryKey={repositoryKey}
      expandedPaths={expanded}
      refreshVersion={refreshVersion}
      onExpandedChange={changeExpanded}
      onContextMenu={handleContextMenu}
    />)}
    {actionNotice && <div className="tree-action-notice" role="status" aria-live="polite">
      {actionNotice.detail ? localizeRuntimeMessage(actionNotice.detail, language) : actionNotice.key ? t(actionNotice.key) : ''}
    </div>}
    {contextMenu && contextMenu.repositoryKey === repositoryKey && <TreeContextMenu
      state={contextMenu}
      expanded={expanded.has(contextMenu.entry.relativePath)}
      onClose={closeContextMenu}
      onOpenFile={() => {
        if (contextMenu.entry.kind === 'file') void runAction(async () => {
          const openError = await window.companion.openFile(contextMenu.entry.relativePath, contextMenu.repositoryKey)
          if (openError) throw new Error(openError)
        }, 'files.opened')
      }}
      onShowInExplorer={() => void runAction(async () => {
        await window.companion.showInExplorer(contextMenu.entry.relativePath, contextMenu.repositoryKey)
      }, 'files.revealed')}
      onCopyPath={absolute => void runAction(async () => {
        await window.companion.copyRepositoryPath(contextMenu.entry.relativePath, contextMenu.repositoryKey, absolute)
      }, absolute ? 'files.absoluteCopied' : 'files.relativeCopied')}
      onToggleFolder={() => {
        if (contextMenu.entry.kind === 'directory') {
          changeExpanded(contextMenu.entry.relativePath, !expanded.has(contextMenu.entry.relativePath))
          closeContextMenu()
        }
      }}
    />}
  </div>
}
