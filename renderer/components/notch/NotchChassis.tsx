import React from 'react'

interface NotchChassisProps {
  children: React.ReactNode
  className?: string
}

export const NotchChassis: React.FC<NotchChassisProps> = ({ children, className = '' }) => {
  return (
    <div className="relative w-full h-full select-none bg-transparent">
      {/* Apple Inverted Concave Curve (Left Ear) */}
      <svg
        className="absolute -top-[0.5px] left-0 w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M0,0 H6 V6 A6,6 0 0 1 0,0 Z" />
      </svg>

      {/* Apple Inverted Concave Curve (Right Ear) */}
      <svg
        className="absolute -top-[0.5px] right-0 w-[6px] h-[6px] fill-black pointer-events-none z-20"
        viewBox="0 0 6 6"
      >
        <path d="M6,0 H0 V6 A6,6 0 0 0 6,0 Z" />
      </svg>

      {/* Main Notch Chassis Body */}
      <main
        className={`w-full h-full bg-black rounded-b-[11px] flex items-center justify-between px-3 text-white cursor-default select-none border-b border-x border-white/[0.08] shadow-[inset_0_-1px_1px_rgba(255,255,255,0.06)] overflow-hidden ${className}`}
      >
        {children}
      </main>
    </div>
  )
}
