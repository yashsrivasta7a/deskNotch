import { useEffect, useState } from 'react'

/** Mirrors the types in main/ipc/limits.ts. */
export interface Limit {
  label: string
  used: number
  resetsAt: string | null
}

export type ProviderLimits =
  | { name: string; limits: Limit[] }
  | { name: string; error: 'expired' | 'unavailable' }

/** Every mounted poller's "check now", for a retry button anywhere. */
const refreshers = new Set<() => Promise<void>>()

/** Checks the limits again right away, past any back-off. */
export const refreshAiLimits = () => Promise.all([...refreshers].map((refresh) => refresh())).then(() => undefined)

/** Plan limits for every signed-in AI tool, polled from the main process.
 *  Disabled, it makes no requests at all. */
export function useAiLimits(enabled = true) {
  const [providers, setProviders] = useState<ProviderLimits[] | null>(null)

  useEffect(() => {
    if (!enabled) return
    const read = (force = false) =>
      (window.bridge?.invoke<ProviderLimits[]>('ai:limits', force) ?? Promise.resolve([]))
        .then(setProviders)
        .catch(() => setProviders([]))

    void read()
    const refresh = () => read(true)
    refreshers.add(refresh)
    // Limits move over minutes, and these are the providers' servers — no need to hammer them.
    const timer = setInterval(() => void read(), 120000)
    return () => {
      clearInterval(timer)
      refreshers.delete(refresh)
    }
  }, [enabled])

  return providers
}

/** "resets in 2h 14m", "resets in 26d 1h". */
export const formatReset = (resetsAt: string | null) => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - Date.now()) / 60000))
  if (minutes < 60) return `resets in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `resets in ${hours}h ${minutes % 60}m`
  return `resets in ${Math.floor(hours / 24)}d ${hours % 24}h`
}
