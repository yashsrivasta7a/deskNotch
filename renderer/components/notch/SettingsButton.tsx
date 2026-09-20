import React from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface SettingsButtonProps {
  active: boolean
  onClick: () => void
}

/** Separate from the view rail: this opens a panel, it is not a place to be. */
export const SettingsButton: React.FC<SettingsButtonProps> = ({ active, onClick }) => (
  <motion.button
    type="button"
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    aria-label="Settings"
    aria-pressed={active}
    title="Settings"
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.92 }}
    transition={spring}
    className={`grid place-items-center w-7 h-7 rounded-full transition-colors duration-200
      ${active
        ? 'bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)]'
        : 'bg-white/[0.04] text-white/35 hover:text-white/70'}`}
  >
    <motion.svg
      viewBox="0 0 16 16"
      className="w-[13px] h-[13px] fill-none stroke-current stroke-[1.3]"
      animate={{ rotate: active ? 90 : 0 }}
      transition={spring}
    >
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.6v1.8M8 12.6v1.8M14.4 8h-1.8M3.4 8H1.6M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3M12.5 12.5l-1.3-1.3M4.8 4.8L3.5 3.5"
            strokeLinecap="round" />
    </motion.svg>
  </motion.button>
)
