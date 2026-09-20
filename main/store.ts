
import { app, dialog, ipcMain } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'

interface StoreShape {
  todos: unknown[]
  settings: Record<string, unknown>
  /** The user's chosen photo, held as a data URL so the renderer can show it
   *  without filesystem access and it survives the original file moving. */
  photo: string | null
}

const defaults: StoreShape = { todos: [], settings: {}, photo: null }

let cache: StoreShape | null = null

const file = () => path.join(app.getPath('userData'), 'desknotch-store.json')

const read = (): StoreShape => {
  if (cache) return cache

  let loaded: StoreShape
  try {
    loaded = { ...defaults, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }
  } catch {
    // Missing or corrupt: start clean rather than failing to launch.
    loaded = { ...defaults }
  }

  cache = loaded
  return loaded
}

/** Writes are synchronous — the file is tiny, and losing a task to a
 *  half-finished write is worse than the few milliseconds. */
const write = (data: StoreShape) => {
  cache = data
  try {
    fs.writeFileSync(file(), JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error('[store] write failed:', error)
  }
}

export function registerStore() {
  ipcMain.handle('store:get', (_event, key: keyof StoreShape) => read()[key])

  ipcMain.handle('store:set', (_event, key: keyof StoreShape, value: unknown) => {
    write({ ...read(), [key]: value } as StoreShape)
    return true
  })

  /** Start-on-boot is a system setting, not a stored value, so it is applied
   *  rather than just remembered. */
  ipcMain.handle('settings:start-on-boot', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  })

  /** Memory pressure and uptime, read from Node rather than a native module. */
  ipcMain.handle('system:stats', () => {
    const total = os.totalmem()
    const free = os.freemem()

    return {
      memoryUsed: (total - free) / total,
      uptimeSeconds: os.uptime(),
    }
  })

  /** Opens a picker and returns the chosen image as a data URL, or null if the
   *  dialog was dismissed. Reading happens here because the renderer has no
   *  filesystem access. */
  ipcMain.handle('photo:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })

    const filePath = result.filePaths[0]
    if (result.canceled || !filePath) return null

    try {
      const extension = path.extname(filePath).slice(1).toLowerCase()
      const mime = extension === 'jpg' ? 'jpeg' : extension
      const data = fs.readFileSync(filePath).toString('base64')
      const dataUrl = `data:image/${mime};base64,${data}`

      write({ ...read(), photo: dataUrl })
      return dataUrl
    } catch (error) {
      console.error('[store] could not read image:', error)
      return null
    }
  })
}
