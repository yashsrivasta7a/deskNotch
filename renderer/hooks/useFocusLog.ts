import { useEffect, useRef, useState } from 'react'
import type { Timer } from './useTimer'

/** One finished session. */
interface Session {
  /** When it ended, ms since the epoch. */
  at: number
  minutes: number
}

const KEY = 'focusLog'
/** Older sessions than this are dropped; the desk shows a week. */
const KEEP_DAYS = 90

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/**
 * Every focus session that ran to the end, kept on disk, and what the desk
 * makes of it: the tally for today and minutes per day of this week.
 */
export function useFocusLog(timer: Timer) {
  const [log, setLog] = useState<Session[]>([])
  const loaded = useRef(false)

  useEffect(() => {
    window.bridge
      ?.invoke<Session[]>('store:get', KEY)
      .then((stored) => setLog(stored ?? []))
      .catch(() => setLog([]))
      .finally(() => {
        loaded.current = true
      })
  }, [])

  // A session counts the moment it finishes — once, on the edge.
  const wasFinished = useRef(timer.finished)
  useEffect(() => {
    if (timer.finished && !wasFinished.current && loaded.current) {
      const cutoff = Date.now() - KEEP_DAYS * 86400000
      setLog((prev) => {
        const next = [...prev.filter((s) => s.at > cutoff), { at: Date.now(), minutes: Math.round(timer.durationMs / 60000) }]
        void window.bridge?.invoke('store:set', KEY, next)
        return next
      })
    }
    wasFinished.current = timer.finished
  }, [timer.finished, timer.durationMs])

  const now = new Date()
  const today = log.filter((s) => sameDay(new Date(s.at), now))

  // This week, Monday first.
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return log.filter((s) => sameDay(new Date(s.at), day)).reduce((sum, s) => sum + s.minutes, 0)
  })

  return {
    today: { sessions: today.length, minutes: today.reduce((sum, s) => sum + s.minutes, 0) },
    week,
    weekday: (now.getDay() + 6) % 7,
  }
}
