import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BotAvatar, botAvatarPalette } from 'bot-avatars'
import { Tile } from '../ui/tile'
import { Check, ChevronLeft, ChevronRight, Plus, RotateCcw, X } from 'lucide-react'
import { CALM } from './CompanionTile'
import { LENGTHS, stepLength } from '../../lib/focus'
import { formatReset, type ProviderLimits } from '../../hooks/useAiLimits'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import type { useFocusLog } from '../../hooks/useFocusLog'
import type { Avatar } from './SettingsPanel'
import { focusApp, type OpenApp } from '../../hooks/useApps'

/** How the desk arrives: each piece rises in a beat after the last. */
const stage = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 320, damping: 30 } },
}
const staggered = { hidden: {}, shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }

/** The desk's geometry: the companion's column, the list, and a line beneath. */
export const DESK_WIDTH = 736
/** The dock of open apps, and the gap above it. */
const DOCK = 12 + 36
/** The line of facts under everything: its text, and the gap above it. */
const FACTS = 12 + 11
const CARD_HEIGHT = 239
const CARD_WIDTH = 248
const CONTENT = CARD_HEIGHT + DOCK + FACTS
export const DESK_HEIGHT = 40 + 14 + CONTENT + 22
const BOT = 128
const RING = 172
const RING_R = RING * 0.44

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(hours ? 2 : 1, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`
}

const stop = (event: React.SyntheticEvent) => event.stopPropagation()

/**
 * The session's ring at desk size: a plain arc in the companion's colour,
 * because at this scale a line reads and dots would shout.
 */
const Ring: React.FC<{ timer: Timer; accent: string }> = ({ timer, accent }) => {
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  const active = timer.isRunning || paused
  if (!active) return null
  const progress = timer.durationMs ? 1 - timer.remainingMs / timer.durationMs : 0
  const c = 2 * Math.PI * RING_R

  return (
    <motion.svg
      aria-hidden
      width={RING}
      height={RING}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-none absolute -rotate-90"
    >
      <circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <motion.circle
        cx={RING / 2}
        cy={RING / 2}
        r={RING_R}
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c * (1 - progress), opacity: paused ? 0.5 : 1 }}
        transition={{ strokeDashoffset: { ease: 'linear', duration: 0.3 }, opacity: { duration: 0.4 } }}
        style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${accent} 60%, transparent))` }}
      />
    </motion.svg>
  )
}

interface FocusSceneProps {
  avatar: Avatar
  photo: string | null
  timer: Timer
  minutes: number
  onMinutes: (m: number) => void
  accent: string
}

/**
 * The companion at its desk: large, with the session drawn around it and
 * the numerals beneath. The same focus language as the glance card, just
 * given the room it deserves.
 */
const FocusScene: React.FC<FocusSceneProps> = ({ avatar, photo, timer, minutes, onMinutes, accent }) => {
  const { remainingMs, isRunning, finished, start, stop: pause, reset, add } = timer
  const paused = !isRunning && remainingMs > 0 && !finished
  const active = isRunning || paused

  const glow = avatar === 'photo' ? undefined : `radial-gradient(80% 90% at 50% 30%, color-mix(in srgb, ${botAvatarPalette[avatar]} 28%, transparent), transparent 75%)`

  return (
    <motion.div variants={stage} className="relative self-start">
      {/* The companion lights its corner of the desk: a wash of its colour
          behind the card, spilling past its edges. */}
      {avatar !== 'photo' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -z-10 rounded-full blur-3xl"
          style={{
            left: -40,
            top: -30,
            width: CARD_WIDTH + 80,
            height: CARD_HEIGHT + 60,
            background: `radial-gradient(closest-side, color-mix(in srgb, ${botAvatarPalette[avatar]} 30%, transparent), transparent)`,
          }}
        />
      )}
    <Tile width={CARD_WIDTH} height={CARD_HEIGHT} tinted glow={glow}>
    <div className="flex h-full flex-col items-center justify-center" onClick={stop}>
      <div className="relative grid place-items-center" style={{ width: RING, height: RING - 24 }}>
        <Ring timer={timer} accent={accent} />
        <div className="relative z-10">
          {avatar === 'photo' ? (
            photo && <img src={photo} alt="" className="rounded-full object-cover" style={{ width: BOT - 24, height: BOT - 24 }} />
          ) : (
            <BotAvatar type={avatar} size={BOT} theme="dark" state={isRunning ? 'working' : 'default'} {...CALM} />
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center">
        {!active && !finished && (
          <button
            type="button"
            aria-label="Shorter session"
            disabled={minutes <= LENGTHS[0]}
            onClick={() => onMinutes(stepLength(minutes, -1))}
            className="grid h-[28px] w-[24px] place-items-center text-white/30 transition-colors hover:text-white disabled:opacity-0"
          >
            <ChevronLeft size={15} strokeWidth={2.2} />
          </button>
        )}
        <span
          className="text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums transition-colors duration-300"
          style={{ color: active || finished ? accent : 'white' }}
        >
          {active ? clock(remainingMs) : finished ? 'Break' : `${minutes}:00`}
        </span>
        {!active && !finished && (
          <button
            type="button"
            aria-label="Longer session"
            disabled={minutes >= LENGTHS[LENGTHS.length - 1]}
            onClick={() => onMinutes(stepLength(minutes, 1))}
            className="grid h-[28px] w-[24px] place-items-center transition-opacity hover:opacity-100 disabled:opacity-0"
            style={{ color: accent, opacity: 0.7 }}
          >
            <ChevronRight size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={isRunning ? 'Pause focus' : paused ? 'Resume focus' : 'Start focus'}
          onClick={() => {
            if (isRunning) pause()
            else if (paused) start(remainingMs / 1000)
            else {
              if (finished) reset()
              start(minutes * 60)
            }
          }}
          className="h-[26px] rounded-full px-4 text-[11.5px] font-semibold transition-colors"
          style={isRunning ? { background: 'rgba(255,255,255,0.1)', color: 'white' } : { background: accent, color: 'black' }}
        >
          {isRunning ? 'Pause' : paused ? 'Resume' : finished ? 'Again' : 'Start'}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => add(5 * 60)}
            className="h-[26px] rounded-full bg-white/[0.08] px-3 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            +5
          </button>
        )}
        {(active || finished) && (
          <button
            type="button"
            aria-label="Reset focus"
            title="Reset"
            onClick={reset}
            className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white/[0.08] text-white/50 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            <RotateCcw size={12} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
    </Tile>
    </motion.div>
  )
}

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
              className="group -mx-2 flex h-[30px] items-center gap-3 rounded-[10px] px-2 transition-colors hover:bg-white/[0.05]"
            >
              <button
                type="button"
                aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                onClick={() => toggle(task.id)}
                className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border transition-colors ${
                  task.done ? 'border-white/60 bg-white/60' : 'border-white/30'
                }`}
                style={task.done ? undefined : ({ '--accent': accent } as React.CSSProperties)}
                onMouseEnter={(event) => {
                  if (!task.done) {
                    event.currentTarget.style.borderColor = accent
                    event.currentTarget.style.background = `color-mix(in srgb, ${accent} 25%, transparent)`
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = ''
                  event.currentTarget.style.background = ''
                }}
              >
                {task.done && <Check size={9} strokeWidth={3} className="text-black" />}
              </button>
              <span className={`min-w-0 flex-1 truncate text-[13.5px] leading-tight ${task.done ? 'text-white/30 line-through' : 'text-white/90'}`}>
                {task.label}
              </span>
              <button type="button" aria-label="Delete task" onClick={() => remove(task.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
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

/**
 * The dock: every app with a window open, as its icon. Hover names it, a
 * click brings it forward. Windows without an icon get their initial.
 */
const Dock: React.FC<{ apps: OpenApp[] | null; accent: string }> = ({ apps, accent }) => {
  const [hovered, setHovered] = useState<OpenApp | null>(null)

  return (
    <motion.div variants={stage} className="flex h-[36px] items-center gap-1">
      {apps === null && <span className="text-[11px] text-white/30">Looking for open apps…</span>}
      {apps?.length === 0 && <span className="text-[11px] text-white/30">Nothing else open</span>}
      {apps?.map((app) => (
        <button
          key={app.hwnd}
          type="button"
          aria-label={`Switch to ${app.name}`}
          onClick={(event) => {
            stop(event)
            focusApp(app.hwnd)
          }}
          onMouseEnter={() => setHovered(app)}
          onMouseLeave={() => setHovered((h) => (h === app ? null : h))}
          className="group grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[11px] transition-colors hover:bg-white/[0.08]"
        >
          {app.icon ? (
            <img src={app.icon} alt="" className="h-[22px] w-[22px] transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-white/[0.1] text-[11px] font-semibold text-white/70">
              {app.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </button>
      ))}
      {/* The name of whatever the pointer is on, in the companion's colour. */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            key={hovered.hwnd}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="ml-2 min-w-0 truncate text-[11.5px] font-medium"
            style={{ color: accent }}
          >
            {hovered.title}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const SHORT: Record<string, string> = { SESSION: '5h', WEEK: '7d', MONTH: '30d' }

/** One line of facts under everything: the week's focus, then every limit, as words. */
const Facts: React.FC<{ log: ReturnType<typeof useFocusLog>; limits: ProviderLimits[] | null }> = ({ log, limits }) => {
  const weekMinutes = log.week.reduce((sum, m) => sum + m, 0)
  const focus = weekMinutes
    ? `${Math.floor(weekMinutes / 60) ? `${Math.floor(weekMinutes / 60)}h ` : ''}${weekMinutes % 60}m focused this week${log.today.sessions ? `, ${log.today.sessions} session${log.today.sessions > 1 ? 's' : ''} today` : ''}`
    : 'No focus yet this week'
  const ai = (limits ?? []).flatMap((p) =>
    'limits' in p
      ? p.limits.map((l) => ({ text: `${p.name} ${SHORT[l.label] ?? l.label} ${Math.round(l.used)}%`, sub: formatReset(l.resetsAt).replace('resets in ', ''), hot: l.used >= 80 }))
      : [],
  )

  return (
    <motion.div variants={stage} className="flex items-baseline gap-x-4 overflow-hidden whitespace-nowrap text-[11px] leading-none text-white/40">
      <span className={`shrink-0 ${weekMinutes ? 'text-white/70' : ''}`}>{focus}</span>
      {ai.map((item) => (
        <span key={item.text} className="flex shrink-0 items-baseline gap-x-4">
          <span className="h-[3px] w-[3px] self-center rounded-full bg-white/20" />
          <span>
            <span style={{ color: item.hot ? 'rgb(255, 95, 46)' : 'rgba(255,255,255,0.65)' }}>{item.text}</span>
            {item.sub && <span className="text-white/30"> · {item.sub}</span>}
          </span>
        </span>
      ))}
    </motion.div>
  )
}

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
  apps: OpenApp[] | null
}

/**
 * The desk: one scene, not a grid. The companion large with the session
 * around it, the list beside it as plain text, and a line of facts beneath.
 */
export const DeskView: React.FC<DeskViewProps> = ({ avatar, photo, tasks, timer, minutes, onMinutes, accent, limits, log, apps }) => (
  <motion.div variants={staggered} initial="hidden" animate="shown" className="flex h-full flex-col">
    {/* The list fills the row so its overflow scrolls; the scene keeps its own height. */}
    <div className="flex min-h-0 flex-1 items-stretch gap-8">
      <FocusScene avatar={avatar} photo={photo} timer={timer} minutes={minutes} onMinutes={onMinutes} accent={accent} />
      <Tasks tasks={tasks} accent={accent} />
    </div>
    <div className="mt-3 shrink-0">
      <Dock apps={apps} accent={accent} />
    </div>
    <div className="mt-3 shrink-0">
      <Facts log={log} limits={limits} />
    </div>
  </motion.div>
)
