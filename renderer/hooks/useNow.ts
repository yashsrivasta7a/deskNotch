import { useEffect, useState } from 'react'

/** Live clock, ticking on the minute: nothing shows seconds, so a per-second
 *  render for a static string would be waste. */
export const useNow = () => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => {
        setNow(new Date())
        timer = schedule()
      }, 60_000 - (Date.now() % 60_000))

    let timer = schedule()
    return () => clearTimeout(timer)
  }, [])

  return now
}
