import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { BotAvatar, botAvatarPalette } from 'bot-avatars'
import { Check, ChevronRight, Moon, Plus, RotateCcw, Sun } from 'lucide-react'
import { Tile, TileLabel } from '../ui/tile'
import { ThinkingOrb } from 'thinking-orbs'
import { ringFrame } from '../ui/complication'
import { QuickAdd } from './QuickAdd'
import { ScrollingText } from '../notch/ScrollingText'
import { useNow } from '../../hooks/useNow'
import { formatReset, type ProviderLimits } from '../../hooks/useAiLimits'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import type { Avatar } from './SettingsPanel'
import { LENGTHS, formatLength, lengthSeconds } from '../../lib/focus'

export const COMPANION_WIDTH = 236
/** Wide: tasks mode's list, or focus's length panel. */
export const COMPANION_OPEN_WIDTH = 468

/** What the companion is for. One at a time: each mode has its own look,
 *  its own motion and its own control. */
export type CompanionMode = 'focus' | 'tasks' | 'time' | 'ai'
export const COMPANION_MODES: { id: CompanionMode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'time', label: 'Time' },
  { id: 'ai', label: 'AI' },
]

/** When the companion sleeps: late at night, when nothing is going on, or never. */
export type CompanionSleeps = 'time' | 'idle' | 'never'
export const COMPANION_SLEEPS: { id: CompanionSleeps; label: string }[] = [
  { id: 'time', label: '23:00 – 06:00' },
  { id: 'idle', label: 'When idle' },
  { id: 'never', label: 'Never' },
]


const SHORT: Record<string, string> = { SESSION: '5h', WEEK: '7d', MONTH: '30d' }

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}


const halt = (event: React.SyntheticEvent) => event.stopPropagation()

type Point = { x: number; y: number }
/** Where a mode wants the companion to look. Set by the mode, read by the gaze. */
export type Aim = React.MutableRefObject<(() => Point | null) | null>

/** The centre of an element, for aiming the eyes at it. */
const centreOf = (el: Element | null | undefined): Point | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * Tasks. Folded, the card shows the one thing to do next, tickable, and how
 * many wait behind it. Tap the card and it opens into the whole list,
 * scrollable, with a field to add one. The companion watches whatever row
 * the pointer is on, the task being ticked, or the field being typed in.
 */
const TasksMode: React.FC<{ tasks: TaskStore; accent: string; aim: Aim; expanded: boolean; onToggle: () => void }> = ({
  tasks,
  accent,
  aim,
  expanded,
  onToggle,
}) => {
  const open = tasks.tasks.filter((task) => !task.done)
  const [adding, setAdding] = useState(false)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLElement>())
  const field = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const shown = expanded ? open : open.slice(0, 1)

  // What the eyes (and the body) follow, most specific first.
  aim.current = () =>
    centreOf(adding ? field.current : null) ??
    centreOf(rows.current.get(leaving ?? hovered ?? '')) ??
    centreOf(rows.current.get(shown[0]?.id ?? '')) ??
    centreOf(header.current)

  const finish = (id: string) => {
    if (leaving) return
    setLeaving(id)
    // The strike plays with the eyes on it; then it goes and the next rises.
    setTimeout(() => {
      tasks.toggle(id)
      setLeaving(null)
    }, 380)
  }

  const row = (task: (typeof open)[number], big: boolean) => (
    <motion.div
      key={task.id}
      ref={(el: HTMLDivElement | null) => {
        if (el) rows.current.set(task.id, el)
        else rows.current.delete(task.id)
      }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={(event) => {
        halt(event)
        finish(task.id)
      }}
      onMouseEnter={() => setHovered(task.id)}
      onMouseLeave={() => setHovered((h) => (h === task.id ? null : h))}
      className={`-mx-1.5 flex shrink-0 cursor-pointer items-center gap-2.5 px-1.5 ${big ? 'h-[34px]' : 'h-[30px]'}`}
    >
      <span
        role="checkbox"
        aria-checked={leaving === task.id}
        aria-label="Mark done"
        className={`grid shrink-0 place-items-center rounded-full border transition-colors ${big ? 'h-[16px] w-[16px]' : 'h-[13px] w-[13px]'}`}
        style={{
          borderColor: leaving === task.id ? accent : hovered === task.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.28)',
          background: leaving === task.id ? accent : 'transparent',
        }}
      >
        {leaving === task.id && <Check size={big ? 10 : 8} strokeWidth={3.2} className="text-black" />}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        {/* Sized to the words, so the strike is exactly as long as the text. */}
        <span className="relative inline-block max-w-full align-middle">
          {/* Long names scroll through instead of being cut off. */}
          <ScrollingText className={`leading-tight ${big ? 'text-[15px] font-semibold text-white' : 'text-[12.5px] text-white/85'}`}>
            {task.label}
          </ScrollingText>
          {/* The strike, drawn left to right before the task leaves. */}
          <motion.span
            aria-hidden
            className="absolute left-0 top-1/2 h-[1.5px] w-full origin-left rounded-full"
            style={{ background: accent }}
            initial={false}
            animate={{ scaleX: leaving === task.id ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </span>
      </span>
    </motion.div>
  )

  return (
    // Clicks anywhere in the task column stay here — a near-miss must never
    // fold the list. The header (and the hint when folded) is the toggle.
    <div className="flex h-full min-w-0 flex-col justify-center" onClick={halt}>
      <div
        ref={header}
        onClick={(event) => {
          halt(event)
          onToggle()
        }}
        className="flex shrink-0 cursor-pointer items-baseline justify-between gap-2 py-1"
      >
        <TileLabel>{expanded ? 'Tasks' : open.length ? 'Up next' : 'Tasks'}</TileLabel>
        {expanded && open.length > 0 && <span className="text-[10.5px] tabular-nums leading-none text-white/35">{open.length}</span>}
        {!expanded && !adding && open.length === 0 && (
          <button
            type="button"
            aria-label="Add a task"
            onClick={(event) => {
              halt(event)
              setAdding(true)
            }}
            className="grid h-[20px] w-[20px] place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Plus size={12} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {adding && !expanded && (
        <div
          ref={field}
          onClick={halt}
          className="mt-1.5 flex h-[24px] shrink-0 items-center gap-2 rounded-[8px] px-1.5"
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
        >
          <Plus size={11} strokeWidth={2.4} style={{ color: accent }} className="shrink-0" />
          <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="!text-[12.5px]" />
        </div>
      )}

      {expanded ? (
        // The whole list, scrolling inside the card, fading at its bottom edge.
        <div
          onWheel={halt}
          onClick={halt}
          className="mt-0.5 flex max-h-[90px] min-h-0 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_6px,black_calc(100%-14px),transparent)]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((task) => row(task, false))}
          </AnimatePresence>
          {/* Adding is the list's last line, the way a notes list works. */}
          {adding ? (
            <div ref={field} onClick={halt} className="-mx-1.5 flex h-[30px] shrink-0 items-center gap-2.5 px-1.5">
              <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-dashed border-white/35" />
              <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="!text-[12.5px]" />
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                halt(event)
                setAdding(true)
              }}
              className="-mx-1.5 flex h-[30px] shrink-0 items-center gap-2.5 px-1.5 text-left text-[12.5px] text-white/35 transition-colors hover:text-white/70"
            >
              <Plus size={13} strokeWidth={2} className="shrink-0" />
              New task
            </button>
          )}
        </div>
      ) : (
        <div className="mt-0.5 flex flex-col">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((task) => row(task, true))}
          </AnimatePresence>
          <span
            onClick={(event) => {
              halt(event)
              if (open.length) onToggle()
            }}
            className="mt-1 cursor-pointer truncate py-1 text-[10.5px] leading-none text-white/40 hover:text-white/70"
          >
            {open.length === 0 ? (adding ? '' : 'Nothing left today') : open.length > 1 ? `+${open.length - 1} more · tap` : 'Last one'}
          </span>
        </div>
      )}
    </div>
  )
}

/** Time mode's card is wider, so the day's wave has room. */
export const COMPANION_TIME_WIDTH = 330

const SUNRISE = 6 * 60
const SUNSET = 18 * 60
/** A minute of the day on a 12-hour clock: 360 → "6 AM". */
const hhmm = (m: number) => `${Math.floor(m / 60) % 12 || 12} ${m < 720 ? 'AM' : 'PM'}`

/** "3h 21m", "45m". */
const span = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`)

/**
 * Time: the clock with its date beside it, over the day as one smooth wave
 * through a horizon. The sun rides the wave — above the line by day, a moon
 * below it by night — with the daylight softly lit. Sunrise and sunset are
 * marked where the wave actually crosses the line, and the last line says
 * the one thing worth knowing: how much light is left, or when it returns.
 */
const TimeMode: React.FC<{ now: Date; accent: string; aim: Aim; expanded: boolean }> = ({ now, accent, aim, expanded }) => {
  const sun = useRef<SVGGElement>(null)
  const glyph = useRef<HTMLSpanElement>(null)
  aim.current = () => centreOf(expanded ? sun.current : glyph.current)
  const hours = String(now.getHours() % 12 || 12)
  const meridiem = now.getHours() < 12 ? 'AM' : 'PM'
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const minuteOfDay = now.getHours() * 60 + now.getMinutes()
  const up = minuteOfDay >= SUNRISE && minuteOfDay < SUNSET

  // One cosine over the day, peaking at midday and crossing the horizon at
  // sunrise and sunset (fixed at 06:00 and 18:00, a quarter of the way in).
  const W = 200
  const H = 44
  const HORIZON = 25
  const AMP = 17
  const y = (t: number) => HORIZON - AMP * -Math.cos(2 * Math.PI * t)
  const points = Array.from({ length: 121 }, (_, i) => [(i / 120) * W, y(i / 120)] as const)
  const path = points.map(([x, yy], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ')
  const daylight = `M ${W * 0.25} ${HORIZON} ` + points.filter(([x]) => x >= W * 0.25 && x <= W * 0.75).map(([x, yy]) => `L ${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ') + ` L ${W * 0.75} ${HORIZON} Z`
  const t = minuteOfDay / 1440
  const here = { x: t * W, y: y(t) }

  const note = up
    ? `${span(SUNSET - minuteOfDay)} of daylight left`
    : `Sunrise in ${span((SUNRISE - minuteOfDay + 1440) % 1440)}`

  const clock = (
    <div className="flex items-baseline text-[28px] font-semibold leading-none tracking-[-0.045em] tabular-nums text-white">
      <span>{hours}</span>
      <motion.span
        animate={{ opacity: [1, 0.15, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ color: accent }}
        className="mx-[1px]"
      >
        :
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={minutes}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          {minutes}
        </motion.span>
      </AnimatePresence>
      <span className="ml-1 text-[11px] font-semibold tracking-normal text-white/45">{meridiem}</span>
    </div>
  )

  // Folded: the clock, the date, and the one line about the light. A tap
  // opens the day's wave.
  if (!expanded)
    return (
      <div className="min-w-0">
        {clock}
        <span className="mt-1.5 block text-[11px] font-semibold leading-none text-white/80">
          {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        <span className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium leading-none text-white/50">
          <span ref={glyph} style={{ color: up ? accent : 'rgba(255,255,255,0.7)' }}>
            {up ? <Sun size={10} strokeWidth={2.4} /> : <Moon size={10} strokeWidth={2.4} />}
          </span>
          {up ? `${span(SUNSET - minuteOfDay)} left` : `Up in ${span((SUNRISE - minuteOfDay + 1440) % 1440)}`}
        </span>
      </div>
    )

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        {clock}
        {/* The date belongs with the time, stacked beside it. */}
        <div className="flex flex-col gap-[3px] leading-none">
          <span className="text-[11px] font-semibold text-white/80">{now.toLocaleDateString(undefined, { weekday: 'long' })}</span>
          <span className="text-[10.5px] font-medium text-white/40">{now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-1.5 block w-full overflow-visible">
        <defs>
          <linearGradient id="daylight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Daylight, softly lit above the horizon. */}
        <path d={daylight} fill="url(#daylight)" />
        <line x1={0} y1={HORIZON} x2={W} y2={HORIZON} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
        {/* The whole day, faint; the part already gone, in the accent. */}
        <path d={path} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={2} strokeLinecap="round" />
        <path d={path} fill="none" stroke={accent} strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" pathLength={1} strokeDasharray={`${t} 1`} />
        {/* Sunrise and sunset, marked where the wave meets the line. */}
        {[
          [0.25, hhmm(SUNRISE)],
          [0.75, hhmm(SUNSET)],
        ].map(([at, label]) => (
          <g key={label as string}>
            <circle cx={W * (at as number)} cy={HORIZON} r={1.6} fill="rgba(255,255,255,0.45)" />
            {/* Above the line and outside the crossing, where the wave is not. */}
            <text x={W * (at as number) + (at === 0.25 ? -5 : 5)} y={HORIZON - 4} textAnchor={at === 0.25 ? 'end' : 'start'} fontSize={8} fontWeight={500} fill="rgba(255,255,255,0.4)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {label}
            </text>
          </g>
        ))}
        <g ref={sun} transform={`translate(${here.x} ${here.y})`}>
          {up ? (
            <>
              <motion.g animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <line key={i} x1={0} y1={-6.5} x2={0} y2={-8.8} stroke={accent} strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${i * 45})`} />
                ))}
              </motion.g>
              <circle r={4.3} fill={accent} style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />
            </>
          ) : (
            <g opacity={0.8}>
              <circle r={4.3} fill="rgba(255,255,255,0.9)" />
              <circle r={4.3} cx={2} cy={-1.5} fill="#0d0f14" />
            </g>
          )}
        </g>
      </svg>

      <span className="mt-1.5 block text-[10.5px] font-medium leading-none text-white/50">{note}</span>
    </div>
  )
}

/**
 * AI: the tightest limit as a big number that counts up to its value, over
 * a ten-segment meter that fills in turn. Past 80% it all turns warning
 * orange and the last lit segment pulses.
 */
const AiMode: React.FC<{ limits: ProviderLimits[]; accent: string; aim: Aim }> = ({ limits, accent, aim }) => {
  const meter = useRef<HTMLDivElement>(null)
  const counted = useRef(0)
  const tight = limits
    .flatMap((p) => ('limits' in p ? p.limits.map((l) => ({ provider: p.name, ...l })) : []))
    .sort((a, b) => b.used - a.used)[0]
  const used = tight ? Math.round(tight.used) : 0
  const hot = used >= 80
  const color = hot ? 'rgb(255, 95, 46)' : accent
  const lit = Math.round(used / 10)

  // Counts up from zero whenever the reading changes.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let frame = 0
    const from = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - from) / 700)
      counted.current = used * (1 - Math.pow(1 - k, 3))
      setShown(Math.round(counted.current))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [used])

  aim.current = () => {
    const r = meter.current?.getBoundingClientRect()
    if (!r) return null
    return { x: r.left + (r.width * Math.max(0.05, counted.current / 100)), y: r.top + r.height / 2 }
  }

  if (!tight) {
    return (
      <div className="min-w-0">
        <TileLabel>AI</TileLabel>
        <span className="mt-1.5 block text-[13px] text-white/40">No AI tools signed in</span>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <TileLabel>{`${tight.provider} · ${SHORT[tight.label] ?? tight.label}`}</TileLabel>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ color: hot ? color : 'white' }}>
          {shown}
        </span>
        <span className="text-[13px] font-semibold text-white/45">% used</span>
      </div>

      <div ref={meter} className="mt-2.5 flex gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <motion.span
            key={i}
            className="h-[6px] flex-1 rounded-[2px]"
            initial={false}
            animate={{
              background: i < lit ? color : 'rgba(255,255,255,0.1)',
              opacity: hot && i === lit - 1 ? [1, 0.35, 1] : 1,
            }}
            transition={{
              background: { delay: i * 0.05, duration: 0.2 },
              opacity: hot && i === lit - 1 ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 },
            }}
          />
        ))}
      </div>

      <span className="mt-1.5 block truncate text-[10.5px] leading-none text-white/40">
        {formatReset(tight.resetsAt) || `${100 - used}% left`}
      </span>
    </div>
  )
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
export const FocusRing: React.FC<{ timer: Timer; accent: string; shown: boolean; size?: number }> = ({ timer, accent, shown, size = RING }) => {
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  const active = timer.isRunning || paused
  // Done, the ring is whole: the session came all the way round.
  const progress = timer.finished ? 1 : active && timer.durationMs ? 1 - timer.remainingMs / timer.durationMs : 0
  // The orb keeps one frame function for the whole session and reads the
  // live progress through it; a new function every tick would restart its breath.
  const live = useRef(progress)
  live.current = progress
  const frame = useMemo(() => {
    const at = (fill: number) => ringFrame(fill)
    return (size: number, t: number, opts: Parameters<ReturnType<typeof ringFrame>>[2]) => at(live.current)(size, t, opts)
  }, [])
  if (!shown || !(active || timer.finished)) return null

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-none absolute inset-0 z-0 grid place-items-center"
    >
      <div style={{ transform: `scale(${size / ORB})` }}>
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
          {active ? clock(remainingMs) : finished ? 'Break' : formatLength(minutes)}
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
              start(lengthSeconds(minutes))
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
 * Points the companion's eyes where its mode says. The avatar only knows how
 * to follow a pointer, so it is fed one: a synthetic pointer at the target,
 * every few frames, with the real pointer kept out of its sight so the two
 * never fight. Focus aims at the ring's lit tip; the other modes aim through
 * `aim`, which they set themselves.
 */
const useGaze = (
  box: React.RefObject<HTMLDivElement | null>,
  timer: Timer,
  mode: CompanionMode,
  aim: Aim,
  onLook: (dx: number, dy: number) => void,
  /** The pointer is on the card, so the companion attends to its mode. */
  engaged: boolean,
) => {
  const paused = !timer.isRunning && timer.remainingMs > 0 && !timer.finished
  // Off the card the companion just sits; on it, it looks at its mode's target.
  const watching = engaged && (mode === 'focus' ? timer.isRunning || paused : true)
  const remaining = useRef(timer.remainingMs)
  remaining.current = timer.remainingMs

  useEffect(() => {
    if (!watching) return

    const shield = (event: PointerEvent) => {
      if (event.isTrusted) event.stopImmediatePropagation()
    }
    document.addEventListener('pointermove', shield, true)

    const target = (): Point | null => {
      if (mode !== 'focus') return aim.current?.() ?? null
      const rect = box.current?.getBoundingClientRect()
      if (!rect) return null
      const progress = timer.durationMs ? 1 - remaining.current / timer.durationMs : 1
      const angle = -Math.PI / 2 + progress * Math.PI * 2
      return { x: rect.left + rect.width / 2 + Math.cos(angle) * RING_R, y: rect.top + rect.height / 2 + Math.sin(angle) * RING_R }
    }

    const look = () => {
      const at = target()
      if (!at) return
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: at.x, clientY: at.y, bubbles: true }))
      const rect = box.current?.getBoundingClientRect()
      if (rect) onLook(at.x - (rect.left + rect.width / 2), at.y - (rect.top + rect.height / 2))
    }
    look()
    const tick = setInterval(look, 90)

    return () => {
      clearInterval(tick)
      onLook(0, 0)
      document.removeEventListener('pointermove', shield, true)
      // The eyes settle back rather than staying fixed on the last target.
      document.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    }
  }, [watching, mode, timer.durationMs, box, aim])
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
  mode: CompanionMode
  sleeps: CompanionSleeps
  minutes: number
  onMinutes: (m: number) => void
  /** Focus: the lengths panel is open. Tasks: the whole list is showing. */
  open: boolean
  onToggle: () => void
}

/**
 * The companion and the one thing it is for. Each mode brings its own look,
 * motion and control; the card itself does nothing on a tap, so a stray
 * click never opens anything. The companion reacts when something happens
 * and otherwise keeps still, sleeping by the rule chosen.
 */
export const CompanionTile: React.FC<CompanionTileProps> = ({
  avatar,
  photo,
  tasks,
  timer,
  limits,
  track,
  playing,
  mode,
  sleeps,
  minutes,
  onMinutes,
  open,
  onToggle,
}) => {
  const [customMin, setCustomMin] = useState('')
  const [customSec, setCustomSec] = useState('')
  const customSeconds = Number(customMin || 0) * 60 + Number(customSec || 0)
  const customValid = customSeconds >= 5 && customSeconds <= 180 * 60
  const setCustom = () => {
    if (!customValid) return
    onMinutes(customSeconds / 60)
    setCustomMin('')
    setCustomSec('')
    // Set: the lengths fold away, leaving the new time and Start.
    onToggle()
  }
  const box = useRef<HTMLDivElement>(null)
  const aim: Aim = useRef(null)
  const now = useNow()
  // The body leans toward what the eyes are on — a reach, on a soft spring.
  const leanX = useMotionValue(0)
  const leanY = useMotionValue(0)
  const tilt = useMotionValue(0)
  const soft = { stiffness: 120, damping: 14, mass: 0.8 }
  const x = useSpring(leanX, soft)
  const y = useSpring(leanY, soft)
  const rotate = useSpring(tilt, soft)
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))
  const [engaged, setEngaged] = useState(false)
  useGaze(box, timer, mode, aim, (dx, dy) => {
    leanX.set(clamp(dx * 0.06, 7))
    leanY.set(clamp(dy * 0.05, 4))
    tilt.set(clamp(dx * 0.08, 9))
  }, engaged)

  const done = tasks.tasks.filter((task) => task.done).length
  const hour = now.getHours()
  const idle = !playing && !timer.isRunning && tasks.tasks.every((task) => task.done)
  // In time mode the companion keeps the clock's hours: asleep through the
  // night, awake with the morning. Elsewhere the setting decides.
  const night = hour >= 22 || hour < 6
  const asleep = mode === 'time' ? night : sleeps === 'time' ? hour >= 23 || hour < 6 : sleeps === 'idle' ? idle : false
  // Waking is a moment: it stretches into life when the morning comes.
  const bursting = useBurst([track, done, timer.isRunning, timer.finished, mode === 'time' && !night])
  const state = bursting ? 'working' : asleep ? 'sleeping' : 'default'
  /** The companion's own colour: every mode wears it. */
  const accent = avatar === 'photo' ? '#ffffff' : botAvatarPalette[avatar]
  const hot = mode === 'ai' && limits.some((p) => 'limits' in p && p.limits.some((l) => l.used >= 80))
  /** Each mode's own body language, on top of the lean, while hovered. Sleep
   *  breathing stays regardless. A task done gets a hop. */
  const idleMove =
    mode === 'time' && asleep
      ? { animate: { y: [3, 5, 3], scaleY: [0.97, 1.01, 0.97], scaleX: [1.02, 0.99, 1.02], rotate: -4 }, transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const } }
      : !engaged
        ? { animate: { rotate: 0, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1 }, transition: { duration: 0.4 } }
        : mode === 'focus' && timer.isRunning
          ? { animate: { rotate: [-2.5, 2.5, -2.5] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const } }
          : hot
            ? { animate: { rotate: [0, -3, 3, -2, 2, 0], x: [0, -1, 1, -1, 1, 0] }, transition: { duration: 0.6, repeat: Infinity, repeatDelay: 1.6 } }
            : mode === 'time'
              ? { animate: { y: [0, -3, 0], scale: [1, 1.02, 1] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const } }
              : { animate: { rotate: 0, x: 0, y: 0, scale: 1 }, transition: { duration: 0.4 } }
  const showLengths = open && mode === 'focus' && !timer.isRunning && !(timer.remainingMs > 0 && !timer.finished)

  return (
    <Tile
      width={showLengths || (mode === 'tasks' && open) ? COMPANION_OPEN_WIDTH : mode === 'time' && open ? COMPANION_TIME_WIDTH : COMPANION_WIDTH}
      onClick={mode === 'tasks' || mode === 'time' ? onToggle : undefined}
      label={mode === 'time' ? (open ? 'Fold the day' : 'Show the day') : open ? 'Fold the tasks' : 'Show all tasks'}
      clip={false}
      tinted
      glow={
        avatar === 'photo'
          ? undefined
          : `radial-gradient(70% 120% at 18% 50%, color-mix(in srgb, ${botAvatarPalette[avatar]} 26%, transparent), transparent 70%)`
      }
    >
      <div className="flex h-full items-center gap-3" onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)}>
        <div ref={box} className="relative grid h-full w-[96px] shrink-0 place-items-center">
          {/* Never takes clicks: its canvas draws well past its box, over the
              task list, and the eyes follow a synthetic pointer anyway. */}
          <div className="pointer-events-none relative z-10 grid place-items-center">
            {avatar === 'photo' ? (
              photo && <img src={photo} alt="" className="h-[68px] w-[68px] rounded-full object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.1)]" />
            ) : (
              <motion.div style={{ x, y, rotate }}>
                <motion.div {...idleMove}>
                  {/* A hop each time a task is finished: up, stretch, land, squash. */}
                  <motion.div
                    key={done}
                    initial={false}
                    animate={mode === 'tasks' ? { y: [0, -14, 0, 0], scaleY: [1, 1.08, 0.9, 1], scaleX: [1, 0.95, 1.08, 1] } : {}}
                    transition={{ duration: 0.55, times: [0, 0.35, 0.7, 1], ease: 'easeOut' }}
                  >
                    <BotAvatar type={avatar} size={84} theme="dark" state={state} {...CALM} />
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
            {/* Asleep: z's drifting up from the companion, one after another. */}
            <AnimatePresence>
              {asleep && (
                <motion.div
                  key="zzz"
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute right-2 top-2"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute font-bold leading-none"
                      style={{ color: accent, fontSize: 9 + i * 3, textShadow: `0 0 6px ${accent}` }}
                      initial={{ opacity: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 1, 0], x: [0, 4, 8, 11], y: [0, -5, -11, -16] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
                    >
                      z
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <FocusRing timer={timer} accent={accent} shown={mode === 'focus'} />
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {/* Every mode but tasks is a short block; centre it in the card. */}
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 5, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
              transition={{ duration: 0.2 }}
              className="h-full min-w-0"
            >
              {mode === 'focus' && <div className="flex h-full items-center"><FocusMode timer={timer} minutes={minutes} accent={accent} open={open} onOpen={onToggle} /></div>}
              {mode === 'tasks' && <TasksMode tasks={tasks} accent={accent} aim={aim} expanded={open} onToggle={onToggle} />}
              {mode === 'time' && <div className="flex h-full items-center"><TimeMode now={now} accent={accent} aim={aim} expanded={open} /></div>}
              {mode === 'ai' && <div className="flex h-full items-center"><AiMode limits={limits} accent={accent} aim={aim} /></div>}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Focus only: every length, and a custom one, beside the card. */}
        {showLengths && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="flex h-full w-[200px] shrink-0 flex-col border-l border-white/[0.08] pl-3"
            onClick={halt}
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
            {/* Any length: minutes : seconds, then Set (or Enter). 5 s to 3 h. */}
            <div className="mt-auto flex items-center gap-1">
              {(
                [
                  ['min', customMin, setCustomMin, 3],
                  ['sec', customSec, setCustomSec, 2],
                ] as const
              ).map(([unit, value, setValue, digits], i) => (
                <React.Fragment key={unit}>
                  {i === 1 && <span className="text-[13px] font-semibold text-white/30">:</span>}
                  <input
                    value={value}
                    inputMode="numeric"
                    aria-label={unit === 'min' ? 'Minutes' : 'Seconds'}
                    placeholder={unit}
                    onChange={(event) => {
                      const v = event.target.value.replace(/[^0-9]/g, '').slice(0, digits)
                      setValue(unit === 'sec' && Number(v) > 59 ? '59' : v)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setCustom()
                      if (event.key === 'Escape') {
                        setCustomMin('')
                        setCustomSec('')
                      }
                    }}
                    className="h-[26px] w-[46px] rounded-[8px] bg-white/[0.06] text-center text-[13px] font-semibold tabular-nums text-white outline-none transition-colors placeholder:text-[10px] placeholder:font-medium placeholder:text-white/30 focus:bg-white/[0.1]"
                  />
                </React.Fragment>
              ))}
              <button
                type="button"
                disabled={!customValid}
                onClick={setCustom}
                className="ml-auto h-[26px] rounded-full px-3 text-[11px] font-semibold transition-colors disabled:opacity-35"
                style={customValid ? { background: accent, color: 'black' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
              >
                Set
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </Tile>
  )
}
