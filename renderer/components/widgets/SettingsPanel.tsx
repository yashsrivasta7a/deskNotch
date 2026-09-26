import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BotAvatar, type BotAvatarType } from 'bot-avatars'
import { AppWindow, Bot, ImagePlus, LayoutGrid, Palette, PanelsTopLeft, Power, RectangleHorizontal } from 'lucide-react'
import { usePhoto } from '../../hooks/usePhoto'
import type { ProviderLimits } from '../../hooks/useAiLimits'
import { limitChoices, visibleLimits } from './AiOrbs'
import { cardCount, MAX_CARDS } from '../../lib/glance'
import type { DockSide } from '../notch/ViewSwitcher'
import type { AppsSide, DeskApps } from './AppsRow'
import { COMPANION_MODES, COMPANION_SLEEPS, type CompanionMode, type CompanionSleeps } from './CompanionTile'

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

/** The page's content height; the notch's Settings size follows it. */
export const SETTINGS_PANE = 312

/** Black, the Dynamic Island; Mica, the blurred wallpaper; Glass, a live blur of what is behind. */
export type NotchStyle = 'black' | 'mica' | 'glass'

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
  /** Where the dock of views and controls sits around the notch. */
  dockSide: DockSide
  /** Views taken off the dock ('glance', 'desk', 'files'); Settings and the lock always stay. */
  hiddenViews: string[]
  /** What the closed notch shows on its right. */
  collapsedRight: 'time' | 'ai'
  /** Open the notch on each new screenshot. */
  catchScreenshots: boolean
  /** The apps bar under the notch: Windows' most used, your favourites, or none. */
  deskApps: DeskApps
  /** Favourite apps, by AppUserModelID, in the order they were added. */
  favoriteApps: string[]
  /** The views the apps bar floats under: 'glance', 'desk', 'files' (the Shelf). */
  appsOn: string[]
  /** Where the apps bar sits; 'auto' puts it on the right when the tabs dock is at the bottom, else under the notch. */
  appsSide: AppsSide | 'auto'
  avatar: Avatar
  /** What the companion is for: one mode at a time. */
  companionMode: CompanionMode
  /** When the companion sleeps. */
  companionSleeps: CompanionSleeps
  /** How long a focus session runs, in minutes (fractions for seconds). */
  focusMinutes: number
  /** AI limits switched off, by key ("Claude-SESSION"). Hidden rather than
   *  shown, so a limit a tool adds later appears without asking. */
  hiddenLimits: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  showMusic: true,
  showTasks: true,
  showAvatar: true,
  showFocus: false,
  showAiUsage: true,
  ambientVideo: true,
  albumTint: true,
  startOnBoot: false,
  notchStyle: 'black',
  dockSide: 'bottom',
  hiddenViews: [],
  collapsedRight: 'time',
  catchScreenshots: true,
  deskApps: 'most',
  favoriteApps: [],
  appsOn: ['files'],
  appsSide: 'auto',
  avatar: 'ghost',
  companionMode: 'focus',
  companionSleeps: 'time',
  focusMinutes: 25,
  hiddenLimits: [],
}

/** The bots on offer: a short, varied few rather than all eighteen. */
const BOTS: BotAvatarType[] = ['ghost', 'cat', 'blob', 'clover', 'droid', 'alien', 'cloud']

/** The three views, by the ids the notch uses. */
const VIEWS = [
  { id: 'glance', label: 'Glance' },
  { id: 'desk', label: 'Desk' },
  { id: 'files', label: 'Shelf' },
] as const

const halt = (event: React.SyntheticEvent) => event.stopPropagation()

// ── Building blocks ─────────────────────────────────────────────────────────

/** A switch, iOS-style: white when on. */
const Switch: React.FC<{ on: boolean; disabled?: boolean; onChange: (on: boolean) => void; label: string }> = ({ on, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={(event) => {
      halt(event)
      onChange(!on)
    }}
    className={`relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-35 ${on ? 'bg-white' : 'bg-white/[0.14]'}`}
  >
    <motion.span
      layout
      transition={spring}
      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full ${on ? 'right-[2px] bg-black' : 'left-[2px] bg-white/70'}`}
    />
  </button>
)

/** One choice out of a few, as a segmented control with a sliding highlight. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  disabled = [],
  disabledTitle,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  id: string
  /** Options that cannot be picked right now (taken by something else). */
  disabled?: readonly string[]
  disabledTitle?: string
}) {
  return (
    <div className="flex shrink-0 rounded-[9px] bg-white/[0.07] p-[2px]">
      {options.map((option) => {
        const on = option.id === value
        const off = disabled.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            disabled={off}
            title={off ? disabledTitle : undefined}
            onClick={(event) => {
              halt(event)
              onChange(option.id)
            }}
            className="relative h-[22px] whitespace-nowrap px-2.5 text-[11px] font-medium disabled:cursor-default disabled:opacity-25"
          >
            {on && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-[7px] bg-white/[0.16]" />}
            <span className={`relative transition-colors ${on ? 'text-white' : 'text-white/45 hover:text-white/75'}`}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Several of a few, as chips. */
const Chips: React.FC<{ options: { id: string; label: string; disabled?: boolean; title?: string }[]; value: string[]; onToggle: (id: string) => void }> = ({
  options,
  value,
  onToggle,
}) => (
  <div className="flex flex-wrap gap-1">
    {options.map((option) => {
      const on = value.includes(option.id)
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={on}
          disabled={option.disabled}
          title={option.title}
          onClick={(event) => {
            halt(event)
            onToggle(option.id)
          }}
          className={`h-[22px] rounded-full px-2.5 text-[10.5px] font-medium transition-colors disabled:opacity-30 ${
            on ? 'bg-white text-black' : 'bg-white/[0.07] text-white/55 hover:text-white'
          }`}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

/** One setting: what it is, a line on what it does, and its control. */
const Row: React.FC<{ title: string; detail?: string; children?: React.ReactNode; below?: React.ReactNode }> = ({ title, detail, children, below }) => (
  <div className="px-3 py-2">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-white/90">{title}</div>
        {detail && <div className="mt-0.5 text-[10.5px] leading-snug text-white/40">{detail}</div>}
      </div>
      {children}
    </div>
    {below && <div className="mt-2">{below}</div>}
  </div>
)

/** Rows grouped on one card, hairlines between them, the way iOS groups settings. */
const Group: React.FC<{ children: React.ReactNode; note?: string }> = ({ children, note }) => (
  <div className="mb-3">
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-[12px] bg-white/[0.045]">{children}</div>
    {note && <p className="mt-1.5 px-3 text-[10px] leading-snug text-white/35">{note}</p>}
  </div>
)

// ── Sections ────────────────────────────────────────────────────────────────

type SectionId = 'glance' | 'companion' | 'closed' | 'apps' | 'tabs' | 'look' | 'general'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'glance', label: 'Glance', icon: <LayoutGrid size={13} strokeWidth={2} /> },
  { id: 'companion', label: 'Companion', icon: <Bot size={13} strokeWidth={2} /> },
  { id: 'closed', label: 'Closed notch', icon: <RectangleHorizontal size={13} strokeWidth={2} /> },
  { id: 'apps', label: 'Apps', icon: <AppWindow size={13} strokeWidth={2} /> },
  { id: 'tabs', label: 'Tabs & dock', icon: <PanelsTopLeft size={13} strokeWidth={2} /> },
  { id: 'look', label: 'Appearance', icon: <Palette size={13} strokeWidth={2} /> },
  { id: 'general', label: 'General', icon: <Power size={13} strokeWidth={2} /> },
]

interface SettingsPanelProps {
  settings: Settings
  onChange: (next: Settings) => void
  /** The AI limits found, to offer them one by one. */
  aiLimits: ProviderLimits[] | null
}

/**
 * Settings, the way System Settings does it: a short list of sections on the
 * left, one section at a time on the right as grouped rows, and every row
 * saying in plain words what it changes.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, aiLimits }) => {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const { photo, pick } = usePhoto()
  const [section, setSection] = useState<SectionId>('glance')

  const hidden = settings.hiddenLimits ?? []
  const aiCards = visibleLimits(aiLimits, hidden).length
  const count = cardCount(settings, aiCards)
  /** Whether switching this on still fits the glance. */
  const fits = (key: keyof Settings) => cardCount({ ...settings, [key]: true }, aiCards) <= MAX_CARDS
  const card = (key: 'showMusic' | 'showTasks' | 'showAvatar' | 'showAiUsage', label: string) => (
    <Switch label={label} on={settings[key]} disabled={!settings[key] && !fits(key)} onChange={(v) => set(key, v)} />
  )
  const hiddenViews = settings.hiddenViews ?? []

  const content: Record<SectionId, React.ReactNode> = {
    glance: (
      <>
        <Group note={count > MAX_CARDS ? `${count} cards chosen; the glance holds ${MAX_CARDS}. Turn one off.` : `${count} of ${MAX_CARDS} cards. A switch greys out when the glance is full.`}>
          <Row title="Companion" detail="Your bot, in the mode you pick under Companion">
            {card('showAvatar', 'Companion')}
          </Row>
          <Row title="Now playing" detail="The song or video, with controls">
            {card('showMusic', 'Now playing')}
          </Row>
          <Row title="Next task" detail="Your next few tasks, tickable">
            {card('showTasks', 'Next task')}
          </Row>
          <Row
            title="AI usage"
            detail="How much of your Claude and Codex limits is used"
            below={
              settings.showAiUsage && limitChoices(aiLimits).length > 0 ? (
                <Chips
                  options={limitChoices(aiLimits).map(({ key, name }) => {
                    const after = hidden.filter((k) => k !== key)
                    const blocked = hidden.includes(key) && cardCount(settings, visibleLimits(aiLimits, after).length) > MAX_CARDS
                    return { id: key, label: name, disabled: blocked, title: blocked ? `Up to ${MAX_CARDS} cards` : undefined }
                  })}
                  value={limitChoices(aiLimits).map((c) => c.key).filter((k) => !hidden.includes(k))}
                  onToggle={(key) => set('hiddenLimits', hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key])}
                />
              ) : undefined
            }
          >
            {card('showAiUsage', 'AI usage')}
          </Row>
        </Group>
      </>
    ),
    companion: (
      <>
        <Group>
          <Row
            title="Character"
            detail="A bot, or your own photo"
            below={
              <div className="-ml-1 flex items-center gap-0.5">
                {BOTS.map((bot) => (
                  <button
                    key={bot}
                    type="button"
                    aria-label={bot}
                    aria-pressed={settings.avatar === bot}
                    onClick={(event) => {
                      halt(event)
                      set('avatar', bot)
                    }}
                    className="relative grid h-[32px] w-[32px] place-items-center rounded-full"
                  >
                    {settings.avatar === bot && <motion.span layoutId="avatar-choice" transition={spring} className="absolute inset-0 rounded-full bg-white/[0.14]" />}
                    <span className={`relative transition-opacity ${settings.avatar === bot ? '' : 'opacity-55 hover:opacity-100'}`}>
                      <BotAvatar type={bot} size={22} theme="dark" interactive={false} paused={settings.avatar !== bot} />
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  aria-label={photo ? 'Your photo. Click again to change it' : 'Use your own photo'}
                  title={photo ? 'Your photo. Click again to change it' : 'Use your own photo'}
                  onClick={async (event) => {
                    halt(event)
                    if (!photo || settings.avatar === 'photo') {
                      if (!(await pick())) return
                    }
                    set('avatar', 'photo')
                  }}
                  className="relative grid h-[32px] w-[32px] place-items-center rounded-full"
                >
                  {settings.avatar === 'photo' && <motion.span layoutId="avatar-choice" transition={spring} className="absolute inset-0 rounded-full bg-white/[0.14]" />}
                  {photo ? (
                    <img src={photo} alt="" className="relative h-[22px] w-[22px] rounded-full object-cover" />
                  ) : (
                    <ImagePlus size={15} strokeWidth={1.8} className="relative text-white/70" />
                  )}
                </button>
              </div>
            }
          />
          <Row title="Mode" detail="What the companion does on the glance">
            <Segmented id="mode" options={COMPANION_MODES} value={settings.companionMode} onChange={(v) => set('companionMode', v)} />
          </Row>
          <Row title="Sleeps" detail="When it dozes off">
            <Segmented id="sleeps" options={COMPANION_SLEEPS} value={settings.companionSleeps ?? 'time'} onChange={(v) => set('companionSleeps', v)} />
          </Row>
        </Group>
      </>
    ),
    closed: (
      <>
        <Group note="The left side shows music, a running focus timer, or the time. Privacy dots appear when the mic or camera is in use.">
          <Row title="Right side" detail="What the small bar shows on its right">
            <Segmented
              id="right"
              options={[
                { id: 'time', label: 'Time' },
                { id: 'ai', label: 'AI usage' },
              ] as const}
              value={settings.collapsedRight ?? 'time'}
              onChange={(v) => set('collapsedRight', v)}
            />
          </Row>
          <Row title="Catch screenshots" detail="Open the notch on a screenshot you just took">
            <Switch label="Catch screenshots" on={settings.catchScreenshots ?? true} onChange={(v) => set('catchScreenshots', v)} />
          </Row>
        </Group>
      </>
    ),
    apps: (
      <>
        <Group>
          <Row title="Apps bar" detail="Four in view under the notch, two beside it; scroll for more">
            <Segmented
              id="apps"
              options={[
                { id: 'most', label: 'Most used' },
                { id: 'favorites', label: 'Favourites' },
                { id: 'off', label: 'Off' },
              ] as const}
              value={settings.deskApps ?? 'most'}
              onChange={(v) => set('deskApps', v)}
            />
          </Row>
          {(settings.deskApps ?? 'most') !== 'off' && (
            <Row title="Position" detail="Never the same side as the tabs dock; Auto picks a free one">
              <Segmented
                id="apps-side"
                options={[
                  { id: 'auto', label: 'Auto' },
                  { id: 'left', label: 'Left' },
                  { id: 'bottom', label: 'Bottom' },
                  { id: 'right', label: 'Right' },
                ] as const}
                // A side the dock has (older settings) is really auto: show that.
                value={(settings.appsSide ?? 'auto') === (settings.dockSide ?? 'bottom') ? 'auto' : (settings.appsSide ?? 'auto')}
                onChange={(v) => set('appsSide', v)}
                // One side, one thing: the tabs dock's side is taken.
                disabled={[settings.dockSide ?? 'bottom']}
                disabledTitle="The tabs dock is here"
              />
            </Row>
          )}
          {(settings.deskApps ?? 'most') !== 'off' && (
            <Row
              title="Show it on"
              detail="The views that get the bar"
              below={
                <Chips
                  options={VIEWS.map((v) => ({ id: v.id, label: v.label }))}
                  value={settings.appsOn ?? ['files']}
                  onToggle={(id) => {
                    const list = settings.appsOn ?? ['files']
                    const next = list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
                    if (next.length) set('appsOn', next)
                  }}
                />
              }
            />
          )}
        </Group>
        {(settings.deskApps ?? 'most') === 'favorites' && (
          <p className="px-3 text-[10px] leading-snug text-white/35">Add favourites with the + on the bar itself; hover one to remove it.</p>
        )}
      </>
    ),
    tabs: (
      <>
        <Group note="Settings and the lock always stay on the dock. With every view off, the notch opens on Glance.">
          {VIEWS.map((v) => (
            <Row key={v.id} title={v.label} detail={v.id === 'glance' ? 'Your cards' : v.id === 'desk' ? 'Focus timer and all tasks' : 'Files you parked'}>
              <Switch
                label={`${v.label} tab`}
                on={!hiddenViews.includes(v.id)}
                onChange={(on) => set('hiddenViews', on ? hiddenViews.filter((x) => x !== v.id) : [...hiddenViews, v.id])}
              />
            </Row>
          ))}
        </Group>
        <Group>
          <Row title="Dock position" detail="Where the tabs sit around the notch">
            <Segmented
              id="dock"
              options={[
                { id: 'left', label: 'Left' },
                { id: 'bottom', label: 'Bottom' },
                { id: 'right', label: 'Right' },
              ] as const}
              value={settings.dockSide ?? 'bottom'}
              onChange={(v) => set('dockSide', v)}
              // One side, one thing: a side the apps bar was put on is taken.
              disabled={(settings.appsSide ?? 'auto') !== 'auto' && (settings.deskApps ?? 'most') !== 'off' ? [settings.appsSide] : []}
              disabledTitle="The apps bar is here"
            />
          </Row>
        </Group>
      </>
    ),
    look: (
      <>
        <Group>
          <Row
            title="Style"
            detail={
              settings.notchStyle === 'glass'
                ? 'A live blur of what is behind it. The notch is hidden from screenshots and screen sharing while on'
                : settings.notchStyle === 'mica'
                  ? 'Your wallpaper, blurred, like Windows 11'
                  : 'A soft charcoal, like the Dynamic Island'
            }
          >
            <Segmented
              id="style"
              options={[
                { id: 'black', label: 'Default' },
                { id: 'mica', label: 'Mica' },
                { id: 'glass', label: 'Glass' },
              ] as const}
              value={settings.notchStyle}
              onChange={(v) => set('notchStyle', v)}
            />
          </Row>
          <Row title="Ambient glow" detail="A soft light while music plays">
            <Switch label="Ambient glow" on={settings.ambientVideo} onChange={(v) => set('ambientVideo', v)} />
          </Row>
          <Row title="Album tint" detail="Colour the notch from the artwork">
            <Switch label="Album tint" on={settings.albumTint} onChange={(v) => set('albumTint', v)} />
          </Row>
        </Group>
      </>
    ),
    general: (
      <>
        <Group>
          <Row title="Start with Windows" detail="Coming soon">
            <Switch label="Start with Windows" on={false} disabled onChange={() => {}} />
          </Row>
        </Group>
      </>
    ),
  }

  return (
    <div className="flex h-full gap-4" onClick={halt}>
      {/* The sections. */}
      <nav className="flex w-[150px] shrink-0 flex-col gap-0.5">
        {SECTIONS.map((s) => {
          const on = s.id === section
          return (
            <button
              key={s.id}
              type="button"
              aria-current={on}
              onClick={(event) => {
                halt(event)
                setSection(s.id)
              }}
              className="relative flex h-[30px] items-center gap-2.5 rounded-[9px] px-2.5 text-left"
            >
              {on && <motion.span layoutId="settings-section" transition={spring} className="absolute inset-0 rounded-[9px] bg-white/[0.1]" />}
              <span className={`relative transition-colors ${on ? 'text-white' : 'text-white/40'}`}>{s.icon}</span>
              <span className={`relative text-[12px] font-medium transition-colors ${on ? 'text-white' : 'text-white/55 hover:text-white/85'}`}>{s.label}</span>
            </button>
          )
        })}
      </nav>

      {/* One section at a time. */}
      <div className="min-w-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <h2 className="mb-2.5 px-1 text-[15px] font-semibold text-white">{SECTIONS.find((s) => s.id === section)?.label}</h2>
            {content[section]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
