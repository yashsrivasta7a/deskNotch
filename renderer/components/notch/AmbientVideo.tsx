import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** The video's own light sits around this hue (a teal-blue). */
const VIDEO_HUE = 198

/** Hue (0–360) and saturation (0–1) of a #rrggbb colour. */
const hueOf = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (!d) return { hue: 0, sat: 0 }
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { hue: (hue * 60 + 360) % 360, sat: d / (1 - Math.abs(max + min - 1)) }
}

/**
 * How to shift the video toward the companion's colour. Blues and near-whites
 * already match its light and are left alone; warm and green companions get
 * the video turned round to their hue, and a little more colour so it shows.
 */
const shiftFor = (accent?: string) => {
  if (!accent || !accent.startsWith('#')) return { rotate: 0, saturate: 0.35 }
  const { hue, sat } = hueOf(accent)
  // Blue through lavender: the video already suits these.
  const blueish = hue >= 170 && hue <= 275
  if (blueish || sat < 0.35) return { rotate: 0, saturate: 0.35 }
  return { rotate: Math.round(hue - VIDEO_HUE), saturate: 0.7 }
}

interface AmbientVideoProps {
  /** Music is playing and the notch is open. Collapsed, the bar is too small
   *  for the glow to be anything but noise. */
  active: boolean
  /** The companion's colour; the light follows it. */
  accent?: string
}

/**
 * A looping video glow along the bottom of the notch while music plays.
 *
 * Masked to fade upward and blended so it lights the black rather than sitting
 * on it — a visible video rectangle inside the shell would read as a mistake.
 */
export const AmbientVideo: React.FC<AmbientVideoProps> = ({ active, accent }) => {
  const shift = shiftFor(accent)
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
              filter: `hue-rotate(${shift.rotate}deg) saturate(${shift.saturate}) brightness(0.95) contrast(1.1)`,
              transition: 'filter 800ms ease',
            }}
          />

        </motion.div>
      )}
    </AnimatePresence>
  )
}
