import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Maximize2, Plus } from 'lucide-react'
import { MediaControls } from '../notch/MediaControls'
import { ScrollingText } from '../notch/ScrollingText'
import { Tile, TileLabel } from '../ui/tile'
import { QuickAdd } from './QuickAdd'
import { useNow } from '../../hooks/useNow'
import { useMediaProgress } from '../../hooks/useMediaProgress'
import type { NowPlaying } from '../../hooks/useNowPlaying'
import type { TaskStore } from '../../hooks/useTasks'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

export const MEDIA_WIDTH = 328
export const TIME_WIDTH = 160
export const TASK_WIDTH = 200

/** Now playing: the art fills the tile's height, the words and controls beside it.
 *  `tint` is the art's own colour, so the card glows with the cover. */
/** A player's id as a name people know: "Spotify", "Chrome", "Edge"… */
const playerName = (id: string) => {
  const lower = id.toLowerCase()
  const known: [string, string][] = [
    ['spotify', 'Spotify'], ['chrome', 'Chrome'], ['msedge', 'Edge'], ['firefox', 'Firefox'], ['brave', 'Brave'],
    ['opera', 'Opera'], ['vlc', 'VLC'], ['zune', 'Media Player'], ['music', 'Music'], ['applemusic', 'Apple Music'],
  ]
  const hit = known.find(([key]) => lower.includes(key))
  if (hit) return hit[1]
  const bare = id.split('!')[0].replace(/\.exe$/i, '').split('.').pop() ?? id
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

const mmss = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Three bars that dance while music plays and lie flat when paused. */
const Bars: React.FC<{ playing: boolean; color: string }> = ({ playing, color }) => (
  <span className="flex h-[9px] items-end gap-[2px]">
    {[0.9, 1.3, 1.05].map((d, i) => (
      <motion.span
        key={i}
        className="w-[2px] rounded-full"
        style={{ background: color }}
        animate={playing ? { height: ['35%', '100%', '50%', '35%'] } : { height: '30%' }}
        transition={playing ? { duration: d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 } : { duration: 0.3 }}
      />
    ))}
  </span>
)

export const MediaTile: React.FC<{ media: NowPlaying; tint: string }> = ({ media, tint }) => {
  const progress = useMediaProgress(media)
  const elapsed = progress * media.duration

  return (
  <Tile
    width={MEDIA_WIDTH}
    tinted
    glow={`radial-gradient(70% 150% at 14% 50%, rgba(${tint}, 0.4), rgba(${tint}, 0.08) 55%, transparent 78%)`}
  >
    <div className="flex h-full items-stretch gap-3.5">
      {/* The art is the way in: tap it and the player comes forward, maximised. */}
      <motion.button
        type="button"
        aria-label="Open the player"
        title="Open the player"
        onClick={(event) => {
          event.stopPropagation()
          void window.bridge?.invoke('media:focus', media.sourceAppId)
        }}
        whileTap={{ scale: 0.95 }}
        className="group relative aspect-square h-full shrink-0 overflow-hidden rounded-[12px] bg-white/[0.06]"
        animate={{ scale: media.isPlaying ? 1 : 0.94, opacity: media.isPlaying ? 1 : 0.7 }}
        transition={spring}
      >
        {media.thumbnailUrl && (
          <img src={media.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" />
        <div className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 size={16} strokeWidth={2} className="text-white" />
        </div>
      </motion.button>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          {/* Where it is playing, and that it is: the source, with the bars. */}
          <div className="mb-1 flex items-center gap-1.5">
            <Bars playing={media.isPlaying} color={`rgb(${tint})`} />
            <span className="truncate text-[8.5px] font-bold uppercase leading-none tracking-[0.12em] text-white/40">
              {media.isPlaying ? playerName(media.sourceAppId) : `Paused · ${playerName(media.sourceAppId)}`}
            </span>
          </div>
          <ScrollingText className="text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white">
            {media.title}
          </ScrollingText>
          <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-white/50">{media.artist}</span>
        </div>
        <div>
          {/* Where the track is: a hairline, not a scrubber; this is a glance. */}
          {media.duration > 0 && (
            <>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: `rgb(${tint})`, boxShadow: `0 0 6px rgba(${tint}, 0.6)` }}
                  animate={{ scaleX: progress }}
                  transition={{ ease: 'linear', duration: 0.5 }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9.5px] tabular-nums leading-none text-white/40">
                <span>{mmss(elapsed)}</span>
                <span>-{mmss(media.duration - elapsed)}</span>
              </div>
            </>
          )}
          <div className="-mb-1 mt-1 flex justify-center">
            <MediaControls
              isPlaying={media.isPlaying}
              onPrevious={() => void window.bridge?.invoke('media:key', 'previous')}
              onPlayPause={() => void window.bridge?.invoke('media:key', 'play-pause')}
              onNext={() => void window.bridge?.invoke('media:key', 'next')}
            />
          </div>
        </div>
      </div>
    </div>
  </Tile>
  )
}

const partOfDay = (now: Date) => {
  const hour = now.getHours()
  return hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
}

/** The time, when there is no music to lead with. */
export const TimeTile: React.FC = () => {
  const now = useNow()

  return (
    <Tile width={TIME_WIDTH}>
      {/* Stacked and centred: a clock is read, not scanned. */}
      <div className="flex h-full flex-col justify-center">
        <TileLabel>{`${now.toLocaleDateString(undefined, { weekday: 'long' })} ${partOfDay(now)}`}</TileLabel>
        <span className="mt-2 block text-[32px] font-semibold leading-none tracking-[-0.04em] text-white">
          {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
        <span className="mt-2 block text-[11.5px] font-medium leading-none text-white/50">
          {now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </span>
      </div>
    </Tile>
  )
}

/** How many open tasks the card lists before it says "N more". */
const SHOWN = 3

/**
 * Tasks, the way the Reminders widget does it: a coloured title and a count,
 * then the next few as rows with a round checkbox. Ticking one fills the
 * circle, strikes the text, and lets the row slide away a beat later, so the
 * list settles rather than jumps.
 */
export const TaskTile: React.FC<{ tasks: TaskStore; accent: string }> = ({ tasks, accent }) => {
  const open = tasks.tasks.filter((task) => !task.done)
  const [adding, setAdding] = useState(false)
  const [ticked, setTicked] = useState<string[]>([])

  const tick = (id: string) => {
    if (ticked.includes(id)) return
    setTicked((t) => [...t, id])
    setTimeout(() => {
      tasks.toggle(id)
      setTicked((t) => t.filter((x) => x !== id))
    }, 420)
  }

  return (
    <Tile width={TASK_WIDTH}>
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[12px] font-semibold" style={{ color: accent }}>
              {adding ? 'New task' : 'Tasks'}
            </span>
            {!adding && open.length > 0 && (
              <span className="text-[12px] font-semibold tabular-nums text-white/30">{open.length}</span>
            )}
          </span>
          {!adding && (
            <motion.button
              type="button"
              aria-label="Add a task"
              whileTap={{ scale: 0.88 }}
              onClick={(event) => {
                event.stopPropagation()
                setAdding(true)
              }}
              className="-mr-1 grid h-[20px] w-[20px] place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Plus size={12} strokeWidth={2.4} />
            </motion.button>
          )}
        </div>

        {adding ? (
          <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="mt-1" />
        ) : open.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 pb-2"
          >
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full" style={{ background: accent }}>
              <Check size={14} strokeWidth={3} className="text-black" />
            </span>
            <span className="text-[12.5px] font-medium text-white/80">All done</span>
          </motion.div>
        ) : (
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {open.slice(0, SHOWN).map((task) => {
                const done = ticked.includes(task.id)
                return (
                  <motion.button
                    key={task.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
                    transition={spring}
                    onClick={(event) => {
                      event.stopPropagation()
                      tick(task.id)
                    }}
                    className="group/row flex h-[24px] min-w-0 items-center gap-2 text-left"
                  >
                    <span
                      className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 ${
                        done ? '' : 'border-white/30 group-hover/row:border-white/60'
                      }`}
                      style={done ? { borderColor: accent, background: accent } : undefined}
                    >
                      {done && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                          <Check size={9} strokeWidth={3.4} className="text-black" />
                        </motion.span>
                      )}
                    </span>
                    <span className="relative min-w-0 truncate text-[12.5px] leading-none">
                      <span className={`transition-colors duration-200 ${done ? 'text-white/35' : 'text-white/85'}`}>{task.label}</span>
                      <motion.span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-px bg-white/45"
                        initial={false}
                        animate={{ width: done ? '100%' : '0%' }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                      />
                    </span>
                  </motion.button>
                )
              })}
            </AnimatePresence>
            {open.length > SHOWN && (
              <span className="mt-0.5 pl-[23px] text-[11px] font-medium text-white/30">{open.length - SHOWN} more</span>
            )}
          </div>
        )}
      </div>
    </Tile>
  )
}
