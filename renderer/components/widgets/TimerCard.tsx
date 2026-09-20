import React, { useState } from 'react'
import { motion } from 'motion/react'
import type { Timer } from '../../hooks/useTimer'
import { AnimatedCounter } from '../ui/animated-counter'
import { cn } from '../../lib/utils'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }
const ACCENT = '#FF5F2E'

/** Each group is its own counter so only the digits that change actually roll —
 *  a single counter over the whole value would spin the minutes every second. */
const split = (totalMs: number) => {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalMs) ? totalMs : 0))
  return {
    hours: Math.floor(safe / 3600000),
    minutes: Math.floor((safe % 3600000) / 60000),
    seconds: Math.floor((safe % 60000) / 1000),
    hundredths: Math.floor((safe % 1000) / 10),
  }
}

const PRESETS = [1, 5, 10, 25]

interface TimerCardProps {
  /** State is owned above this card so it survives the notch collapsing. */
  timer: Timer
}

export const TimerCard: React.FC<TimerCardProps> = ({ timer }) => {
  const { remainingMs, isRunning, finished, start, add, stop, reset } = timer
  const [custom, setCustom] = useState('')
  const { hours, minutes, seconds, hundredths } = split(remainingMs)

  const handleAction = () => {
    if (isRunning) {
      stop()
      return
    }

    const minutes = parseFloat(custom.trim())
    if (Number.isFinite(minutes) && minutes > 0) {
      if (minutes > 1440) return // Max 24 hours (1440 mins)
      start(Math.round(minutes * 60))
      setCustom('')
      return
    }

    // If there is paused remaining time, resume it
    if (remainingMs > 0 && !finished) {
      start(remainingMs / 1000)
    }
  }

  return (
    <div className="flex flex-col justify-between h-full rounded-card bg-[#121215]/90 border border-white/[0.08] px-3.5 pt-3.5 pb-5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      {/* Header matching tasks header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#FF5F2E] animate-pulse' : 'bg-white/40'}`} />
          <span className="text-[12px] font-semibold text-white/90 tracking-tight">Timer</span>
        </div>
        {isRunning ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FF5F2E]/15 text-[#FF5F2E] border border-[#FF5F2E]/25">
            Active
          </span>
        ) : finished ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
            Time's up
          </span>
        ) : (
          <span className="tabular-nums text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/60">
            Ready
          </span>
        )}
      </div>

      {/* Hero Time Display: Clean, professional timer with baseline-aligned (neeche) microseconds */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-1">
        <motion.div
          animate={finished ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={finished ? { duration: 0.4 } : spring}
          className="flex items-center justify-center select-none leading-none pointer-events-none text-white font-bold tracking-tight"
        >
          {/* Main digits: minutes & seconds */}
          <div className={cn(
            "flex items-center tabular-nums",
            hours > 0 ? "text-[44px]" : "text-[62px]"
          )}>
            {hours > 0 && (
              <>
                <AnimatedCounter value={hours} duration={0.4} separator="" />
                <span className="opacity-30 mx-1 font-light text-white select-none">:</span>
              </>
            )}
            <AnimatedCounter value={minutes} padStart={2} duration={0.4} separator="" />
            <span className="opacity-30 mx-1 font-light text-white select-none">:</span>
            <AnimatedCounter value={seconds} padStart={2} duration={0.4} separator="" />
          </div>

          {/* Microseconds aligned to the bottom baseline (neeche) like a professional timer */}
          <div className={cn(
            "flex items-baseline tabular-nums ml-1 select-none",
            hours > 0 ? "translate-y-[9px]" : "translate-y-[14px]"
          )}>
            <span className="text-[16px] font-normal text-white/40 mr-0.5">.</span>
            <span className={cn(
              "font-semibold text-white/70 tracking-tight",
              hours > 0 ? "text-[16px]" : "text-[20px]"
            )}>
              {String(hundredths).padStart(2, '0')}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Presets & Custom Input matching tasks controls styling */}
      <div className="shrink-0 space-y-2 pt-1">
        <div className="flex items-center justify-center gap-1.5">
          {PRESETS.map((m) => (
            <motion.button
              key={m}
              type="button"
              onClick={() => (isRunning ? add(m * 60) : start(m * 60))}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={spring}
              className="flex-1 py-1.5 rounded-control bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.06]
                         border border-white/[0.08] hover:border-white/[0.14]
                         text-[11px] font-medium text-white/80 hover:text-white
                         transition-all cursor-pointer"
            >
              {isRunning ? `+${m}` : `${m}`}m
            </motion.button>
          ))}

          <motion.button
            type="button"
            onClick={reset}
            aria-label="Reset timer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            className="w-7 h-7 rounded-control grid place-items-center
                       bg-white/[0.04] hover:bg-red-500/15 active:bg-red-500/25
                       border border-white/[0.08] hover:border-red-500/30
                       text-white/40 hover:text-red-400
                       transition-all shrink-0 cursor-pointer"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-none stroke-current stroke-[1.75]">
              <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            value={custom}
            maxLength={4}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            inputMode="decimal"
            placeholder="Custom minutes"
            className="flex-1 min-w-0 rounded-control bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08]
                       border border-white/[0.08] focus:border-[#FF5F2E]/60
                       px-3 py-1.5 text-[11px] text-white
                       placeholder:text-white/30 outline-none
                       transition-all duration-200"
          />
          <motion.button
            type="button"
            onClick={handleAction}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            className="shrink-0 rounded-control px-4 py-1.5 text-[11px] font-semibold text-white
                       bg-[#FF5F2E] hover:brightness-110 active:scale-95
                       shadow-[0_1px_6px_rgba(255,95,46,0.3)] transition-all cursor-pointer"
          >
            {isRunning ? 'Stop' : 'Start'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
