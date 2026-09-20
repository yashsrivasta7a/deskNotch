
import { BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { Worker } from 'worker_threads'

export interface NowPlaying {
  sourceAppId: string
  title: string
  artist: string
  album: string
  isPlaying: boolean
  position: number
  duration: number
  /** Album art as a data URL, or null when the player publishes none. */
  thumbnailUrl: string | null
}

type WorkerMessage = {
  type: string
  requestId?: number
  result?: unknown
  error?: string
  sourceAppId?: string
  [key: string]: unknown
}

let worker: Worker | null = null
let current: NowPlaying | null = null
let nextRequestId = 1
const pending = new Map<number, (message: WorkerMessage) => void>()

const PLAYBACK_STATUS_PLAYING = 4

const toNowPlaying = (session: any): NowPlaying | null => {
  if (!session) return null
  return {
    sourceAppId: session.sourceAppId,
    title: session.media?.title ?? '',
    artist: session.media?.artist ?? '',
    album: session.media?.albumTitle ?? '',
    isPlaying: session.playback?.playbackStatus === PLAYBACK_STATUS_PLAYING,
    position: session.timeline?.position ?? 0,
    duration: session.timeline?.duration ?? 0,
    thumbnailUrl: session.media?.thumbnailUrl ?? null,
  }
}

const request = (type: string, args?: unknown[]): Promise<unknown> => {
  if (!worker) return Promise.resolve(null)
  const requestId = nextRequestId++
  return new Promise((resolve, reject) => {
    pending.set(requestId, (message) => {
      if (message.error) reject(new Error(message.error))
      else resolve(message.result)
    })
    worker!.postMessage({ type, requestId, args })
  })
}

export function startSmtc(window: BrowserWindow) {
  // Resolves to app/ at runtime, where the worker is copied alongside main.js.
  // import.meta.dirname rather than __dirname: the bundle is an ES module.
  worker = new Worker(path.join(import.meta.dirname, 'smtc-worker.ts'))

  const push = () => {
    if (window.isDestroyed()) return
    window.webContents.send('smtc:now-playing', current)
  }

  const refresh = async () => {
    try {
      current = toNowPlaying(await request('getCurrentMediaSession'))
      push()
    } catch (error) {
      console.error('[smtc] refresh failed:', error)
    }
  }

  worker.on('message', (message: WorkerMessage) => {
    if (message.type === 'response' && message.requestId !== undefined) {
      const resolver = pending.get(message.requestId)
      if (resolver) {
        pending.delete(message.requestId)
        resolver(message)
      }
      return
    }

    // Anything else is a change event from SMTC.
    void refresh()
  })

  worker.on('error', (error) => {
    console.error('[smtc] worker error:', error)
  })

  worker.on('exit', (code) => {
    if (code !== 0) console.error(`[smtc] worker exited with code ${code}`)
    worker = null
  })

  // The renderer asks once on mount; after that it listens.
  ipcMain.handle('smtc:get', () => current)

  void refresh()
}

export function stopSmtc() {
  void worker?.terminate()
  worker = null
  pending.clear()
}
