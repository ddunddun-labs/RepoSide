import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../../src/i18n.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const i18n = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('English and Korean resources contain every typed translation key', () => {
  const englishKeys = Object.keys(i18n.translationResources.en).sort()
  const koreanKeys = Object.keys(i18n.translationResources.ko).sort()
  assert.deepEqual(koreanKeys, englishKeys)
  for (const key of englishKeys) {
    assert.equal(i18n.translate('en', key), i18n.translationResources.en[key])
    assert.equal(i18n.translate('ko', key), i18n.translationResources.ko[key])
  }
})

test('a missing localized string falls back to English and interpolates values', () => {
  const resources = {
    en: { 'ai.generatedAndVerified': 'Generated {count} files.' },
    ko: {},
  }
  assert.equal(i18n.translate('ko', 'ai.generatedAndVerified', { count: 3 }, resources), 'Generated 3 files.')
})

test('English is the explicit default and language preferences persist independently', () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  assert.equal(i18n.defaultUiLanguage, 'en')
  assert.equal(i18n.readUiLanguage(storage), 'en')
  assert.equal(i18n.writeUiLanguage(storage, 'ko'), true)
  assert.equal(i18n.readUiLanguage(storage), 'ko')
  assert.equal(values.size, 1)
  assert.equal(values.has('auto-launch-github-desktop'), false)
  assert.equal(values.has('repository-workspace-state-v1'), false)
  assert.equal(i18n.resolveUiLanguage('fr'), 'en')
  assert.equal(i18n.resolveUiLanguage(null), 'en')
})

test('known runtime errors localize while preserving dynamic values', () => {
  assert.equal(
    i18n.localizeRuntimeMessage('GitHub Desktop은 4개 파일을 커밋 대상으로 표시하지만 3개 경로만 읽었어. 확인을 중단했어.', 'en'),
    'GitHub Desktop marks 4 files for commit, but only 3 paths could be read. The selection could not be verified, so generation was stopped.',
  )
  assert.equal(
    i18n.localizeRuntimeMessage('포커스를 이동한 뒤 GitHub Desktop 입력 내용이 유지되지 않았어. Gemini 결과는 RepoSide에 남아 있어.', 'en'),
    i18n.translate('en', 'errors.inputDidNotPersist'),
  )
  assert.equal(
    i18n.localizeRuntimeMessage('Gemini request failed (HTTP 503).', 'ko'),
    'Gemini 요청 실패 (HTTP 503).',
  )
  assert.match(i18n.localizeRuntimeMessage('GitHub Desktop 저장소가 바뀌었어. 현재 저장소: demo-repo', 'en'), /demo-repo/)
})
