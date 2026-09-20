import React, { useEffect, useState } from 'react'
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


  const setHover = (over: boolean) => {
    setIsHovered(over)
    if (over || isPinned || keepOpen) {
      window.bridge?.send('notch:hover', true)
    } else {
      window.bridge?.send('notch:hover', false)
    }
  }

  useEffect(() => {
    if (isPinned || keepOpen) window.bridge?.send('notch:hover', true)
    else if (!isHovered) window.bridge?.send('notch:hover', false)
  }, [isPinned, keepOpen, isHovered])

  useEffect(() => {
    window.bridge?.send('notch:pinned', isPinned)
  }, [isPinned])

  return (
    <motion.div
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
        className="w-full h-full bg-black text-white overflow-hidden flex flex-col
                   border-b border-x border-white/[0.08]
                   shadow-[inset_0_-1px_1px_rgba(255,255,255,0.06)]"
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          willChange: 'border-radius',
        }}
      >
        <div
          onClick={() => setIsPinned((pinned) => !pinned)}
          className="h-[30px] shrink-0 flex items-center justify-between px-3.5 cursor-pointer relative"
        >
          <div className="flex items-center gap-2">
            {children}
          </div>
          {isOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-7 h-1 rounded-full bg-white/20" />
            </div>
          )}
          {isPinned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.08] text-white/70 ml-auto"
              title="Pinned open - click to unpin"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F2E]" />
              <span className="text-[9px] font-semibold tracking-wider">PINNED</span>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {isOpen && expandedContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              transition={{ ...spring, opacity: { duration: 0.15 } }}
              className="flex-1 px-3 pb-3 overflow-hidden"
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
