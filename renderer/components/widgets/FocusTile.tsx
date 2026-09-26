import React, { useState } from 'react'
import { formatLength, lengthSeconds } from '../../lib/focus'
import { Plus } from 'lucide-react'
import { QuickAdd } from './QuickAdd'
import { AnimatePresence, motion } from 'motion/react'
import { Complication } from '../ui/complication'
import { Tile, TileLabel } from '../ui/tile'
import type { Timer } from '../../hooks/useTimer'
import type { TaskStore } from '../../hooks/useTasks'


/** Focus has its own colour, so it never reads as another usage meter. */
export const FOCUS_COLOR = 'rgb(52, 211, 153)'

export const FOCUS_WIDTH = 244

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Focus and the task it is for, in one card: a session is something you do
 * *on* something. The ring fills as the session passes; the task sits under
 * the countdown, tickable when it is done. Tap the card to start or pause.
 */
export const FocusTile: React.FC<{ timer: Timer; tasks?: TaskStore; minutes: number }> = ({ timer, tasks, minutes }) => {
  const { remainingMs, durationMs, isRunning, finished, start, stop } = timer
  const paused = !isRunning && remainingMs > 0 && !finished
  const active = isRunning || paused
  const next = tasks?.tasks.find((task) => !task.done)
  const [adding, setAdding] = useState(false)

  return (
    <Tile
      width={FOCUS_WIDTH}
      label={isRunning ? 'Pause focus' : 'Start focus'}
      onClick={adding ? undefined : () => (isRunning ? stop() : paused ? start(remainingMs / 1000) : start(lengthSeconds(minutes)))}
    >
      <div className="flex h-full items-center gap-3">
        <div className="-ml-1 shrink-0">
          <Complication
            compact
            shape="ring"
            fill={active && durationMs ? 1 - remainingMs / durationMs : 1}
            color={FOCUS_COLOR}
            value=""
            label=""
            idle={!active && !finished}
          />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col justify-between py-0.5">
          <TileLabel>{finished ? 'Done' : paused ? 'Paused' : isRunning ? 'Focusing' : 'Focus'}</TileLabel>

          <span
            className="text-[26px] font-semibold leading-none tracking-[-0.03em] transition-colors"
            style={{ color: active ? FOCUS_COLOR : finished ? FOCUS_COLOR : 'rgba(255,255,255,0.9)' }}
          >
            {active ? clock(remainingMs) : finished ? 'Break' : formatLength(minutes)}
          </span>

          {tasks ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={next?.id ?? 'none'}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14 }}
                className="flex min-w-0 items-center gap-1.5"
              >
                {next ? (
                  <>
                    <button
                      type="button"
                      aria-label="Mark done"
                      onClick={(event) => {
                        event.stopPropagation()
                        tasks.toggle(next.id)
                      }}
                      className="group grid h-[13px] w-[13px] shrink-0 place-items-center rounded-full border border-white/35 transition-colors hover:border-white hover:bg-white/20"
                    />
                    <span className="truncate text-[11.5px] leading-none text-white/65">{next.label}</span>
                  </>
                ) : adding ? (
                  <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="!text-[11.5px]" />
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setAdding(true)
                    }}
                    className="flex items-center gap-1 text-[11px] leading-none text-white/35 transition-colors hover:text-white"
                  >
                    <Plus size={11} strokeWidth={2.2} />
                    Add a task
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <span className="text-[11px] leading-none text-white/35">
              {isRunning ? 'tap to pause' : paused ? 'tap to resume' : 'tap to start'}
            </span>
          )}
        </div>
      </div>
    </Tile>
  )
}
