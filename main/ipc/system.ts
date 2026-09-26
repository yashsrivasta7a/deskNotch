/** Readings about the machine itself. */
import { BrowserWindow, desktopCapturer, ipcMain, screen, systemPreferences } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'

export function registerSystemIpc() {
  /** Memory pressure and uptime, read from Node rather than a native module. */
  ipcMain.handle('system:stats', () => {
    const total = os.totalmem()
    const free = os.freemem()

    return {
      memoryUsed: (total - free) / total,
      uptimeSeconds: os.uptime(),
    }
  })

  /** Active Windows desktop wallpaper encoded as a data URL. */
  ipcMain.handle('system:wallpaper', () => {
    try {
      if (process.platform === 'win32') {
        const appData = process.env.APPDATA || ''
        const wallpaperPath = path.join(appData, 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper')
        if (fs.existsSync(wallpaperPath)) {
          const buf = fs.readFileSync(wallpaperPath)
          return `data:image/jpeg;base64,${buf.toString('base64')}`
        }
      }
    } catch (err) {
      console.error('[deskNotch] Failed to read wallpaper:', err)
    }
    return null
  })

  /** Windows accent color hex string (e.g. "0078d7ff"). */
  ipcMain.handle('system:accent-color', () => {
    try {
      if (process.platform === 'win32') {
        return systemPreferences.getAccentColor()
      }
    } catch {}
    return null
  })

  /**
   * Glass: the notch shows a live, blurred view of what is behind it. For
   * that, Windows is asked to leave this window out of screen capture
   * (`setContentProtection`, WDA_EXCLUDEFROMCAPTURE), so capturing the screen
   * returns what is underneath the notch rather than the notch itself. The
   * cost, said plainly in Settings: while Glass is on, the notch does not
   * appear in screenshots or screen shares.
   */
  ipcMain.handle('glass:protect', (event, on: unknown) => {
    BrowserWindow.fromWebContents(event.sender)?.setContentProtection(on === true)
  })

  /** The capture source for the display the notch is on, for the renderer to stream. */
  ipcMain.handle('glass:source', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const display = screen.getDisplayMatching(window.getBounds())
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
    return (sources.find((s) => s.display_id === String(display.id)) ?? sources[0])?.id ?? null
  })
}

