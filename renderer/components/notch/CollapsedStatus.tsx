import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { NowPlaying } from '../../hooks/useNowPlaying'
import type { TaskStore } from '../../hooks/useTasks'

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
}

/**
 * What the notch says when it is closed.
 *
 * Only two things earn a place: something is playing, and something is due.
 * Anything more and the bar becomes a status line nobody reads.
 */
export const CollapsedStatus: React.FC<CollapsedStatusProps> = ({ nowPlaying, tasks }) => {
  const isPlaying = Boolean(nowPlaying?.isPlaying)
  const open = tasks.tasks.filter((task) => !task.done).length

  return (
    <div className="flex items-center gap-2.5 min-w-0">
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
            <Pulse />
            <span className="truncate text-[10px] text-white/55 max-w-[130px]">
              {nowPlaying?.title}
            </span>
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
