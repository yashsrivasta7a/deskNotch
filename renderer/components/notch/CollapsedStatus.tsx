import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { NowPlaying } from '../../hooks/useNowPlaying'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import { BotAvatar, botAvatarPalette } from 'bot-avatars'
import { CALM } from '../widgets/CompanionTile'
import type { Avatar } from '../widgets/SettingsPanel'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

/** Three bars that only move while audio is playing. */
const Pulse: React.FC = () => (
  <div className="flex items-end gap-[2px] h-[9px]">
    {[0.85, 1.15, 0.95].map((duration, index) => (
      <motion.span
        key={index}
        className="w-[2px] rounded-full bg-white/70"
        animate={{ height: ['30%', '100%', '45%', '30%'] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay: index * 0.1 }}
      />
    ))}
  </div>
)

interface CollapsedStatusProps {
  nowPlaying: NowPlaying | null
  tasks: TaskStore
  timer: Timer
  /** The companion, kept small at the left of the bar. */
  avatar?: Avatar | null
  photo?: string | null
}

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * What the notch says when it is closed.
 *
 * One thing at a time, most urgent first: a focus session running, then
 * music (just the art and a pulse — the title was a status line nobody read),
 * then what is left to do.
 */
export const CollapsedStatus: React.FC<CollapsedStatusProps> = ({ nowPlaying, tasks, timer, avatar, photo }) => {
  const focusing = timer.isRunning
  const isPlaying = !focusing && Boolean(nowPlaying?.isPlaying)
  const open = focusing || isPlaying ? 0 : tasks.tasks.filter((task) => !task.done).length

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {avatar &&
        (avatar === 'photo' ? (
          photo && <img src={photo} alt="" className="h-[16px] w-[16px] shrink-0 rounded-full object-cover" />
        ) : (
          <div className="-my-1 shrink-0">
            <BotAvatar type={avatar} size={20} theme="dark" interactive={false} {...CALM} />
          </div>
        ))}

      <AnimatePresence mode="popLayout">
        {focusing && (
          <motion.div
            key="focus"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-1.5 overflow-hidden"
          >
            {/* The session as a ring, the same shape as the card it came from. */}
            <svg viewBox="0 0 12 12" className="h-[11px] w-[11px] shrink-0 -rotate-90">
              <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
              <motion.circle
                cx="6"
                cy="6"
                r="4.5"
                fill="none"
                stroke={avatar && avatar !== 'photo' ? botAvatarPalette[avatar] : 'white'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 4.5}
                animate={{ strokeDashoffset: 2 * Math.PI * 4.5 * (timer.durationMs ? timer.remainingMs / timer.durationMs : 1) }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </svg>
            <span className="text-[10px] font-semibold tabular-nums text-white/80 whitespace-nowrap">
              {clock(timer.remainingMs)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {isPlaying && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-2 min-w-0 overflow-hidden"
          >
            {/* The art, then the title, then the pulse: what, which, and that it
                is still going — the Island's own order. */}
            {nowPlaying?.thumbnailUrl && (
              <img
                src={nowPlaying.thumbnailUrl}
                alt=""
                className="h-[16px] w-[16px] shrink-0 rounded-[4px] object-cover"
              />
            )}
            <Pulse />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {open > 0 && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-1 overflow-hidden"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-white/35 shrink-0" />
            <span className="text-[10px] tabular-nums text-white/45 whitespace-nowrap">
              {open}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
