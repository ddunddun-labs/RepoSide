import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('./repository-path.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replace("import path from 'node:path'", "const path = await import('node:path')"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { assertExpectedRepository, resolveSafeRepositoryPath } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

test('resolves relative paths within a Windows repository root', () => {
  assert.equal(
    resolveSafeRepositoryPath('C:\\work\\repo', 'src\\file.ts', path.win32),
    'C:\\work\\repo\\src\\file.ts',
  )
  assert.equal(
    resolveSafeRepositoryPath('C:\\work\\repo', '.', path.win32),
    'C:\\work\\repo',
  )
})

test('rejects absolute paths and traversal outside a repository', () => {
  assert.throws(() => resolveSafeRepositoryPath('C:\\work\\repo', 'C:\\outside\\secret', path.win32), /Absolute paths/)
  assert.throws(() => resolveSafeRepositoryPath('C:\\work\\repo', '..\\other\\file', path.win32), /outside/)
  assert.throws(() => resolveSafeRepositoryPath('/work/repo', '../other/file', path.posix), /outside/)
})

test('repository-scoped actions fail closed if the selected repository changed', () => {
  assert.doesNotThrow(() => assertExpectedRepository('42', '42'))
  assert.doesNotThrow(() => assertExpectedRepository('42'))
  assert.throws(() => assertExpectedRepository('43', '42'), /저장소가 변경되어 작업을 취소했어/)
  assert.throws(() => assertExpectedRepository(undefined, '42'), /저장소가 변경되어 작업을 취소했어/)
})
