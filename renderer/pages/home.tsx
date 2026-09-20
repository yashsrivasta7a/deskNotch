import React from 'react'
import Head from 'next/head'
import { NotchChassis } from '../components/notch/NotchChassis'
import { TodoCard } from '../components/widgets/TodoCard'
import { TimerCard } from '../components/widgets/TimerCard'

// --- Now playing, parked ---------------------------------------------------
// The SMTC pipeline still runs in main; only the UI is disconnected. Restore by
// uncommenting these and the block marked below.
//
// import { AnimatePresence, motion } from 'motion/react'
// import { MediaControls } from '../components/notch/MediaControls'
// import { useNowPlaying } from '../hooks/useNowPlaying'
// const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

export default function HomePage() {
  // const nowPlaying = useNowPlaying()

  return (
    <React.Fragment>
      <Head>
        <title>deskNotch</title>
      </Head>

      <div className="w-full h-full flex justify-center items-start pointer-events-none">
        <div className="pointer-events-auto">
          <NotchChassis
            expandedWidth={620}
            expandedHeight={250}
            expandedContent={
              <div className="grid grid-cols-2 gap-2 h-full">
                <TodoCard />
                <TimerCard />
              </div>
            }
          >

          </NotchChassis>
        </div>
      </div>
    </React.Fragment>
  )
}

/* --- Now playing UI, parked -------------------------------------------------

Collapsed bar had album art and the playing bars:

  <div className="flex items-center gap-2">
    <AnimatePresence>
      {nowPlaying?.thumbnailUrl && (
        <motion.img
          key={nowPlaying.thumbnailUrl}
          src={nowPlaying.thumbnailUrl}
          alt=""
          initial={{ opacity: 0, scale: 0.6, width: 0 }}
          animate={{ opacity: 1, scale: 1, width: 18 }}
          exit={{ opacity: 0, scale: 0.6, width: 0 }}
          transition={spring}
          className="h-[18px] rounded-[4px] object-cover shrink-0"
        />
      )}
    </AnimatePresence>
    <PlayingBars active={Boolean(nowPlaying?.isPlaying)} />
  </div>

Expanded had art, title, progress and controls:

  <div className="flex flex-col h-full pt-1">
    <div className="flex items-center gap-2.5">
      <div className="relative w-11 h-11 rounded-lg bg-white/[0.07] shrink-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {nowPlaying.thumbnailUrl && (
            <motion.img
              key={nowPlaying.thumbnailUrl}
              src={nowPlaying.thumbnailUrl}
              alt=""
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
              transition={spring}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-tight">
          {nowPlaying.title || 'Unknown track'}
        </div>
        <div className="truncate text-[11px] text-white/50 leading-tight mt-0.5">
          {nowPlaying.artist || 'Unknown artist'}
        </div>
      </div>
    </div>

    <div className="mt-2 h-[2px] rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full bg-white/60 rounded-full"
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>

    <div className="mt-1.5">
      <MediaControls isPlaying={nowPlaying.isPlaying} />
    </div>
  </div>

Plus the PlayingBars component and the progress calculation:

  const progress =
    nowPlaying && nowPlaying.duration > 0
      ? Math.min(1, nowPlaying.position / nowPlaying.duration)
      : 0

--------------------------------------------------------------------------- */
