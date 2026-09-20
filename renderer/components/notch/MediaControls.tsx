import React from 'react'
import { motion } from 'motion/react'

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
    onClick={onClick}
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
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
        <path d="M4 3h1.6v10H4zm8 0v10L5.6 8z" />
      </svg>
    </ControlButton>

    <ControlButton label={isPlaying ? 'Pause' : 'Play'} onClick={onPlayPause}>
      {/* Morphs between the two glyphs rather than swapping them. */}
      <motion.svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
        <motion.path
          initial={false}
          animate={{ d: isPlaying ? 'M4 3h2.5v10H4z' : 'M4.5 3L13 8l-8.5 5z' }}
          transition={spring}
        />
        <motion.path
          initial={false}
          animate={{
            d: isPlaying ? 'M9.5 3H12v10H9.5z' : 'M4.5 3L13 8l-8.5 5z',
            opacity: isPlaying ? 1 : 0,
          }}
          transition={spring}
        />
      </motion.svg>
    </ControlButton>

    <ControlButton label="Next track" onClick={onNext}>
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
        <path d="M10.4 3H12v10h-1.6zM4 3l6.4 5L4 13z" />
      </svg>
    </ControlButton>
  </div>
)
