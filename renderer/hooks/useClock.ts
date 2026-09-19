import { useState, useEffect } from 'react'

export interface ClockState {
  time: string
  date: string
}

export function useClock(): ClockState {
  const [clock, setClock] = useState<ClockState>({
    time: '',
    date: '',
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const timeStr = `${hours}:${minutes}`

      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
      const dateStr = now.toLocaleDateString(undefined, options)

      setClock({ time: timeStr, date: dateStr })
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return clock
}
