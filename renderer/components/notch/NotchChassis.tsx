import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lock, LockOpen } from 'lucide-react'

/** The top bar: the notch itself when closed, a toolbar with air when open. */
export const BAR_CLOSED = 30
export const BAR_OPEN = 40

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

import type { NotchStyle } from '../widgets/SettingsPanel'

interface NotchChassisProps {
  /** The collapsed bar's content. A function gets the open state, for content
   *  that should step aside once the notch opens. */
  children?: React.ReactNode | ((isOpen: boolean) => React.ReactNode)
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
  /** Shown in the middle of the bar while open, in place of the handle. The
   *  centre is the one point that stays put as the notch changes width. */
  center?: React.ReactNode
  /** Shown at the right of the collapsed bar, but only while open. */
  trailing?: React.ReactNode
  /** Holds the notch open regardless of hover — for a running timer, say. */
  keepOpen?: boolean
  className?: string
  /** Material / theme appearance of the notch shell. */
  notchStyle?: NotchStyle
  /** Dominant wallpaper or ambient background color as "r, g, b". */
  bgTint?: string
}

const CORNER_FILLS: Record<NotchStyle, string> = {
  glass: 'rgba(14, 15, 20, 0.68)',
  translucent: 'rgba(9, 10, 14, 0.52)',
  black: '#000000',
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
  center,
  trailing,
  keepOpen = false,
  className = '',
  notchStyle = 'glass',
  bgTint = '255, 255, 255',
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
        height: isOpen ? expandedHeight : BAR_CLOSED,
      }}
      transition={spring}
      style={{ willChange: 'width, height' }}
      className={`relative select-none cursor-default ${className}`}
    >

      <svg
        className="absolute top-0 -left-[1px] w-[6px] h-[6px] pointer-events-none z-20 transition-colors duration-300"
        viewBox="0 0 6 6"
        style={{ fill: CORNER_FILLS[notchStyle] }}
      >
        <path d="M0,0 H6 V6 A6,6 0 0 1 0,0 Z" />
      </svg>
      <svg
        className="absolute top-0 -right-[1px] w-[6px] h-[6px] pointer-events-none z-20 transition-colors duration-300"
        viewBox="0 0 6 6"
        style={{ fill: CORNER_FILLS[notchStyle] }}
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
        className={`relative w-full h-full text-white overflow-hidden flex flex-col
                   border-b border-x border-t-0 transition-colors duration-300
                   ${
                     notchStyle === 'glass'
                       ? 'border-white/[0.13] shadow-[0_22px_55px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_0_20px_rgba(255,255,255,0.02)]'
                       : notchStyle === 'translucent'
                         ? 'border-white/[0.08] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)]'
                         : 'bg-black border-white/[0.07] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,255,255,0.05)]'
                   }`}
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          willChange: 'border-radius',
          ...(notchStyle === 'glass'
            ? {
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 19, 25, 0.62) 20%, rgba(10, 11, 15, 0.72) 100%)',
              }
            : notchStyle === 'translucent'
              ? { background: 'rgba(9, 10, 14, 0.52)' }
              : {}),
        }}
      >
        {/* Specular hairline along top border in glassmorphic mode */}
        {notchStyle === 'glass' && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent z-20"
          />
        )}

        {/* Ambient background adaptation glow in glassmorphic mode */}
        {notchStyle === 'glass' && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -top-8 h-28 -z-10 blur-xl transition-all duration-700 opacity-70"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, rgba(${bgTint}, 0.22) 0%, transparent 75%)`,
            }}
          />
        )}

        {/* Diagonal sheen in glassmorphic mode */}
        {notchStyle === 'glass' && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_25%_0%,rgba(255,255,255,0.06),transparent_60%)] -z-10"
          />
        )}

        {ambient?.(isOpen)}

        {/* The bar is the notch when closed, and a toolbar when open: it grows
            so the tabs and buttons in it get air rather than filling it. */}
        <motion.div
          onClick={() => setIsPinned((pinned) => !pinned)}
          initial={false}
          animate={{ height: isOpen ? BAR_OPEN : BAR_CLOSED }}
          transition={spring}
          className="shrink-0 flex items-center justify-between px-5 cursor-pointer relative"
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
            {typeof children === 'function' ? children(isOpen) : children}
          </div>
          {isOpen && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${center ? '' : 'pointer-events-none'}`}
            >
              {center ?? <div className="w-7 h-1 rounded-full bg-white/20" />}
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
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

            {/* The lock: a control rather than a dot, so pinning is something
                you can see and do, not just a state you happen to be in. */}
            {isOpen && (
              <motion.button
                type="button"
                aria-label={isPinned ? 'Unpin' : 'Pin open'}
                aria-pressed={isPinned}
                title={isPinned ? 'Unpin' : 'Keep open'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                transition={spring}
                onClick={(event) => {
                  event.stopPropagation()
                  setIsPinned((pinned) => !pinned)
                }}
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full outline-none transition-colors ${
                  isPinned ? 'bg-white text-black' : 'text-white/35 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {isPinned ? <Lock size={11} strokeWidth={2.2} /> : <LockOpen size={11} strokeWidth={2} />}
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && expandedContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              transition={{ ...spring, opacity: { duration: 0.15 } }}
              className="flex-1 min-h-0 px-5 pt-3.5 pb-[22px]"
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
