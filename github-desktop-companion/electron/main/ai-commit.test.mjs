import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('./ai-commit.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { hashCommitState, parseCommitDraft, requestCommitDraft, requestGeminiModels } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
const scopeSource = await readFile(new URL('./commit-scope.ts', import.meta.url), 'utf8')
const scopeCompiled = ts.transpileModule(scopeSource.replace(
  "import { hashCommitState, maximumDiffBytes } from './ai-commit'",
  "import { createHash } from 'node:crypto'\nconst hashCommitState = parts => createHash('sha256').update(parts.join('\\0')).digest('hex')\nconst maximumDiffBytes = 256 * 1024",
), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { resolveDesktopCommitScope } = await import(
  `data:text/javascript;base64,${Buffer.from(scopeCompiled).toString('base64')}`
)

const validScopeInput = (overrides = {}) => ({
  repositoryId: 1,
  expectedRoot: '/repos/example',
  actualRoot: '/repos/example',
  windows: false,
  branch: 'main\n',
  status: ' M src/file.ts\0',
  diff: 'diff --git a/src/file.ts b/src/file.ts\n+const value = 1\n',
  numstat: '1\t0\tsrc/file.ts\n',
  desktop: {
    success: true,
    message: '',
    selectedFiles: ['src/file.ts'],
    partialFiles: [],
    commitFileCount: 1,
    selectedViewFileCount: 1,
    visibleFilePath: 'src/file.ts',
    lineCheckboxCount: 1,
    checkedLineCheckboxCount: 1,
  },
  ...overrides,
})

test('parses a Korean Summary and Description from Gemini JSON output', () => {
  const draft = parseCommitDraft({
    candidates: [{ content: { parts: [{ text: '{"summary":"feat(ai): 커밋 메시지 생성","description":"선택된 변경을 요약해."}' }] } }],
  })

  assert.deepEqual(draft, {
    summary: 'feat(ai): 커밋 메시지 생성',
    description: '선택된 변경을 요약해.',
  })
})

test('rejects malformed or multiline commit summaries', () => {
  assert.throws(() => parseCommitDraft({ candidates: [{ content: { parts: [{ text: '설명만 반환' }] } }] }), /JSON/)
  assert.throws(() => parseCommitDraft({ candidates: [{ content: { parts: [{ text: '{"summary":"첫 줄\\n둘째 줄","description":""}' }] } }] }), /한 줄/)
})

test('fingerprints commit scope inputs deterministically', () => {
  assert.equal(hashCommitState(['main', 'diff']), hashCommitState(['main', 'diff']))
  assert.notEqual(hashCommitState(['main', 'diff']), hashCommitState(['main', 'changed']))
})

test('sends the selected diff and structured output request to Gemini', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestInit
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestInit = init
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"summary":"fix(ui): 입력 상태 보호","description":""}' }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const draft = await requestCommitDraft(
      'test-api-key', 'gemini-test-model', '한국어 지시사항', 'RepoSide', 'main', 'diff --git a/file b/file',
    )
    const body = JSON.parse(requestInit.body)
    assert.equal(draft.summary, 'fix(ui): 입력 상태 보호')
    assert.match(requestUrl, /gemini-test-model:generateContent$/)
    assert.equal(requestInit.headers['x-goog-api-key'], 'test-api-key')
    assert.doesNotMatch(requestUrl, /test-api-key/)
    assert.doesNotMatch(requestInit.body, /test-api-key/)
    assert.equal(body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON')
    assert.match(body.contents[0].parts[0].text, /diff --git a\/file b\/file/)
    assert.match(body.contents[0].parts[0].text, /현재 커밋 범위로 확인된 Git diff/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('lists only Gemini models that support generateContent', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestInit
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestInit = init
    return new Response(JSON.stringify({ models: [
      { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemma-3-12b', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/other-model', supportedGenerationMethods: ['generateContent'] },
    ] }), { status: 200 })
  }
  try {
    assert.deepEqual(await requestGeminiModels('mock-key'), ['gemini-2.0-flash', 'gemma-3-12b'])
    assert.equal(requestUrl, 'https://generativelanguage.googleapis.com/v1beta/models')
    assert.equal(requestInit.headers['x-goog-api-key'], 'mock-key')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('surfaces Gemini HTTP failures without placing the API key in the request URL', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  globalThis.fetch = async input => {
    requestUrl = String(input)
    return new Response(JSON.stringify({ error: { message: 'mock permission denied' } }), { status: 403 })
  }
  try {
    await assert.rejects(requestCommitDraft('secret-mock-key', 'gemini-test-model', 'instruction', 'RepoSide', 'main', 'diff'), /mock permission denied/)
    assert.doesNotMatch(requestUrl, /secret-mock-key/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('accepts only the complete GitHub Desktop selection and binds its fingerprint to branch and diff', () => {
  const scope = resolveDesktopCommitScope(validScopeInput())
  assert.deepEqual(scope.changedFiles, ['src/file.ts'])
  assert.equal(scope.diff, validScopeInput().diff)
  assert.equal(scope.selectionMode, 'github-desktop-selection')
  assert.notEqual(scope.fingerprint, resolveDesktopCommitScope(validScopeInput({ branch: 'feature\n' })).fingerprint)
  assert.notEqual(scope.fingerprint, resolveDesktopCommitScope(validScopeInput({ diff: 'different diff' })).fingerprint)
  assert.equal(scope.fingerprint, resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop,
    selectedViewFileCount: 2,
    visibleFilePath: 'src/unrelated-preview.ts',
    lineCheckboxCount: 7,
    checkedLineCheckboxCount: 0,
  } })).fingerprint)
  assert.doesNotThrow(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop,
    visibleFilePath: 'src/unrelated-preview.ts',
    lineCheckboxCount: 7,
    checkedLineCheckboxCount: 0,
  } })))
  assert.notEqual(scope.fingerprint, resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, selectedFiles: ['other.ts'], visibleFilePath: 'other.ts',
  } })).fingerprint)
})

test('fails closed when the visible file list is virtualized or the commit count is unknown', () => {
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, commitFileCount: 3,
  } })), /목록이 가상화/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, commitFileCount: undefined,
  } })), /알 수 없는 수/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, selectedFiles: [], commitFileCount: 0,
  } })), /체크된 파일이 없어/)
})

test('refuses partial files, partial lines, truncated line lists, and untracked selected files', () => {
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, partialFiles: ['src/file.ts'],
  } })), /일부 라인만 선택/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, checkedLineCheckboxCount: 0,
  } })), /일부 변경 라인만 선택/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
    ...validScopeInput().desktop, lineCheckboxCount: 0, checkedLineCheckboxCount: 0,
  } })), /개만 GitHub Desktop에서 확인돼/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({
    status: '?? src/file.ts\0',
  })), /추적되지 않는 새 파일/)
})

test('rejects unsafe paths, repository mismatches, empty branches, and empty selected diffs', () => {
  for (const file of ['../outside', '/etc/passwd', 'C:\\outside']) {
    assert.throws(() => resolveDesktopCommitScope(validScopeInput({ desktop: {
      ...validScopeInput().desktop, selectedFiles: [file], visibleFilePath: file,
    } })), /안전한 상대 파일 경로/)
  }
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ actualRoot: '/other/repo' })), /저장소 경로/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ branch: '  ' })), /브랜치 정보/)
  assert.throws(() => resolveDesktopCommitScope(validScopeInput({ diff: '  ' })), /변경을 확인하지 못했어/)
})
