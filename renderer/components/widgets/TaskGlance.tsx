import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { TaskStore } from '../../hooks/useTasks'

/** Matches REORDER in task-list.tsx, so both views move alike. */
const spring = { type: 'spring' as const, stiffness: 320, damping: 30 }

/**
 * Tasks at a glance: the next few, tickable in place.
 *
 * Read and complete only — adding happens in the Tasks view, where there is
 * room to type. Seeing what is due should never require switching views; that
 * is the one thing the notch is for.
 */
interface TaskGlanceProps {
  store: TaskStore
}

export const TaskGlance: React.FC<TaskGlanceProps> = ({ store }) => {
  const { tasks, toggle } = store

  const open = tasks.filter((task) => !task.done)
  const visible = open.slice(0, 3)

  return (
    <div className="flex flex-col gap-1.5 min-w-0 pt-0.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[9px] font-bold tracking-[0.1em] text-white/25">TASKS</span>
        <AnimatePresence mode="popLayout">
          {open.length > 0 && (
            <motion.span
              key={open.length}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.16 }}
              className="text-[9px] font-semibold tabular-nums text-white/40"
            >
              {open.length}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((task) => (
            <motion.button
              key={task.id}
              layout
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggle(task.id)
              }}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              // Completed tasks leave to the right with a strike, so the
              // gesture reads as finishing rather than deleting.
              exit={{ opacity: 0, x: 14, transition: { duration: 0.22 } }}
              transition={spring}
              className="group flex items-center gap-1.5 text-left min-w-0"
            >
              <span className="relative grid place-items-center w-[12px] h-[12px] shrink-0">
                <span className="absolute inset-0 rounded-full border border-white/25
                                 group-hover:border-white/70 transition-colors duration-200" />
                <motion.svg
                  viewBox="0 0 12 12"
                  className="relative w-[7px] h-[7px] fill-none stroke-white stroke-[2]
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <path d="M2.5 6.2l2.3 2.3L9.5 3.6" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </span>

              <span className="truncate text-[11px] leading-tight text-white/60
                               group-hover:text-white/90 transition-colors duration-200">
                {task.label}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-white/20 leading-tight"
          >
            All clear
          </motion.span>
        )}

        {open.length > 3 && (
          <span className="text-[9px] text-white/20">+{open.length - 3} more</span>
        )}
      </div>
    </div>
  )
}
