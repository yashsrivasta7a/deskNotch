/*
 Runs inside a worker thread. SMTCMonitor blocks whatever thread it runs on,
 so keeping it here is what stops the notch from freezing. -- Doc se mila
 */
import { parentPort } from 'worker_threads'
import { SMTCMonitor } from '@coooookies/windows-smtc-monitor'
import type { MediaInfo, MediaProps } from '@coooookies/windows-smtc-monitor'

if (!parentPort) {
  throw new Error('smtc-worker must be run as a worker thread')
}

const port = parentPort
const smtc = new SMTCMonitor()

/**
 * Replace the raw thumbnail Buffer with a data URL the renderer can use
 * directly as an <img src>.
 *
 * The encoding happens here rather than in main because base64-ing a few
 * hundred KB is exactly the kind of synchronous work this thread exists to
 * absorb.
 */
const lean = (session: MediaInfo | null) => {
  if (!session) return null
  const { thumbnail, ...media } = session.media
  return {
    ...session,
    media: { ...media, thumbnailUrl: toDataUrl(thumbnail) },
  }
}

/** SMTC hands over raw image bytes with no media type, so sniff it from the
 *  magic number. PNG and JPEG cover what players actually publish. */
const toDataUrl = (buffer?: Buffer | null): string | null => {
  if (!buffer || buffer.length === 0) return null

  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47

  return `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${buffer.toString('base64')}`
}

port.on('message', (message: { type: string; requestId?: number; args?: unknown[] }) => {
  const { type, requestId, args } = message || {}

  try {
    switch (type) {
      case 'getCurrentMediaSession':
        port.postMessage({
          type: 'response',
          requestId,
          result: lean(SMTCMonitor.getCurrentMediaSession()),
        })
        break

      case 'getMediaSessions':
        port.postMessage({
          type: 'response',
          requestId,
          result: SMTCMonitor.getMediaSessions().map(lean),
        })
        break

      case 'getMediaSessionByAppId':
        port.postMessage({
          type: 'response',
          requestId,
          result: lean(SMTCMonitor.getMediaSessionByAppId(args?.[0] as string)),
        })
        break

      default:
        port.postMessage({
          type: 'response',
          requestId,
          error: `Unknown message type: ${type}`,
        })
    }
  } catch (error) {
    port.postMessage({
      type: 'response',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})


smtc.on('current-session-changed', (sourceAppId: string) => {
  port.postMessage({ type: 'current-session-changed', sourceAppId })
})

smtc.on('session-media-changed', (sourceAppId: string, mediaProps: MediaProps) => {
  const { thumbnail, ...media } = mediaProps
  port.postMessage({
    type: 'session-media-changed',
    sourceAppId,
    media: { ...media, thumbnailUrl: toDataUrl(thumbnail) },
  })
})

smtc.on('session-playback-changed', (sourceAppId: string, playback) => {
  port.postMessage({ type: 'session-playback-changed', sourceAppId, playback })
})

smtc.on('session-timeline-changed', (sourceAppId: string, timeline) => {
  port.postMessage({ type: 'session-timeline-changed', sourceAppId, timeline })
})

smtc.on('session-added', (sourceAppId: string, media: MediaInfo) => {
  port.postMessage({ type: 'session-added', sourceAppId, media: lean(media) })
})

smtc.on('session-removed', (sourceAppId: string) => {
  port.postMessage({ type: 'session-removed', sourceAppId })
})
