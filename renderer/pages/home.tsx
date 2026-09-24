import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { AnimatePresence, motion } from 'motion/react'
import { Settings2 } from 'lucide-react'
import { NotchChassis, BAR_OPEN } from '../components/notch/NotchChassis'
import { AmbientVideo } from '../components/notch/AmbientVideo'
import { CollapsedStatus } from '../components/notch/CollapsedStatus'
import { ViewSwitcher, BarButton, type ViewDefinition } from '../components/notch/ViewSwitcher'
import { SettingsPanel, DEFAULT_SETTINGS, SETTINGS_PANE, type Settings } from '../components/widgets/SettingsPanel'
import { DeskView, DESK_WIDTH, DESK_HEIGHT } from '../components/widgets/DeskView'
import { useFocusLog } from '../hooks/useFocusLog'
import { useApps } from '../hooks/useApps'
import { botAvatarPalette } from 'bot-avatars'
import { CompanionTile, COMPANION_WIDTH, COMPANION_OPEN_WIDTH, type CompanionSays } from '../components/widgets/CompanionTile'
import { MediaTile, TimeTile, TaskTile, MEDIA_WIDTH, TIME_WIDTH, TASK_WIDTH } from '../components/widgets/GlanceTiles'
import { FocusTile, FOCUS_WIDTH } from '../components/widgets/FocusTile'
import { AiOrbs, providerWidth, visibleLimits } from '../components/widgets/AiOrbs'
import { AloneContext, TILE, TILE_GAP } from '../components/ui/tile'
import { MAX_CARDS } from '../lib/glance'
import { usePhoto } from '../hooks/usePhoto'
import { useNowPlaying } from '../hooks/useNowPlaying'
import { useDominantColor } from '../hooks/useDominantColor'
import { useWallpaperColor } from '../hooks/useWallpaperColor'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'
import { useAiLimits } from '../hooks/useAiLimits'

/** The places to go. Settings is a control, not a place, so it lives on the
 *  right of the bar with the lock. */
const VIEWS: ViewDefinition[] = [
  { id: 'glance', label: 'Glance' },
  { id: 'desk', label: 'Desk' },
]

/** Each view sets the shell it needs; the notch springs between them. */
const SIZES: Record<string, { width: number; height: number }> = {
  desk: { width: DESK_WIDTH, height: DESK_HEIGHT },
  settings: { width: 20 + 240 + 40 + 300 + 20, height: 40 + 14 + SETTINGS_PANE + 22 },
}

/** The notch's side padding around the card row. */
const PADDING = 20
/** The bar, a clear step, the cards, and room below them. */
const GLANCE_HEIGHT = BAR_OPEN + 14 + TILE + 22

export default function HomePage() {
  const nowPlaying = useNowPlaying()
  const albumTint = useDominantColor(nowPlaying?.thumbnailUrl)
  const wallpaperColor = useWallpaperColor()
  const timer = useTimer()
  const tasks = useTasks()
  const focusLog = useFocusLog(timer)
  const [view, setView] = useState('glance')
  // The dock lists open apps only while the desk is up: a PowerShell run each poll.
  const apps = useApps(view === 'desk')
  const [hubOpen, setHubOpen] = useState(false)
  const { photo } = usePhoto()

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)
  // With nothing chosen, the AI readings stand in rather than an empty notch —
  // so they are fetched then too. Otherwise nothing is asked of Anthropic or
  // OpenAI while the readings are switched off.
  // Settings also needs them, to count the cards a switch would add.
  const nothingChosen = !settings.showAvatar && !settings.showMusic && !settings.showTasks && !settings.showFocus
  // The companion also needs them when it has been asked to talk about AI.
  const companionWantsAi = settings.showAvatar && (settings.companionSays ?? []).includes('ai')
  const aiLimits = useAiLimits(settings.showAiUsage || nothingChosen || view === 'settings' || view === 'desk' || companionWantsAi)

  useEffect(() => {
    window.bridge
      ?.invoke<Partial<Settings>>('store:get', 'settings')
      .then((stored) =>
        setSettings({
          ...DEFAULT_SETTINGS,
          ...stored,
          // Older settings kept one word here ('auto', 'time'); now it is a set.
          companionSays: Array.isArray(stored.companionSays)
            ? stored.companionSays
            : stored.companionSays && (stored.companionSays as string) !== 'auto'
              ? [stored.companionSays as CompanionSays]
              : [],
        }),
      )
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => {
        settingsLoaded.current = true
      })
  }, [])

  useEffect(() => {
    if (!settingsLoaded.current) return
    void window.bridge?.invoke('store:set', 'settings', settings)
    void window.bridge?.invoke('settings:start-on-boot', settings.startOnBoot)
  }, [settings])

  const isPlayingAudio = Boolean(nowPlaying?.isPlaying)
  const tint =
    isPlayingAudio && settings.albumTint
      ? albumTint
      : settings.notchStyle === 'glass'
        ? wallpaperColor
        : '255, 255, 255'
  // The readings keep to the notch's own look — album art never recolours them.
  const orbTint = settings.notchStyle === 'glass' ? wallpaperColor : '255, 255, 255'

  const shownLimits = settings.showAiUsage || nothingChosen ? visibleLimits(aiLimits, settings.hiddenLimits) : []
  // What the companion may speak about: the chosen windows, whether or not their cards are on.
  const companionLimits = visibleLimits(aiLimits, settings.hiddenLimits)
  /** The companion's colour, which the desk borrows so both views agree. */
  const accent = settings.avatar === 'photo' ? '#ffffff' : botAvatarPalette[settings.avatar]
  const showCompanion = settings.showAvatar && (settings.avatar !== 'photo' || Boolean(photo))
  const media = settings.showMusic && nowPlaying?.title ? nowPlaying : null
  // Focus takes the task into its own card, so the task card only stands
  // alone without it. The time card is the last resort: only when there is
  // nothing else at all, not even an AI reading.
  const showTaskCard = settings.showTasks && !settings.showFocus
  const showTime = !showCompanion && !media && !showTaskCard && !settings.showFocus && shownLimits.length === 0

  // Every card, in order, with its width — the notch is exactly as wide as
  // they need. Past MAX_CARDS the AI cards, which come last, are the ones left off.
  const fixed = [
    showCompanion && (hubOpen ? COMPANION_OPEN_WIDTH : COMPANION_WIDTH),
    media && MEDIA_WIDTH,
    showTime && TIME_WIDTH,
    showTaskCard && TASK_WIDTH,
    settings.showFocus && FOCUS_WIDTH,
  ].filter((w): w is number => typeof w === 'number')
  const aiShown = shownLimits.slice(0, Math.max(0, MAX_CARDS - fixed.length))
  const widths = [...fixed, ...aiShown.map(providerWidth)]
  const glanceWidth = PADDING * 2 + widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * TILE_GAP

  const size = view === 'glance' ? { width: Math.max(320, glanceWidth), height: GLANCE_HEIGHT } : SIZES[view]

  return (
    <React.Fragment>
      <Head>
        <title>deskNotch</title>
      </Head>
      <div className="w-full h-full flex justify-center items-start pointer-events-none">
        <div className="pointer-events-auto">
          <NotchChassis
            notchStyle={settings.notchStyle}
            bgTint={wallpaperColor}
            ambient={(isOpen) => (
              // Only behind the glance, and only when the music it belongs to is shown.
              <AmbientVideo
                active={settings.ambientVideo && settings.showMusic && isOpen && isPlayingAudio && view === 'glance'}
              />
            )}
            expandedWidth={size.width}
            expandedHeight={size.height}
            leading={<ViewSwitcher views={VIEWS} active={view} onChange={setView} />}
            trailing={
              <BarButton
                label="Settings"
                active={view === 'settings'}
                onClick={() => setView((current) => (current === 'settings' ? 'glance' : 'settings'))}
              >
                <Settings2 size={12} strokeWidth={2} />
              </BarButton>
            }
            expandedContent={
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="h-full"
                >
                  {view === 'glance' ? (
                    <AloneContext.Provider value={widths.length === 1}>
                    <div className={`relative flex h-full items-start ${widths.length === 1 ? 'justify-center' : ''}`} style={{ gap: TILE_GAP }}>
                      {/* Light bleeding from behind the notch, in the current
                          tint. Keeps the surface from reading as a flat black
                          rectangle without adding a single border. */}
                      <motion.div
                        aria-hidden
                        className="pointer-events-none absolute -inset-x-6 -top-12 h-28 -z-10 blur-2xl"
                        animate={{
                          background: `radial-gradient(50% 100% at 18% 0%, rgba(${tint}, 0.2), transparent 72%)`,
                        }}
                        transition={{ duration: 0.9 }}
                      />

                      {showCompanion && (
                        <CompanionTile
                          avatar={settings.avatar}
                          photo={photo}
                          tasks={tasks}
                          timer={timer}
                          limits={companionLimits}
                          track={nowPlaying?.title ?? null}
                          playing={isPlayingAudio}
                          says={settings.companionSays}
                          sleeps={settings.companionSleeps ?? 'time'}
                          minutes={settings.focusMinutes ?? 25}
                          onMinutes={(m) => setSettings((s) => ({ ...s, focusMinutes: m }))}
                          open={hubOpen}
                          onToggle={() => setHubOpen((o) => !o)}
                        />
                      )}
                      {media && <MediaTile media={media} tint={albumTint} />}
                      {showTime && <TimeTile />}
                      {showTaskCard && <TaskTile tasks={tasks} />}
                      {settings.showFocus && (
                        <FocusTile timer={timer} tasks={settings.showTasks ? tasks : undefined} minutes={settings.focusMinutes ?? 25} />
                      )}
                      <AiOrbs providers={aiShown} tint={orbTint} />
                    </div>
                    </AloneContext.Provider>
                  ) : view === 'settings' ? (
                    <SettingsPanel settings={settings} onChange={setSettings} aiLimits={aiLimits} />
                  ) : (
                    <DeskView
                      avatar={settings.avatar}
                      photo={photo}
                      tasks={tasks}
                      timer={timer}
                      minutes={settings.focusMinutes ?? 25}
                      onMinutes={(m) => setSettings((s) => ({ ...s, focusMinutes: m }))}
                      accent={accent}
                      limits={aiLimits}
                      log={focusLog}
                      apps={apps}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            }
          >
            {(isOpen) =>
              !isOpen && (
                <CollapsedStatus
                  nowPlaying={nowPlaying}
                  tasks={tasks}
                  timer={timer}
                  avatar={showCompanion ? settings.avatar : null}
                  photo={photo}
                />
              )
            }
          </NotchChassis>
        </div>
      </div>
    </React.Fragment>
  )
}
