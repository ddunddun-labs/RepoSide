import { readdir, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const appDirectoryName = 'GitHub Desktop'

async function isDirectory(candidate) {
  try {
    return (await stat(candidate)).isDirectory()
  } catch {
    return false
  }
}

async function findWslProfiles() {
  const usersRoot = '/mnt/c/Users'
  const entries = await readdir(usersRoot, { withFileTypes: true })
  const matches = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const candidate = path.join(
      usersRoot,
      entry.name,
      'AppData',
      'Roaming',
      appDirectoryName
    )

    if (await isDirectory(candidate)) matches.push(candidate)
  }

  return matches
}

export async function resolveGitHubDesktopDataDirectory(explicitPath) {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath)
    if (!(await isDirectory(resolved))) {
      throw new Error(`GitHub Desktop data directory not found: ${resolved}`)
    }
    return resolved
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    const candidate = path.join(process.env.APPDATA, appDirectoryName)
    if (await isDirectory(candidate)) return candidate
  }

  if (os.release().toLowerCase().includes('microsoft')) {
    const matches = await findWslProfiles()
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) {
      throw new Error(
        `Multiple GitHub Desktop profiles found. Use --data-dir.\n${matches.join('\n')}`
      )
    }
  }

  throw new Error('GitHub Desktop data directory not found. Use --data-dir <path>.')
}

export function getStoragePaths(dataDirectory) {
  return {
    dataDirectory,
    localStorageDirectory: path.join(dataDirectory, 'Local Storage', 'leveldb'),
    indexedDbDirectory: path.join(
      dataDirectory,
      'IndexedDB',
      'file__0.indexeddb.leveldb'
    ),
  }
}
