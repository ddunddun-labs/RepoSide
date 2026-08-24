import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { readSstableValues } from './sstable-reader.mjs'
import { createStorageSnapshot, removeStorageSnapshot } from './storage-snapshot.mjs'

const pathProperty = Buffer.from([0x22, 0x04, 0x70, 0x61, 0x74, 0x68])
const idProperty = Buffer.from([0x22, 0x02, 0x69, 0x64, 0x49])
const aliasProperty = Buffer.from([0x22, 0x05, 0x61, 0x6c, 0x69, 0x61, 0x73])
const missingProperty = Buffer.from([
  0x22, 0x07, 0x6d, 0x69, 0x73, 0x73, 0x69, 0x6e, 0x67,
])
const maximumObjectScanLength = 2048

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

  return undefined
}

function decodeZigZag(value) {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2
}

function readV8String(buffer, offset) {
  const tag = buffer[offset]
  if (tag !== 0x22 && tag !== 0x63) return undefined

  const length = readVarint(buffer, offset + 1)
  if (!length) return undefined
  const end = length.offset + length.value
  if (end > buffer.length) return undefined

  return {
    value: buffer.subarray(length.offset, end).toString(tag === 0x22 ? 'utf8' : 'utf16le'),
    offset: end,
  }
}

function readPropertyOffset(buffer, property, start, end) {
  const offset = buffer.indexOf(property, start)
  return offset >= start && offset < end ? offset + property.length : undefined
}

function readOptionalStringProperty(buffer, property, start, end) {
  const offset = readPropertyOffset(buffer, property, start, end)
  if (offset === undefined) return undefined
  if (buffer[offset] === 0x30) return null
  return readV8String(buffer, offset)?.value
}

function readBooleanProperty(buffer, property, start, end) {
  const offset = readPropertyOffset(buffer, property, start, end)
  if (offset === undefined) return undefined
  if (buffer[offset] === 0x54) return true
  if (buffer[offset] === 0x46) return false
  return undefined
}

function parseRepositoryAt(buffer, propertyOffset, source) {
  const objectEnd = Math.min(buffer.length, propertyOffset + maximumObjectScanLength)
  const pathValue = readV8String(buffer, propertyOffset + pathProperty.length)
  if (!pathValue || !/^[A-Za-z]:\\/.test(pathValue.value)) return undefined

  const idOffset = readPropertyOffset(buffer, idProperty, pathValue.offset, objectEnd)
  if (idOffset === undefined) return undefined
  const encodedId = readVarint(buffer, idOffset)
  if (!encodedId) return undefined
  const id = decodeZigZag(encodedId.value)
  if (!Number.isSafeInteger(id) || id < 0) return undefined

  return {
    id,
    path: pathValue.value,
    alias: readOptionalStringProperty(buffer, aliasProperty, pathValue.offset, objectEnd),
    missing: readBooleanProperty(buffer, missingProperty, pathValue.offset, objectEnd),
    source,
    offset: propertyOffset,
  }
}

function inspectBuffer(buffer, source, byId) {
  let offset = 0

  while ((offset = buffer.indexOf(pathProperty, offset)) >= 0) {
    const repository = parseRepositoryAt(buffer, offset, source)
    if (repository) byId.set(repository.id, repository)
    offset += pathProperty.length
  }
}

async function inspectSnapshot(snapshotDirectory) {
  const files = (await readdir(snapshotDirectory))
    .filter(file => /\.(?:log|ldb)$/.test(file))
    .sort((left, right) => Number.parseInt(left) - Number.parseInt(right))
  const byId = new Map()

  for (const file of files) {
    const filePath = path.join(snapshotDirectory, file)
    if (file.endsWith('.ldb')) {
      const values = await readSstableValues(filePath)
      for (const value of values) inspectBuffer(value, file, byId)
    } else {
      inspectBuffer(await readFile(filePath), file, byId)
    }
  }

  return [...byId.values()].sort((left, right) => left.id - right.id)
}

export async function inspectIndexedDbRepositories(indexedDbDirectory) {
  const snapshotDirectory = await createStorageSnapshot(indexedDbDirectory)
  try {
    return await inspectSnapshot(snapshotDirectory)
  } finally {
    await removeStorageSnapshot(snapshotDirectory)
  }
}

export function getRepositoryName(repository) {
  if (repository.alias) return repository.alias
  return path.win32.basename(repository.path)
}
