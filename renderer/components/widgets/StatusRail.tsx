import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useBattery } from '../../hooks/useBattery'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

/**
 * Colour only when it means something.
 *
 * A battery that is simply fine should not be shouting a colour at the user —
 * it earns one once it is low, and green only while charging, which is a state
 * worth confirming.
 */
const levelColor = (level: number, charging: boolean) => {
  if (charging) return 'rgba(48, 209, 88, 0.9)'
  if (level <= 0.1) return 'rgba(255, 69, 58, 0.9)'
  if (level <= 0.2) return 'rgba(255, 159, 10, 0.85)'
  return 'rgba(255, 255, 255, 0.55)'
}

export const StatusRail: React.FC = () => {
  const battery = useBattery()
  if (!battery.supported) return null

  const percent = Math.round(battery.level * 100)
  const color = levelColor(battery.level, battery.charging)
  const isLow = battery.level <= 0.2 && !battery.charging

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-[17px] h-[9px] rounded-[2.5px] border border-white/20">
        {/* Terminal nub, so it reads as a battery rather than a bar. */}
        <div className="absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-[3px] rounded-r-[1px] bg-white/20" />

        <motion.div
          className="absolute inset-[1.5px] rounded-[1px] origin-left"
          style={{ backgroundColor: color }}
          animate={{ scaleX: Math.max(0.05, battery.level) }}
          transition={spring}
        />

        <AnimatePresence>
          {battery.charging && (
            <motion.svg
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={spring}
              viewBox="0 0 10 10"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                         w-[7px] h-[7px] fill-black/75"
            >
              <path d="M5.6 0L1.4 5.4h2.6L4.4 10l4.2-5.4H6L5.6 0z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* The number only appears when it matters — otherwise the bar says enough. */}
      <AnimatePresence>
        {(isLow || battery.charging) && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="text-[9px] font-semibold tabular-nums leading-none overflow-hidden whitespace-nowrap"
            style={{ color }}
          >
            {percent}%
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
