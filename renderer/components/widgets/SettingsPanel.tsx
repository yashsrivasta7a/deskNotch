import React from 'react'
import { motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

export interface Settings {
  /** Which panels appear in the glance row. */
  showMusic: boolean
  showTasks: boolean
  showCalendar: boolean
  showPhoto: boolean
  ambientVideo: boolean
  albumTint: boolean
  startOnBoot: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  showMusic: true,
  showTasks: true,
  showCalendar: true,
  showPhoto: true,
  ambientVideo: true,
  albumTint: true,
  startOnBoot: false,
}

const Switch: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={`relative shrink-0 w-[30px] h-[17px] rounded-full transition-colors duration-200
      ${checked ? 'bg-white/85' : 'bg-white/[0.08]'}`}
  >
    <motion.span
      layout
      transition={spring}
      className={`absolute top-[2.5px] w-[12px] h-[12px] rounded-full
        ${checked ? 'right-[2.5px] bg-black' : 'left-[2.5px] bg-white/45'}`}
    />
  </span>
)

/** A full-width row. Used where the label needs explaining. */
const Row: React.FC<{
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}> = ({ label, hint, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={(event) => {
      event.stopPropagation()
      onChange(!checked)
    }}
    className="glass-control flex items-center justify-between gap-3 w-full
               rounded-control px-3 py-2 text-left"
  >
    <span className="min-w-0">
      <span className="block text-[11.5px] font-medium text-white/85 leading-tight truncate">
        {label}
      </span>
      {hint && (
        <span className="block text-[9.5px] text-white/30 leading-tight mt-[1px] truncate">
          {hint}
        </span>
      )}
    </span>
    <Switch checked={checked} />
  </button>
)

/** A compact chip. Used where the icon and name already say everything. */
const Chip: React.FC<{
  label: string
  icon: React.ReactNode
  checked: boolean
  onChange: (value: boolean) => void
}> = ({ label, icon, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={(event) => {
      event.stopPropagation()
      onChange(!checked)
    }}
    className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5
                transition-all duration-200
      ${checked
        ? 'bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
        : 'bg-white/[0.02] text-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:text-white/55'}`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
)

const ICONS = {
  music: (
    <svg viewBox="0 0 14 14" className="w-3 h-3 fill-current">
      <path d="M5.4 10.6a1.5 1.5 0 1 1-1.5-1.5c.22 0 .43.05.62.14V3.1l5.4-1.1v6.4a1.5 1.5 0 1 1-1.5-1.5c.22 0 .43.05.62.14V3.5l-3.64.74v6.36z" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 14 14" className="w-3 h-3 fill-none stroke-current stroke-[1.5]">
      <path d="M2 4.4l1.5 1.5L6.2 3.2M2 10l1.5 1.5L6.2 8.8M8.4 4.4h3.6M8.4 10.2h3.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 14 14" className="w-3 h-3 fill-none stroke-current stroke-[1.5]">
      <rect x="2" y="3" width="10" height="9" rx="2" />
      <path d="M2 5.8h10M4.8 1.8v2.2M9.2 1.8v2.2" strokeLinecap="round" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 14 14" className="w-3 h-3 fill-none stroke-current stroke-[1.5]">
      <rect x="2" y="2.5" width="10" height="9" rx="2" />
      <circle cx="5.2" cy="5.6" r="1" />
      <path d="M2.4 9.6l2.8-2.4 2.4 2 1.8-1.4 2.6 2.2" strokeLinejoin="round" />
    </svg>
  ),
}

interface SettingsPanelProps {
  settings: Settings
  onChange: (next: Settings) => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* What appears in the glance row. Chips rather than switches: these are
          a set to pick from, not independent preferences. */}
      <div className="glass rounded-card px-3.5 py-3 flex flex-col">
        <span className="text-[9px] font-bold tracking-[0.12em] text-white/25 mb-2.5">
          SHOW IN GLANCE
        </span>

        <div className="flex flex-wrap gap-1.5 content-start">
          <Chip
            label="Music"
            icon={ICONS.music}
            checked={settings.showMusic}
            onChange={(value) => set('showMusic', value)}
          />
          <Chip
            label="Tasks"
            icon={ICONS.tasks}
            checked={settings.showTasks}
            onChange={(value) => set('showTasks', value)}
          />
          <Chip
            label="Calendar"
            icon={ICONS.calendar}
            checked={settings.showCalendar}
            onChange={(value) => set('showCalendar', value)}
          />
          <Chip
            label="Photo"
            icon={ICONS.photo}
            checked={settings.showPhoto}
            onChange={(value) => set('showPhoto', value)}
          />
        </div>
      </div>

      <div className="glass rounded-card px-3.5 py-3 flex flex-col">
        <span className="text-[9px] font-bold tracking-[0.12em] text-white/25 mb-2.5">
          APPEARANCE
        </span>

        <div className="flex flex-col gap-1.5">
          <Row
            label="Ambient glow"
            hint="Firelight while music plays"
            checked={settings.ambientVideo}
            onChange={(value) => set('ambientVideo', value)}
          />
          <Row
            label="Album tint"
            hint="Colour from the artwork"
            checked={settings.albumTint}
            onChange={(value) => set('albumTint', value)}
          />
          <Row
            label="Start on boot"
            checked={settings.startOnBoot}
            onChange={(value) => set('startOnBoot', value)}
          />
        </div>
      </div>
    </div>
  )
}
