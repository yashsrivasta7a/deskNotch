import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import serve from 'electron-serve'
import { startSmtc, stopSmtc } from './smtc'
import { registerIpc } from './ipc'
import { stopMediaIpc } from './ipc/media'
import { stopPrivacyIpc } from './ipc/privacy'
import { stopUsageIpc } from './ipc/usage'
import { startScreenshotWatch, stopScreenshotWatch } from './ipc/screenshots'
import { setupNotchWindows } from './display'
import { applyContentProtection } from './ipc/system'
import { startUpdater } from './updater'
import { checkAndApplyFullscreenState, isTucked, stopFullscreenWatch } from './fullscreen'

const isProd = process.env.NODE_ENV === 'production'

const STRIP_HEIGHT = 500

if (isProd) {
  serve({ directory: 'app' })
}

// The notch, and the rail beside it while open: every rectangle that takes
// clicks, per window (keyed by webContents id), as its renderer reports them.
type Rect = { x: number; y: number; width: number; height: number }
const notchBounds = new Map<number, Rect[]>()
const notchOpen = new Set<number>()

/** One notch strip across the top of a display. */
const createNotchWindow = (bounds: Rect) => {
  const window = new BrowserWindow({
    ...bounds,
    // The fullscreen watcher (fullscreen.ts) knows its own window by this title.
    title: 'DeskNotch',
    transparent: true,
    hasShadow: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // A tool window: Windows never lists these on the taskbar or in Alt+Tab,
    // even after it takes focus (plain skipTaskbar can be lost then).
    type: 'toolbar',
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true)

  window.setIgnoreMouseEvents(true, { forward: true })
  // A notch made later (a display plugged in) honours Hide in screenshots too.
  applyContentProtection()

  // The strip spans the whole screen width, so it must never take clicks for
  // anything but the notch itself. The renderer reports the notch's bounds and
  // the cursor is polled against them: setIgnoreMouseEvents(false) would hand
  // the entire strip clicks, swallowing anything the user aimed at underneath.
  const contentsId = window.webContents.id
  let interactive = false
  let lastCursor = ''

  const applyCursorHitTest = () => {
    if (window.isDestroyed() || !window.isVisible()) return

    const { x, y } = screen.getCursorScreenPoint()
    const windowBounds = window.getBounds()
    const isOpen = notchOpen.has(contentsId)

    const inside = (notchBounds.get(contentsId) ?? []).some(
      (r) =>
        x >= windowBounds.x + r.x &&
        x <= windowBounds.x + r.x + r.width &&
        y >= windowBounds.y + r.y &&
        y <= windowBounds.y + r.y + Math.max(r.height, 6),
    )

    // Where the pointer is, relative to the strip, whenever it moves: the
    // notch decides whether a pointer that left it has really gone. DOM events
    // cannot tell it, since the window stops taking the mouse past the edge.
    const at = `${x - windowBounds.x},${y - windowBounds.y}`
    if (at !== lastCursor) {
      lastCursor = at
      window.webContents.send('notch:cursor', { x: x - windowBounds.x, y: y - windowBounds.y })
    }

    if (inside === interactive) return
    interactive = inside
    window.setIgnoreMouseEvents(!inside, { forward: true })
    // Guarantee hover-to-open even on the 5px minimized slim line if Windows
    // drops DOM mouseenter during the setIgnoreMouseEvents transition.
    if (inside && !isOpen) {
      window.webContents.send('notch:enter')
    }
  }

  // 60ms is under the threshold where a click feels like it missed, and cheap
  // enough to leave running.
  const hitTestTimer = setInterval(applyCursorHitTest, 60)
  window.on('closed', () => {
    clearInterval(hitTestTimer)
    notchBounds.delete(contentsId)
    notchOpen.delete(contentsId)
  })

  if (isProd) {
    void window.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    void window.loadURL(`http://localhost:${port}/home`)
  }

  return window
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.devezio.desknotch')
  }

  ipcMain.on('notch:bounds', (event, bounds: Rect[] | Rect) => {
    notchBounds.set(event.sender.id, Array.isArray(bounds) ? bounds : [bounds])
  })

  ipcMain.on('notch:open', (event, open: boolean) => {
    const id = event.sender.id
    if (open) notchOpen.add(id)
    else notchOpen.delete(id)
  })

  // Only take keyboard focus when the notch is pinned open, so merely hovering
  // it does not steal focus from whatever the user was typing in.
  ipcMain.on('notch:pinned', (event, isPinned: boolean) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) return
    if (isPinned) window.focus()
    else window.blur()
    // Focus can put a window back on the taskbar; keep it off.
    window.setSkipTaskbar(true)
  })

  // A notch that just loaded asks whether it starts tucked behind a browser.
  ipcMain.handle('notch:tucked', (event) => isTucked(BrowserWindow.fromWebContents(event.sender)?.id ?? -1))

  ipcMain.on('notch:playback_session', (_event, session: any) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send('notch:playback_session', session)
  })

  // Handlers first, so a window created later (another display, or 'All')
  // finds them ready.
  registerIpc()
  startUpdater()
  startSmtc()
  startScreenshotWatch()
  setupNotchWindows(createNotchWindow, STRIP_HEIGHT)
  // Its PowerShell compiles C# on start; let the notch paint first.
  setTimeout(checkAndApplyFullscreenState, 2000)
})

app.on('window-all-closed', () => {
  stopSmtc()
  stopMediaIpc()
  stopPrivacyIpc()
  stopUsageIpc()
  stopScreenshotWatch()
  stopFullscreenWatch()
  app.quit()
})
