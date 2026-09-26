import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import serve from 'electron-serve'
import { startSmtc, stopSmtc } from './smtc'
import { registerIpc } from './ipc'
import { stopMediaIpc } from './ipc/media'
import { stopPrivacyIpc } from './ipc/privacy'
import { startScreenshotWatch, stopScreenshotWatch } from './ipc/screenshots'

const isProd = process.env.NODE_ENV === 'production'

const STRIP_HEIGHT = 500

if (isProd) {
  serve({ directory: 'app' })
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.devezio.desknotch')
  }

  const { width: screenWidth, x: screenX, y: screenY } = screen.getPrimaryDisplay().bounds

  const mainWindow = new BrowserWindow({
    width: screenWidth,
    height: STRIP_HEIGHT,
    x: screenX,
    y: screenY,
    title: 'deskNotch',
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

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true)

  mainWindow.setIgnoreMouseEvents(true, { forward: true })


  // The strip spans the whole screen width, so it must never take clicks for
  // anything but the notch itself. The renderer reports the notch's bounds and
  // the cursor is polled against them: setIgnoreMouseEvents(false) would hand
  // the entire strip clicks, swallowing anything the user aimed at underneath.
  // The notch, and the rail beside it while open: every rectangle that takes clicks.
  type Rect = { x: number; y: number; width: number; height: number }
  let notchBounds: Rect[] = []
  let interactive = false
  let lastCursor = ''

  const applyCursorHitTest = () => {
    if (mainWindow.isDestroyed()) return

    const { x, y } = screen.getCursorScreenPoint()
    const windowBounds = mainWindow.getBounds()

    const inside = notchBounds.some(
      (r) =>
        x >= windowBounds.x + r.x &&
        x <= windowBounds.x + r.x + r.width &&
        y >= windowBounds.y + r.y &&
        y <= windowBounds.y + r.y + r.height,
    )

    // Where the pointer is, relative to the strip, whenever it moves: the
    // notch decides whether a pointer that left it has really gone. DOM events
    // cannot tell it, since the window stops taking the mouse past the edge.
    const at = `${x - windowBounds.x},${y - windowBounds.y}`
    if (at !== lastCursor) {
      lastCursor = at
      mainWindow.webContents.send('notch:cursor', { x: x - windowBounds.x, y: y - windowBounds.y })
    }

    if (inside === interactive) return
    interactive = inside
    mainWindow.setIgnoreMouseEvents(!inside, { forward: true })
  }

  // 60ms is under the threshold where a click feels like it missed, and cheap
  // enough to leave running.
  const hitTestTimer = setInterval(applyCursorHitTest, 60)
  mainWindow.on('closed', () => clearInterval(hitTestTimer))

  ipcMain.on('notch:bounds', (_event, bounds: Rect[] | Rect) => {
    notchBounds = Array.isArray(bounds) ? bounds : [bounds]
  })

  // Only take keyboard focus when the notch is pinned open, so merely hovering
  // it does not steal focus from whatever the user was typing in.
  ipcMain.on('notch:pinned', (_event, isPinned: boolean) => {
    if (mainWindow.isDestroyed()) return
    if (isPinned) mainWindow.focus()
    else mainWindow.blur()
    // Focus can put a window back on the taskbar; keep it off.
    mainWindow.setSkipTaskbar(true)
  })

  ipcMain.on('notch:playback_session', (_event, session: any) => {
    mainWindow.webContents.send('notch:playback_session', session)
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
  }

  registerIpc()
  startSmtc(mainWindow)
  startScreenshotWatch()
})

app.on('window-all-closed', () => {
  stopSmtc()
  stopMediaIpc()
  stopPrivacyIpc()
  stopScreenshotWatch()
  app.quit()
})
