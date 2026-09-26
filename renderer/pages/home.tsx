import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { AnimatePresence, motion } from 'motion/react'
import { Inbox, LampDesk, LayoutGrid, Settings2 } from 'lucide-react'
import { NotchChassis, CHROME_X, CHROME_Y, PAD } from '../components/notch/NotchChassis'
import { AmbientVideo } from '../components/notch/AmbientVideo'
import { CollapsedStatus, type Moment } from '../components/notch/CollapsedStatus'
import { ViewRail, RailButton, type ViewDefinition } from '../components/notch/ViewSwitcher'
import { SettingsPanel, DEFAULT_SETTINGS, SETTINGS_PANE, type Settings } from '../components/widgets/SettingsPanel'
import { DeskView, DESK_WIDTH, DESK_HEIGHT } from '../components/widgets/DeskView'
import { AppsRow } from '../components/widgets/AppsRow'
import { useFocusLog } from '../hooks/useFocusLog'
import { FileStrip, SHELF_HEIGHT, shelfWidth } from '../components/widgets/FileStrip'
import { CaptureView, CAPTURE_HEIGHT, CAPTURE_WIDTH } from '../components/widgets/CaptureView'
import { DoneView, DONE_HEIGHT, DONE_WIDTH } from '../components/widgets/DoneView'
import type { FileItem } from '../hooks/useFiles'
import { botAvatarPalette } from 'bot-avatars'
import { CompanionTile, COMPANION_WIDTH, COMPANION_OPEN_WIDTH, COMPANION_TIME_WIDTH, type CompanionMode } from '../components/widgets/CompanionTile'
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
import { usePrivacy } from '../hooks/usePrivacy'
import { useHeadphones } from '../hooks/useHeadphones'

/** The places to go, as circles on the dock. Settings is a control, not a
 *  place, so it sits after them with the lock. */
const VIEWS: ViewDefinition[] = [
  { id: 'glance', label: 'Glance', icon: <LayoutGrid size={12} strokeWidth={2.2} /> },
  { id: 'desk', label: 'Desk', icon: <LampDesk size={12} strokeWidth={2.2} /> },
  { id: 'files', label: 'Shelf', icon: <Inbox size={12} strokeWidth={2.2} /> },
]

/** Each view sets the shell it needs; the notch springs between them. */
const SIZES: Record<string, { width: number; height: number }> = {
  desk: { width: DESK_WIDTH, height: DESK_HEIGHT },
  settings: { width: CHROME_X + 620, height: CHROME_Y + SETTINGS_PANE },
}

/** The notch's side padding around the card row. */
const PADDING = PAD
/** The bar, a clear step, the cards, and room below them. */
const GLANCE_HEIGHT = CHROME_Y + TILE

export default function HomePage() {
  const nowPlaying = useNowPlaying()
  const albumTint = useDominantColor(nowPlaying?.thumbnailUrl)
  const wallpaperColor = useWallpaperColor()
  const timer = useTimer()
  const tasks = useTasks()
  const focusLog = useFocusLog(timer)
  const [view, setView] = useState('glance')
  // A file dragged over the notch from outside: open Files, where the shelf is
  // waiting to take it.
  const [dragging, setDragging] = useState(false)
  // The shelf's size follows what is on it: a slim well, widening per file.
  const [shelfCount, setShelfCount] = useState(0)
  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth += 1
      setDragging(true)
      setView('files')
    }
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const end = () => {
      depth = 0
      setDragging(false)
    }
    // A drop anywhere on the notch lands on the shelf, not only on its well
    // (which handles its own drops and marks them handled). If the shelf is
    // not on screen yet (the notch was still opening), the paths are saved
    // straight to its list and it shows them when it appears.
    const drop = (event: DragEvent) => {
      end()
      if (event.defaultPrevented || !hasFiles(event)) return
      event.preventDefault()
      const paths = Array.from(event.dataTransfer?.files ?? [])
        .map((file) => window.bridge?.pathOf(file) ?? '')
        .filter(Boolean)
      if (!paths.length) return
      setView('files')
      const taken = !window.dispatchEvent(new CustomEvent('shelf:add', { detail: paths, cancelable: true }))
      if (!taken)
        void window.bridge
          ?.invoke<string[]>('store:get', 'shelf')
          .then((list) => window.bridge?.invoke('store:set', 'shelf', [...(list ?? []).filter((p) => !paths.includes(p)), ...paths]))
    }
    // Anything dropped outside a drop target must not navigate the window.
    const over = (event: DragEvent) => hasFiles(event) && event.preventDefault()
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    window.addEventListener('dragend', end)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
      window.removeEventListener('dragend', end)
    }
  }, [])
  const [hubOpen, setHubOpen] = useState(false)

  // Moments: something happens while the notch is closed (a screenshot, a
  // focus session ending), so it opens on it by itself for a few seconds,
  // then folds away (hovering keeps it) and the view before it comes back.
  const [capture, setCapture] = useState<FileItem | null>(null)
  const [holdOpen, setHoldOpen] = useState(false)
  const [closeKey, setCloseKey] = useState(0)
  const notchOpen = useRef(false)
  const catchScreenshots = useRef(true)
  /** The view to return to once a moment folds away; null when not peeking. */
  const beforePeek = useRef<string | null>(null)
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const peek = (target: string, ms: number) => {
    setView((current) => {
      if (beforePeek.current === null) beforePeek.current = current
      return target
    })
    setHoldOpen(true)
    clearTimeout(release.current)
    release.current = setTimeout(() => setHoldOpen(false), ms)
  }
  useEffect(() => () => clearTimeout(release.current), [])

  useEffect(
    () =>
      window.bridge?.on<string>('screenshot:new', async (file) => {
        // Switched off, or open and in use: do not pull the notch out from under the user.
        if (!catchScreenshots.current || notchOpen.current) return
        const [item] = (await window.bridge?.invoke<FileItem[]>('files:describe', [file])) ?? []
        if (!item) return
        setCapture(item)
        peek('capture', 4500)
      }),
    [],
  )
  const openChanged = (open: boolean) => {
    notchOpen.current = open
    // Folded away: the moment is over; the notch is itself again next time.
    if (!open) {
      if (beforePeek.current !== null) setView(beforePeek.current)
      beforePeek.current = null
      setCapture(null)
    }
  }

  const { photo } = usePhoto()
  const privacy = usePrivacy()
  const headphones = useHeadphones()

  // "Just connected" moments on the closed bar: headphones, a Wi-Fi network,
  // a Bluetooth device. Each shows for a beat. What is already connected when
  // the app starts is not news, so changes count only after a short warm-up.
  const [moment, setMoment] = useState<Moment | null>(null)
  const momentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastHeadphones = useRef(0)
  const warm = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => (warm.current = true), 12000)
    return () => {
      clearTimeout(t)
      clearTimeout(momentTimer.current)
    }
  }, [])
  const show = (next: Moment) => {
    setMoment(next)
    clearTimeout(momentTimer.current)
    momentTimer.current = setTimeout(() => setMoment(null), 1600)
  }
  useEffect(() => {
    if (!headphones) return
    lastHeadphones.current = Date.now()
    show({ kind: 'headphones', name: headphones })
  }, [headphones])
  const wifiName = privacy.wifi?.name ?? null
  const lastWifi = useRef<string | null>(null)
  useEffect(() => {
    if (warm.current && wifiName && wifiName !== lastWifi.current) show({ kind: 'wifi', name: wifiName })
    lastWifi.current = wifiName
  }, [wifiName])
  const btKey = privacy.bluetooth.join(';')
  const lastBt = useRef<string[]>([])
  useEffect(() => {
    const arrived = privacy.bluetooth.find((name) => !lastBt.current.includes(name))
    // Headphones already had their moment a moment ago: one is enough.
    if (warm.current && arrived && Date.now() - lastHeadphones.current > 30000) show({ kind: 'bluetooth', name: arrived })
    lastBt.current = privacy.bluetooth
  }, [btKey])

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)
  // With nothing chosen, the AI readings stand in rather than an empty notch —
  // so they are fetched then too. Otherwise nothing is asked of Anthropic or
  // OpenAI while the readings are switched off.
  // Settings also needs them, to count the cards a switch would add.
  const nothingChosen = !settings.showAvatar && !settings.showMusic && !settings.showTasks && !settings.showFocus
  // The companion also needs them when it has been asked to talk about AI.
  const companionWantsAi = settings.showAvatar && settings.companionMode === 'ai'
  const collapsedWantsAi = settings.collapsedRight === 'ai'
  const aiLimits = useAiLimits(settings.showAiUsage || nothingChosen || view === 'settings' || view === 'desk' || companionWantsAi || collapsedWantsAi)

  useEffect(() => {
    window.bridge
      ?.invoke<Partial<Settings>>('store:get', 'settings')
      .then((stored) =>
        setSettings({
          ...DEFAULT_SETTINGS,
          ...stored,
          // Translucent became Glass, now a real blur.
          notchStyle: (stored.notchStyle as string) === 'translucent' ? 'glass' : (stored.notchStyle ?? DEFAULT_SETTINGS.notchStyle),
          // Focus lives in the companion now; the glance card is retired.
          showFocus: false,
          // Older settings kept a list of topics under another name; the first
          // one becomes the mode.
          companionMode:
            stored.companionMode ??
            ((Array.isArray((stored as any).companionSays) && (stored as any).companionSays[0]) as CompanionMode | undefined) ??
            DEFAULT_SETTINGS.companionMode,
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
    // Start with Windows is switched off for now (Settings shows it as coming soon).
    void window.bridge?.invoke('settings:start-on-boot', false)
  }, [settings])

  catchScreenshots.current = settings.catchScreenshots ?? true

  // Tabs taken off the dock. On a hidden one, move to the first still shown;
  // with none shown, the notch simply opens on the glance.
  const shownViews = VIEWS.filter((v) => !(settings.hiddenViews ?? []).includes(v.id))
  useEffect(() => {
    if (VIEWS.some((v) => v.id === view) && !shownViews.some((v) => v.id === view)) setView(shownViews[0]?.id ?? 'glance')
  }, [settings.hiddenViews, view])

  // The apps bar's place: on the right when the tabs dock is under the notch
  // (so the two do not stack), otherwise under the notch; or wherever chosen.
  // They never share a side: a chosen side the dock already has (older settings) falls back to auto.
  const chosenApps = settings.appsSide ?? 'auto'
  const dockSideNow = settings.dockSide ?? 'bottom'
  const appsSide = chosenApps === 'auto' || chosenApps === dockSideNow ? (dockSideNow === 'bottom' ? 'right' : 'bottom') : chosenApps

  const isPlayingAudio = Boolean(nowPlaying?.isPlaying)
  // The style only changes the background: the glow follows the album (when
  // that setting is on) and the readings stay white, whatever the material.
  const tint = isPlayingAudio && settings.albumTint ? albumTint : '255, 255, 255'
  const orbTint = '255, 255, 255'

  const shownLimits = settings.showAiUsage || nothingChosen ? visibleLimits(aiLimits, settings.hiddenLimits) : []
  // What the companion may speak about: the chosen windows, whether or not their cards are on.
  const companionLimits = visibleLimits(aiLimits, settings.hiddenLimits)
  /** The companion's colour, which the desk borrows so both views agree. */
  const accent = settings.avatar === 'photo' ? '#ffffff' : botAvatarPalette[settings.avatar]
  const showCompanion = settings.showAvatar && (settings.avatar !== 'photo' || Boolean(photo))

  // A focus session just ended: the notch opens on the Done card alone for a
  // few seconds, wherever the timer was started. Already open on a view that
  // shows the timer (the glance's focus companion, the desk), it says Done there.
  const wasFinished = useRef(timer.finished)
  useEffect(() => {
    const showsTimer = view === 'desk' || (view === 'glance' && showCompanion && settings.companionMode === 'focus')
    if (timer.finished && !wasFinished.current && !(notchOpen.current && showsTimer)) peek('done', 6000)
    wasFinished.current = timer.finished
  }, [timer.finished])
  const media = settings.showMusic && nowPlaying?.title ? nowPlaying : null
  // Focus takes the task into its own card, so the task card only stands
  // alone without it. The time card is the last resort: only when there is
  // nothing else at all, not even an AI reading.
  const showTaskCard = settings.showTasks && !settings.showFocus
  const showTime = !showCompanion && !media && !showTaskCard && !settings.showFocus && shownLimits.length === 0

  // Every card, in order, with its width — the notch is exactly as wide as
  // they need. Past MAX_CARDS the AI cards, which come last, are the ones left off.
  const fixed = [
    // Wide while tasks mode shows its whole list, or focus its lengths (idle only).
    showCompanion &&
      ((hubOpen && settings.companionMode === 'tasks') ||
      (hubOpen && settings.companionMode === 'focus' && !timer.isRunning && !(timer.remainingMs > 0 && !timer.finished))
        ? COMPANION_OPEN_WIDTH
        : hubOpen && settings.companionMode === 'time'
          ? COMPANION_TIME_WIDTH
          : COMPANION_WIDTH),
    media && MEDIA_WIDTH,
    showTime && TIME_WIDTH,
    showTaskCard && TASK_WIDTH,
    settings.showFocus && FOCUS_WIDTH,
  ].filter((w): w is number => typeof w === 'number')
  const aiShown = shownLimits.slice(0, Math.max(0, MAX_CARDS - fixed.length))
  const widths = [...fixed, ...aiShown.map(providerWidth)]
  const glanceWidth = PADDING * 2 + widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * TILE_GAP

  const size =
    view === 'glance'
      ? { width: Math.max(320, glanceWidth), height: GLANCE_HEIGHT }
      : view === 'files'
        ? { width: shelfWidth(shelfCount), height: CHROME_Y + SHELF_HEIGHT }
        : view === 'desk'
          ? { width: DESK_WIDTH, height: DESK_HEIGHT }
        : view === 'capture'
          ? { width: CAPTURE_WIDTH, height: CHROME_Y + CAPTURE_HEIGHT }
          : view === 'done'
            ? { width: DONE_WIDTH, height: CHROME_Y + DONE_HEIGHT }
          : SIZES[view]

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
               accent={accent} />
            )}
            expandedWidth={size.width}
            expandedHeight={size.height}
            dockSide={settings.dockSide ?? 'bottom'}
            keepOpen={holdOpen}
            belowSide={appsSide}
            below={
              (settings.deskApps ?? 'most') !== 'off' && (settings.appsOn ?? ['files']).includes(view) ? (
                <AppsRow
                  side={appsSide}
                  mode={settings.deskApps ?? 'most'}
                  favorites={settings.favoriteApps ?? []}
                  onFavorites={(ids) => setSettings((s) => ({ ...s, favoriteApps: ids }))}
                />
              ) : undefined
            }
            onOpenChange={openChanged}
            closeKey={closeKey}
            rail={view === 'capture' || view === 'done' ? undefined : 
              <>
                <ViewRail views={shownViews} active={view} onChange={setView} />
                <RailButton
                  label="Settings"
                  active={view === 'settings'}
                  layoutId="rail-settings"
                  onClick={() => setView((current) => (current === 'settings' ? 'glance' : 'settings'))}
                >
                  <Settings2 size={12} strokeWidth={2.2} />
                </RailButton>
              </>
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
                          mode={settings.companionMode}
                          sleeps={settings.companionSleeps ?? 'time'}
                          minutes={settings.focusMinutes ?? 25}
                          onMinutes={(m) => setSettings((s) => ({ ...s, focusMinutes: m }))}
                          open={hubOpen}
                          onToggle={() => setHubOpen((o) => !o)}
                        />
                      )}
                      {media && <MediaTile media={media} tint={albumTint} />}
                      {showTime && <TimeTile />}
                      {showTaskCard && <TaskTile tasks={tasks} accent={accent} />}
                      {settings.showFocus && (
                        <FocusTile timer={timer} tasks={settings.showTasks ? tasks : undefined} minutes={settings.focusMinutes ?? 25} />
                      )}
                      <AiOrbs providers={aiShown} tint={orbTint} />
                    </div>
                    </AloneContext.Provider>
                  ) : view === 'done' ? (
                    <DoneView
                      timer={timer}
                      minutes={settings.focusMinutes ?? 25}
                      avatar={settings.avatar}
                      photo={photo}
                      accent={accent}
                      onDone={() => {
                        setHoldOpen(false)
                        setCloseKey((k) => k + 1)
                      }}
                    />
                  ) : view === 'capture' && capture ? (
                    <CaptureView
                      item={capture}
                      accent={accent}
                      onDone={() => {
                        setHoldOpen(false)
                        setCloseKey((k) => k + 1)
                      }}
                    />
                  ) : view === 'files' ? (
                    <FileStrip accent={accent} dragging={dragging} onCount={setShelfCount} />
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
                      limits={companionLimits}
                      log={focusLog}
                      track={nowPlaying?.title ?? null}
                      playing={isPlayingAudio}
                      sleeps={settings.companionSleeps ?? 'time'}
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
                  right={settings.collapsedRight ?? 'time'}
                  limits={companionLimits}
                  privacy={privacy}
                  moment={moment}
                />
              )
            }
          </NotchChassis>
        </div>
      </div>
    </React.Fragment>
  )
}
