#!/usr/bin/env node

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  getStoragePaths,
  resolveGitHubDesktopDataDirectory,
} from '../../github-desktop-companion/electron/main/detector/github-desktop-storage.mjs'
import {
  getRepositoryName,
  inspectIndexedDbRepositories,
} from '../../github-desktop-companion/electron/main/detector/indexeddb-inspector.mjs'
import { readLastSelectedRepositoryId } from '../../github-desktop-companion/electron/main/detector/local-storage-wal.mjs'

function parseArguments(argv) {
  const options = { watch: false, inspectIndexedDb: false, interval: 250 }

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--watch') options.watch = true
    else if (argument === '--inspect-indexeddb') options.inspectIndexedDb = true
    else if (argument === '--data-dir') options.dataDirectory = argv[++index]
    else if (argument === '--interval') options.interval = Number.parseInt(argv[++index], 10)
    else if (argument === '--help' || argument === '-h') options.help = true
    else throw new Error(`Unknown argument: ${argument}`)
  }

  if (!Number.isInteger(options.interval) || options.interval < 50) {
    throw new Error('--interval must be an integer of at least 50 milliseconds.')
  }
  return options
}

function printHelp() {
  console.log(`GitHub Desktop Companion detector PoC

Usage:
  node src/index.mjs [--watch] [--inspect-indexeddb]
                     [--data-dir <path>] [--interval <ms>]

Options:
  --watch                Poll Local Storage and report repository ID changes
  --inspect-indexeddb    Print repository-like paths found in IndexedDB
  --data-dir <path>      Override the GitHub Desktop user data directory
  --interval <ms>        Polling interval (default: 250)
`)
}

async function getStorageSignature(localStorageDirectory) {
  const files = (await readdir(localStorageDirectory))
    .filter(file => /^\d+\.(?:log|ldb)$/.test(file))
    .sort()

  const details = await Promise.all(
    files.map(async file => {
      const metadata = await stat(path.join(localStorageDirectory, file))
      return `${file}:${metadata.size}:${metadata.mtimeMs}`
    })
  )

  return details.join('|')
}

async function run() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) return printHelp()

  const dataDirectory = await resolveGitHubDesktopDataDirectory(options.dataDirectory)
  const storage = getStoragePaths(dataDirectory)
  console.log(`GitHub Desktop data: ${storage.dataDirectory}`)

  if (options.inspectIndexedDb) {
    const repositories = await inspectIndexedDbRepositories(storage.indexedDbDirectory)
    console.log('\nIndexedDB repositories:')
    for (const repository of repositories) {
      console.log(
        `- ID ${repository.id}: ${getRepositoryName(repository)} ` +
        `(${repository.path}, missing: ${repository.missing ?? 'unknown'}, ` +
        `source: ${repository.source})`
      )
    }
    if (repositories.length === 0) console.log('(none found)')
  }

  let lastId
  let lastSignature

  const detect = async force => {
    const signature = await getStorageSignature(storage.localStorageDirectory)
    if (!force && signature === lastSignature) return
    lastSignature = signature

    const result = await readLastSelectedRepositoryId(storage.localStorageDirectory)
    if (force || result.id !== lastId) {
      const repositories = await inspectIndexedDbRepositories(storage.indexedDbDirectory)
      const repository = repositories.find(candidate => candidate.id === result.id)
      const label = lastId === undefined ? 'Current repository' : 'Repository changed'
      console.log(`\n${label}:`)
      console.log(`ID: ${result.id ?? '(none)'}`)
      if (repository) {
        console.log(`Name: ${getRepositoryName(repository)}`)
        console.log(`Path: ${repository.path}`)
        console.log(`Missing: ${repository.missing ?? '(unknown)'}`)
      } else if (result.id !== null) {
        console.log('Path: (not decoded from IndexedDB)')
      }
      console.log(`LevelDB sequence: ${result.sequence}`)
      console.log(`Source: ${result.source}`)
      lastId = result.id
    }
  }

  await detect(true)
  if (!options.watch) return

  console.log(`\nWatching every ${options.interval}ms... Press Ctrl+C to stop.`)
  let running = false
  setInterval(async () => {
    if (running) return
    running = true
    try {
      await detect(false)
    } catch (error) {
      console.error(`[detector] ${error.message}`)
    } finally {
      running = false
    }
  }, options.interval)
}

run().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
