import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ThinkingOrb, makeProj, finalizeFrame, MODE_FRAMES, STATE_TO_MODE, type Dot, type ModeFrame } from 'thinking-orbs'

/** Dots on latitude rings, so a turning globe reads as turning. */
const GLOBE = Array.from({ length: 9 }, (_, ring) => {
  const lat = ((ring + 0.5) / 9 - 0.5) * Math.PI
  const count = Math.max(4, Math.round(24 * Math.cos(lat)))
  return Array.from({ length: count }, (_, i) => ({ lat, lon: (i / count) * Math.PI * 2 }))
}).flat()

/**
 * A dotted globe turning left to right, filled like a tank from the bottom.
 * Dots above the waterline stay a faint outline; the line ripples so a full or
 * empty globe still reads as liquid.
 */
const tankFrame = (fill: number): ModeFrame => (size, t) => {
  const project = makeProj(t * 0.55, 0.35, size / 2, size / 2, size * 0.44)
  const unit = size / 64
  const dots: Dot[] = GLOBE.map(({ lat, lon }) => {
    const wy = Math.sin(lat)
    const [x, y, z] = project(Math.cos(lat) * Math.cos(lon), wy, Math.cos(lat) * Math.sin(lon))
    const near = (z + 1) / 2
    const level = -1 + 2 * fill + Math.sin(lon * 3 + t * 2.2) * 0.05
    return wy > level
      ? { x, y, z, r: (0.25 + 0.4 * near) * unit, white: 0.7 - 0.3 * near, a: 0.22 }
      : { x, y, z, r: (0.4 + 0.75 * near) * unit, white: 0.5 - 0.48 * near }
  })
  return finalizeFrame(dots, [], 0.25 * unit)
}

const breathing = MODE_FRAMES[STATE_TO_MODE.breathing]

/**
 * The breathing ring, filled clockwise from the top: dots up to `fill` keep
 * their full ink, the rest fade to an outline — a progress ring that still
 * breathes.
 */
export const ringFrame = (fill: number): ModeFrame => (size, t, opts) => {
  const frame = breathing(size, t, opts)
  const centre = size / 2
  return {
    ...frame,
    dots: frame.dots.map((dot) => {
      const turn = (Math.atan2(dot.x - centre, centre - dot.y) / (Math.PI * 2) + 1) % 1
      return turn <= fill ? { ...dot, white: Math.min(dot.white, 0.12), r: dot.r * 1.2 } : { ...dot, a: (dot.a ?? 1) * 0.16 }
    }),
  }
}

interface ComplicationProps {
  /** How full the globe is, 0–1. */
  fill: number
  /** A filling globe for an amount; a filling ring for time passing. */
  shape?: 'globe' | 'ring'
  /** Plain rgb() — the orb takes no alpha. */
  color: string
  value: string
  label: string
  /** Replaces the label while hovered. */
  hint?: string
  /** Frozen and grey: nothing to report. */
  idle?: boolean
  /** The orb alone — for a card that puts its own words beside it. */
  compact?: boolean
  onClick?: () => void
}

/**
 * One reading in the glance row, in the shape every reading shares: a globe,
 * its value, and a label that turns into detail on hover. Watch-face
 * complications, not widgets — the row reads as one set.
 */
export const Complication: React.FC<ComplicationProps> = ({ fill, shape = 'globe', color, value, label, hint, idle, compact, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const frame = useMemo(() => (shape === 'ring' ? ringFrame(fill) : tankFrame(fill)), [fill, shape])
  const caption = hovered && hint ? hint : label

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={(event) => {
        if (!onClick) return
        event.stopPropagation()
        onClick()
      }}
      onKeyDown={(event) => onClick && event.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex shrink-0 flex-col items-center outline-none ${compact ? 'w-[64px]' : 'w-[72px]'} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <motion.div
        className="relative -mt-2 mb-0"
        animate={{ scale: hovered ? 1.04 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      >
        {/* Light from the filled part, stronger the fuller the globe. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-full blur-lg transition-opacity duration-500"
          style={{ background: color, opacity: idle ? 0 : 0.06 + 0.22 * fill }}
        />
        <ThinkingOrb
          state={shape === 'ring' ? 'breathing' : 'solving'}
          size={64}
          theme="dark"
          frame={frame}
          color={idle ? 'rgb(170, 170, 178)' : color}
          paused={idle}
        />
      </motion.div>

      {!compact && (
        <span
          className="mt-2 text-[11px] font-semibold tabular-nums leading-none tracking-[-0.01em]"
          style={{ color: idle ? 'rgba(255,255,255,0.4)' : color }}
        >
          {value}
        </span>
      )}

      {!compact && (
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={caption}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.12 }}
          className={`mt-1.5 whitespace-nowrap text-[7.5px] leading-none tabular-nums ${
            caption === label ? 'font-bold uppercase tracking-[0.1em] text-white/30' : 'font-medium text-white/55'
          }`}
        >
          {caption}
        </motion.span>
      </AnimatePresence>
      )}
    </div>
  )
}
