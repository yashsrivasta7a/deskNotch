import { useEffect, useState } from 'react'

export interface BatteryState {
  level: number
  charging: boolean
  supported: boolean
}

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

/** Laptop charge, via the browser's own battery API — no native code needed. */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    level: 1,
    charging: false,
    supported: false,
  })

  useEffect(() => {
    const getBattery = (navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>
    }).getBattery

    if (!getBattery) return

    let battery: BatteryManager | null = null

    const sync = () => {
      if (!battery) return
      setState({ level: battery.level, charging: battery.charging, supported: true })
    }

    getBattery.call(navigator).then((found) => {
      battery = found
      sync()
      battery.addEventListener('levelchange', sync)
      battery.addEventListener('chargingchange', sync)
    })

    return () => {
      battery?.removeEventListener('levelchange', sync)
      battery?.removeEventListener('chargingchange', sync)
    }
  }, [])

  return state
}
