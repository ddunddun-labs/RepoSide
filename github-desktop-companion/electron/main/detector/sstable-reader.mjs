import { readFile } from 'node:fs/promises'
import snappy from 'snappyjs'

const footerLength = 48
const blockTrailerLength = 5
const tableMagic = Buffer.from([0x57, 0xfb, 0x80, 0x8b, 0x24, 0x75, 0x47, 0xdb])
const maximumUncompressedBlockLength = 64 * 1024 * 1024

function readVarint(buffer, initialOffset, limit = buffer.length) {
  let value = 0
  let multiplier = 1
  let offset = initialOffset

  while (offset < limit && offset - initialOffset < 10) {
    const byte = buffer[offset++]
    value += (byte & 0x7f) * multiplier
    if ((byte & 0x80) === 0) return { value, offset }
    multiplier *= 128
  }

  throw new Error(`Invalid varint at offset ${initialOffset}`)
}

function readBlockHandle(buffer, offset, limit = buffer.length) {
  const blockOffset = readVarint(buffer, offset, limit)
  const blockSize = readVarint(buffer, blockOffset.offset, limit)
  return {
    offset: blockOffset.value,
    size: blockSize.value,
    nextOffset: blockSize.offset,
  }
}

function readBlock(table, handle) {
  const trailerOffset = handle.offset + handle.size
  if (handle.offset < 0 || trailerOffset + blockTrailerLength > table.length) {
    throw new Error(`SSTable block is outside the file: ${handle.offset}+${handle.size}`)
  }

  const contents = table.subarray(handle.offset, trailerOffset)
  const compressionType = table[trailerOffset]
  if (compressionType === 0) return contents
  if (compressionType === 1) {
    return Buffer.from(snappy.uncompress(contents, maximumUncompressedBlockLength))
  }
  throw new Error(`Unsupported SSTable compression type: ${compressionType}`)
}

function parseBlockEntries(block) {
  if (block.length < 4) throw new Error('Truncated SSTable block')
  const restartCount = block.readUInt32LE(block.length - 4)
  const entriesEnd = block.length - 4 - restartCount * 4
  if (entriesEnd < 0) throw new Error('Invalid SSTable restart table')

  const entries = []
  let previousKey = Buffer.alloc(0)
  let offset = 0

  while (offset < entriesEnd) {
    const shared = readVarint(block, offset, entriesEnd)
    const nonShared = readVarint(block, shared.offset, entriesEnd)
    const valueLength = readVarint(block, nonShared.offset, entriesEnd)
    const keyEnd = valueLength.offset + nonShared.value
    const valueEnd = keyEnd + valueLength.value

    if (shared.value > previousKey.length || valueEnd > entriesEnd) {
      throw new Error('Invalid prefix-compressed SSTable entry')
    }

    const key = Buffer.concat([
      previousKey.subarray(0, shared.value),
      block.subarray(valueLength.offset, keyEnd),
    ])
    const value = block.subarray(keyEnd, valueEnd)
    entries.push({ key, value })
    previousKey = key
    offset = valueEnd
  }

  return entries
}

export async function readSstableEntries(filePath) {
  const table = await readFile(filePath)
  if (table.length < footerLength) throw new Error('SSTable is shorter than its footer')

  const footerOffset = table.length - footerLength
  const magic = table.subarray(table.length - tableMagic.length)
  if (!magic.equals(tableMagic)) throw new Error('Invalid SSTable magic number')

  const metaIndexHandle = readBlockHandle(table, footerOffset, table.length - tableMagic.length)
  const indexHandle = readBlockHandle(
    table,
    metaIndexHandle.nextOffset,
    table.length - tableMagic.length
  )
  const indexEntries = parseBlockEntries(readBlock(table, indexHandle))
  const entries = []

  for (const indexEntry of indexEntries) {
    const dataHandle = readBlockHandle(indexEntry.value, 0)
    const dataEntries = parseBlockEntries(readBlock(table, dataHandle))
    entries.push(...dataEntries)
  }

  return entries
}

export async function readSstableValues(filePath) {
  return (await readSstableEntries(filePath)).map(entry => entry.value)
}
