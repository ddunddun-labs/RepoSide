import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileEntry } from '../shared/types'
import { ChevronIcon, FileIcon, FolderIcon } from './icons'

interface TreeNodeProps {
  entry: FileEntry
  depth: number
  expandedPaths: Set<string>
  onExpandedChange(path: string, expanded: boolean): void
}

function TreeNode({ entry, depth, expandedPaths, onExpandedChange }: TreeNodeProps) {
  const expanded = entry.kind === 'directory' && expandedPaths.has(entry.relativePath)
  const [children, setChildren] = useState<FileEntry[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!expanded || children) return
    let cancelled = false
    void window.companion.readDirectory(entry.relativePath).then(result => {
      if (!cancelled) setChildren(result)
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { cancelled = true }
  }, [children, entry.relativePath, expanded])

  const openFile = async () => {
    if (entry.kind !== 'file') return
    const openError = await window.companion.openFile(entry.relativePath)
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
        void window.companion.showInExplorer(entry.relativePath)
      }}
      title={error ?? entry.relativePath}
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
      expandedPaths={expandedPaths}
      onExpandedChange={onExpandedChange}
    />)}
  </>
}

interface FileTreeProps {
  repositoryKey?: string
  expandedPaths: string[]
  scrollTop: number
  onExpandedPathsChange(paths: string[]): void
  onScrollTopChange(scrollTop: number): void
}

export function FileTree({
  repositoryKey,
  expandedPaths,
  scrollTop,
  onExpandedPathsChange,
  onScrollTopChange,
}: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const treeRef = useRef<HTMLDivElement>(null)
  const expanded = new Set(expandedPaths)

  const load = useCallback(async () => {
    if (!repositoryKey) return
    setLoading(true)
    setEntries([])
    setError(undefined)
    try {
      setEntries(await window.companion.readDirectory(''))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [repositoryKey])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (treeRef.current) treeRef.current.scrollTop = scrollTop
  }, [repositoryKey, loading, scrollTop])

  const changeExpanded = (relativePath: string, isExpanded: boolean) => {
    const next = new Set(expandedPaths)
    if (isExpanded) next.add(relativePath)
    else next.delete(relativePath)
    onExpandedPathsChange([...next])
  }

  if (!repositoryKey) return <div className="panel-empty">Repository 연결을 기다리는 중이야.</div>
  if (loading) return <div className="panel-empty"><span className="spinner" />파일을 불러오는 중...</div>
  if (error) return <div className="panel-empty error-text">{error}</div>

  return <div
    className="file-tree"
    ref={treeRef}
    onScroll={event => onScrollTopChange(event.currentTarget.scrollTop)}
  >
    {entries.map(entry => <TreeNode
      key={entry.relativePath}
      entry={entry}
      depth={0}
      expandedPaths={expanded}
      onExpandedChange={changeExpanded}
    />)}
  </div>
}
