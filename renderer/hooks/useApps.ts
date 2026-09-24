import { useEffect, useState } from 'react'

/** Mirrors OpenApp in main/ipc/apps.ts. */
export interface OpenApp {
  pid: number
  name: string
  title: string
  hwnd: string
  icon: string | null
}

/** The apps with a window open. Polled only while something shows them. */
export function useApps(enabled: boolean) {
  const [apps, setApps] = useState<OpenApp[] | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const read = () => {
      window.bridge
        ?.invoke<OpenApp[]>('apps:list')
        .then((list) => {
          if (!cancelled) setApps(list)
        })
        .catch(() => {
          if (!cancelled) setApps([])
        })
    }
    read()
    // Listing costs a PowerShell run; every few seconds is plenty for a dock.
    const timer = setInterval(read, 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])

  return apps
}

export const focusApp = (hwnd: string) => void window.bridge?.invoke('apps:focus', hwnd)
