import { hashCommitState, maximumDiffBytes } from './ai-commit'

export interface DesktopCommitSnapshot {
  success: boolean
  message: string
  repositoryName?: string
  summaryEmpty?: boolean
  descriptionEmpty?: boolean
  selectedFiles?: string[]
  partialFiles?: string[]
  commitFileCount?: number
  selectedViewFileCount?: number
  visibleFilePath?: string
  lineCheckboxCount?: number
  checkedLineCheckboxCount?: number
}

export interface DesktopCommitScopeInput {
  repositoryId: number
  expectedRoot: string
  actualRoot: string
  windows: boolean
  branch: string
  status: string
  diff: string
  numstat: string
  desktop: DesktopCommitSnapshot
}

export function resolveDesktopCommitScope(input: DesktopCommitScopeInput) {
  const { desktop } = input
  const changedFiles = desktop.selectedFiles ?? []
  if (changedFiles.length === 0) {
    throw new Error('GitHub Desktop에 커밋 대상으로 체크된 파일이 없어. 선택 상태를 확인해줘.')
  }
  if (desktop.commitFileCount !== changedFiles.length) {
    throw new Error(`GitHub Desktop은 ${desktop.commitFileCount ?? '알 수 없는 수'}개 파일을 커밋 대상으로 표시하지만 ${changedFiles.length}개 경로만 읽었어. 목록이 가상화되었거나 선택 범위를 확인할 수 없어 생성을 중단했어.`)
  }
  if ((desktop.partialFiles ?? []).length > 0) {
    throw new Error(`GitHub Desktop에서 일부 라인만 선택한 파일이 있어 (${(desktop.partialFiles ?? []).join(', ')}). 선택한 부분 diff를 확정할 수 없어 메시지 생성을 중단했어.`)
  }

  const relativePaths = changedFiles.map(file => file.replaceAll('\\', '/'))
  if (relativePaths.some(relativePath => (
    !relativePath || relativePath.startsWith('/') || /^[A-Za-z]:/.test(relativePath) ||
    relativePath.split('/').includes('..')
  ))) {
    throw new Error('GitHub Desktop에서 안전한 상대 파일 경로를 확인하지 못했어.')
  }
  if (relativePaths.length === 1 && (
    desktop.selectedViewFileCount !== 1 || desktop.visibleFilePath?.replaceAll('\\', '/') !== relativePaths[0]
  )) {
    throw new Error('체크된 커밋 파일과 현재 diff 파일이 달라. GitHub Desktop에서 파일 하나를 선택해 범위를 확인해줘.')
  }

  const normalizedRoot = input.actualRoot.trim()
  const rootMatches = input.windows
    ? normalizedRoot.toLocaleLowerCase() === input.expectedRoot.toLocaleLowerCase()
    : normalizedRoot === input.expectedRoot
  if (!rootMatches) throw new Error('Git 저장소 경로가 GitHub Desktop에서 선택한 저장소와 일치하지 않아.')
  if (!input.branch.trim()) throw new Error('브랜치 정보를 확인할 수 없어 커밋 메시지를 만들지 않았어.')

  if (input.status.split('\0').some(entry => (
    entry.startsWith('??') && relativePaths.includes(entry.slice(3).replaceAll('\\', '/'))
  ))) {
    throw new Error('선택 범위에 아직 추적되지 않는 새 파일이 포함돼 있어. 새 파일의 정확한 커밋 diff를 확인할 수 없어 생성을 중단했어.')
  }
  if (!input.diff.trim()) throw new Error('선택한 파일에서 커밋할 변경을 확인하지 못했어. 전체 변경 사항을 대신 보내지 않았어.')
  if (Buffer.byteLength(input.diff, 'utf8') > maximumDiffBytes) {
    throw new Error('커밋 대상 diff가 256KB를 넘어 Gemini에 보내지 않았어.')
  }

  const [addedText, deletedText] = input.numstat.trim().split('\t').slice(0, 2)
  const totalChangedLines = addedText === '-' || deletedText === '-'
    ? 0
    : Number(addedText || 0) + Number(deletedText || 0)
  if (relativePaths.length === 1 && totalChangedLines > 0 && desktop.lineCheckboxCount !== totalChangedLines) {
    throw new Error(`선택 파일의 변경 라인 ${totalChangedLines}개 중 ${desktop.lineCheckboxCount ?? 0}개만 GitHub Desktop에서 확인돼. 부분 선택 여부를 확정할 수 없어 메시지를 만들지 않았어.`)
  }
  if ((desktop.checkedLineCheckboxCount ?? 0) !== (desktop.lineCheckboxCount ?? -1)) {
    throw new Error('GitHub Desktop에서 일부 변경 라인만 선택된 것으로 보여. 선택한 부분 diff를 안전하게 재구성할 수 없어 생성을 중단했어.')
  }

  return {
    branch: input.branch.trim(),
    diff: input.diff,
    changedFiles,
    selectionMode: 'github-desktop-selection' as const,
    fingerprint: hashCommitState([
      input.repositoryId.toString(), input.expectedRoot, input.branch, input.status, input.diff,
      JSON.stringify(changedFiles), desktop.visibleFilePath ?? '',
      JSON.stringify(desktop.partialFiles ?? []), String(desktop.commitFileCount),
      String(desktop.lineCheckboxCount), String(desktop.checkedLineCheckboxCount),
    ]),
  }
}
