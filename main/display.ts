import { screen, BrowserWindow, Display } from 'electron'
import { readStore } from './store'

export interface DisplayInfo {
  id: string
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

export function getDisplaysInfo(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  const all = screen.getAllDisplays()

  return all.map((d, index) => {
    const isPrimary = d.id === primary.id
    const name = d.label ? d.label : `Display ${index + 1}`
    const res = `${d.bounds.width}×${d.bounds.height}`
    const label = isPrimary ? `${name} (Primary - ${res})` : `${name} (${res})`
    return {
      id: String(d.id),
      label,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      isPrimary,
    }
  })
}

/** The displays that get a notch: every one for 'all', else the chosen one
 *  (the primary when it is unset or unplugged). */
export function resolveTargetDisplays(selectedDisplayId?: string): Display[] {
  if (selectedDisplayId === 'all') return screen.getAllDisplays()
  const found = screen.getAllDisplays().find((d) => String(d.id) === selectedDisplayId)
  return [found ?? screen.getPrimaryDisplay()]
}

/** One notch window per display it sits on, keyed by display id. */
const windows = new Map<string, BrowserWindow>()
let createWindow: ((bounds: Electron.Rectangle) => BrowserWindow) | null = null
let stripHeight = 500

export const notchWindows = () => [...windows].filter(([, win]) => !win.isDestroyed())

/**
 * Puts a notch on each target display. A window whose display is still a
 * target stays put; one whose display is not is moved to a new target rather
 * than rebuilt, so switching displays keeps the notch's state. Extras close
 * only after the new ones exist, so the app never has zero windows and quits.
 */
export function syncNotchWindows() {
  if (!createWindow) return
  const selected = (readStore().settings?.selectedDisplayId as string) || 'primary'
  const targets = resolveTargetDisplays(selected)
  const targetIds = new Set(targets.map((d) => String(d.id)))

  const spare: BrowserWindow[] = []
  for (const [id, win] of windows) {
    if (targetIds.has(id) && !win.isDestroyed()) continue
    windows.delete(id)
    if (!win.isDestroyed()) spare.push(win)
  }

  for (const display of targets) {
    const id = String(display.id)
    // The work area, not the whole screen: a taskbar on the top (or a side)
    // takes its strip, and the notch sits below it instead of over it.
    const { x, y, width } = display.workArea
    const bounds = { x, y, width, height: stripHeight }
    const win = windows.get(id) ?? spare.pop() ?? createWindow(bounds)
    windows.set(id, win)
    const current = win.getBounds()
    if (current.x !== bounds.x || current.y !== bounds.y || current.width !== bounds.width || current.height !== bounds.height) {
      win.setBounds(bounds)
    }
  }

  for (const win of spare) win.destroy()

  notifyDisplaysChanged()
}

export function notifyDisplaysChanged() {
  const list = getDisplaysInfo()
  for (const [, win] of notchWindows()) win.webContents.send('display:changed', list)
}

export function setupNotchWindows(create: (bounds: Electron.Rectangle) => BrowserWindow, STRIP_HEIGHT: number = 500) {
  createWindow = create
  stripHeight = STRIP_HEIGHT
  syncNotchWindows()

  screen.on('display-added', syncNotchWindows)
  screen.on('display-removed', syncNotchWindows)
  screen.on('display-metrics-changed', syncNotchWindows)
}
