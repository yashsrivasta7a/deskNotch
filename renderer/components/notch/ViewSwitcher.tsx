import React from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export interface ViewDefinition {
  id: string
  label: string
}

interface ViewSwitcherProps {
  views: ViewDefinition[]
  active: string
  onChange: (id: string) => void
}

/**
 * The views, as words at the left of the notch's top bar — where a toolbar
 * puts the places you can go. Words, not icons: nobody should have to guess.
 *
 * The highlight is a shared layoutId, so it slides between tabs instead of
 * fading in and out; the movement is what says they are one control.
 */
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ views, active, onChange }) => (
  <div className="flex items-center gap-1">
    {views.map((view) => {
      const isActive = view.id === active

      return (
        <button
          key={view.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onChange(view.id)
          }}
          aria-label={view.label}
          aria-pressed={isActive}
          className="relative h-[24px] rounded-full px-3 outline-none"
        >
          {isActive && (
            <motion.span layoutId="view-switcher-active" transition={spring} className="absolute inset-0 rounded-full bg-white/[0.12]" />
          )}
          <span
            className={`relative -mt-px block text-[11.5px] font-medium leading-none transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {view.label}
          </span>
        </button>
      )
    })}
  </div>
)

/** A small round button for the right of the bar: a control, not a place. */
export const BarButton: React.FC<{
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}> = ({ label, active, onClick, children }) => (
  <motion.button
    type="button"
    aria-label={label}
    aria-pressed={active}
    title={label}
    whileTap={{ scale: 0.9 }}
    transition={spring}
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full outline-none transition-colors ${
      active ? 'bg-white text-black' : 'text-white/35 hover:bg-white/[0.08] hover:text-white'
    }`}
  >
    {children}
  </motion.button>
)
