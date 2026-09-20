/**
 * Small JSON store for widget state that should survive a restart.
 *
 * Lives in the main process because the renderer has no filesystem access, and
 * in userData so it is per-user and outside the install directory.
 */
import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

interface StoreShape {
  todos: unknown[]
}

const defaults: StoreShape = { todos: [] }

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

  ipcMain.handle('store:set', (_event, key: keyof StoreShape, value: unknown[]) => {
    write({ ...read(), [key]: value })
    return true
  })
}
