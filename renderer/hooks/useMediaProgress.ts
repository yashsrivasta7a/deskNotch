import { useEffect, useState } from 'react'
import type { NowPlaying } from './useNowPlaying'

/**
 * Where the track is, 0–1. SMTC reports position only when it changes, which
 * for most players is every few seconds; between reports the bar keeps
 * moving at real time while playing, so it never visibly stalls.
 */
export function useMediaProgress(media: NowPlaying | null) {
  const [, tick] = useState(0)
  const [seen, setSeen] = useState({ position: 0, at: Date.now() })

  useEffect(() => {
    setSeen({ position: media?.position ?? 0, at: Date.now() })
  }, [media?.position, media?.title])

  useEffect(() => {
    if (!media?.isPlaying) return
    const timer = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(timer)
  }, [media?.isPlaying])

  if (!media || !media.duration) return 0
  const elapsed = media.isPlaying ? (Date.now() - seen.at) / 1000 : 0
  return Math.min(1, Math.max(0, (seen.position + elapsed) / media.duration))
}
