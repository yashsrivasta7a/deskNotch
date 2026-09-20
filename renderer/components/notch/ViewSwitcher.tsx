import React from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export interface ViewDefinition {
  id: string
  label: string
  icon: React.ReactNode
}

interface ViewSwitcherProps {
  views: ViewDefinition[]
  active: string
  onChange: (id: string) => void
  /** Rendered below the rail, separated from it. Settings is an action, not a
   *  view, so grouping it with the others would misrepresent what it does. */
  footer?: React.ReactNode
}

/**
 * Vertical rail of views, pinned to the right edge of the notch.
 *
 * The highlight is a shared layoutId, so it travels between buttons instead of
 * fading in and out — the movement is what tells you the two are the same
 * control.
 */
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  views,
  active,
  onChange,
  footer,
}) => (
  <div className="flex flex-col items-center gap-2.5">
    <div className="flex flex-col items-center gap-1 p-0.5 rounded-full bg-white/[0.04]">
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
          className="relative grid place-items-center w-6 h-6 rounded-full"
        >
          {isActive && (
            <motion.div
              layoutId="view-switcher-active"
              transition={spring}
              className="absolute inset-0 rounded-full bg-white/[0.14]"
            />
          )}
          <span
            className={`relative transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {view.icon}
          </span>
          </button>
        )
      })}
    </div>

    {footer}
  </div>
)
