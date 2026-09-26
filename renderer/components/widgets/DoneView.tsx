import React from 'react'
import { motion } from 'motion/react'
import { BotAvatar } from 'bot-avatars'
import { CALM } from './CompanionTile'
import { lengthSeconds } from '../../lib/focus'
import type { Timer } from '../../hooks/useTimer'
import type { Avatar } from './SettingsPanel'

export const DONE_WIDTH = 280
export const DONE_HEIGHT = 124

const spring = { type: 'spring' as const, stiffness: 420, damping: 22 }

/** A few ways to say it, so it is not the same line every time. */
const CHEERS = ['Done!', 'Nailed it!', 'All done!', 'Nice work!']

/**
 * A focus session just ended: the notch opens on this alone. The companion
 * pops up and says so in a comic speech bubble, the classic way; how long
 * you went and what to do next sit underneath.
 */
export const DoneView: React.FC<{
  timer: Timer
  minutes: number
  avatar: Avatar
  photo: string | null
  accent: string
  onDone: () => void
}> = ({ timer, minutes, avatar, photo, accent, onDone }) => {
  const secs = Math.round(timer.durationMs / 1000)
  const went = secs < 60 ? `${secs} sec` : `${Math.round(secs / 60)} min`
  const [cheer] = React.useState(() => CHEERS[Math.floor(Math.random() * CHEERS.length)])

  return (
    <div className="flex h-full flex-col items-center justify-center" onClick={(event) => event.stopPropagation()}>
      {/* The companion, and what it says: the bubble's tail points back at it. */}
      <div className="flex items-center gap-2.5">
        {/* A fixed box: the avatar draws past its size, so it gets room of its own. */}
        <motion.div
          className="grid h-[52px] w-[52px] shrink-0 place-items-center"
          initial={{ y: 16, scale: 0.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={spring}
        >
          {avatar === 'photo' ? (
            photo && <img src={photo} alt="" className="h-[44px] w-[44px] rounded-full object-cover" />
          ) : (
            <BotAvatar type={avatar} size={48} theme="dark" state="working" {...CALM} />
          )}
        </motion.div>
        <motion.div
          className="relative rounded-[14px] bg-white px-3 py-1.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]"
          style={{ originX: 0, originY: 0.5 }}
          initial={{ scale: 0, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.25 }}
        >
          {/* The tail: a small corner pointing left, at the companion. */}
          <span aria-hidden className="absolute -left-[4px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rotate-45 rounded-[2px] bg-white" />
          <span className="relative block whitespace-nowrap text-[13px] font-bold leading-tight text-black">{cheer}</span>
          <span className="relative block whitespace-nowrap text-[10px] font-medium leading-tight text-black/50">Focus complete</span>
        </motion.div>
      </div>

      <motion.div
        className="mt-2.5 flex items-center gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.22 }}
      >
        <span className="text-[11px] font-medium text-white/50">
          <span className="font-semibold tabular-nums" style={{ color: accent }}>
            {went}
          </span>{' '}
          of focus
        </span>
        <div className="flex gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              timer.reset()
              timer.start(lengthSeconds(minutes))
              onDone()
            }}
            className="h-[26px] shrink-0 whitespace-nowrap rounded-full px-4 text-[11px] font-semibold text-black"
            style={{ background: accent }}
          >
            Again
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              timer.reset()
              onDone()
            }}
            className="h-[26px] shrink-0 whitespace-nowrap rounded-full bg-white/[0.08] px-4 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
