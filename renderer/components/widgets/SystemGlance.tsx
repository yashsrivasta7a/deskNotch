import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useBattery } from '../../hooks/useBattery'

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

interface SystemStats {
  memoryUsed: number
  uptimeSeconds: number
}

/** Colour only when it means something — a healthy reading stays quiet. */
const batteryColor = (level: number, charging: boolean) => {
  if (charging) return 'rgba(48, 209, 88, 0.9)'
  if (level <= 0.1) return 'rgba(255, 69, 58, 0.9)'
  if (level <= 0.2) return 'rgba(255, 159, 10, 0.85)'
  return 'rgba(255, 255, 255, 0.6)'
}

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  if (hours < 1) return `${Math.floor(seconds / 60)}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** A labelled bar — the same shape for every reading, so they compare at a glance. */
const Meter: React.FC<{ label: string; value: number; color: string; readout: string }> = ({
  label,
  value,
  color,
  readout,
}) => (
  <div className="flex flex-col gap-1 min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[8px] font-bold tracking-[0.1em] text-white/25">{label}</span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={readout}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={{ duration: 0.18 }}
          className="text-[10px] font-semibold tabular-nums leading-none"
          style={{ color }}
        >
          {readout}
        </motion.span>
      </AnimatePresence>
    </div>

    <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
      <motion.div
        className="h-full rounded-full origin-left"
        style={{ backgroundColor: color }}
        animate={{ scaleX: Math.max(0.02, value) }}
        transition={spring}
      />
    </div>
  </div>
)

/**
 * The machine's state in three readings.
 *
 * Everything here comes from web or Node APIs — no native modules — and each
 * one answers a question worth glancing up for: will it last, is it slowing
 * down, how long has it been on.
 */
export const SystemGlance: React.FC = () => {
  const battery = useBattery()
  const [stats, setStats] = useState<SystemStats | null>(null)

  useEffect(() => {
    const read = () => {
      window.bridge
        ?.invoke<SystemStats>('system:stats')
        .then(setStats)
        .catch(() => setStats(null))
    }

    read()
    // Memory moves slowly; polling faster would only burn cycles.
    const timer = setInterval(read, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-0">
      {battery.supported && (
        <Meter
          label="BATTERY"
          value={battery.level}
          color={batteryColor(battery.level, battery.charging)}
          readout={`${Math.round(battery.level * 100)}%${battery.charging ? ' ⚡' : ''}`}
        />
      )}

      {stats && (
        <Meter
          label="MEMORY"
          value={stats.memoryUsed}
          color={
            stats.memoryUsed > 0.9
              ? 'rgba(255, 69, 58, 0.9)'
              : stats.memoryUsed > 0.75
                ? 'rgba(255, 159, 10, 0.85)'
                : 'rgba(255, 255, 255, 0.6)'
          }
          readout={`${Math.round(stats.memoryUsed * 100)}%`}
        />
      )}

      {stats && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[8px] font-bold tracking-[0.1em] text-white/25">UPTIME</span>
          <span className="text-[10px] font-semibold tabular-nums text-white/45 leading-none">
            {formatUptime(stats.uptimeSeconds)}
          </span>
        </div>
      )}
    </div>
  )
}
