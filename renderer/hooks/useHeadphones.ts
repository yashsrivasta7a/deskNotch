import { useEffect, useRef, useState } from 'react'

/** Outputs that are worn: Bluetooth headsets name themselves this way. */
const WORN = /headphone|headset|airpods|buds|earphone|earbud|hands-free|wh-|wf-/i

/** "Headphones (WH-1000XM4)" → "WH-1000XM4": the model, not the role. */
const tidy = (label: string) => label.match(/\(([^)]+)\)/)?.[1]?.replace(/\s*Hands-Free.*$/i, '').trim() || label

/** How long the notch holds the moment before it slides away. */
const SHOW_MS = 1400

/**
 * The name of a pair of headphones that just connected, for a moment, then
 * null again. Windows lists a Bluetooth headset as two outputs at once
 * (stereo and hands-free), so a burst of new devices is one moment.
 */
export function useHeadphones() {
  const [connected, setConnected] = useState<string | null>(null)
  const known = useRef<Set<string> | null>(null)

  useEffect(() => {
    const devices = navigator.mediaDevices
    if (!devices) return
    let hide: ReturnType<typeof setTimeout> | undefined

    const outputs = async () =>
      (await devices.enumerateDevices()).filter(
        (d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications',
      )

    // What is already plugged in when the app starts is not news.
    void outputs().then((list) => {
      known.current = new Set(list.map((d) => d.deviceId))
    })

    const change = async () => {
      const list = await outputs()
      const before = known.current
      known.current = new Set(list.map((d) => d.deviceId))
      if (!before) return
      const arrived = list.find((d) => !before.has(d.deviceId) && WORN.test(d.label))
      if (!arrived) return
      clearTimeout(hide)
      setConnected(tidy(arrived.label))
      hide = setTimeout(() => setConnected(null), SHOW_MS)
    }

    devices.addEventListener('devicechange', change)
    return () => {
      devices.removeEventListener('devicechange', change)
      clearTimeout(hide)
    }
  }, [])

  return connected
}
