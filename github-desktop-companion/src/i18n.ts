export type UiLanguage = 'en' | 'ko'

const en = {
  'status.connecting': 'Connecting',
  'status.linked': 'Connected',
  'status.error': 'Error',
  'linkMode.fast': 'Fast',
  'linkMode.delayed': 'Delayed',
  'app.connecting': 'Checking the GitHub Desktop connection…',
  'app.preloadError': 'Could not load the companion API. Check the developer console.',
  'app.rendererError': 'Could not start the app.',
  'header.aiCommit': 'AI Commit',
  'header.generating': 'Generating message…',
  'header.settings': 'Settings',
  'header.settingsTitle': 'Open settings',
  'header.openExplorer': 'Open in Explorer',
  'header.openExplorerTitle': 'Open repository in File Explorer',
  'ai.copyMessage': 'Copy message',
  'ai.copiedMessage': 'The generated title and description were copied to the clipboard.',
  'ai.summary': 'Summary',
  'ai.description': 'Description',
  'ai.settingsLoadFailed': 'Could not load AI Commit settings.',
  'ai.settingsSaveFailed': 'Could not save settings.',
  'ai.settingsSaved': 'AI Commit settings were saved securely.',
  'ai.configureFirst': 'Set up a Gemini API key and model first.',
  'ai.generating': 'Checking the selected files in GitHub Desktop and generating a message with Gemini…',
  'ai.generatedAndVerified': 'Gemini generated a message from {count} selected files, and GitHub Desktop retained both fields after focus changed.',
  'ai.inputNotVerified': 'Gemini generated a message, but GitHub Desktop input could not be verified. {reason}',
  'ai.generationFailed': 'Could not generate an AI commit message.',
  'ai.modelsLoaded': 'Loaded {count} available Gemini models.',
  'ai.modelsLoadFailed': 'Could not load Gemini models.',
  'ai.settingsTitle': 'Settings',
  'ai.settingsClose': 'Close settings',
  'ai.language': 'Language',
  'ai.languageHelp': 'Choose the language used for RepoSide menus and messages. This does not change AI commit instructions or output.',
  'ai.aiCommitSection': 'AI Commit',
  'ai.apiKey': 'Gemini API key',
  'ai.keepSavedKey': 'Leave blank to keep the saved key',
  'ai.apiKeyPlaceholder': 'Paste your Gemini API key',
  'ai.apiKeyHelp': 'Encrypted on this device. The key is never shown in RepoSide or written to logs.',
  'ai.model': 'Model',
  'ai.modelPlaceholder': 'Gemini model name',
  'ai.loading': 'Loading…',
  'ai.loadModels': 'Load available models',
  'ai.instructions': 'Custom AI instructions',
  'ai.configured': 'API key is configured.',
  'ai.notConfigured': 'Save an API key to use AI Commit.',
  'ai.saving': 'Saving…',
  'ai.save': 'Save settings',
  'connection.notRunning': 'GitHub Desktop is not running.',
  'connection.delayed': 'Using delayed connection. Close GitHub Desktop completely to restart it in fast mode.',
  'connection.autoLaunch': 'Launch GitHub Desktop with RepoSide next time',
  'connection.launching': 'Launching…',
  'connection.launchFast': 'Launch in fast mode',
  'files.heading': 'FILES',
  'files.refresh': 'Refresh files',
  'files.expand': 'Expand Files panel',
  'files.collapse': 'Collapse Files panel',
  'files.waiting': 'Waiting for a repository…',
  'files.loading': 'Loading files…',
  'files.file': 'File',
  'files.folder': 'Folder',
  'files.menu': '{kind} {name} actions',
  'files.open': 'Open file',
  'files.reveal': 'Show in Explorer',
  'files.copyAbsolute': 'Copy full path',
  'files.copyRelative': 'Copy relative path',
  'files.expandFolder': 'Expand folder',
  'files.collapseFolder': 'Collapse folder',
  'files.opened': 'File opened.',
  'files.revealed': 'Item shown in Explorer.',
  'files.absoluteCopied': 'Full path copied.',
  'files.relativeCopied': 'Relative path copied.',
  'terminal.close': 'Close {name} terminal',
  'terminal.new': 'New terminal',
  'terminal.heading': 'Terminal',
  'terminal.waiting': 'Waiting for a repository…',
  'terminal.error': 'Terminal error: {reason}',
  'terminal.exited': '[{name} exited with code {code}]',
  'terminal.invalidCwd': '[Companion] The terminal working directory is no longer valid. Run cd .. and return to the repository, or open a new terminal tab.',
  'errors.operationFailed': 'The operation could not be completed. Try again.',
  'errors.desktopInstallNotFound': 'GitHub Desktop was not found. Install the app and try again.',
  'errors.localAppData': 'The Windows LOCALAPPDATA location is unavailable.',
  'errors.pathOutsideRepository': 'The requested path is outside the linked repository.',
  'errors.repositoryIdMissing': 'Repository ID {id} was not found in GitHub Desktop IndexedDB.',
  'errors.repositoryChanged': 'The selected repository changed, so the operation was canceled. Try again.',
  'errors.repositoryListingChanged': 'The selected repository changed, so the file list was not shown. Try again.',
  'errors.invalidPathCopy': 'The path copy request was invalid.',
  'errors.settingsRead': 'Could not read AI Commit settings.',
  'errors.secureStorage': 'The operating system secure storage is unavailable. The API key was not read or saved.',
  'errors.decryptKey': 'Could not decrypt the saved Gemini API key. Enter it again in Settings.',
  'errors.apiKeyRequired': 'Enter and save a Gemini API key first.',
  'errors.apiKeyNotConfigured': 'Save a Gemini API key in AI Commit settings first.',
  'errors.repositoryNotReady': 'The repository selected in GitHub Desktop is not available yet.',
  'errors.repositoryMismatch': 'GitHub Desktop and RepoSide are linked to different repositories. Select the repository again.',
  'errors.originalMessage': 'The GitHub Desktop commit fields already contain text. They were left unchanged.',
  'errors.noSelectedFiles': 'No files are selected for commit in GitHub Desktop. Check the selection.',
  'errors.selectionCount': 'GitHub Desktop marks {expected} files for commit, but only {actual} paths could be read. The selection could not be verified, so generation was stopped.',
  'errors.partialFiles': 'Some files have only partial lines selected in GitHub Desktop ({paths}). The selected diff cannot be verified, so generation was stopped.',
  'errors.unsafePath': 'A safe relative file path could not be verified in GitHub Desktop.',
  'errors.branchUnknown': 'Branch information is unavailable, so no commit message was generated.',
  'errors.untracked': 'The selection contains an untracked file whose exact commit diff cannot be verified. Generation was stopped.',
  'errors.emptyDiff': 'No commit changes were found in the selected files. The full working tree was not used as a substitute.',
  'errors.diffTooLarge': 'The selected diff exceeds 256 KB and was not sent to Gemini.',
  'errors.lineCount': 'Only {known} of {total} changed lines in the selected files could be checked in GitHub Desktop. Partial selection could not be verified.',
  'errors.partialLines': 'GitHub Desktop appears to have only some changed lines selected. The selected diff cannot be safely reconstructed, so generation was stopped.',
  'errors.gitRootMismatch': 'The Git repository path does not match the repository selected in GitHub Desktop.',
  'errors.indexEmpty': 'The GitHub Desktop selection could not be read and the Git index has no staged changes. The full working tree was not used as a substitute.',
  'errors.indexTooLarge': 'The Git index diff exceeds 256 KB and was not sent to Gemini.',
  'errors.windowsOnly': 'GitHub Desktop input integration is available only on Windows.',
  'errors.desktopUnavailable': 'Could not inspect or enter text in GitHub Desktop. Make sure the app is running.',
  'errors.accessibilityUnavailable': 'Could not read GitHub Desktop accessibility data. Restart it with accessibility enabled and try again.',
  'errors.desktopWindowMissing': 'Could not find the GitHub Desktop window. Open the app and try again.',
  'errors.desktopRepositoryUnknown': 'Could not identify the repository selected in GitHub Desktop.',
  'errors.commitFieldsMissing': 'Could not find the commit Summary and Description fields. Make sure GitHub Desktop was started with accessibility enabled.',
  'errors.commitFieldsUnreadable': 'Could not read the current commit fields safely, so the operation was stopped.',
  'errors.desktopRepositoryChanged': 'The GitHub Desktop repository changed to {name}. No text was entered.',
  'errors.selectionChanged': 'The GitHub Desktop file or line selection changed during generation. Nothing was overwritten; the result remains in RepoSide.',
  'errors.generatedSummaryEmpty': 'The generated commit Summary is empty, so nothing was entered.',
  'errors.messageAppeared': 'Text appeared in the GitHub Desktop commit fields. It was left unchanged.',
  'errors.focusTargetMissing': 'Could not find a safe focus target to verify the commit fields. Input was not marked successful.',
  'errors.selectionChangedAfterInput': 'The GitHub Desktop repository or commit selection changed during verification. The message remains, but input was not marked successful.',
  'errors.inputDidNotPersist': 'The GitHub Desktop fields did not retain their text after focus changed. The generated result remains in RepoSide.',
  'errors.geminiEmpty': 'Gemini returned no commit message.',
  'errors.geminiInvalidJson': 'Gemini did not return the Summary and Description as JSON. Try again.',
  'errors.geminiInvalidResponse': 'Gemini returned an invalid response.',
  'errors.geminiInvalidSummary': 'Gemini could not create a valid one-line commit Summary.',
  'errors.geminiModelsHttp': 'Could not load Gemini models (HTTP {status}).',
  'errors.geminiRequestHttp': 'Gemini request failed (HTTP {status}).',
  'errors.geminiRequest': 'Gemini request failed: {detail}',
  'errors.gitHubSelectionFallback': 'GitHub Desktop selection could not be verified, so only staged changes from the Git index were analyzed ({reason}). Review the result and copy it manually.',
  'errors.inputSkipped': '{reason} The generated result was kept, and input was skipped.',
  'errors.repositoryChangedDuringGeneration': 'RepoSide changed repositories during generation. The result was kept, and input was skipped.',
  'errors.indexChangedDuringGeneration': 'The Git index changed during generation. The result was kept, and input was skipped.',
  'errors.scopeChangedDuringGeneration': 'The branch or selected changes changed during generation. The result was kept, and input was skipped for safety.',
  'errors.desktopChangedDuringGeneration': 'The GitHub Desktop repository changed during generation. The result was kept, and input was skipped.',
  'errors.messageAppearedDuringGeneration': 'Text appeared in GitHub Desktop during generation. The result was kept, and existing text was not overwritten.',
  'errors.inputFailed': 'GitHub Desktop input could not be verified.',
} as const

export type TranslationKey = keyof typeof en
type TranslationParams = Record<string, string | number>
type TranslationResource = Partial<Record<TranslationKey, string>>

const ko: Record<TranslationKey, string> = {
  'status.connecting': '연결 중',
  'status.linked': '연결됨',
  'status.error': '오류',
  'linkMode.fast': '빠른 모드',
  'linkMode.delayed': '지연 모드',
  'app.connecting': 'GitHub Desktop 연결을 확인하고 있어.',
  'app.preloadError': 'Companion preload API를 불러오지 못했어. 개발자 콘솔을 확인해줘.',
  'app.rendererError': '앱을 시작하지 못했어.',
  'header.aiCommit': 'AI Commit',
  'header.generating': '메시지 생성 중...',
  'header.settings': '설정',
  'header.settingsTitle': '설정 열기',
  'header.openExplorer': 'Explorer에서 열기',
  'header.openExplorerTitle': '파일 탐색기에서 저장소 열기',
  'ai.copyMessage': '메시지 복사',
  'ai.copiedMessage': '생성한 제목과 본문을 클립보드에 복사했어.',
  'ai.summary': 'Summary',
  'ai.description': 'Description',
  'ai.settingsLoadFailed': 'AI Commit 설정을 불러오지 못했어.',
  'ai.settingsSaveFailed': '설정을 저장하지 못했어.',
  'ai.settingsSaved': 'AI Commit 설정을 안전하게 저장했어.',
  'ai.configureFirst': '먼저 Gemini API 키와 모델을 설정해줘.',
  'ai.generating': 'GitHub Desktop에서 선택한 파일 범위를 확인하고 Gemini가 메시지를 작성하고 있어...',
  'ai.generatedAndVerified': 'Gemini가 선택 파일 {count}개를 바탕으로 메시지를 생성했고, 포커스를 옮긴 뒤에도 GitHub Desktop의 두 입력란에 유지되는 것을 확인했어.',
  'ai.inputNotVerified': 'Gemini 생성은 완료했지만 GitHub Desktop 입력은 확인되지 않았어. {reason}',
  'ai.generationFailed': 'AI 커밋 메시지를 생성하지 못했어.',
  'ai.modelsLoaded': '사용 가능한 Gemini 모델 {count}개를 불러왔어.',
  'ai.modelsLoadFailed': 'Gemini 모델을 불러오지 못했어.',
  'ai.settingsTitle': '설정',
  'ai.settingsClose': '설정 닫기',
  'ai.language': '언어',
  'ai.languageHelp': 'RepoSide 메뉴와 안내에 사용할 언어야. AI 커밋 지시사항과 생성 언어에는 영향을 주지 않아.',
  'ai.aiCommitSection': 'AI Commit',
  'ai.apiKey': 'Gemini API 키',
  'ai.keepSavedKey': '저장된 키를 유지하려면 비워 둬',
  'ai.apiKeyPlaceholder': 'Gemini API 키 입력',
  'ai.apiKeyHelp': '이 기기에 암호화해 저장해. RepoSide 화면이나 로그에는 키를 표시하지 않아.',
  'ai.model': '모델',
  'ai.modelPlaceholder': 'Gemini 모델 이름',
  'ai.loading': '불러오는 중...',
  'ai.loadModels': '사용 가능한 모델 불러오기',
  'ai.instructions': '사용자 지정 AI 지시사항',
  'ai.configured': 'API 키가 설정되어 있어.',
  'ai.notConfigured': 'AI Commit을 사용하려면 API 키를 저장해줘.',
  'ai.saving': '저장 중...',
  'ai.save': '설정 저장',
  'connection.notRunning': 'GitHub Desktop이 실행되지 않았어.',
  'connection.delayed': '지연 연결 중이야. GitHub Desktop을 완전히 종료하면 빠른 모드로 다시 실행할 수 있어.',
  'connection.autoLaunch': '다음부터 RepoSide와 함께 GitHub Desktop 실행',
  'connection.launching': '실행 중...',
  'connection.launchFast': '빠른 모드로 실행',
  'files.heading': '파일',
  'files.refresh': '파일 새로고침',
  'files.expand': '파일 패널 펼치기',
  'files.collapse': '파일 패널 접기',
  'files.waiting': '저장소 연결을 기다리는 중이야.',
  'files.loading': '파일을 불러오는 중...',
  'files.file': '파일',
  'files.folder': '폴더',
  'files.menu': '{kind} {name} 메뉴',
  'files.open': '파일 열기',
  'files.reveal': '탐색기에서 보기',
  'files.copyAbsolute': '전체 경로 복사',
  'files.copyRelative': '상대 경로 복사',
  'files.expandFolder': '폴더 펼치기',
  'files.collapseFolder': '폴더 접기',
  'files.opened': '파일을 열었어.',
  'files.revealed': '탐색기에서 항목을 표시했어.',
  'files.absoluteCopied': '전체 경로를 복사했어.',
  'files.relativeCopied': '상대 경로를 복사했어.',
  'terminal.close': '{name} 터미널 닫기',
  'terminal.new': '새 터미널',
  'terminal.heading': '터미널',
  'terminal.waiting': '저장소 연결을 기다리는 중이야.',
  'terminal.error': '터미널 오류: {reason}',
  'terminal.exited': '[{name} 프로세스가 종료됨, 코드 {code}]',
  'terminal.invalidCwd': '[Companion] 터미널의 작업 디렉터리 참조가 유효하지 않아. cd .. 후 Repository로 다시 들어오거나 새 터미널 탭을 열어줘.',
  'errors.operationFailed': '작업을 완료하지 못했어. 다시 시도해줘.',
  'errors.desktopInstallNotFound': 'GitHub Desktop을 찾지 못했어. 앱을 설치한 뒤 다시 시도해줘.',
  'errors.localAppData': 'Windows LOCALAPPDATA 위치를 확인할 수 없어.',
  'errors.pathOutsideRepository': '요청한 경로가 연결된 저장소 밖에 있어.',
  'errors.repositoryIdMissing': 'GitHub Desktop IndexedDB에서 Repository ID {id}를 찾지 못했어.',
  'errors.repositoryChanged': '선택한 저장소가 바뀌어 작업을 취소했어. 다시 시도해줘.',
  'errors.repositoryListingChanged': '저장소가 바뀌어 파일 목록을 표시하지 않았어. 다시 시도해줘.',
  'errors.invalidPathCopy': '잘못된 경로 복사 요청이야.',
  'errors.settingsRead': 'AI Commit 설정을 읽지 못했어.',
  'errors.secureStorage': '운영체제 보안 저장소를 사용할 수 없어. API 키를 읽거나 저장하지 않았어.',
  'errors.decryptKey': '저장된 Gemini API 키를 복호화하지 못했어. 설정에서 다시 입력해줘.',
  'errors.apiKeyRequired': '먼저 Gemini API 키를 입력하고 저장해줘.',
  'errors.apiKeyNotConfigured': '먼저 AI Commit 설정에서 Gemini API 키를 저장해줘.',
  'errors.repositoryNotReady': 'GitHub Desktop에서 선택한 저장소를 아직 확인하지 못했어.',
  'errors.repositoryMismatch': 'GitHub Desktop과 RepoSide의 저장소가 달라. 다시 선택해줘.',
  'errors.originalMessage': 'GitHub Desktop 커밋 입력란에 기존 내용이 있어. 변경하지 않았어.',
  'errors.noSelectedFiles': 'GitHub Desktop에서 커밋 대상으로 선택한 파일이 없어. 선택 상태를 확인해줘.',
  'errors.selectionCount': 'GitHub Desktop은 커밋 대상으로 파일 {expected}개를 표시하지만 경로 {actual}개만 읽었어. 선택 범위를 확인할 수 없어 생성을 중단했어.',
  'errors.partialFiles': 'GitHub Desktop에서 일부 라인만 선택한 파일이 있어 ({paths}). 선택 diff를 확인할 수 없어 생성을 중단했어.',
  'errors.unsafePath': 'GitHub Desktop에서 안전한 상대 파일 경로를 확인하지 못했어.',
  'errors.branchUnknown': '브랜치 정보를 확인할 수 없어 커밋 메시지를 만들지 않았어.',
  'errors.untracked': '선택 범위에 추적되지 않는 파일이 있어. 정확한 커밋 diff를 확인할 수 없어 생성을 중단했어.',
  'errors.emptyDiff': '선택한 파일에서 커밋할 변경을 확인하지 못했어. 전체 작업 파일을 대신 사용하지 않았어.',
  'errors.diffTooLarge': '선택한 diff가 256KB를 넘어 Gemini에 보내지 않았어.',
  'errors.lineCount': '변경 라인 {total}개 중 {known}개만 GitHub Desktop에서 확인돼. 부분 선택 여부를 확인할 수 없어.',
  'errors.partialLines': 'GitHub Desktop에서 일부 변경 라인만 선택한 것으로 보여. 선택 diff를 안전하게 재구성할 수 없어 생성을 중단했어.',
  'errors.gitRootMismatch': 'Git 저장소 경로가 GitHub Desktop에서 선택한 저장소와 일치하지 않아.',
  'errors.indexEmpty': 'GitHub Desktop 선택 범위를 읽지 못했고 Git index에도 staged 변경이 없어. 전체 작업 파일을 대신 사용하지 않았어.',
  'errors.indexTooLarge': 'Git index diff가 256KB를 넘어 Gemini에 보내지 않았어.',
  'errors.windowsOnly': 'GitHub Desktop 입력 연동은 Windows에서만 사용할 수 있어.',
  'errors.desktopUnavailable': 'GitHub Desktop 상태를 확인하거나 입력하지 못했어. 앱이 실행 중인지 확인해줘.',
  'errors.accessibilityUnavailable': 'GitHub Desktop 접근성 정보를 읽지 못했어. 접근성 창으로 실행한 뒤 다시 시도해줘.',
  'errors.desktopWindowMissing': 'GitHub Desktop 창을 찾지 못했어. 앱을 열고 다시 시도해줘.',
  'errors.desktopRepositoryUnknown': 'GitHub Desktop에서 현재 저장소를 확인하지 못했어.',
  'errors.commitFieldsMissing': '커밋 제목 또는 본문 입력창을 찾지 못했어. GitHub Desktop을 접근성 창으로 실행했는지 확인해줘.',
  'errors.commitFieldsUnreadable': '커밋 입력창의 현재 내용을 확인할 수 없어 안전하게 중단했어.',
  'errors.desktopRepositoryChanged': 'GitHub Desktop 저장소가 {name}(으)로 바뀌었어. 입력하지 않았어.',
  'errors.selectionChanged': '메시지 생성 중 GitHub Desktop 파일 또는 라인 선택이 바뀌었어. 덮어쓰지 않았고 결과는 RepoSide에 보관했어.',
  'errors.generatedSummaryEmpty': '생성된 커밋 제목이 비어 있어 입력하지 않았어.',
  'errors.messageAppeared': 'GitHub Desktop 커밋 입력창에 내용이 생겼어. 기존 내용을 덮어쓰지 않았어.',
  'errors.focusTargetMissing': '커밋 입력 확인을 위한 포커스 대상을 찾지 못했어. 성공으로 표시하지 않았어.',
  'errors.selectionChangedAfterInput': '확인 중 GitHub Desktop 저장소 또는 커밋 대상 파일이 바뀌었어. 입력 성공으로 표시하지 않았어.',
  'errors.inputDidNotPersist': '포커스를 옮긴 뒤 GitHub Desktop 입력 내용이 유지되지 않았어. Gemini 결과는 RepoSide에 남아 있어.',
  'errors.geminiEmpty': 'Gemini 응답에 커밋 메시지가 없어.',
  'errors.geminiInvalidJson': 'Gemini가 제목과 본문을 JSON으로 반환하지 않았어. 다시 시도해줘.',
  'errors.geminiInvalidResponse': 'Gemini 응답 형식이 올바르지 않아.',
  'errors.geminiInvalidSummary': 'Gemini가 유효한 한 줄 커밋 제목을 만들지 못했어.',
  'errors.geminiModelsHttp': 'Gemini 모델 목록을 가져오지 못했어 (HTTP {status}).',
  'errors.geminiRequestHttp': 'Gemini 요청 실패 (HTTP {status}).',
  'errors.geminiRequest': 'Gemini 요청 실패: {detail}',
  'errors.gitHubSelectionFallback': 'GitHub Desktop 선택 범위를 확인하지 못해 Git index의 staged 변경만 분석했어 ({reason}). 결과를 검토하고 직접 복사해줘.',
  'errors.inputSkipped': '{reason} 생성 결과는 보관했고 입력은 건너뛰었어.',
  'errors.repositoryChangedDuringGeneration': 'AI 생성 중 RepoSide의 저장소가 바뀌었어. 생성 결과는 보관했고 입력은 건너뛰었어.',
  'errors.indexChangedDuringGeneration': 'AI 생성 중 Git index가 바뀌었어. 생성 결과는 보관했고 입력은 건너뛰었어.',
  'errors.scopeChangedDuringGeneration': 'AI 생성 중 브랜치 또는 선택한 변경 범위가 바뀌었어. 안전을 위해 입력을 건너뛰었고 결과는 보관했어.',
  'errors.desktopChangedDuringGeneration': 'AI 생성 중 GitHub Desktop 저장소가 바뀌었어. 생성 결과는 보관했고 입력은 건너뛰었어.',
  'errors.messageAppearedDuringGeneration': 'AI 생성 중 GitHub Desktop 입력창에 내용이 생겼어. 기존 내용을 덮어쓰지 않았고 결과는 보관했어.',
  'errors.inputFailed': 'GitHub Desktop 입력을 확인하지 못했어.',
}

export const defaultUiLanguage: UiLanguage = 'en'
export const uiLanguageStorageKey = 'reposide-ui-language-v1'
export const translationResources = { en, ko }

export interface UiLanguageStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readUiLanguage(storage: Pick<UiLanguageStorage, 'getItem'>): UiLanguage {
  try {
    return resolveUiLanguage(storage.getItem(uiLanguageStorageKey))
  } catch {
    return defaultUiLanguage
  }
}

export function writeUiLanguage(storage: Pick<UiLanguageStorage, 'setItem'>, language: UiLanguage) {
  try {
    storage.setItem(uiLanguageStorageKey, language)
    return true
  } catch {
    return false
  }
}

export function resolveUiLanguage(value: string | null | undefined): UiLanguage {
  return value === 'ko' || value === 'en' ? value : defaultUiLanguage
}

export function translate(
  language: UiLanguage,
  key: TranslationKey,
  params: TranslationParams = {},
  resources: { en: TranslationResource; ko: TranslationResource } = translationResources,
) {
  const template = resources[language][key] ?? resources.en[key] ?? key
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => String(params[name] ?? match))
}

const runtimeMessageKeys: Record<string, TranslationKey> = {
  'GitHub Desktop이 실행되지 않았어.': 'connection.notRunning',
  'Companion preload API를 불러오지 못했어. 개발자 콘솔을 확인해줘.': 'app.preloadError',
  'AI Commit 설정을 읽지 못했어.': 'errors.settingsRead',
  '운영체제 보안 저장소를 사용할 수 없어 API 키를 읽지 않았어.': 'errors.secureStorage',
  '운영체제 보안 저장소를 사용할 수 없어 API 키를 저장하지 않았어.': 'errors.secureStorage',
  '저장된 Gemini API 키를 복호화하지 못했어. 설정에서 다시 입력해줘.': 'errors.decryptKey',
  'GitHub Desktop에 커밋 대상으로 체크된 파일이 없어. 선택 상태를 확인해줘.': 'errors.noSelectedFiles',
  'GitHub Desktop에서 일부 변경 라인만 선택된 것으로 보여. 선택한 부분 diff를 안전하게 재구성할 수 없어 메시지 생성을 중단했어.': 'errors.partialLines',
  'GitHub Desktop에서 안전한 상대 파일 경로를 확인하지 못했어.': 'errors.unsafePath',
  'Git 저장소 경로가 GitHub Desktop에서 선택한 저장소와 일치하지 않아.': 'errors.gitRootMismatch',
  'Git index 저장소 경로가 GitHub Desktop에서 선택한 저장소와 일치하지 않아.': 'errors.gitRootMismatch',
  '브랜치 정보를 확인할 수 없어 커밋 메시지를 만들지 않았어.': 'errors.branchUnknown',
  '선택 범위에 아직 추적되지 않는 새 파일이 포함돼 있어. 새 파일의 정확한 커밋 diff를 확인할 수 없어 생성을 중단했어.': 'errors.untracked',
  '선택한 파일에서 커밋할 변경을 확인하지 못했어. 전체 변경 사항을 대신 보내지 않았어.': 'errors.emptyDiff',
  'GitHub Desktop 선택 범위를 읽지 못했고 Git index에도 staged 변경이 없어. 전체 작업 파일을 대신 분석하지 않았어.': 'errors.indexEmpty',
  'Git index diff가 256KB를 넘어 Gemini에 보내지 않았어.': 'errors.indexTooLarge',
  'GitHub Desktop 입력 연동은 Windows에서만 사용할 수 있어.': 'errors.windowsOnly',
  'GitHub Desktop 상태를 확인하거나 입력하지 못했어. 앱이 실행 중인지 확인해줘.': 'errors.desktopUnavailable',
  'GitHub Desktop 접근성 결과를 읽지 못했어. 접근성 창으로 실행한 뒤 다시 시도해줘.': 'errors.accessibilityUnavailable',
  '먼저 Gemini API 키를 설정하고 저장해줘.': 'errors.apiKeyRequired',
  '먼저 AI Commit 설정에서 Gemini API 키를 저장해줘.': 'errors.apiKeyNotConfigured',
  'GitHub Desktop에서 선택된 저장소를 아직 확인하지 못했어.': 'errors.repositoryNotReady',
  'GitHub Desktop과 RepoSide의 저장소가 달라. 다시 선택한 뒤 시도해줘.': 'errors.repositoryMismatch',
  'GitHub Desktop 커밋 입력창에 기존 메시지가 있어. 덮어쓰지 않도록 생성을 중단했어.': 'errors.originalMessage',
  'AI 생성 중 RepoSide의 저장소가 바뀌었어. 생성 결과는 보관했어.': 'errors.repositoryChangedDuringGeneration',
  'AI 생성 중 RepoSide의 저장소가 바뀌었어. 생성 결과를 아래에 보관했고 입력은 건너뛰었어.': 'errors.repositoryChangedDuringGeneration',
  'AI 생성 중 Git index가 바뀌었어. 생성 결과는 보관했고 입력은 건너뛰었어.': 'errors.indexChangedDuringGeneration',
  'AI 생성 중 브랜치 또는 선택된 변경 범위가 바뀌었어. 생성 결과를 아래에 보관했고 안전을 위해 입력은 건너뛰었어.': 'errors.scopeChangedDuringGeneration',
  'AI 생성 중 GitHub Desktop 입력창에 내용이 생겼어. 생성 결과를 아래에 보관했고 덮어쓰지 않았어.': 'errors.messageAppearedDuringGeneration',
  'AI 생성 중 GitHub Desktop 저장소가 바뀌었어. 생성 결과를 아래에 보관했고 입력은 건너뛰었어.': 'errors.desktopChangedDuringGeneration',
  'AI 생성 중 GitHub Desktop 저장소가 바뀌었어. 생성 결과는 아래에 보관했고 입력은 건너뛰었어.': 'errors.desktopChangedDuringGeneration',
  'GitHub Desktop 창을 확인하지 못했어.': 'errors.desktopWindowMissing',
  'GitHub Desktop 창을 찾지 못했어. 앱을 열고 다시 시도해줘.': 'errors.desktopWindowMissing',
  'GitHub Desktop에서 현재 저장소를 확인하지 못했어.': 'errors.desktopRepositoryUnknown',
  '커밋 제목 또는 본문 입력창을 찾지 못했어. GitHub Desktop 접근성 창으로 실행했는지 확인해줘.': 'errors.commitFieldsMissing',
  '커밋 입력창의 현재 내용을 확인할 수 없어 안전하게 중단했어.': 'errors.commitFieldsUnreadable',
  '입력 전에 GitHub Desktop 선택 범위를 다시 확인하지 못했어.': 'errors.selectionChanged',
  'GitHub Desktop의 저장소 파일 또는 라인 선택이 생성 중 바뀌었어. 덮어쓰지 않았고 결과는 RepoSide에 보관했어.': 'errors.selectionChanged',
  '생성된 커밋 제목이 비어 있어 입력하지 않았어.': 'errors.generatedSummaryEmpty',
  'GitHub Desktop 입력창에 기존 메시지가 있어 덮어쓰지 않았어. 내용을 비우고 다시 시도해줘.': 'errors.messageAppeared',
  '커밋 입력 후 상태를 확인할 포커스 대상을 찾지 못했어. 성공으로 표시하지 않았어.': 'errors.focusTargetMissing',
  '입력 확인 중 GitHub Desktop 저장소 또는 커밋 대상 파일이 바뀌었어. 메시지는 유지했으며 성공으로 표시하지 않았어.': 'errors.selectionChangedAfterInput',
  '포커스를 이동한 뒤 GitHub Desktop 입력 내용이 유지되지 않았어. Gemini 결과는 RepoSide에 남아 있어.': 'errors.inputDidNotPersist',
  'Gemini 응답에 커밋 메시지가 없어.': 'errors.geminiEmpty',
  'Gemini가 제목과 본문을 JSON으로 반환하지 않았어. 다시 시도해줘.': 'errors.geminiInvalidJson',
  'Gemini 응답 형식이 올바르지 않아.': 'errors.geminiInvalidResponse',
  'Gemini가 유효한 한 줄 커밋 제목을 만들지 못했어.': 'errors.geminiInvalidSummary',
  '잘못된 경로 복사 요청이야.': 'errors.invalidPathCopy',
  '저장소가 변경되어 작업을 취소했어. 다시 시도해줘.': 'errors.repositoryChanged',
  '저장소가 변경되어 파일 목록을 표시하지 않았어. 다시 시도해줘.': 'errors.repositoryListingChanged',
  '커밋 대상 diff가 256KB를 넘어 Gemini에 보내지 않았어.': 'errors.diffTooLarge',
  'GitHub Desktop 저장소 재확인 실패': 'errors.desktopUnavailable',
  'Git index 확인 실패': 'errors.indexEmpty',
  '상태 확인 실패': 'errors.desktopUnavailable',
  'GitHub Desktop 입력에 실패했어.': 'errors.inputFailed',
}

const englishRuntimeMessageKeys: Record<string, TranslationKey> = {
  'No linked Repository.': 'errors.repositoryNotReady',
  'Absolute paths are not allowed.': 'errors.unsafePath',
  'The requested path is outside the linked Repository.': 'errors.pathOutsideRepository',
  'LOCALAPPDATA is unavailable.': 'errors.localAppData',
  'GitHub Desktop installation not found.': 'errors.desktopInstallNotFound',
}

export function localizeRuntimeMessage(message: string, language: UiLanguage): string {
  if (!message) return message
  if (language === 'ko') {
    const englishKey = englishRuntimeMessageKeys[message]
    if (englishKey) return translate(language, englishKey)
    const repositoryIdMatch = /^Repository ID (\d+) was not found in GitHub Desktop IndexedDB\.$/.exec(message)
    if (repositoryIdMatch) return translate(language, 'errors.repositoryIdMissing', { id: repositoryIdMatch[1] })
    const geminiHttpMatch = /^Gemini request failed \(HTTP (\d+)\)\.$/.exec(message)
    if (geminiHttpMatch) return translate(language, 'errors.geminiRequestHttp', { status: geminiHttpMatch[1] })
    const geminiDetailMatch = /^Gemini request failed: (.*)$/.exec(message)
    if (geminiDetailMatch) return translate(language, 'errors.geminiRequest', { detail: geminiDetailMatch[1] })
    return message
  }
  const key = runtimeMessageKeys[message]
  if (key) return translate(language, key)

  let match = /^Gemini 모델 목록을 가져오지 못했어 \(HTTP (\d+)\)\.$/.exec(message)
  if (match) return translate(language, 'errors.geminiModelsHttp', { status: match[1] })
  match = /^Gemini 요청 실패 \(HTTP (\d+)\)\.$/.exec(message)
  if (match) return translate(language, 'errors.geminiRequestHttp', { status: match[1] })
  match = /^Gemini 요청 실패: (.*)$/.exec(message)
  if (match) return translate(language, 'errors.geminiRequest', { detail: localizeRuntimeMessage(match[1], language) })
  match = /^GitHub Desktop은 (.*?)개 파일을 커밋 대상으로 표시하지만 (.*?)개 경로만 읽었어\..*$/.exec(message)
  if (match) return translate(language, 'errors.selectionCount', {
    expected: match[1] === '알 수 없는 수' ? 'an unknown number of' : match[1],
    actual: match[2],
  })
  match = /^GitHub Desktop에서 일부 라인만 선택한 파일이 있어 \((.*)\)\..*$/.exec(message)
  if (match) return translate(language, 'errors.partialFiles', { paths: match[1] })
  match = /^선택 파일의 변경 라인 (\d+)개 중 (\d+)개만 GitHub Desktop에서 확인돼\..*$/.exec(message)
  if (match) return translate(language, 'errors.lineCount', { total: match[1], known: match[2] })
  match = /^GitHub Desktop의 현재 선택 범위를 확인하지 못해 Git index의 staged 변경만 분석했어 \((.*)\)\..*$/.exec(message)
  if (match) return translate(language, 'errors.gitHubSelectionFallback', { reason: localizeRuntimeMessage(match[1], language) })
  match = /^GitHub Desktop 저장소가 바뀌었어\. 현재 저장소: (.*)$/.exec(message)
  if (match) return translate(language, 'errors.desktopRepositoryChanged', { name: match[1] })
  match = /^(.*?) 생성 결과는 (?:아래에 )?보관했고 입력은 건너뛰었어\.$/.exec(message)
  if (match) return translate(language, 'errors.inputSkipped', { reason: localizeRuntimeMessage(match[1], language) })
  if (/[\uac00-\ud7af]/.test(message)) return translate(language, 'errors.operationFailed')
  return message
}
