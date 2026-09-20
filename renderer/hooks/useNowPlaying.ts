import { useEffect, useState } from 'react'

/** Mirrors NowPlaying in main/smtc.ts. */
export interface NowPlaying {
  sourceAppId: string
  title: string
  artist: string
  album: string
  isPlaying: boolean
  position: number
  duration: number
  thumbnailUrl: string | null
}

/**
 * Current track, or null when nothing is playing.
 *
 * Two ways in, because a push alone is not enough: the main process already
 * knows the track before this component mounts, and it will not send again
 * until something changes. So ask once, then listen.
 */
export function useNowPlaying(): NowPlaying | null {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)

  useEffect(() => {
    // 1. Whatever is playing right now.
    window.bridge
      ?.invoke<NowPlaying | null>('smtc:get')
      .then(setNowPlaying)
      .catch(() => setNowPlaying(null))

    // 2. Every change from here on. `on` returns its own unsubscribe.
    const unsubscribe = window.bridge?.on<NowPlaying | null>(
      'smtc:now-playing',
      setNowPlaying
    )

    return unsubscribe
  }, [])

  return nowPlaying
}
