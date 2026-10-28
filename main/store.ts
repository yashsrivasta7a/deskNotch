/**
 * The app's persisted state: one JSON file in userData.
 *
 * Only the reading and writing lives here. Features that happen to persist
 * something import `readStore`/`writeStore` rather than adding themselves to
 * this file.
 */
import { app } from 'electron'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

export interface StoreShape {
  todos: unknown[]
  settings: Record<string, unknown>
  /** The user's chosen photo, held as a data URL so the renderer can show it
   *  without filesystem access and it survives the original file moving. */
  photo: string | null
  /** File paths pinned to the shelf (dropped or saved captures). */
  shelf: string[]
  /** File paths the user has explicitly pinned in the desk. */
  pins: string[]
  /** Completed focus-timer sessions, kept for up to 90 days. */
  focusLog: unknown[]
  /** Reminders set from the companion: { id, at, message }. */
  reminders: unknown[]
  /** Whether the user let deskNotch read Claude Code's and Codex's logins to
   *  fetch plan limits (ipc/limits.ts). null: not asked yet. */
  aiConsent: boolean | null
}

const defaults: StoreShape = { todos: [], settings: {}, photo: null, shelf: [], pins: [], focusLog: [], reminders: [], aiConsent: null }

/** A first launch starts with a short list that shows what the card does, instead of an empty one. */
const welcomeTasks = () =>
  ['Tap this circle to tick it off', 'Add your own with +', 'Drop a file on the notch to park it'].map((label) => ({
    id: randomUUID(),
    label,
    done: false,
  }))

let cache: StoreShape | null = null

const file = () => path.join(app.getPath('userData'), 'desknotch-store.json')

export const readStore = (): StoreShape => {
  if (cache) return cache

  let loaded: StoreShape
  try {
    loaded = { ...defaults, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }
  } catch (error) {
    // Missing or corrupt: start clean rather than failing to launch. Only a
    // missing file is a first launch; a corrupt one has no business re-seeding.
    loaded = { ...defaults, ...((error as NodeJS.ErrnoException).code === 'ENOENT' ? { todos: welcomeTasks() } : {}) }
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
