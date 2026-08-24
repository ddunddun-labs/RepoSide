import { copyFile, mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function createStorageSnapshot(sourceDirectory) {
  const snapshotDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'github-desktop-companion-')
  )

  try {
    const files = await readdir(sourceDirectory, { withFileTypes: true })
    for (const file of files) {
      if (!file.isFile() || file.name === 'LOCK') continue
      await copyFile(
        path.join(sourceDirectory, file.name),
        path.join(snapshotDirectory, file.name)
      )
    }
    return snapshotDirectory
  } catch (error) {
    await rm(snapshotDirectory, { recursive: true, force: true })
    throw error
  }
}

export async function removeStorageSnapshot(snapshotDirectory) {
  const expectedRoot = path.resolve(os.tmpdir()) + path.sep
  const resolved = path.resolve(snapshotDirectory)
  if (!resolved.startsWith(expectedRoot) || !path.basename(resolved).startsWith('github-desktop-companion-')) {
    throw new Error(`Refusing to remove unexpected snapshot path: ${resolved}`)
  }
  await rm(resolved, { recursive: true, force: true })
}
