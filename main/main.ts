import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import serve from 'electron-serve'
import { startSmtc, stopSmtc } from './smtc'
import { registerStore } from './store'

const isProd = process.env.NODE_ENV === 'production'

const STRIP_HEIGHT = 400

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
  let notchBounds: { x: number; y: number; width: number; height: number } | null = null
  let interactive = false

  const applyCursorHitTest = () => {
    if (mainWindow.isDestroyed()) return

    const { x, y } = screen.getCursorScreenPoint()
    const windowBounds = mainWindow.getBounds()

    const inside =
      notchBounds !== null &&
      x >= windowBounds.x + notchBounds.x &&
      x <= windowBounds.x + notchBounds.x + notchBounds.width &&
      y >= windowBounds.y + notchBounds.y &&
      y <= windowBounds.y + notchBounds.y + notchBounds.height

    if (inside === interactive) return
    interactive = inside
    mainWindow.setIgnoreMouseEvents(!inside, { forward: true })
  }

  // 60ms is under the threshold where a click feels like it missed, and cheap
  // enough to leave running.
  const hitTestTimer = setInterval(applyCursorHitTest, 60)
  mainWindow.on('closed', () => clearInterval(hitTestTimer))

  ipcMain.on('notch:bounds', (_event, bounds: typeof notchBounds) => {
    notchBounds = bounds
  })

  // Only take keyboard focus when the notch is pinned open, so merely hovering
  // it does not steal focus from whatever the user was typing in.
  ipcMain.on('notch:pinned', (_event, isPinned: boolean) => {
    if (mainWindow.isDestroyed()) return
    if (isPinned) mainWindow.focus()
    else mainWindow.blur()
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

  registerStore()
  startSmtc(mainWindow)
})

app.on('window-all-closed', () => {
  stopSmtc()
  app.quit()
})
