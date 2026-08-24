import { open, readdir } from 'node:fs/promises'
import path from 'node:path'
import { readSstableEntries } from './sstable-reader.mjs'
import { createStorageSnapshot, removeStorageSnapshot } from './storage-snapshot.mjs'

const blockSize = 32 * 1024
const headerSize = 7
const targetKey = 'last-selected-repository-id'

function readVarint(buffer, initialOffset) {
  let value = 0
  let multiplier = 1
  let offset = initialOffset

  while (offset < buffer.length && offset - initialOffset < 10) {
    const byte = buffer[offset++]
    value += (byte & 0x7f) * multiplier
    if ((byte & 0x80) === 0) return { value, offset }
    multiplier *= 128
  }

  throw new Error(`Invalid varint at offset ${initialOffset}`)
}

function decodeLocalStorageValue(value) {
  if (value.length === 0) return ''

  // Chromium DOM Storage values use 0 for UTF-16LE and 1 for UTF-8.
  if (value[0] === 0) return value.subarray(1).toString('utf16le')
  if (value[0] === 1) return value.subarray(1).toString('utf8')
  return value.toString('utf8')
}

function parseWriteBatch(record, source, onEntry) {
  if (record.length < 12) return

  const sequence = Number(record.readBigUInt64LE(0))
  const expectedCount = record.readUInt32LE(8)
  let offset = 12
  let entryIndex = 0

  while (offset < record.length && entryIndex < expectedCount) {
    const tag = record[offset++]
    const keyLength = readVarint(record, offset)
    offset = keyLength.offset
    const keyEnd = offset + keyLength.value
    if (keyEnd > record.length) throw new Error(`Truncated key in ${source}`)
    const key = record.subarray(offset, keyEnd)
    offset = keyEnd

    if (tag === 0) {
      onEntry({ sequence: sequence + entryIndex, key, value: null, source })
    } else if (tag === 1) {
      const valueLength = readVarint(record, offset)
      offset = valueLength.offset
      const valueEnd = offset + valueLength.value
      if (valueEnd > record.length) throw new Error(`Truncated value in ${source}`)
      const value = record.subarray(offset, valueEnd)
      offset = valueEnd
      onEntry({ sequence: sequence + entryIndex, key, value, source })
    } else {
      throw new Error(`Unknown WriteBatch tag ${tag} in ${source}`)
    }

    entryIndex++
  }
}

function parseWal(buffer, source, onRecord) {
  let offset = 0
  let fragments = []

  while (offset + headerSize <= buffer.length) {
    const blockOffset = offset % blockSize
    const remainingInBlock = blockSize - blockOffset

    if (remainingInBlock < headerSize) {
      offset += remainingInBlock
      continue
    }

    const length = buffer.readUInt16LE(offset + 4)
    const type = buffer[offset + 6]

    if (length === 0 && type === 0) {
      offset += remainingInBlock
      continue
    }

    const payloadStart = offset + headerSize
    const payloadEnd = payloadStart + length
    if (payloadEnd > buffer.length || length > remainingInBlock - headerSize) break
    const payload = buffer.subarray(payloadStart, payloadEnd)

    if (type === 1) {
      fragments = []
      onRecord(payload)
    } else if (type === 2) {
      fragments = [payload]
    } else if (type === 3 && fragments.length > 0) {
      fragments.push(payload)
    } else if (type === 4 && fragments.length > 0) {
      fragments.push(payload)
      onRecord(Buffer.concat(fragments))
      fragments = []
    }

    offset = payloadEnd
  }
}

function keyMatches(key) {
  const separator = key.indexOf(0)
  const logicalKey = key.subarray(separator >= 0 ? separator + 1 : 0)
  const encodingPrefix = logicalKey[0] === 0 || logicalKey[0] === 1 ? 1 : 0
  return logicalKey.subarray(encodingPrefix).toString('utf8') === targetKey
}

function considerEntry(entry, latest) {
  if (!keyMatches(entry.key)) return latest
  const text = entry.value === null ? null : decodeLocalStorageValue(entry.value)
  const id = text === null ? null : Number.parseInt(text, 10)
  if (text !== null && !Number.isInteger(id)) return latest
  if (!latest || entry.sequence >= latest.sequence) {
    return { id, sequence: entry.sequence, source: entry.source }
  }
  return latest
}

function parseInternalKey(entry, source) {
  if (entry.key.length < 8) return undefined
  const tag = entry.key.readBigUInt64LE(entry.key.length - 8)
  const type = Number(tag & 0xffn)
  const sequence = Number(tag >> 8n)
  if (type !== 0 && type !== 1) return undefined
  return {
    key: entry.key.subarray(0, entry.key.length - 8),
    value: type === 0 ? null : entry.value,
    sequence,
    source,
  }
}

async function readSnapshot(snapshotDirectory) {
  const files = (await readdir(snapshotDirectory))
    .filter(file => /^\d+\.(?:log|ldb)$/.test(file))
    .sort((left, right) => Number.parseInt(left) - Number.parseInt(right))

  let latest

  for (const file of files) {
    const filePath = path.join(snapshotDirectory, file)
    if (file.endsWith('.ldb')) {
      const entries = await readSstableEntries(filePath)
      for (const entry of entries) {
        const decoded = parseInternalKey(entry, file)
        if (decoded) latest = considerEntry(decoded, latest)
      }
      continue
    }

    const handle = await open(filePath, 'r')
    let buffer
    try {
      buffer = await handle.readFile()
    } finally {
      await handle.close()
    }

    parseWal(buffer, file, record => {
      parseWriteBatch(record, file, entry => {
        latest = considerEntry(entry, latest)
      })
    })
  }

  if (!latest) {
    throw new Error(
      'The selected repository key was not found in active WAL files. ' +
      'It may have been compacted into an SSTable.'
    )
  }

  return latest
}

export async function readLastSelectedRepositoryId(localStorageDirectory) {
  const snapshotDirectory = await createStorageSnapshot(localStorageDirectory)
  try {
    return await readSnapshot(snapshotDirectory)
  } finally {
    await removeStorageSnapshot(snapshotDirectory)
  }
}
