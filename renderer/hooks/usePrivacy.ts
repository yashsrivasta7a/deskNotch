import { useEffect, useState } from 'react'

/** Mirrors PrivacyState in main/ipc/privacy.ts. */
export interface PrivacyState {
  mic: boolean
  camera: boolean
  /** The Wi-Fi network, when connected. */
  wifi: { name: string; signal: number } | null
  /** Names of connected Bluetooth devices. */
  bluetooth: string[]
}

/** Microphone and camera in use, Wi-Fi and Bluetooth: the edge of the closed bar. */
export function usePrivacy() {
  const [state, setState] = useState<PrivacyState>({ mic: false, camera: false, wifi: null, bluetooth: [] })

  useEffect(() => {
    const unsubscribe = window.bridge?.on<PrivacyState>('privacy:state', setState)
    window.bridge
      ?.invoke<PrivacyState>('privacy:get')
      .then(setState)
      .catch(() => {})
    return () => unsubscribe?.()
  }, [])

  return state
}
