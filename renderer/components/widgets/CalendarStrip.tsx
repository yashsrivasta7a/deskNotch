import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 420, damping: 36 }

const DAY_WIDTH = 26

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** Live clock, because the notch is the thing people look up at. */
const useNow = () => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Tick on the minute: nothing here shows seconds, and a per-second render
    // for a static string is waste.
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

export const CalendarStrip: React.FC = () => {
  const now = useNow()

  // Days away from today. Dragging and scrolling both move this; it is an
  // offset rather than a date so a midnight rollover stays consistent.
  const [offset, setOffset] = useState(0)
  const dragAccumulator = useRef(0)

  const anchor = addDays(now, offset)
  // Render two extra days each side, so a day scrolling in is already mounted
  // and slides rather than popping.
  const days = Array.from({ length: 11 }, (_, index) => addDays(anchor, index - 5))

  const shift = (days: number) => setOffset((value) => value + days)

  return (
    <div className="flex flex-col gap-2.5 select-none pt-0.5">
      <div className="flex items-baseline gap-2.5">
        <div className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums">
          {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: false })}
        </div>

        <div className="relative h-[13px] min-w-[86px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {offset === 0 ? (
              <motion.span
                key="weekday"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                className="absolute inset-0 text-[11px] font-medium leading-none text-white/35"
              >
                {now.toLocaleDateString(undefined, { weekday: 'long' })}
              </motion.span>
            ) : (
              <motion.button
                key="reset"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOffset(0)
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                className="absolute inset-0 flex items-center gap-1 text-[11px] font-medium
                           leading-none text-white/50 hover:text-white transition-colors"
              >
                {anchor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                <svg viewBox="0 0 10 10" className="w-2 h-2 fill-none stroke-current stroke-[1.6]">
                  <path d="M6 2L3 5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* A fixed window onto a strip that slides. Scroll or drag moves it a day
          at a time — paging a whole week made it impossible to tell what had
          happened. */}
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          width: DAY_WIDTH * 7,
          // Fades the days themselves at the edges, so it works over the
          // ambient glow instead of painting a black band on top of it.
          maskImage:
            'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        }}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY
          dragAccumulator.current += delta
          const steps = Math.trunc(dragAccumulator.current / 40)
          if (steps !== 0) {
            dragAccumulator.current -= steps * 40
            shift(steps)
          }
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          dragMomentum={false}
          onDrag={(_event, info) => {
            // Convert the drag into whole days as it happens, so the strip
            // tracks the pointer instead of snapping back at the end.
            const steps = Math.trunc(-info.offset.x / DAY_WIDTH) - dragAccumulator.current
            if (steps !== 0) {
              dragAccumulator.current += steps
              shift(steps)
            }
          }}
          onDragEnd={() => {
            dragAccumulator.current = 0
          }}
          className="flex"
          style={{ marginLeft: -DAY_WIDTH * 2 }}
        >
          {days.map((day) => {
            const isToday = sameDay(day, now)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <motion.div
                key={day.toDateString()}
                layout
                transition={spring}
                className="flex flex-col items-center gap-1 shrink-0"
                style={{ width: DAY_WIDTH }}
              >
                <span
                  className={`text-[8px] font-bold leading-none tracking-[0.1em] transition-colors duration-300 ${
                    isToday ? 'text-white/70' : 'text-white/20'
                  }`}
                >
                  {day.toLocaleDateString(undefined, { weekday: 'narrow' }).toUpperCase()}
                </span>

                <div className="relative grid place-items-center w-full h-[20px]">
                  {isToday && (
                    <motion.div
                      layoutId="calendar-today"
                      transition={spring}
                      className="absolute inset-x-[1px] inset-y-0 rounded-[6px] bg-white"
                    />
                  )}
                  <span
                    className={`relative text-[11px] tabular-nums leading-none font-medium transition-colors duration-300 ${
                      isToday ? 'text-black' : isWeekend ? 'text-white/25' : 'text-white/45'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

      </div>
    </div>
  )
}
