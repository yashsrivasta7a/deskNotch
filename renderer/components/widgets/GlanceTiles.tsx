import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Maximize2, Plus } from 'lucide-react'
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
export const TASK_WIDTH = 180

/** Now playing: the art fills the tile's height, the words and controls beside it.
 *  `tint` is the art's own colour, so the card glows with the cover. */
export const MediaTile: React.FC<{ media: NowPlaying; tint: string }> = ({ media, tint }) => {
  const progress = useMediaProgress(media)

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
          <ScrollingText className="text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white">
            {media.title}
          </ScrollingText>
          <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-white/50">{media.artist}</span>
        </div>
        <div>
          {/* Where the track is: a hairline, not a scrubber; this is a glance. */}
          {media.duration > 0 && (
            <div className="mb-2 h-[2px] overflow-hidden rounded-full bg-white/[0.1]">
              <motion.div
                className="h-full origin-left rounded-full bg-white/70"
                animate={{ scaleX: progress }}
                transition={{ ease: 'linear', duration: 0.5 }}
              />
            </div>
          )}
          <div className="-ml-1.5 -mb-1">
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
          {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: false })}
        </span>
        <span className="mt-2 block text-[11.5px] font-medium leading-none text-white/50">
          {now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </span>
      </div>
    </Tile>
  )
}

/** What is next, tickable in place; how many wait behind it; and a way to add one. */
export const TaskTile: React.FC<{ tasks: TaskStore }> = ({ tasks }) => {
  const open = tasks.tasks.filter((task) => !task.done)
  const next = open[0]
  const [adding, setAdding] = useState(false)

  return (
    <Tile width={TASK_WIDTH} onClick={next && !adding ? () => tasks.toggle(next.id) : undefined} label="Mark next task done">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <TileLabel>{adding ? 'New task' : next ? 'Next' : 'Tasks'}</TileLabel>
          {!adding && (
            <button
              type="button"
              aria-label="Add a task"
              onClick={(event) => {
                event.stopPropagation()
                setAdding(true)
              }}
              className="-mr-1 -mt-1 grid h-[20px] w-[20px] place-items-center rounded-full text-white/35 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Plus size={12} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {adding ? (
          <QuickAdd tasks={tasks} onDone={() => setAdding(false)} className="mb-3" />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={next?.id ?? 'clear'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="min-w-0"
            >
              <span className="block truncate text-[14px] font-medium leading-snug text-white/90">
                {next ? next.label : 'All clear'}
              </span>
              <span className="mt-1 block text-[11px] leading-none text-white/40">
                {next ? (open.length > 1 ? `${open.length - 1} more · tap to finish` : 'tap to finish') : 'Nothing left today'}
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Tile>
  )
}
