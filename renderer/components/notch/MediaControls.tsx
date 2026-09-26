import React from 'react'
import { motion } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

/** Filled, not stroked: at this size a stroked play triangle reads as a wire. */
const glyph = { fill: 'currentColor', strokeWidth: 0 } as const

/** Dynamic Island spring. Snappy enough to feel physical, damped enough not to wobble. */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface ControlButtonProps {
  label: string
  /** The main control: a filled disc rather than a bare glyph. */
  solid?: boolean
  onClick?: () => void
  children: React.ReactNode
}

const ControlButton: React.FC<ControlButtonProps> = ({ label, solid, onClick, children }) => (
  <motion.button
    type="button"
    aria-label={label}
    onClick={(event) => {
      event.stopPropagation()
      onClick?.()
    }}
    whileHover={{ scale: 1.12 }}
    whileTap={{ scale: 0.92 }}
    transition={spring}
    className={`grid place-items-center rounded-full transition-colors ${
      solid ? 'w-8 h-8 bg-white text-black hover:bg-white/90' : 'w-7 h-7 text-white/60 hover:text-white hover:bg-white/10'
    } focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/40`}
  >
    {children}
  </motion.button>
)

interface MediaControlsProps {
  isPlaying: boolean
  onPrevious?: () => void
  onPlayPause?: () => void
  onNext?: () => void
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isPlaying,
  onPrevious,
  onPlayPause,
  onNext,
}) => (
  <div className="flex items-center gap-0.5">
    <ControlButton label="Previous track" onClick={onPrevious}>
      <SkipBack size={13} {...glyph} />
    </ControlButton>

    <ControlButton label={isPlaying ? 'Pause' : 'Play'} solid onClick={onPlayPause}>
      {isPlaying ? <Pause size={15} {...glyph} /> : <Play size={15} {...glyph} />}
    </ControlButton>

    <ControlButton label="Next track" onClick={onNext}>
      <SkipForward size={13} {...glyph} />
    </ControlButton>
  </div>
)
