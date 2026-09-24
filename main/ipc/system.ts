/** Readings about the machine itself. */
import { ipcMain, systemPreferences } from 'electron'
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
}

