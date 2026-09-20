import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MediaControls } from '../notch/MediaControls'
import { ScrollingText } from '../notch/ScrollingText'
import type { NowPlaying } from '../../hooks/useNowPlaying'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

interface NowPlayingPanelProps {
  nowPlaying: NowPlaying | null
  tint: string
}

export const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({ nowPlaying, tint }) => {
  const isPlaying = Boolean(nowPlaying?.isPlaying)

  return (
    <div className="flex items-start gap-4">
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="relative w-[76px] h-[76px] rounded-[18px] overflow-hidden shrink-0"
        animate={{
          // The art lifts slightly while playing — the only cue that survives
          // being glanced at from across the room.
          boxShadow: isPlaying
            ? `0 6px 20px -8px rgba(${tint}, 0.35), inset 0 0 0 1px rgba(255,255,255,0.07)`
            : '0 2px 10px -6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        transition={{ boxShadow: { duration: 0.6 }, scale: spring }}
      >
        <div className="absolute inset-0 bg-white/[0.04]" />

        <AnimatePresence mode="popLayout">
          {nowPlaying?.thumbnailUrl ? (
            <motion.img
              key={nowPlaying.thumbnailUrl}
              src={nowPlaying.thumbnailUrl}
              alt=""
              initial={{ opacity: 0, scale: 1.12, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.94, filter: 'blur(10px)' }}
              transition={spring}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center"
            >
              <svg viewBox="0 0 16 16" className="w-5 h-5 fill-white/20">
                <path d="M6 12.5a1.8 1.8 0 1 1-1.8-1.8c.3 0 .6.1.8.2V3.2l7-1.4v8.1a1.8 1.8 0 1 1-1.8-1.8c.3 0 .6.1.8.2V4.4l-5 1v7.1z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col min-w-0 flex-1 h-[76px] justify-between py-0.5">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={nowPlaying?.title ?? 'idle'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="min-w-0"
            >
              <ScrollingText className="text-[14px] font-semibold leading-tight tracking-[-0.015em] text-white">
                {nowPlaying?.title || 'Nothing playing'}
              </ScrollingText>
              <div className="truncate text-[11px] leading-tight text-white/40 mt-0.5">
                {nowPlaying?.artist || 'Start something'}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="-ml-1.5">
          <MediaControls isPlaying={isPlaying} />
        </div>
      </div>
    </div>
  )
}
