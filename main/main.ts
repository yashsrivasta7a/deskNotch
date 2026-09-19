import path from 'path'
import { app, BrowserWindow, screen } from 'electron'
import serve from 'electron-serve'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.devezio.desknotch')
  }

  const { width: screenWidth, x: screenX, y: screenY } = screen.getPrimaryDisplay().bounds
  const notchWidth = 240
  const notchHeight = 30

  const mainWindow = new BrowserWindow({
    width: notchWidth,
    height: notchHeight,
    x: Math.round(screenX + (screenWidth - notchWidth) / 2),
    y: screenY,
    title: 'deskNotch',
    transparent: true,
    hasShadow: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
