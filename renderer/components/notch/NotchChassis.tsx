import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lock, LockOpen } from 'lucide-react'
import { DockSideContext, railLabel, type DockSide } from './ViewSwitcher'

/** The top bar: the notch itself when closed. Open, the controls live on the
 *  rail beside the notch, so the bar shrinks to a sliver of top margin. */
export const BAR_CLOSED = 30
export const BAR_OPEN = 6
/** The open notch's padding around its content: tight and even on every side
 *  (the sliver of bar plus PAD_TOP makes the top match). Views size themselves
 *  as content + CHROME_X / CHROME_Y. */
export const PAD = 12
const PAD_TOP = PAD - BAR_OPEN
export const CHROME_X = PAD * 2
export const CHROME_Y = BAR_OPEN + PAD_TOP + PAD

/** How far past its edge the pointer may drift before the notch lets go. */
const LEAVE_MARGIN = 48

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
import { Backdrop } from './Backdrop'

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
  /** The dock's circles, views and controls, floating under the notch while
   *  it is open. The lock is added at its end. */
  rail?: React.ReactNode
  /** Where the dock sits. */
  dockSide?: DockSide
  /** A bar floating under the notch while open (the apps), below the dock if that is under it too. */
  below?: React.ReactNode
  /** Where that bar sits: under the notch, or hanging beside it. */
  belowSide?: 'left' | 'right' | 'bottom'
  /** Holds the notch open regardless of hover — for a running timer, say. */
  keepOpen?: boolean
  /** Told whenever the notch opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Bumped to fold the notch away now, even under the pointer. */
  closeKey?: number
  className?: string
  /** Material / theme appearance of the notch shell. */
  notchStyle?: NotchStyle
  /** Dominant wallpaper or ambient background color as "r, g, b". */
  bgTint?: string
}

/** The little inverted corners where the notch meets the screen's edge, and
 *  the dock and apps tray: the surface's own colour, solid. */
const CORNER_FILLS: Record<NotchStyle, string> = {
  black: '#0b0b0d',
  mica: 'rgb(20, 20, 24)',
  glass: 'rgb(20, 20, 24)',
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
  rail,
  dockSide = 'bottom',
  below,
  belowSide = 'bottom',
  keepOpen = false,
  onOpenChange,
  closeKey = 0,
  className = '',
  notchStyle = 'black',
  bgTint = '255, 255, 255',
}) => {
  const [isHovered, setIsHovered] = useState(false)


  const [isPinned, setIsPinned] = useState(false)

  const isOpen = isHovered || isPinned || keepOpen
  useEffect(() => onOpenChange?.(isOpen), [isOpen])

  // Resolved after mount so server-rendered markup and the client agree.
  const [radius, setRadius] = useState({ closed: 11, open: 26 })
  useEffect(() => {
    setRadius({
      closed: radiusToken('--radius-notch-closed', 11),
      open: radiusToken('--radius-notch-open', 26),
    })
  }, [])


  const setHover = (over: boolean) => setIsHovered(over)

  // Leaving is judged by intent, not by the edge. The notch changes size under
  // a still pointer (switch to the smaller Shelf and the edge jumps away), so
  // crossing the edge only starts watching: the notch closes once the pointer
  // is clearly away (past LEAVE_MARGIN) and still heading away, or leaves the
  // window. Heading back toward it keeps it open.
  const leaving = useRef<(() => void) | null>(null)
  const stopLeaving = () => {
    leaving.current?.()
    leaving.current = null
  }
  useEffect(() => stopLeaving, [])
  /** Everything that belongs to the notch: itself, the dock, the apps tray, and
   *  any popover marked `data-notch-part` (the favourites picker). */
  const parts = () =>
    [shellRef.current, railRef.current, belowRef.current, ...Array.from(document.querySelectorAll<HTMLElement>('[data-notch-part]'))].filter(
      (el): el is HTMLElement => Boolean(el),
    )
  const distance = (x: number, y: number) =>
    Math.min(
      ...parts()
        .map((el) => {
          const r = el.getBoundingClientRect()
          return Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom))
        }),
    )
  // Asked to fold away: let go of the hover. The pointer has to leave and
  // come back to open it again, so it does not spring straight back open.
  useEffect(() => {
    if (!closeKey) return
    stopLeaving()
    setHover(false)
  }, [closeKey])

  const onEnter = () => {
    stopLeaving()
    setHover(true)
  }
  const onLeave = () => {
    stopLeaving()
    let last = Infinity
    // The real cursor, from the main process, and only when the hand moves:
    // past the edge the window lets the mouse through, so DOM events stop (or
    // claim the pointer left), and while the notch resizes the browser sends
    // moves for a pointer that never moved.
    const unsubscribe = window.bridge?.on<{ x: number; y: number }>('notch:cursor', ({ x, y }) => {
      const d = distance(x, y)
      if (d > LEAVE_MARGIN && d > last) {
        stopLeaving()
        setHover(false)
      }
      last = d
    })
    leaving.current = () => unsubscribe?.()
  }

  // The window is a full-width strip, so the main process cannot simply stop
  // ignoring mouse events — that would hand the whole strip clicks meant for
  // whatever is underneath. It gets the notch's rectangle instead and tests
  // the cursor against it.
  const shellRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const belowRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const report = () => {
      const element = shellRef.current
      if (!element) return

      // The notch, and the dock under it when it is out.
      const rects = parts()
        .map((el) => el.getBoundingClientRect())
        .map((rect) => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }))
      window.bridge?.send('notch:bounds', rects)
    }

    report()

    // The shell springs between sizes, so its bounds are only final once the
    // animation settles; an observer catches every frame of that.
    const observer = new ResizeObserver(report)
    if (shellRef.current) observer.observe(shellRef.current)
    // The dock mounts and springs in a beat after opening; catch it once settled.
    const late = setTimeout(report, 500)
    // Popovers open and close without resizing anything; a slow re-check while
    // open keeps them clickable.
    const tick = isOpen ? setInterval(report, 250) : undefined

    return () => {
      observer.disconnect()
      clearTimeout(late)
      clearInterval(tick)
    }
  }, [isOpen, expandedWidth, expandedHeight])

  useEffect(() => {
    window.bridge?.send('notch:pinned', isPinned)
  }, [isPinned])

  /** The apps tray, in the notch's own surface so the two read as one object:
   *  a short row under the notch, or a column hanging beside it. */
  const tray = (side: 'left' | 'right' | 'bottom') => (
    <motion.div
      key={`tray-${side}`}
      ref={belowRef}
      initial={{ opacity: 0, scale: 0.94, ...(side === 'bottom' ? { y: -10 } : { x: side === 'right' ? -10 : 10 }) }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
      transition={{ ...spring, delay: 0.06 }}
      className={`pointer-events-auto relative isolate border ${side === 'bottom' ? 'rounded-[12px] px-3 py-1' : 'rounded-b-[12px] border-t-0 px-1 pb-1.5 pt-2'} ${
        notchStyle === 'black' ? 'bg-[#0b0b0d] border-white/[0.07]' : 'border-white/[0.1]'
      } shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)]`}
      style={notchStyle === 'black' ? undefined : { background: CORNER_FILLS[notchStyle] }}
    >
      {notchStyle !== 'black' && <Backdrop kind={notchStyle} host={belowRef} />}
      {below}
    </motion.div>
  )

  return (
    <motion.div
      ref={shellRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onDragEnter={(event) => {
        setHover(true)
        // A file on its way in: stay open to take it, and after, until unlocked.
        if (Array.from(event.dataTransfer.types).includes('Files')) setIsPinned(true)
      }}
      // A drag never sends mouseleave, so hover is cleared when it leaves or drops;
      // the lock is what keeps the notch open after that.
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false)
      }}
      onDrop={() => setHover(false)}
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
        ref={mainRef}
        initial={false}
        animate={{
          borderBottomLeftRadius: isOpen ? radius.open : radius.closed,
          borderBottomRightRadius: isOpen ? radius.open : radius.closed,
        }}
        transition={spring}
        className={`relative isolate w-full h-full text-white overflow-hidden flex flex-col
                   border-b border-x border-t-0 transition-colors duration-300
                   ${
                     notchStyle === 'black'
                       ? 'bg-[#0b0b0d] border-white/[0.07] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,255,255,0.05)]'
                       : 'border-white/[0.12] shadow-[0_22px_55px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.14)]'
                   }`}
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          willChange: 'border-radius',
          ...(notchStyle === 'black' ? {} : { background: CORNER_FILLS[notchStyle] }),
        }}
      >
        {/* Mica or Glass: what the surface shows through, open or closed. */}
        {notchStyle !== 'black' && <Backdrop kind={notchStyle} host={mainRef} />}

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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {typeof children === 'function' ? children(isOpen) : children}
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && expandedContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
              transition={{ ...spring, opacity: { duration: 0.15 } }}
              className="flex-1 min-h-0"
              style={{ padding: `${PAD_TOP}px ${PAD}px ${PAD}px`, willChange: 'opacity, transform, filter' }}
            >
              {expandedContent}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Around the notch while it is open: the dock of tabs and the apps tray.
          Under the notch they stack in one column (tray first, against the
          notch); beside it they hang from the screen's edge, the dock nearest
          the notch and the tray just outside it. The notch grows about its
          centre, so nothing under it slides sideways between views. */}
      <DockSideContext.Provider value={dockSide}>
        <div className="pointer-events-none absolute inset-x-0 top-full flex flex-col items-center gap-1.5 pt-1">
          <AnimatePresence>{isOpen && below && belowSide === 'bottom' && tray('bottom')}</AnimatePresence>
          <AnimatePresence>
            {isOpen && rail && dockSide === 'bottom' && (
              <motion.div
                  ref={railRef}
                  initial={{ opacity: 0, scale: 0.92, ...(dockSide === 'bottom' ? { y: -10 } : { x: dockSide === 'right' ? -10 : 10 }) }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                  transition={{ ...spring, delay: 0.04 }}
                  style={{
                    transformOrigin: dockSide === 'bottom' ? 'top center' : dockSide === 'right' ? 'top left' : 'top right',
                    ...(notchStyle === 'black' ? {} : { background: CORNER_FILLS[notchStyle] }),
                  }}
                  className={`pointer-events-auto relative isolate flex items-center gap-[3px] border shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] ${
                    dockSide === 'bottom' ? 'h-[32px] rounded-full px-1' : 'w-[32px] flex-col rounded-b-[16px] border-t-0 px-1 pb-1 pt-1.5'
                  } ${notchStyle === 'black' ? 'bg-[#0b0b0d] border-white/[0.08]' : 'border-white/[0.1]'}`}
                >
                  {notchStyle !== 'black' && <Backdrop kind={notchStyle} host={railRef} />}
                {rail}
                  <div className={dockSide === 'bottom' ? 'mx-0.5 h-3.5 w-px bg-white/[0.1]' : 'my-0.5 h-px w-3.5 bg-white/[0.1]'} />
                  {/* The lock: pinning is something you can see and do. */}
                  <motion.button
                    type="button"
                    aria-label={isPinned ? 'Unpin' : 'Pin open'}
                    aria-pressed={isPinned}
                    whileTap={{ scale: 0.88 }}
                    transition={spring}
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsPinned((pinned) => !pinned)
                    }}
                    className={`group/rail relative grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full outline-none transition-colors duration-200 ${
                      isPinned ? 'bg-white text-black' : 'text-white/45 hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {isPinned ? <Lock size={11} strokeWidth={2.2} /> : <LockOpen size={11} strokeWidth={2} />}
                    <span className={railLabel(dockSide)}>{isPinned ? 'Unlock' : 'Keep open'}</span>
                  </motion.button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            className={`pointer-events-none absolute top-0 flex items-start gap-1.5 ${side === 'right' ? 'left-full pl-1.5' : 'right-full flex-row-reverse pr-1.5'}`}
          >
            <AnimatePresence>
              {isOpen && rail && dockSide === side && (
                <motion.div
                ref={railRef}
                initial={{ opacity: 0, scale: 0.92, x: dockSide === 'right' ? -10 : 10 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                transition={{ ...spring, delay: 0.04 }}
                style={{
                  transformOrigin: dockSide === 'right' ? 'top left' : 'top right',
                  ...(notchStyle === 'black' ? {} : { background: CORNER_FILLS[notchStyle] }),
                }}
                className={`pointer-events-auto relative isolate flex items-center gap-[3px] border shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] ${
                  'w-[32px] flex-col rounded-b-[16px] border-t-0 px-1 pb-1 pt-1.5'
                } ${notchStyle === 'black' ? 'bg-[#0b0b0d] border-white/[0.08]' : 'border-white/[0.1]'}`}
              >
                {notchStyle !== 'black' && <Backdrop kind={notchStyle} host={railRef} />}
                {rail}
                <div className={'my-0.5 h-px w-3.5 bg-white/[0.1]'} />
                {/* The lock: pinning is something you can see and do. */}
                <motion.button
                  type="button"
                  aria-label={isPinned ? 'Unpin' : 'Pin open'}
                  aria-pressed={isPinned}
                  whileTap={{ scale: 0.88 }}
                  transition={spring}
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsPinned((pinned) => !pinned)
                  }}
                  className={`group/rail relative grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full outline-none transition-colors duration-200 ${
                    isPinned ? 'bg-white text-black' : 'text-white/45 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {isPinned ? <Lock size={11} strokeWidth={2.2} /> : <LockOpen size={11} strokeWidth={2} />}
                  <span className={railLabel(dockSide)}>{isPinned ? 'Unlock' : 'Keep open'}</span>
                </motion.button>
              </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>{isOpen && below && belowSide === side && tray(side)}</AnimatePresence>
          </div>
        ))}
      </DockSideContext.Provider>
    </motion.div>
  )
}
