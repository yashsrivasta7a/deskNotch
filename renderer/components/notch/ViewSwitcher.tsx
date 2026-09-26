import React, { createContext, useContext } from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export interface ViewDefinition {
  id: string
  label: string
  icon: React.ReactNode
}

/** Where the dock sits: beside the notch on either side, or under it. */
export type DockSide = 'left' | 'right' | 'bottom'
export const DockSideContext = createContext<DockSide>('bottom')

const LABEL_BASE =
  'pointer-events-none absolute whitespace-nowrap rounded-full bg-[#1c1c1f] px-2 py-[3px] text-[10.5px] font-medium text-white/85 opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-[opacity,transform] duration-150 group-hover/rail:opacity-100 group-hover/rail:delay-300'

/** A circle's name, shown on the dock's open side after a short hover, the way
 *  macOS tooltips wait. */
export const railLabel = (side: DockSide) =>
  `${LABEL_BASE} ${
    side === 'bottom'
      ? 'left-1/2 top-[calc(100%+10px)] -translate-x-1/2 -translate-y-1 group-hover/rail:translate-y-0'
      : side === 'right'
        ? 'left-[calc(100%+12px)] top-1/2 -translate-y-1/2 -translate-x-1 group-hover/rail:translate-x-0'
        : 'right-[calc(100%+12px)] top-1/2 -translate-y-1/2 translate-x-1 group-hover/rail:translate-x-0'
  }`

/** One circle on the dock. Its name slides out beside it on hover, so an icon
 *  never has to be guessed. */
export const RailButton: React.FC<{
  label: string
  active?: boolean
  /** The highlight slides between views on a shared id; controls get their own. */
  layoutId?: string
  onClick: () => void
  children: React.ReactNode
}> = ({ label, active, layoutId, onClick, children }) => {
  const side = useContext(DockSideContext)
  return (
  <motion.button
    type="button"
    aria-label={label}
    aria-pressed={active}
    whileTap={{ scale: 0.88 }}
    transition={spring}
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    className={`group/rail relative grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full outline-none transition-colors duration-200 ${
      active ? 'text-black' : 'text-white/45 hover:bg-white/[0.1] hover:text-white'
    }`}
  >
    {active && <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-full bg-white" />}
    <span className="relative">{children}</span>
    <span className={railLabel(side)}>{label}</span>
  </motion.button>
  )
}

/**
 * The places to go, as circles on the dock beside or under the notch: out of
 * the notch, so the notch is all content.
 */
export const ViewRail: React.FC<{ views: ViewDefinition[]; active: string; onChange: (id: string) => void }> = ({ views, active, onChange }) => (
  <>
    {views.map((view) => (
      <RailButton key={view.id} label={view.label} active={view.id === active} layoutId="rail-active" onClick={() => onChange(view.id)}>
        {view.icon}
      </RailButton>
    ))}
  </>
)
