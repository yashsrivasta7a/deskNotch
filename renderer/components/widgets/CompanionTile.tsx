import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BotAvatar, botAvatarPalette } from 'bot-avatars'
import { Check, ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { Tile, TileLabel } from '../ui/tile'
import { ThinkingOrb } from 'thinking-orbs'
import { ringFrame } from '../ui/complication'
import { QuickAdd } from './QuickAdd'
import { useNow } from '../../hooks/useNow'
import { formatReset, type ProviderLimits } from '../../hooks/useAiLimits'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import type { Avatar } from './SettingsPanel'
import { LENGTHS } from '../../lib/focus'

export const COMPANION_WIDTH = 236
/** Open, the card grows a panel of tasks beside the companion. */
export const COMPANION_OPEN_WIDTH = 468

/** The things the companion can talk about. Settings keeps a list of them;
 *  an empty list means all of them. */
export type CompanionSays = 'time' | 'tasks' | 'focus' | 'ai'
export const COMPANION_SAYS: { id: CompanionSays; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'focus', label: 'Focus' },
  { id: 'ai', label: 'AI' },
]

/** When the companion sleeps: late at night, when nothing is going on, or never. */
export type CompanionSleeps = 'time' | 'idle' | 'never'
export const COMPANION_SLEEPS: { id: CompanionSleeps; label: string }[] = [
  { id: 'time', label: '23:00 – 06:00' },
  { id: 'idle', label: 'When idle' },
  { id: 'never', label: 'Never' },
]


/**
 * One thing the companion can show. Not a caption: a topic can carry a
 * control (start focus, finish the task), a colour and a progress line, so
 * choosing it in settings gives you something to do, not just read.
 */
interface Topic {
  id: CompanionSays
  label: string
  title: string
  detail: string
  color?: string
  /** 0–1, drawn as a hairline under the words. */
  progress?: number
  action?: { label: string; icon: React.ReactNode; onClick: () => void }
}

const SHORT: Record<string, string> = { SESSION: '5h', WEEK: '7d', MONTH: '30d' }

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const partOfDay = (hour: number) =>
  hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'

/** Everything the companion could show right now, most pressing first. */
const gather = (
  now: Date,
  tasks: TaskStore,
  timer: Timer,
  limits: ProviderLimits[],
  says: CompanionSays[],
): Topic[] => {
  const topics: Topic[] = []
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  const active = timer.isRunning || paused

  // Focus: always there when asked for, otherwise only while a session is live.
  // It draws itself (FocusMode); this entry just gives it a turn.
  if (active || says.includes('focus')) {
    topics.push({ id: 'focus', label: 'Focus', title: '', detail: '' })
  }

  // Tasks: the next one is the headline; a tick finishes it right here.
  const open = tasks.tasks.filter((task) => !task.done)
  topics.push(
    open.length
      ? {
          id: 'tasks',
          label: 'Up next',
          title: open[0].label,
          detail: open.length > 1 ? `${open.length - 1} more after this` : 'The last one',
          action: { label: 'Mark done', icon: <Check size={11} strokeWidth={3} />, onClick: () => tasks.toggle(open[0].id) },
        }
      : { id: 'tasks', label: 'Tasks', title: 'All clear', detail: 'Nothing left today' },
  )

  topics.push({
    id: 'time',
    label: `${now.toLocaleDateString(undefined, { weekday: 'long' })} ${partOfDay(now.getHours())}`,
    title: now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: false }),
    detail: now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
  })

  // AI: the limit nearest to running out — once it is worth a word, or
  // always, if it is something the companion was asked to talk about.
  const tight = limits
    .flatMap((p) => ('limits' in p ? p.limits.map((l) => ({ provider: p.name, ...l })) : []))
    .sort((a, b) => b.used - a.used)[0]
  if (tight && (tight.used >= 50 || says.includes('ai'))) {
    const used = Math.round(tight.used)
    topics.push({
      id: 'ai',
      label: `${tight.provider} · ${SHORT[tight.label] ?? tight.label}`,
      title: `${used}% used`,
      detail: formatReset(tight.resetsAt) || `${100 - used}% left`,
      progress: used / 100,
      color: used >= 80 ? 'rgb(255, 95, 46)' : undefined,
    })
  }

  return topics
}

/**
 * A short burst of life on a moment worth reacting to. Idle, the companion
 * only looks around: constant hopping and spinning was too much motion for
 * something that sits at the top of the screen all day.
 */
const useBurst = (signals: unknown[]) => {
  const [bursting, setBursting] = useState(false)
  const seen = useRef<unknown[] | null>(null)

  useEffect(() => {
    if (seen.current === null) {
      seen.current = signals
      return
    }
    const changed = signals.some((value, i) => value !== seen.current![i])
    seen.current = signals
    if (!changed) return
    setBursting(true)
    const settle = setTimeout(() => setBursting(false), 1800)
    return () => clearTimeout(settle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, signals)

  return bursting
}

/** The ring's diameter on screen, and the radius its dots sit on (the orb draws
 *  them at 0.44). The orb only knows 64px, so it is drawn at 64 and scaled up. */
const RING = 132
const RING_R = RING * 0.44
const ORB = 64

/**
 * The session, worn by the companion: the breathing dotted ring around it
 * lights up clockwise as the time passes, and the companion watches the lit
 * edge creep round. Paused, the ring holds its breath.
 */
const FocusRing: React.FC<{ timer: Timer; accent: string; shown: boolean }> = ({ timer, accent, shown }) => {
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  const active = timer.isRunning || paused
  const progress = active && timer.durationMs ? 1 - timer.remainingMs / timer.durationMs : 0
  // The orb keeps one frame function for the whole session and reads the
  // live progress through it; a new function every tick would restart its breath.
  const live = useRef(progress)
  live.current = progress
  const frame = useMemo(() => {
    const at = (fill: number) => ringFrame(fill)
    return (size: number, t: number, opts: Parameters<ReturnType<typeof ringFrame>>[2]) => at(live.current)(size, t, opts)
  }, [])
  if (!shown || !active) return null

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-none absolute inset-0 z-0 grid place-items-center"
    >
      <div style={{ transform: `scale(${RING / ORB})` }}>
        <ThinkingOrb state="breathing" size={ORB} theme="dark" frame={frame} color={accent} paused={!timer.isRunning} />
      </div>
    </motion.div>
  )
}

/**
 * The session as a small timer beside the companion: the numerals lead, a
 * › beside them opens the lengths while nothing runs, and one pill says the
 * one thing you can do next. Colour is the companion's own — the ring and
 * the live numerals share it.
 */
const FocusMode: React.FC<{ timer: Timer; minutes: number; accent: string; open: boolean; onOpen: () => void }> = ({
  timer,
  minutes,
  accent,
  open,
  onOpen,
}) => {
  const { remainingMs, isRunning, finished, start, stop, reset } = timer
  const paused = !isRunning && remainingMs > 0 && !finished
  const active = isRunning || paused
  const stop_ = (event: React.MouseEvent) => event.stopPropagation()

  return (
    <div className="min-w-0">
      <TileLabel>{finished ? 'Done' : paused ? 'Paused' : isRunning ? 'Focusing' : 'Focus'}</TileLabel>

      <div className="mt-1 flex items-center">
        <span
          className="text-[26px] font-semibold tabular-nums leading-none tracking-[-0.035em] transition-colors duration-300"
          style={{ color: active || finished ? accent : 'white' }}
        >
          {active ? clock(remainingMs) : finished ? 'Break' : `${minutes}:00`}
        </span>
        {/* Opens the lengths beside the card; turns round while they are open. */}
        {!active && !finished && (
          <motion.button
            type="button"
            aria-label={open ? 'Close the lengths' : 'Pick a length'}
            onClick={(event) => {
              stop_(event)
              onOpen()
            }}
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="ml-1 grid h-[22px] w-[18px] place-items-center text-white/35 transition-colors hover:text-white"
          >
            <ChevronRight size={13} strokeWidth={2.2} />
          </motion.button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={isRunning ? 'Pause focus' : paused ? 'Resume focus' : 'Start focus'}
          onClick={(event) => {
            stop_(event)
            if (isRunning) stop()
            else if (paused) start(remainingMs / 1000)
            else {
              if (finished) reset()
              start(minutes * 60)
            }
          }}
          className="h-[22px] rounded-full px-3 text-[11px] font-semibold leading-none transition-colors"
          style={isRunning ? { background: 'rgba(255,255,255,0.1)', color: 'white' } : { background: accent, color: 'black' }}
        >
          {isRunning ? 'Pause' : paused ? 'Resume' : finished ? 'Again' : 'Start'}
        </button>
        {/* The way out: back to an idle timer, whenever there is a session to drop. */}
        {(active || finished) && (
          <button
            type="button"
            aria-label="Reset focus"
            title="Reset"
            onClick={(event) => {
              stop_(event)
              reset()
            }}
            className="grid h-[22px] w-[22px] place-items-center rounded-full bg-white/[0.08] text-white/50 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            <RotateCcw size={11} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Points the companion's eyes at the arc's tip while a session is on. The
 * avatar only knows how to follow a pointer, so it is fed one: a synthetic
 * pointer at the tip, every few frames, with the real pointer kept out of
 * its sight for the duration so the two never fight.
 */
const useGazeAtArc = (box: React.RefObject<HTMLDivElement | null>, timer: Timer, shown: boolean) => {
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  const watching = shown && (timer.isRunning || paused)
  const remaining = useRef(timer.remainingMs)
  remaining.current = timer.remainingMs

  useEffect(() => {
    if (!watching) return

    const shield = (event: PointerEvent) => {
      if (event.isTrusted) event.stopImmediatePropagation()
    }
    document.addEventListener('pointermove', shield, true)

    const look = () => {
      const rect = box.current?.getBoundingClientRect()
      if (!rect) return
      const progress = timer.durationMs ? 1 - remaining.current / timer.durationMs : 1
      const angle = -Math.PI / 2 + progress * Math.PI * 2
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: rect.left + rect.width / 2 + Math.cos(angle) * RING_R,
          clientY: rect.top + rect.height / 2 + Math.sin(angle) * RING_R,
          bubbles: true,
        }),
      )
    }
    look()
    const tick = setInterval(look, 120)

    return () => {
      clearInterval(tick)
      document.removeEventListener('pointermove', shield, true)
      // A last pointer far away, so the eyes settle back rather than staying fixed.
      document.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    }
  }, [watching, timer.durationMs, box])
}

/** How the bot behaves everywhere it appears: calm, no idle jumps, a modest turn. */
export const CALM = { jumpEvery: 0, turn: 0.7 } as const

interface CompanionTileProps {
  avatar: Avatar
  photo: string | null
  tasks: TaskStore
  timer: Timer
  limits: ProviderLimits[]
  /** The current track, if any: a new one is a moment to react to. */
  track: string | null
  playing: boolean
  says: CompanionSays[]
  sleeps: CompanionSleeps
  minutes: number
  onMinutes: (m: number) => void
  /** Grown into the hub, with the tasks beside it. */
  open: boolean
  onToggle: () => void
}

/**
 * The companion and what it has to show. It works through its topics one
 * every few seconds — or holds on a live focus session — and each topic
 * brings its own control. A tap on the card opens the hub. It reacts when
 * something happens and otherwise keeps still, sleeping by the rule chosen.
 */
export const CompanionTile: React.FC<CompanionTileProps> = ({
  avatar,
  photo,
  tasks,
  timer,
  limits,
  track,
  playing,
  says,
  sleeps,
  minutes,
  onMinutes,
  open,
  onToggle,
}) => {
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const now = useNow()
  const all = gather(now, tasks, timer, limits, says)
  // Only the chosen topics — or everything, if none of them applies right now.
  const chosen = says.length ? all.filter((t) => says.includes(t.id)) : all
  const pool = chosen.length ? chosen : all
  // A live session holds the floor: the countdown must not cycle away.
  const topics = timer.isRunning && pool.some((t) => t.id === 'focus') ? pool.filter((t) => t.id === 'focus') : pool
  const [index, setIndex] = useState(0)
  const topic = topics[index % topics.length]
  useGazeAtArc(box, timer, topic.id === 'focus')

  useEffect(() => {
    if (topics.length < 2) return
    const cycle = setInterval(() => setIndex((i) => i + 1), 10000)
    return () => clearInterval(cycle)
  }, [topics.length])

  const done = tasks.tasks.filter((task) => task.done).length
  const bursting = useBurst([track, done, timer.isRunning, timer.finished])
  const hour = now.getHours()
  const idle = !playing && !timer.isRunning && tasks.tasks.every((task) => task.done)
  const asleep = sleeps === 'time' ? hour >= 23 || hour < 6 : sleeps === 'idle' ? idle : false
  const state = bursting ? 'working' : asleep ? 'sleeping' : 'default'
  /** The companion's own colour: what the ring, the light and the live numerals wear. */
  const accent = avatar === 'photo' ? '#ffffff' : botAvatarPalette[avatar]

  return (
    <Tile
      width={open ? COMPANION_OPEN_WIDTH : COMPANION_WIDTH}
      label={open ? 'Close the companion' : 'Open the companion'}
      onClick={adding ? undefined : onToggle}
      clip={false}
      tinted
      glow={
        avatar === 'photo'
          ? undefined
          : `radial-gradient(70% 120% at 18% 50%, color-mix(in srgb, ${botAvatarPalette[avatar]} 26%, transparent), transparent 70%)`
      }
    >
      <div className="flex h-full items-center gap-3">
        <div ref={box} className="relative grid h-full w-[96px] shrink-0 place-items-center">
          <div className="relative z-10 grid place-items-center">
            {avatar === 'photo' ? (
              photo && <img src={photo} alt="" className="h-[68px] w-[68px] rounded-full object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.1)]" />
            ) : (
              <BotAvatar type={avatar} size={84} theme="dark" state={state} {...CALM} />
            )}
          </div>
          <FocusRing timer={timer} accent={accent} shown={topic.id === 'focus'} />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 5, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
              transition={{ duration: 0.2 }}
              className="min-w-0"
            >
              {topic.id === 'focus' ? (
                <FocusMode timer={timer} minutes={minutes} accent={accent} open={open} onOpen={onToggle} />
              ) : (
              <>
              <TileLabel className="truncate">{topic.label}</TileLabel>

              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-tight tracking-[-0.02em] transition-colors duration-300"
                  style={{ color: topic.color ?? 'white' }}
                >
                  {topic.title}
                </span>
                {topic.action && (
                  <button
                    type="button"
                    aria-label={topic.action.label}
                    title={topic.action.label}
                    onClick={(event) => {
                      event.stopPropagation()
                      topic.action!.onClick()
                    }}
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full transition-colors"
                    style={{
                      background: topic.color ?? 'rgba(255,255,255,0.9)',
                      color: 'black',
                    }}
                  >
                    {topic.action.icon}
                  </button>
                )}
              </div>

              {topic.progress !== undefined ? (
                <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-white/[0.1]">
                  <motion.div
                    className="h-full origin-left rounded-full"
                    style={{ background: topic.color ?? 'rgba(255,255,255,0.7)' }}
                    animate={{ scaleX: Math.max(0.01, topic.progress) }}
                    transition={{ ease: 'linear', duration: 0.3 }}
                  />
                </div>
              ) : (
                <span className="mt-1 block truncate text-[11px] leading-tight text-white/50">{topic.detail}</span>
              )}
              </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Which topic this is, and how many there are — tiny, like a pager. */}
          {topics.length > 1 && (
            <div className="mt-2.5 flex gap-1">
              {topics.map((t, i) => (
                <span
                  key={t.id}
                  className={`h-[3px] rounded-full transition-all duration-300 ${
                    i === index % topics.length ? 'w-3 bg-white/70' : 'w-[3px] bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* The hub, for whatever is in front of you: an idle focus opens the
            lengths, anything else the next few tasks, tickable, with a field
            to add one — so neither needs another page. */}
        {open && topic.id === 'focus' && !timer.isRunning && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="flex h-full w-[200px] shrink-0 flex-col border-l border-white/[0.08] pl-3"
            onClick={(event) => event.stopPropagation()}
          >
            <TileLabel>Length</TileLabel>
            <div className="mt-2 flex flex-wrap gap-1">
              {LENGTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={m === minutes}
                  onClick={() => onMinutes(m)}
                  className="h-[20px] min-w-[30px] rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums transition-colors"
                  style={m === minutes ? { background: accent, color: 'black' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  {m}
                </button>
              ))}
            </div>
            {/* Anything else: type it. */}
            <div className="mt-auto flex h-[24px] items-center gap-2 rounded-[8px] bg-white/[0.05] px-2 focus-within:bg-white/[0.08]">
              <input
                value={custom}
                inputMode="numeric"
                placeholder="Custom minutes"
                onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                onKeyDown={(event) => {
                  const n = Number(custom)
                  if (event.key === 'Enter' && n >= 1 && n <= 180) {
                    onMinutes(n)
                    setCustom('')
                  }
                  if (event.key === 'Escape') setCustom('')
                }}
                className="min-w-0 flex-1 bg-transparent text-[11.5px] tabular-nums text-white outline-none placeholder:text-white/30"
              />
              <span className="text-[9px] text-white/30">↵</span>
            </div>
          </motion.div>
        )}
        {open && !(topic.id === 'focus' && !timer.isRunning) && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="flex h-full w-[200px] shrink-0 flex-col border-l border-white/[0.08] pl-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <TileLabel>Tasks</TileLabel>
              {!adding && (
                <button
                  type="button"
                  aria-label="Add a task"
                  onClick={() => setAdding(true)}
                  className="-mr-1 -mt-1 grid h-[20px] w-[20px] place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  <Plus size={12} strokeWidth={2.2} />
                </button>
              )}
            </div>

            <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-[3px]">
              {adding && <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="h-[22px] !text-[12px]" />}
              {tasks.tasks
                .filter((task) => !task.done)
                .slice(0, adding ? 3 : 4)
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => tasks.toggle(task.id)}
                    className="group flex h-[22px] min-w-0 items-center gap-2 text-left"
                  >
                    <span className="grid h-[12px] w-[12px] shrink-0 place-items-center rounded-full border border-white/35 transition-colors group-hover:border-white group-hover:bg-white">
                      <Check size={8} strokeWidth={3} className="text-black opacity-0 group-hover:opacity-100" />
                    </span>
                    <span className="truncate text-[12px] leading-none text-white/75 transition-colors group-hover:text-white">
                      {task.label}
                    </span>
                  </button>
                ))}
              {!adding && tasks.tasks.every((task) => task.done) && (
                <span className="text-[11px] leading-[22px] text-white/35">Nothing left · add one</span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </Tile>
  )
}
