import { useEffect, useState } from 'react'

/** Mirrors TopApp in main/ipc/apps.ts. */
export interface TopApp {
  id: string
  name: string
  icon: string | null
}

/** The apps used most, by Windows' own count; asked for once per mount, while enabled. */
export function useTopApps(enabled = true) {
  const [apps, setApps] = useState<TopApp[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    window.bridge
      ?.invoke<TopApp[]>('apps:top')
      .then(setApps)
      .catch(() => setApps([]))
  }, [enabled])
  return apps
}

/** Every installed app, by name, for picking favourites. */
export function useAllApps() {
  const [apps, setApps] = useState<{ id: string; name: string }[] | null>(null)
  useEffect(() => {
    window.bridge
      ?.invoke<{ id: string; name: string }[]>('apps:all')
      .then(setApps)
      .catch(() => setApps([]))
  }, [])
  return apps
}

/** Names and icons for these app ids, looked up (and cached) by the main process. */
export function useAppInfo(ids: string[]) {
  const [apps, setApps] = useState<TopApp[]>([])
  const key = ids.join('|')
  useEffect(() => {
    if (!ids.length) return setApps([])
    let cancelled = false
    // A short wait, so typing in the picker does not ask on every keystroke.
    const timer = setTimeout(() => {
      window.bridge
        ?.invoke<TopApp[]>('apps:describe', ids)
        .then((list) => !cancelled && setApps(list))
        .catch(() => {})
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key])
  return apps
}

export const launchApp = (id: string) => void window.bridge?.invoke('apps:launch', id)
