import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface AmbientVideoProps {
  /** Music is playing and the notch is open. Collapsed, the bar is too small
   *  for the glow to be anything but noise. */
  active: boolean
}

/**
 * A looping video glow along the bottom of the notch while music plays.
 *
 * Masked to fade upward and blended so it lights the black rather than sitting
 * on it — a visible video rectangle inside the shell would read as a mistake.
 */
export const AmbientVideo: React.FC<AmbientVideoProps> = ({ active }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (active) {
      // Autoplay can still be refused; nothing here depends on it succeeding.
      void video.play().catch(() => { })
    } else {
      video.pause()
    }
  }, [active])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[90%] overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.6) 75%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to top, #000 0%, rgba(0,0,0,0.6) 45%, transparent 100%)',
          }}
        >
          <video
            ref={videoRef}
            src="/video/loopbg.mp4"
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              // Screen keeps the black of the video transparent, so only its
              // light lands on the shell.
              mixBlendMode: 'screen',
              opacity: 0.32,
              filter: 'saturate(0.35) brightness(0.95) contrast(1.1)',
            }}
          />

        </motion.div>
      )}
    </AnimatePresence>
  )
}
