import { useEffect, useRef, useState } from 'react'

export interface Timer {
  remaining: number
  remainingMs: number
  /** The full length of the current run, so progress can be drawn. */
  durationMs: number
  isRunning: boolean
  finished: boolean
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
  reset: () => void
}

export function useTimer(): Timer {
  const [remainingMs, setRemainingMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const deadlineRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      if (deadlineRef.current === null) return
      const left = Math.max(0, deadlineRef.current - Date.now())
      setRemainingMs(left)
      if (left <= 0) {
        setIsRunning(false)
        setFinished(true)
        deadlineRef.current = null
      }
    }

    tick()
    const id = setInterval(tick, 33)
    return () => clearInterval(id)
  }, [isRunning])

  const start = (seconds: number) => {
    if (seconds <= 0) return
    deadlineRef.current = Date.now() + seconds * 1000
    setRemainingMs(seconds * 1000)
    setDurationMs(seconds * 1000)
    setFinished(false)
    setIsRunning(true)
  }

  const add = (seconds: number) => {
    const base = deadlineRef.current ?? Date.now()
    deadlineRef.current = base + seconds * 1000
    setDurationMs((total) => total + seconds * 1000)
    setRemainingMs(Math.max(0, deadlineRef.current - Date.now()))
    setFinished(false)
    setIsRunning(true)
  }

  const stop = () => {
    if (deadlineRef.current !== null) {
      const left = Math.max(0, deadlineRef.current - Date.now())
      setRemainingMs(left)
      deadlineRef.current = null
    }
    setIsRunning(false)
  }

  const reset = () => {
    deadlineRef.current = null
    setIsRunning(false)
    setFinished(false)
    setRemainingMs(0)
    setDurationMs(0)
  }

  return {
    remaining: Math.ceil(remainingMs / 1000),
    remainingMs,
    durationMs,
    isRunning,
    finished,
    start,
    add,
    stop,
    reset,
  }
}
