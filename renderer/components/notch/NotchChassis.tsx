import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Dynamic Island spring — snappy, barely overshoots. */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

/**
 * Motion animates numbers, not custom properties, so the notch radius cannot
 * be a class the way the cards' is. Reading the token at runtime keeps
 * globals.css the single place these values are defined.
 */
const radiusToken = (name: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

interface NotchChassisProps {
  children?: React.ReactNode
  /** Rendered only while expanded, below the collapsed bar. */
  expandedContent?: React.ReactNode
  /** Must stay under STRIP_HEIGHT in main.ts, or the window clips it. */
  expandedWidth?: number
  expandedHeight?: number
  /** Rendered behind everything, inside the shell's rounded clip. Receives the
   *  open state so it can stay out of the way while collapsed. */
  ambient?: (isOpen: boolean) => React.ReactNode
  /** Shown at the left of the collapsed bar, but only while open. */
  leading?: React.ReactNode
  /** Shown at the right of the collapsed bar, but only while open. */
  trailing?: React.ReactNode
  /** Holds the notch open regardless of hover — for a running timer, say. */
  keepOpen?: boolean
  className?: string
}

/**
 * The notch itself, drawn inside the full-width invisible strip window.
 *
 * Geometry lives here rather than in the BrowserWindow, so sizes and motion
 * hot-reload. The only hard limit is STRIP_HEIGHT in main.ts: the expanded
 * height must stay under it or the window clips the element.
 */
export const NotchChassis: React.FC<NotchChassisProps> = ({
  children,
  expandedContent,
  expandedWidth = 340,
  expandedHeight = 132,
  ambient,
  leading,
  trailing,
  keepOpen = false,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const [isPinned, setIsPinned] = useState(false)

  const isOpen = isHovered || isPinned || keepOpen

  // Resolved after mount so server-rendered markup and the client agree.
  const [radius, setRadius] = useState({ closed: 11, open: 26 })
  useEffect(() => {
    setRadius({
      closed: radiusToken('--radius-notch-closed', 11),
      open: radiusToken('--radius-notch-open', 26),
    })
  }, [])


  const setHover = (over: boolean) => setIsHovered(over)

  // The window is a full-width strip, so the main process cannot simply stop
  // ignoring mouse events — that would hand the whole strip clicks meant for
  // whatever is underneath. It gets the notch's rectangle instead and tests
  // the cursor against it.
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const report = () => {
      const element = shellRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      window.bridge?.send('notch:bounds', {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    report()

    // The shell springs between sizes, so its bounds are only final once the
    // animation settles; an observer catches every frame of that.
    const observer = new ResizeObserver(report)
    if (shellRef.current) observer.observe(shellRef.current)

    return () => observer.disconnect()
  }, [isOpen, expandedWidth, expandedHeight])

  useEffect(() => {
    window.bridge?.send('notch:pinned', isPinned)
  }, [isPinned])

  return (
    <motion.div
      ref={shellRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={false}
      animate={{
        width: isOpen ? expandedWidth : 240,
        height: isOpen ? expandedHeight : 30,
      }}
      transition={spring}
      style={{ willChange: 'width, height' }}
      className={`relative select-none cursor-default ${className}`}
    >

      <svg
        className="absolute top-0 -left-[1px] w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M0,0 H6 V6 A6,6 0 0 1 0,0 Z" />
      </svg>
      <svg
        className="absolute top-0 -right-[1px] w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M6,0 H0 V6 A6,6 0 0 0 6,0 Z" />
      </svg>

      <motion.main
        initial={false}
        animate={{
          borderBottomLeftRadius: isOpen ? radius.open : radius.closed,
          borderBottomRightRadius: isOpen ? radius.open : radius.closed,
        }}
        transition={spring}
        className="relative w-full h-full bg-black text-white overflow-hidden flex flex-col
                   border-b border-x border-white/[0.07] border-t-0
                   shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,255,255,0.05)]"
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          willChange: 'border-radius',
        }}
      >
        {ambient?.(isOpen)}

        <div
          onClick={() => setIsPinned((pinned) => !pinned)}
          className="h-[30px] shrink-0 flex items-center justify-between px-3.5 cursor-pointer relative"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AnimatePresence>
              {isOpen && leading && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={spring}
                >
                  {leading}
                </motion.div>
              )}
            </AnimatePresence>
            {children}
          </div>
          {isOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-7 h-1 rounded-full bg-white/20" />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <AnimatePresence>
              {isOpen && trailing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring}
                >
                  {trailing}
                </motion.div>
              )}
            </AnimatePresence>

            {/* A dot rather than a label: the pin is a state, not an
                announcement, and the bar has no room for words. */}
            {isPinned && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                className="w-1.5 h-1.5 rounded-full bg-[#FF5F2E] shrink-0"
                title="Pinned open — click to unpin"
              />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && expandedContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              transition={{ ...spring, opacity: { duration: 0.15 } }}
              className="flex-1 min-h-0 px-5 pt-1 pb-4"
              style={{ willChange: 'opacity, transform, filter' }}
            >
              {expandedContent}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </motion.div>
  )
}
