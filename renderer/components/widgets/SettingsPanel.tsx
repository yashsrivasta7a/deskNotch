import React from 'react'
import { motion } from 'motion/react'
import { BotAvatar, type BotAvatarType } from 'bot-avatars'
import { ImagePlus } from 'lucide-react'
import { usePhoto } from '../../hooks/usePhoto'
import type { ProviderLimits } from '../../hooks/useAiLimits'
import { limitChoices, visibleLimits } from './AiOrbs'
import { cardCount, MAX_CARDS } from '../../lib/glance'
import { COMPANION_SAYS, COMPANION_SLEEPS, type CompanionSays, type CompanionSleeps } from './CompanionTile'

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

/** The page's content height; the notch's Settings size follows it. */
export const SETTINGS_PANE = 312

export type NotchStyle = 'glass' | 'translucent' | 'black'

/** A bot, or the user's own photo. */
export type Avatar = BotAvatarType | 'photo'

export interface Settings {
  /** What the glance shows. */
  showMusic: boolean
  showTasks: boolean
  showAvatar: boolean
  showFocus: boolean
  showAiUsage: boolean
  ambientVideo: boolean
  albumTint: boolean
  startOnBoot: boolean
  notchStyle: NotchStyle
  avatar: Avatar
  /** What the companion talks about; empty means everything. */
  companionSays: CompanionSays[]
  /** When the companion sleeps. */
  companionSleeps: CompanionSleeps
  /** How long a focus session runs, in minutes. */
  focusMinutes: number
  /** AI limits switched off, by key ("Claude-SESSION"). Hidden rather than
   *  shown, so a limit a tool adds later appears without asking. */
  hiddenLimits: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  showMusic: true,
  showTasks: true,
  showAvatar: true,
  showFocus: true,
  showAiUsage: true,
  ambientVideo: true,
  albumTint: true,
  startOnBoot: false,
  notchStyle: 'glass',
  avatar: 'ghost',
  companionSays: [],
  companionSleeps: 'time',
  focusMinutes: 25,
  hiddenLimits: [],
}

/** The bots on offer — a short, varied few rather than all eighteen. */
const BOTS: BotAvatarType[] = ['ghost', 'cat', 'blob', 'clover', 'droid', 'alien', 'cloud']

const Label: React.FC<{ children: React.ReactNode; hint?: string; warn?: boolean }> = ({ children, hint, warn }) => (
  <span className="mb-2 flex items-baseline justify-between">
    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">{children}</span>
    {hint && <span className={`text-[9px] ${warn ? 'font-semibold text-[#FF5F2E]' : 'text-white/25'}`}>{hint}</span>}
  </span>
)

/** A plain row: label left, switch right. The whole row is the target. */
const Toggle: React.FC<{
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}> = ({ label, checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    title={disabled ? `Up to ${MAX_CARDS} cards in the glance` : undefined}
    onClick={(event) => {
      event.stopPropagation()
      onChange(!checked)
    }}
    className="group flex h-[26px] w-full items-center justify-between gap-3 text-left disabled:cursor-default"
  >
    <span
      className={`text-[12px] transition-colors ${
        disabled ? 'text-white/20' : checked ? 'text-white/85 group-hover:text-white' : 'text-white/40 group-hover:text-white'
      }`}
    >
      {label}
    </span>
    <span
      className={`relative h-[16px] w-[27px] shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-white' : disabled ? 'bg-white/[0.05]' : 'bg-white/[0.12]'
      }`}
    >
      <motion.span
        layout
        transition={spring}
        className={`absolute top-[2px] h-[12px] w-[12px] rounded-full ${
          checked ? 'right-[2px] bg-black' : `left-[2px] ${disabled ? 'bg-white/25' : 'bg-white/60'}`
        }`}
      />
    </span>
  </button>
)

/** One avatar choice: a small round button, the chosen one lit and moving. */
const AvatarChoice: React.FC<{ selected: boolean; label: string; onClick: () => void; children: React.ReactNode }> = ({
  selected,
  label,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={selected}
    title={label}
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    className="relative grid h-[32px] w-[32px] place-items-center rounded-full"
  >
    {selected && (
      <motion.span layoutId="avatar-choice" transition={spring} className="absolute inset-0 rounded-full bg-white/[0.14]" />
    )}
    <span className={`relative transition-opacity ${selected ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}>
      {children}
    </span>
  </button>
)

interface SettingsPanelProps {
  settings: Settings
  onChange: (next: Settings) => void
  /** The AI limits found, to offer them one by one. */
  aiLimits: ProviderLimits[] | null
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, aiLimits }) => {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const { photo, pick } = usePhoto()

  const hidden = settings.hiddenLimits ?? []
  const aiCards = visibleLimits(aiLimits, hidden).length
  const count = cardCount(settings, aiCards)
  /** Whether switching this on still fits the glance. */
  const fits = (key: keyof Settings) => cardCount({ ...settings, [key]: true }, aiCards) <= MAX_CARDS

  const show = (label: string, key: 'showMusic' | 'showTasks' | 'showAvatar' | 'showFocus' | 'showAiUsage') => (
    <Toggle label={label} checked={settings[key]} disabled={!settings[key] && !fits(key)} onChange={(value) => set(key, value)} />
  )

  return (
    <div className="flex h-full items-start gap-10">
      <div className="w-[240px] shrink-0" onClick={(event) => event.stopPropagation()}>
        {/* Over the limit only happens from older settings; nothing is removed
            behind the user's back, it is just said plainly. */}
        <Label hint={count > MAX_CARDS ? `${count} of ${MAX_CARDS} cards · turn one off` : `${count} of ${MAX_CARDS} cards`} warn={count > MAX_CARDS}>
          Glance
        </Label>
        {show('Companion', 'showAvatar')}
        {show('Now playing', 'showMusic')}
        {show('Next task', 'showTasks')}
        {show('Focus', 'showFocus')}
        {show('AI usage', 'showAiUsage')}
        {settings.showAiUsage && limitChoices(aiLimits).length > 0 && (
          // Which limits: chips rather than switches, a set to pick from.
          <div className="mb-1 flex flex-wrap gap-1">
            {limitChoices(aiLimits).map(({ key, name }) => {
              const shown = !hidden.includes(key)
              // Showing a window can add a whole card, if it is a new tool's.
              const after = hidden.filter((k) => k !== key)
              const blocked = !shown && cardCount(settings, visibleLimits(aiLimits, after).length) > MAX_CARDS
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={shown}
                  disabled={blocked}
                  title={blocked ? `Up to ${MAX_CARDS} cards in the glance` : undefined}
                  onClick={(event) => {
                    event.stopPropagation()
                    set('hiddenLimits', shown ? [...hidden, key] : after)
                  }}
                  className={`h-[20px] rounded-full px-2 text-[10px] font-medium transition-colors ${
                    shown
                      ? 'bg-white/[0.14] text-white'
                      : blocked
                        ? 'bg-white/[0.02] text-white/20'
                        : 'bg-white/[0.04] text-white/35 hover:text-white/70'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col" onClick={(event) => event.stopPropagation()}>
        <Label>Companion</Label>
        <div className="-ml-1 mb-3 flex items-center gap-0.5">
          {BOTS.map((bot) => (
            <AvatarChoice key={bot} label={bot} selected={settings.avatar === bot} onClick={() => set('avatar', bot)}>
              <BotAvatar type={bot} size={22} theme="dark" interactive={false} paused={settings.avatar !== bot} />
            </AvatarChoice>
          ))}
          <AvatarChoice
            label={photo ? 'Your photo — click again to change it' : 'Use your own photo'}
            selected={settings.avatar === 'photo'}
            onClick={async () => {
              // First pick, or a second click on the chosen photo, asks for a file.
              if (!photo || settings.avatar === 'photo') {
                if (!(await pick())) return
              }
              set('avatar', 'photo')
            }}
          >
            {photo ? (
              <img src={photo} alt="" className="h-[22px] w-[22px] rounded-full object-cover" />
            ) : (
              <ImagePlus size={16} strokeWidth={1.8} className="text-white" />
            )}
          </AvatarChoice>
        </div>

        <Label hint="pick any">Says</Label>
        <div className="mb-3 flex gap-1">
          {/* Any mix: nothing chosen means all of them. */}
          {(() => {
            const says = Array.isArray(settings.companionSays) ? settings.companionSays : []
            const chip = (on: boolean, label: string, onClick: () => void) => (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={(event) => {
                  event.stopPropagation()
                  onClick()
                }}
                className={`h-[20px] rounded-full px-2 text-[10px] font-medium transition-colors ${
                  on ? 'bg-white/[0.14] text-white' : 'bg-white/[0.04] text-white/35 hover:text-white/70'
                }`}
              >
                {label}
              </button>
            )
            return [
              chip(says.length === 0, 'Everything', () => set('companionSays', [])),
              ...COMPANION_SAYS.map((option) =>
                chip(says.includes(option.id), option.label, () =>
                  set('companionSays', says.includes(option.id) ? says.filter((id) => id !== option.id) : [...says, option.id]),
                ),
              ),
            ]
          })()}
        </div>

        <Label>Sleeps</Label>
        <div className="mb-3 flex gap-1">
          {COMPANION_SLEEPS.map((option) => {
            const on = (settings.companionSleeps ?? 'time') === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                onClick={(event) => {
                  event.stopPropagation()
                  set('companionSleeps', option.id)
                }}
                className={`h-[20px] rounded-full px-2 text-[10px] font-medium tabular-nums transition-colors ${
                  on ? 'bg-white/[0.14] text-white' : 'bg-white/[0.04] text-white/35 hover:text-white/70'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <Label>Style</Label>
        <div className="mb-2 grid grid-cols-3 rounded-[10px] bg-white/[0.06] p-[3px]">
          {(
            [
              { id: 'glass', label: 'Glass' },
              { id: 'translucent', label: 'Translucent' },
              { id: 'black', label: 'Black' },
            ] as const
          ).map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                set('notchStyle', style.id)
              }}
              className="relative h-[24px] text-[11px] font-medium"
            >
              {settings.notchStyle === style.id && (
                <motion.span layoutId="notch-style-active" transition={spring} className="absolute inset-0 rounded-[7px] bg-white/[0.14]" />
              )}
              <span className={`relative ${settings.notchStyle === style.id ? 'text-white' : 'text-white/45'}`}>
                {style.label}
              </span>
            </button>
          ))}
        </div>

        <Toggle label="Ambient glow with music" checked={settings.ambientVideo} onChange={(value) => set('ambientVideo', value)} />
        <Toggle label="Tint from album art" checked={settings.albumTint} onChange={(value) => set('albumTint', value)} />
        <Toggle label="Start on boot" checked={settings.startOnBoot} onChange={(value) => set('startOnBoot', value)} />
      </div>
    </div>
  )
}