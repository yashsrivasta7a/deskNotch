import React, { createContext, useContext, useState } from 'react'
import { motion } from 'motion/react'

/** Every card in the glance is this tall; widths vary by what it holds. */
export const TILE = 136
export const TILE_GAP = 10

/**
 * Two glasses. Thin: a near-clear pane over the notch, for the readings —
 * the content is the thing, the card only holds it. Tinted: a fuller face,
 * for a card with its own colour under it (the companion), so the colour
 * has something to bloom through.
 */
const THIN = 'linear-gradient(155deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 50%, rgba(255,255,255,0.012) 100%)'
const THIN_HOVER = 'linear-gradient(155deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.025) 100%)'
const TINTED = 'linear-gradient(155deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.045) 42%, rgba(255,255,255,0.02) 100%)'
const TINTED_HOVER = 'linear-gradient(155deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.07) 42%, rgba(255,255,255,0.035) 100%)'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

/** True when a card is the only one: a frame around one thing inside the
 *  notch is a box in a box, so the card drops it and becomes the notch. */
export const AloneContext = createContext(false)

interface TileProps {
  width: number
  /** The glance's card height unless said otherwise (the desk's panes are taller). */
  height?: number
  /** A CSS background laid under the frost, for a card that takes colour
   *  from what it shows. */
  glow?: string
  /** The fuller glass, for a card with colour under it. */
  tinted?: boolean
  onClick?: () => void
  label?: string
  className?: string
  /** Off, the card lets its content spill past its edge (a ring wider than the card). */
  clip?: boolean
  children: React.ReactNode
}

/**
 * One surface for everything in the glance. A glossy bot, an album cover and
 * a dotted orb share nothing visually — the identical frame is what makes
 * them read as one set rather than things that happen to be side by side.
 * The width springs, so a card that grows pushes its neighbours smoothly.
 */
export const Tile: React.FC<TileProps> = ({ width, height = TILE, glow, tinted, onClick, label, className = '', clip = true, children }) => {
  const Component = onClick ? motion.button : motion.div
  const alone = useContext(AloneContext)
  const [hovered, setHovered] = useState(false)

  const lit = hovered && onClick
  const face = alone ? 'transparent' : [glow, tinted ? (lit ? TINTED_HOVER : TINTED) : lit ? THIN_HOVER : THIN].filter(Boolean).join(', ')

  return (
    <Component
      type={onClick ? 'button' : undefined}
      aria-label={onClick ? label : undefined}
      onClick={
        onClick &&
        ((event: React.MouseEvent) => {
          event.stopPropagation()
          onClick()
        })
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={false}
      animate={{ width }}
      transition={spring}
      className={`shrink-0 ${clip ? 'overflow-hidden' : 'overflow-visible'} rounded-[24px] p-3.5 text-left ${alone ? 'relative' : tinted ? 'frost' : 'frost frost-thin'}
                  ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ height, background: face, transition: 'background 200ms ease' }}
    >
      {children}
    </Component>
  )
}

/** The tiny caption every card uses. */
export const TileLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`block text-[8.5px] font-bold uppercase tracking-[0.12em] leading-none text-white/35 ${className}`}>
    {children}
  </span>
)
