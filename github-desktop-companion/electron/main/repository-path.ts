import path from 'node:path'

export function assertExpectedRepository(activeRepositoryKey: string | undefined, expectedRepositoryKey?: string) {
  if (expectedRepositoryKey !== undefined && activeRepositoryKey !== expectedRepositoryKey) {
    throw new Error('저장소가 변경되어 작업을 취소했어. 다시 시도해줘.')
  }
}

export function resolveSafeRepositoryPath(
  repositoryRoot: string | undefined,
  relativePath: string,
  pathApi: typeof path = path,
) {
  if (!repositoryRoot) throw new Error('No linked Repository.')
  if (typeof relativePath !== 'string' || pathApi.isAbsolute(relativePath)) {
    throw new Error('Absolute paths are not allowed.')
  }

  const root = pathApi.resolve(repositoryRoot)
  const target = pathApi.resolve(root, relativePath)
  const relation = pathApi.relative(root, target)
  if (relation === '..' || relation.startsWith(`..${pathApi.sep}`) || pathApi.isAbsolute(relation)) {
    throw new Error('The requested path is outside the linked Repository.')
  }
  return target
}
