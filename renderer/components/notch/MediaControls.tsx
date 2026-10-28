import React from 'react'
import { motion } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

/** Filled, not stroked: at this size a stroked play triangle reads as a wire. */
const glyph = { fill: 'currentColor', strokeWidth: 0 } as const

/** The notch's spring. Snappy enough to feel physical, damped enough not to wobble. */
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
      solid ? 'w-10 h-10 bg-white text-black hover:bg-white/90' : 'w-9 h-9 text-white/60 hover:text-white'
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
      <SkipBack size={17} {...glyph} />
    </ControlButton>

    <ControlButton label={isPlaying ? 'Pause' : 'Play'} solid onClick={onPlayPause}>
      {isPlaying ? <Pause size={19} {...glyph} /> : <Play size={19} {...glyph} />}
    </ControlButton>

    <ControlButton label="Next track" onClick={onNext}>
      <SkipForward size={17} {...glyph} />
    </ControlButton>
  </div>
)
