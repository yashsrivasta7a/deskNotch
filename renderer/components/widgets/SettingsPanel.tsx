import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BotAvatar, type BotAvatarType } from 'bot-avatars'
import { Bot, ChevronDown, Heart, ImagePlus, LayoutGrid, PanelsTopLeft, Settings as Cog } from 'lucide-react'
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

/** Default, a soft charcoal notch; Glass, a live blur of what is behind. */
export type NotchStyle = 'black' | 'glass'

/** Left, centre or right along the top edge. */
export type NotchAlign = 'left' | 'center' | 'right'

/** A bot, or the user's own photo. */
export type Avatar = BotAvatarType | 'photo'

export interface Settings {
  /** What the glance shows. */
  showMusic: boolean
  showTasks: boolean
  showAvatar: boolean
  showFocus: boolean
  showAiUsage: boolean
  /** The Right now card: apps on the mic or camera, and the battery, while there are any. */
  showStatus: boolean
  ambientVideo: boolean
  startOnBoot: boolean
  notchStyle: NotchStyle
  /** Where the notch sits along the top of the screen. */
  notchAlign?: NotchAlign
  /** Where the dock of views and controls sits around the notch. */
  dockSide: DockSide
  /** Views taken off the dock ('glance', 'desk', 'files'); Settings and the lock always stay. */
  hiddenViews: string[]
  /** What the closed notch shows on its right; 'screen' needs ScreenWise installed. */
  collapsedRight: 'time' | 'ai' | 'screen'
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
  /** The monitor deskNotch appears on: 'primary', 'all', or a display ID string. */
  selectedDisplayId?: string
  /** Hide deskNotch when another app enters fullscreen. */
  hideOnFullscreen?: boolean
  /** Shrink the closed notch to a sliver while a browser is in front, so it
   *  does not cover tabs; hovering opens it as usual. */
  tuckForBrowsers?: boolean
  /** Leave the notch out of screenshots and screen sharing. */
  hideInScreenshots?: boolean
  /** The dock's buttons and icons, for screens where they come out small. */
  dockSize?: DockSize
}

export type DockSize = 'default' | 'large' | 'larger'
export const DOCK_SCALE: Record<DockSize, number> = { default: 1, large: 1.25, larger: 1.5 }

export const DEFAULT_SETTINGS: Settings = {
  showMusic: true,
  showTasks: true,
  showAvatar: true,
  showFocus: false,
  showAiUsage: true,
  showStatus: false,
  ambientVideo: true,
  startOnBoot: true,
  notchStyle: 'black',
  notchAlign: 'center',
  dockSide: 'bottom',
  hiddenViews: [],
  collapsedRight: 'time',
  catchScreenshots: true,
  deskApps: 'most',
  favoriteApps: [],
  appsOn: ['files'],
  appsSide: 'auto',
  avatar: 'ghost',
  companionMode: 'time',
  companionSleeps: 'time',
  focusMinutes: 25,
  hiddenLimits: [],
  selectedDisplayId: 'primary',
  hideOnFullscreen: true,
  tuckForBrowsers: false,
  hideInScreenshots: false,
  dockSize: 'default',
}

/** The bots on offer: a short, varied few rather than all eighteen. */
const BOTS: BotAvatarType[] = ['ghost', 'cat', 'blob', 'clover', 'droid', 'alien', 'cloud']

/** The three views, by the ids the notch uses. */
const VIEWS = [
  { id: 'glance', label: 'Home' },
  { id: 'desk', label: 'Focus & tasks' },
  { id: 'files', label: 'Files' },
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
  <div className="px-3 py-2.5">
    <div className="flex min-h-[22px] items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12.5px] text-white/90">{title}</div>
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

/** The rarely-needed settings, folded away until asked for. */
const More: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          halt(event)
          setOpen((o) => !o)
        }}
        className="flex h-[28px] w-full items-center justify-between rounded-[12px] bg-white/[0.045] px-3 text-[12px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        {label}
        <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

// ── Sections ────────────────────────────────────────────────────────────────

/** The blocks of settings; a sidebar section shows one or more of them. */
type PartId = 'glance' | 'companion' | 'closed' | 'apps' | 'tabs' | 'look' | 'general'
type SectionId = 'notch' | 'companion' | 'layout' | 'general'

/** Four sections, few enough to take in at once. A block marked `more` stays
 *  folded until opened, so the page opens on what most people change. */
const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; parts: { id: PartId; title: string; more?: boolean }[] }[] = [
  { id: 'notch', label: 'Home', icon: <LayoutGrid size={13} strokeWidth={2} />, parts: [{ id: 'glance', title: 'Cards' }, { id: 'closed', title: 'Closed notch' }] },
  { id: 'companion', label: 'Companion', icon: <Bot size={13} strokeWidth={2} />, parts: [{ id: 'companion', title: '' }] },
  { id: 'layout', label: 'Look', icon: <PanelsTopLeft size={13} strokeWidth={2} />, parts: [{ id: 'look', title: '' }, { id: 'tabs', title: 'Tabs', more: true }, { id: 'apps', title: 'Apps bar', more: true }] },
  { id: 'general', label: 'General', icon: <Cog size={13} strokeWidth={2} />, parts: [{ id: 'general', title: '' }] },
]

interface SettingsPanelProps {
  settings: Settings
  onChange: (next: Settings) => void
  /** The AI limits found, to offer them one by one. */
  aiLimits: ProviderLimits[] | null
  /** ScreenWise is installed, so the screen-time reading can be picked. */
  desktimeInstalled: boolean
}

/** The updater's state, as main/updater.ts reports it. */
type UpdateState = {
  status: 'dev' | 'store' | 'idle' | 'checking' | 'none' | 'error' | 'downloading' | 'ready'
  version: string
  next?: string
  percent?: number
}

/** Version, update status, and the one thing to do about it. */
const UpdateRow: React.FC = () => {
  const [update, setUpdate] = useState<UpdateState | null>(null)
  React.useEffect(() => {
    void window.bridge?.invoke<UpdateState>('update:get').then(setUpdate)
    return window.bridge?.on<UpdateState>('update:state', setUpdate)
  }, [])
  if (!update) return null
  const detail = {
    dev: 'Updates run in the installed app',
    store: 'Updates come from the Microsoft Store',
    idle: undefined,
    checking: 'Checking for updates…',
    none: 'Up to date',
    error: "Couldn't check for updates",
    downloading: `Downloading ${update.next ?? ''} · ${update.percent ?? 0}%`,
    // It installs itself once the PC is left alone for a minute; nothing to press.
    ready: `Version ${update.next} installs when you step away`,
  }[update.status]
  const busy = update.status === 'checking' || update.status === 'downloading' || update.status === 'dev'
  return (
    <Row title={`Version ${update.version}`} detail={detail}>
      {update.status !== 'store' && update.status !== 'ready' && (
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            halt(event)
            void window.bridge?.invoke('update:check')
          }}
          className="h-[24px] shrink-0 rounded-full bg-white/[0.08] px-3 text-[11px] font-medium text-white/75 transition-colors hover:bg-white/[0.14] hover:text-white disabled:opacity-35"
        >
          Check for updates
        </button>
      )}
    </Row>
  )
}

/** GitHub's mark (Octicons mark-github), for the link to the repo. */
const GitHubMark: React.FC = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export interface DisplayInfo {
  id: string
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

/**
 * Settings, the way System Settings does it: a short list of sections on the
 * left, one section at a time on the right as grouped rows, and every row
 * saying in plain words what it changes.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, aiLimits, desktimeInstalled }) => {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const { photo, pick } = usePhoto()
  const [section, setSection] = useState<SectionId>('notch')
  const [displays, setDisplays] = React.useState<DisplayInfo[]>([])
  // The Store build starts with Windows through Windows' own Startup page.
  const [store, setStore] = useState(false)
  React.useEffect(() => {
    void window.bridge?.invoke<boolean>('app:is-store').then((s) => setStore(Boolean(s)))
  }, [])

  React.useEffect(() => {
    window.bridge?.invoke<DisplayInfo[]>('display:get-all').then((list) => {
      if (Array.isArray(list)) setDisplays(list)
    })
    const unsub = window.bridge?.on<DisplayInfo[]>('display:changed', (list) => {
      if (Array.isArray(list)) setDisplays(list)
    })
    return () => unsub?.()
  }, [])

  // One per display connected, numbered, the primary starred, then All.
  const displayOptions = [
    ...displays.map((d, i) => ({ id: d.id, label: d.isPrimary ? `${i + 1} (main)` : `${i + 1}` })),
    { id: 'all', label: 'All' },
  ]
  // Unset, or a display since unplugged, means the primary.
  const displayValue = displayOptions.some((o) => o.id === settings.selectedDisplayId)
    ? settings.selectedDisplayId!
    : (displays.find((d) => d.isPrimary)?.id ?? 'all')

  const hidden = settings.hiddenLimits ?? []
  const aiCards = visibleLimits(aiLimits, hidden).length
  const count = cardCount(settings, aiCards)
  /** Whether switching this on still fits the glance. */
  const fits = (key: keyof Settings) => cardCount({ ...settings, [key]: true }, aiCards) <= MAX_CARDS
  const card = (key: 'showMusic' | 'showTasks' | 'showAvatar' | 'showAiUsage' | 'showStatus', label: string) => (
    <Switch label={label} on={settings[key]} disabled={!settings[key] && !fits(key)} onChange={(v) => set(key, v)} />
  )
  const hiddenViews = settings.hiddenViews ?? []
  // Against a screen edge (notch left or right) that side has no room for the dock or apps bar.
  const edge = settings.notchAlign ?? 'center'
  const dockNow = (settings.dockSide ?? 'bottom') === edge ? 'bottom' : (settings.dockSide ?? 'bottom')
  const appsPicked = settings.appsSide ?? 'auto'
  const appsShown = appsPicked === dockNow || appsPicked === edge ? 'auto' : appsPicked

  const content: Record<PartId, React.ReactNode> = {
    glance: (
      <>
        <Group note={count > MAX_CARDS ? `Only ${MAX_CARDS} cards fit. Turn one off.` : undefined}>
          <Row title="Companion">
            {card('showAvatar', 'Companion')}
          </Row>
          <Row title="Now playing">
            {card('showMusic', 'Now playing')}
          </Row>
          <Row title="Tasks">
            {card('showTasks', 'Tasks')}
          </Row>
          <Row title="Status" detail="Mic, camera, battery and PC usage">
            {card('showStatus', 'Status')}
          </Row>
          <Row
            title="AI usage"
            detail="Claude and Codex limits"
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
          <Row title="Mode">
            <Segmented
              id="mode"
              options={COMPANION_MODES}
              value={settings.companionMode === 'screen' && !desktimeInstalled ? 'focus' : settings.companionMode}
              onChange={(v) => set('companionMode', v)}
              disabled={desktimeInstalled ? [] : ['screen']}
              disabledTitle="Needs ScreenWise installed"
            />
          </Row>
          <Row title="Sleep">
            <Segmented id="sleeps" options={COMPANION_SLEEPS} value={settings.companionSleeps ?? 'time'} onChange={(v) => set('companionSleeps', v)} />
          </Row>
        </Group>
      </>
    ),
    closed: (
      <>
        <Group>
          <Row title="Right side">
            <Segmented
              id="right"
              options={[
                { id: 'time', label: 'Time' },
                { id: 'ai', label: 'AI usage' },
                { id: 'screen', label: 'Screen time' },
              ] as const}
              // Picked earlier, then ScreenWise was uninstalled: the clock stands in.
              value={settings.collapsedRight === 'screen' && !desktimeInstalled ? 'time' : (settings.collapsedRight ?? 'time')}
              onChange={(v) => set('collapsedRight', v)}
              disabled={desktimeInstalled ? [] : ['screen']}
              disabledTitle="Needs ScreenWise installed"
            />
          </Row>
          {!desktimeInstalled && (
            <Row title="Screen time" detail="Requires ScreenWise">
              <button
                type="button"
                onClick={(event) => {
                  halt(event)
                  void window.bridge?.invoke('desktime:download')
                }}
                className="h-[22px] shrink-0 rounded-full bg-white px-2.5 text-[10.5px] font-medium text-black"
              >
                Get ScreenWise
              </button>
            </Row>
          )}
          <Row title="Open on screenshot">
            <Switch label="Catch screenshots" on={settings.catchScreenshots ?? true} onChange={(v) => set('catchScreenshots', v)} />
          </Row>
        </Group>
      </>
    ),
    apps: (
      <>
        <Group>
          <Row title="Show">
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
            <Row title="Position">
              <Segmented
                id="apps-side"
                options={[
                  { id: 'auto', label: 'Auto' },
                  { id: 'left', label: 'Left' },
                  { id: 'bottom', label: 'Bottom' },
                  { id: 'right', label: 'Right' },
                ] as const}
                // A side the dock has (older settings) is really auto: show that.
                value={appsShown}
                onChange={(v) => set('appsSide', v)}
                // One side, one thing: the tabs dock's side, or the screen's edge, is taken.
                disabled={[dockNow, edge]}
                disabledTitle="Not available here"
              />
            </Row>
          )}
          {(settings.deskApps ?? 'most') !== 'off' && (
            <Row
              title="Show on"
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
          <p className="px-3 text-[10px] leading-snug text-white/35">Add favourites with + on the apps bar.</p>
        )}
      </>
    ),
    tabs: (
      <>
        <Group>
          {VIEWS.map((v) => (
            <Row key={v.id} title={v.label}>
              <Switch
                label={`${v.label} tab`}
                on={!hiddenViews.includes(v.id)}
                onChange={(on) => set('hiddenViews', on ? hiddenViews.filter((x) => x !== v.id) : [...hiddenViews, v.id])}
              />
            </Row>
          ))}
        </Group>
        <Group>
          <Row title="Size">
            <Segmented
              id="dock-size"
              options={[
                { id: 'default', label: 'Default' },
                { id: 'large', label: 'Large' },
                { id: 'larger', label: 'Larger' },
              ] as const}
              value={settings.dockSize ?? 'default'}
              onChange={(v) => set('dockSize', v)}
            />
          </Row>
          <Row title="Position">
            <Segmented
              id="dock"
              options={[
                { id: 'left', label: 'Left' },
                { id: 'bottom', label: 'Bottom' },
                { id: 'right', label: 'Right' },
              ] as const}
              value={dockNow}
              onChange={(v) => set('dockSide', v)}
              // One side, one thing: a side the apps bar was put on, or the screen's edge, is taken.
              disabled={[...((settings.appsSide ?? 'auto') !== 'auto' && (settings.deskApps ?? 'most') !== 'off' ? [settings.appsSide] : []), edge]}
              disabledTitle="Not available here"
            />
          </Row>
        </Group>
      </>
    ),
    look: (
      <>
        <Group>
          <Row title="Notch position" detail="Where it sits along the top">
            <Segmented
              id="align"
              options={[
                { id: 'left', label: 'Left' },
                { id: 'center', label: 'Center' },
                { id: 'right', label: 'Right' },
              ] as const}
              value={edge}
              onChange={(v) => set('notchAlign', v)}
            />
          </Row>
          <Row title="Style">
            <Segmented
              id="style"
              options={[
                { id: 'black', label: 'Default' },
                { id: 'glass', label: 'Glass' },
              ] as const}
              value={settings.notchStyle}
              onChange={(v) => set('notchStyle', v)}
            />
          </Row>
          <Row title="Music glow">
            <Switch label="Ambient glow" on={settings.ambientVideo} onChange={(v) => set('ambientVideo', v)} />
          </Row>
        </Group>
      </>
    ),
    general: (
      <>
        <Group>
          <UpdateRow />
        </Group>
        <Group>
          {store ? (
            <Row title="Start with Windows" detail="Managed in Windows Settings">
              <button
                type="button"
                onClick={(event) => {
                  halt(event)
                  void window.bridge?.invoke('settings:open-startup')
                }}
                className="h-[24px] shrink-0 rounded-full bg-white/[0.08] px-3 text-[11px] font-medium text-white/75 transition-colors hover:bg-white/[0.14] hover:text-white"
              >
                Open
              </button>
            </Row>
          ) : (
            <Row title="Start with Windows">
              <Switch label="Start with Windows" on={settings.startOnBoot} onChange={(v) => set('startOnBoot', v)} />
            </Row>
          )}
        </Group>
        {displays.length > 1 && (
          <Group>
            <Row title="Display">
              {displays.length <= 3 ? (
                <Segmented
                  id="display"
                  options={displayOptions}
                  value={displayValue}
                  onChange={(v) => set('selectedDisplayId', v)}
                />
              ) : (
                <select
                  value={displayValue}
                  onChange={(e) => set('selectedDisplayId', e.target.value)}
                  className="h-[24px] max-w-[190px] rounded-[7px] bg-white/[0.1] px-2 text-[11px] font-medium text-white outline-none border border-white/10"
                >
                  {displayOptions.map((option) => (
                    <option key={option.id} value={option.id} className="bg-[#141418] text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </Row>
          </Group>
        )}
        <More label="More options">
        <Group>
          <Row title="Hide in fullscreen" detail="Videos, games and F11">
            <Switch label="Hide on Fullscreen" on={settings.hideOnFullscreen ?? true} onChange={(v) => set('hideOnFullscreen', v)} />
          </Row>
          {/* Glass needs the notch out of every capture to see what is behind it,
              so under Glass this is on and cannot be turned off. */}
          <Row
            title="Hide in screenshots"
            detail={settings.notchStyle === 'glass' ? 'Always on with Glass' : 'Also screen recordings and sharing'}
          >
            <Switch
              label="Hide in screenshots"
              on={settings.notchStyle === 'glass' || (settings.hideInScreenshots ?? false)}
              disabled={settings.notchStyle === 'glass'}
              onChange={(v) => set('hideInScreenshots', v)}
            />
          </Row>
          <Row title="Shrink over browsers" detail="Keeps browser tabs visible">
            <Switch label="Tuck behind browsers" on={settings.tuckForBrowsers ?? false} onChange={(v) => set('tuckForBrowsers', v)} />
          </Row>
        </Group>
        </More>
      </>
    ),
  }

  return (
    <div className="flex h-full gap-4" onClick={halt}>
      {/* The sections. */}
      <nav className="flex w-[124px] shrink-0 flex-col gap-0.5">
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
        {/* Sponsoring: not in the Store build, which keeps to the Store's own payment rules. */}
        {!store && (
          <button
            type="button"
            onClick={(event) => {
              halt(event)
              void window.bridge?.invoke('app:open-support')
            }}
            className="mt-auto flex h-[28px] items-center gap-2 rounded-[9px] px-2.5 text-[12px] font-medium text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Heart size={12} strokeWidth={2.2} />
            Support
          </button>
        )}
        {/* The project's GitHub, at the foot of the sidebar whatever the section. */}
        <button
          type="button"
          onClick={(event) => {
            halt(event)
            void window.bridge?.invoke('app:open-repo')
          }}
          className={`${store ? 'mt-auto ' : ''}flex h-[28px] items-center gap-2 rounded-[9px] px-2.5 text-[12px] font-medium text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white`}
        >
          <GitHubMark />
          GitHub
        </button>
      </nav>

      {/* One section at a time. */}
      <div className="min-w-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <h2 className="mb-2.5 px-1 text-[15px] font-semibold text-white">{SECTIONS.find((s) => s.id === section)?.label}</h2>
            {SECTIONS.find((s) => s.id === section)?.parts.map((part) => (
              <React.Fragment key={part.id}>
                {part.more ? (
                  <More label={part.title}>{content[part.id]}</More>
                ) : (
                  <>
                    {part.title && <h3 className="mb-1.5 mt-1 px-1 text-[11.5px] font-medium text-white/45">{part.title}</h3>}
                    {content[part.id]}
                  </>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
