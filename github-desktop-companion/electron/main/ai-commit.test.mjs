import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('./ai-commit.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { hashCommitState, parseCommitDraft, requestCommitDraft } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

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
    assert.equal(body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON')
    assert.match(body.contents[0].parts[0].text, /diff --git a\/file b\/file/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
