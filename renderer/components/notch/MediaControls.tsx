import React from 'react'
import { motion } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

/** Filled, not stroked: at this size a stroked play triangle reads as a wire. */
const glyph = { fill: 'currentColor', strokeWidth: 0 } as const

/** Dynamic Island spring. Snappy enough to feel physical, damped enough not to wobble. */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface ControlButtonProps {
  label: string
  onClick?: () => void
  children: React.ReactNode
}

const ControlButton: React.FC<ControlButtonProps> = ({ label, onClick, children }) => (
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
    className="grid place-items-center w-7 h-7 rounded-full text-white/55
               hover:text-white hover:bg-white/10 transition-colors
               focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/40"
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

    <ControlButton label={isPlaying ? 'Pause' : 'Play'} onClick={onPlayPause}>
      {isPlaying ? <Pause size={15} {...glyph} /> : <Play size={15} {...glyph} />}
    </ControlButton>

    <ControlButton label="Next track" onClick={onNext}>
      <SkipForward size={13} {...glyph} />
    </ControlButton>
  </div>
)
