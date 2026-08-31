import { app, screen } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export const defaultWindowWidth = 1100
export const defaultWindowHeight = 700
export const minimumWindowWidth = 900
export const minimumWindowHeight = 560

const boundsFileName = 'window-bounds.json'

function boundsFilePath() {
  return path.join(app.getPath('userData'), boundsFileName)
}

export function loadWindowBounds(): Partial<WindowBounds> {
  try {
    const parsed = JSON.parse(readFileSync(boundsFilePath(), 'utf8')) as Partial<WindowBounds>
    if (
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed
    }
  } catch {
    // First launch or corrupted file — use defaults.
  }
  return {}
}

export function saveWindowBounds(bounds: WindowBounds) {
  writeFileSync(boundsFilePath(), JSON.stringify(bounds))
}

export function clampWindowBounds(bounds: WindowBounds): WindowBounds {
  const width = Math.max(minimumWindowWidth, bounds.width)
  const height = Math.max(minimumWindowHeight, bounds.height)
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  const area = display.workArea
  const minVisible = 80

  let x = bounds.x
  let y = bounds.y

  if (x + width < area.x + minVisible) x = area.x
  if (y + height < area.y + minVisible) y = area.y
  if (x > area.x + area.width - minVisible) x = area.x + area.width - width
  if (y > area.y + area.height - minVisible) y = area.y + area.height - height

  x = Math.min(Math.max(x, area.x), area.x + area.width - width)
  y = Math.min(Math.max(y, area.y), area.y + area.height - height)

  return { x, y, width, height }
}

export function resolveInitialWindowBounds(): {
  width: number
  height: number
  x?: number
  y?: number
} {
  const saved = loadWindowBounds()
  const width = saved.width ?? defaultWindowWidth
  const height = saved.height ?? defaultWindowHeight
  if (saved.x === undefined || saved.y === undefined) {
    return { width, height }
  }
  return clampWindowBounds({ x: saved.x, y: saved.y, width, height })
}
