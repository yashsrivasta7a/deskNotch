import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

const format = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TimerCardProps {
  /** Lets the notch stay open while a countdown is running. */
  onRunningChange?: (isRunning: boolean) => void
}

export const TimerCard: React.FC<TimerCardProps> = ({ onRunningChange }) => {
  const [remaining, setRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  // Tracks whether a timer ran down, so "Time's up" only shows after a real
  // countdown rather than on a fresh 00:00.
  const [finished, setFinished] = useState(false)

  // setInterval drifts, so the deadline is stored as a timestamp and the
  // remaining time is derived from the clock on every tick.
  const deadlineRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRunning) return

    const tick = () => {
      if (deadlineRef.current === null) return
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setRemaining(left)

      if (left === 0) {
        setIsRunning(false)
        setFinished(true)
        deadlineRef.current = null
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [isRunning])

  // Held in a ref so a caller passing an inline function cannot turn this into
  // a render loop.
  const onRunningChangeRef = useRef(onRunningChange)
  onRunningChangeRef.current = onRunningChange

  useEffect(() => {
    onRunningChangeRef.current?.(isRunning)
  }, [isRunning])

  const addMinutes = (minutes: number) => {
    const base = deadlineRef.current ?? Date.now()
    deadlineRef.current = base + minutes * 60_000
    setRemaining(Math.round((deadlineRef.current - Date.now()) / 1000))
    setFinished(false)
    setIsRunning(true)
  }

  const reset = () => {
    deadlineRef.current = null
    setIsRunning(false)
    setFinished(false)
    setRemaining(0)
  }

  return (
    <div className="flex flex-col h-full rounded-2xl bg-neutral-100 dark:bg-[#161616] p-3 overflow-hidden">
      <div className="flex-1 grid place-items-center min-h-0">
        <div className="text-center">
          <motion.div
            key={finished ? 'done' : 'running'}
            animate={finished ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={finished ? { duration: 0.4 } : spring}
            className="text-3xl font-light tabular-nums tracking-tight text-neutral-800 dark:text-neutral-100"
          >
            {format(remaining)}
          </motion.div>

          <div className="h-4 mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
            {finished ? "Time's up" : isRunning ? 'Counting down' : 'Set a timer'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 shrink-0">
        <motion.button
          type="button"
          onClick={() => addMinutes(5)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          className="flex items-center gap-1.5 rounded-full bg-[#FF5F2E] text-white
                     px-3 py-1.5 text-[11px] font-medium
                     shadow-[0_1px_2px_rgba(0,0,0,0.06),0_3px_10px_rgba(0,0,0,0.08)]"
        >
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
            <path d="M3 2l7 4-7 4z" />
          </svg>
          +5 min
        </motion.button>

        <motion.button
          type="button"
          onClick={reset}
          aria-label="Reset timer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          className="grid place-items-center w-8 h-8 rounded-full
                     bg-white dark:bg-[#1F1F1F] hover:brightness-95 dark:hover:brightness-110
                     transition-[filter] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <svg viewBox="0 0 12 12" className="w-3 h-3 fill-none stroke-neutral-800 stroke-[1.8]">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
