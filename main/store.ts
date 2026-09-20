/**
 * The app's persisted state: one JSON file in userData.
 *
 * Only the reading and writing lives here. Features that happen to persist
 * something import `readStore`/`writeStore` rather than adding themselves to
 * this file.
 */
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface StoreShape {
  todos: unknown[]
  settings: Record<string, unknown>
  /** The user's chosen photo, held as a data URL so the renderer can show it
   *  without filesystem access and it survives the original file moving. */
  photo: string | null
}

const defaults: StoreShape = { todos: [], settings: {}, photo: null }

let cache: StoreShape | null = null

const file = () => path.join(app.getPath('userData'), 'desknotch-store.json')

export const readStore = (): StoreShape => {
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
export const writeStore = (data: StoreShape) => {
  cache = data
  try {
    fs.writeFileSync(file(), JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error('[store] write failed:', error)
  }
}
