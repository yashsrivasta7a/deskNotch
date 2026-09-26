import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Plus, X } from 'lucide-react'
import { CompanionTile, type CompanionSleeps } from './CompanionTile'
import { TILE } from '../ui/tile'
import { CHROME_X, CHROME_Y } from '../notch/NotchChassis'
import type { ProviderLimits } from '../../hooks/useAiLimits'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import type { useFocusLog } from '../../hooks/useFocusLog'
import type { Avatar } from './SettingsPanel'

/** How the desk arrives: each piece rises in a beat after the last. */
const stage = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 320, damping: 30 } },
}
const staggered = { hidden: {}, shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }

/** The desk's geometry: the companion card and the list beside it, a glance card tall. */
export const DESK_WIDTH = 696 + CHROME_X
export const DESK_HEIGHT = CHROME_Y + TILE

const stop = (event: React.SyntheticEvent) => event.stopPropagation()

/** The list, as a list: a line to type on, rows of text, nothing boxed. */
const Tasks: React.FC<{ tasks: TaskStore; accent: string }> = ({ tasks, accent }) => {
  const { tasks: all, add, toggle, remove, setTasks } = tasks
  const [draft, setDraft] = useState('')
  const [showDone, setShowDone] = useState(false)
  const open = all.filter((task) => !task.done)
  const done = all.filter((task) => task.done)

  const submit = () => {
    add(draft.slice(0, 200))
    setDraft('')
  }

  return (
    <motion.div variants={staggered} className="flex min-h-0 min-w-0 flex-1 flex-col" onClick={stop}>
      <motion.div variants={stage} className="flex h-[34px] items-center gap-2.5 border-b border-white/[0.1] transition-colors focus-within:border-white/40">
        <Plus size={13} strokeWidth={2.2} className="shrink-0 text-white/35" />
        <input
          value={draft}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder="What needs doing"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/30"
          style={{ caretColor: accent }}
        />
        {open.length > 0 && <span className="text-[11px] tabular-nums text-white/30">{open.length}</span>}
      </motion.div>

      {/* The list fades out at its bottom edge rather than cutting a row. */}
      <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-18px),transparent)]">
        <AnimatePresence initial={false}>
          {(showDone ? [...open, ...done] : open).map((task) => (
            <motion.div
              key={task.id}
              layout
              variants={stage}
              initial="hidden"
              animate="shown"
              exit={{ opacity: 0, x: 12 }}
              // The whole row ticks, text and all, as in the companion; the
              // circle lights up while the pointer is anywhere on the row.
              onClick={() => toggle(task.id)}
              className="group -mx-2 flex h-[30px] cursor-pointer items-center gap-3 px-2"
              style={{ '--accent': accent } as React.CSSProperties}
            >
              <span
                role="checkbox"
                aria-checked={task.done}
                aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border transition-colors ${
                  task.done
                    ? 'border-white/60 bg-white/60'
                    : 'border-white/30 group-hover:border-[var(--accent)] group-hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)]'
                }`}
              >
                {task.done && <Check size={9} strokeWidth={3} className="text-black" />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[13.5px] leading-tight ${task.done ? 'text-white/30 line-through' : 'text-white/90'}`}>
                {task.label}
              </span>
              <button
                type="button"
                aria-label="Delete task"
                onClick={(event) => {
                  event.stopPropagation()
                  remove(task.id)
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} strokeWidth={2} className="text-white/35 hover:text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {open.length === 0 && !showDone && (
          <motion.p variants={stage} className="pt-2 text-[13px] text-white/30">
            Nothing left. Type the next thing above.
          </motion.p>
        )}
      </div>

      {/* Done things fold away; a word brings them back or clears them. */}
      {done.length > 0 && (
        <div className="mt-1 flex items-center gap-3 text-[11px] text-white/35">
          <button type="button" onClick={() => setShowDone((s) => !s)} className="transition-colors hover:text-white">
            {done.length} done{showDone ? ' · hide' : ''}
          </button>
          <button type="button" onClick={() => setTasks((prev) => prev.filter((task) => !task.done))} className="transition-colors hover:text-white">
            clear
          </button>
        </div>
      )}
    </motion.div>
  )
}



/** One line of facts under everything: the week's focus, then every limit, as words. */

interface DeskViewProps {
  avatar: Avatar
  photo: string | null
  tasks: TaskStore
  timer: Timer
  minutes: number
  onMinutes: (m: number) => void
  /** The companion's colour, so the desk and the glance agree. */
  accent: string
  limits: ProviderLimits[] | null
  log: ReturnType<typeof useFocusLog>
  track: string | null
  playing: boolean
  sleeps: CompanionSleeps
}

/**
 * The desk: one scene, not a grid. The companion large with the session
 * around it, the list beside it as plain text, and a line of facts beneath.
 */
/**
 * The desk: the same companion card as the glance, always in Focus, since the
 * desk is where the work happens (the glance's companion can be on anything
 * else), beside the whole task list.
 */
export const DeskView: React.FC<DeskViewProps> = ({ avatar, photo, tasks, timer, minutes, onMinutes, accent, limits, track, playing, sleeps }) => {
  const [lengths, setLengths] = useState(false)
  return (
  <motion.div variants={staggered} initial="hidden" animate="shown" className="flex h-full flex-col">
    {/* The list fills the row so its overflow scrolls; the scene keeps its own height. */}
    <div className="flex min-h-0 flex-1 items-stretch gap-8">
      <motion.div variants={stage} className="shrink-0 self-start">
        <CompanionTile
          avatar={avatar}
          photo={photo}
          tasks={tasks}
          timer={timer}
          limits={limits ?? []}
          track={track}
          playing={playing}
          mode="focus"
          sleeps={sleeps}
          minutes={minutes}
          onMinutes={onMinutes}
          open={lengths}
          onToggle={() => setLengths((o) => !o)}
        />
      </motion.div>
      <Tasks tasks={tasks} accent={accent} />
    </div>
  </motion.div>
  )
}
