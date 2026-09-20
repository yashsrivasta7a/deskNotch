import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Dynamic Island spring — snappy, barely overshoots. */
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

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
  // Clicking pins the notch open. Without it, anything that takes more than a
  // moment — typing a task, watching a timer — disappears the instant the
  // pointer drifts off.
  const [isPinned, setIsPinned] = useState(false)

  const isOpen = isHovered || isPinned || keepOpen

  // The window is click-through by default so the rest of the strip does not
  // swallow clicks meant for whatever is underneath. The main process only
  // needs to take clicks back while the notch is actually open.
  const setHover = (over: boolean) => {
    setIsHovered(over)
    if (over || isPinned || keepOpen) {
      window.ipc?.send('notch:hover', true)
    } else {
      window.ipc?.send('notch:hover', false)
    }
  }

  // A pin or a keepOpen that outlives the hover still needs clicks routed here.
  useEffect(() => {
    if (isPinned || keepOpen) window.ipc?.send('notch:hover', true)
    else if (!isHovered) window.ipc?.send('notch:hover', false)
  }, [isPinned, keepOpen, isHovered])

  // Keyboard focus follows the pin, not the hover — text fields inside the
  // notch need it, but grabbing focus on a passing hover would be hostile.
  useEffect(() => {
    window.ipc?.send('notch:pinned', isPinned)
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
      {/* Inverted concave corners, filling the gap where the flat screen edge
          meets the notch shoulder. Pinned to the top so they hold while the
          notch grows. */}
      <svg
        className="absolute top-0 -left-[6px] w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M0,0 H6 V6 A6,6 0 0 1 0,0 Z" />
      </svg>
      <svg
        className="absolute top-0 -right-[6px] w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M6,0 H0 V6 A6,6 0 0 0 6,0 Z" />
      </svg>

      {/* Only the bottom corners round — the top edge sits flush against the
          screen edge, like the hardware notch it imitates. */}
      <motion.main
        initial={false}
        animate={{
          borderBottomLeftRadius: isOpen ? 26 : 11,
          borderBottomRightRadius: isOpen ? 26 : 11,
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
        {/* The collapsed bar keeps its height while the shell grows around it.
            Clicking it pins the notch; clicks inside the expanded content are
            left alone so widget buttons do not toggle the pin. */}
        <div
          onClick={() => setIsPinned((pinned) => !pinned)}
          className="h-[30px] shrink-0 flex items-center justify-between px-3 cursor-pointer"
        >
          {children}
          {isPinned && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0"
              title="Pinned open"
            />
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
