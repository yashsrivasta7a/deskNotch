import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { AnimatePresence, motion } from 'motion/react'
import { NotchChassis } from '../components/notch/NotchChassis'
import { AmbientVideo } from '../components/notch/AmbientVideo'
import { CollapsedStatus } from '../components/notch/CollapsedStatus'
import { ViewSwitcher, type ViewDefinition } from '../components/notch/ViewSwitcher'
import { SettingsButton } from '../components/notch/SettingsButton'
import { SettingsPanel, DEFAULT_SETTINGS, type Settings } from '../components/widgets/SettingsPanel'
import { NowPlayingPanel } from '../components/widgets/NowPlayingPanel'
import { CalendarStrip } from '../components/widgets/CalendarStrip'
import { PhotoWidget } from '../components/widgets/PhotoWidget'
import { TaskGlance } from '../components/widgets/TaskGlance'
import { TodoCard } from '../components/widgets/TodoCard'
import { TimerCard } from '../components/widgets/TimerCard'
// Battery, parked. The component stays; it is simply not earning its place in
// the bar yet.
// import { StatusRail } from '../components/widgets/StatusRail'
import { useNowPlaying } from '../hooks/useNowPlaying'
import { useDominantColor } from '../hooks/useDominantColor'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'

const VIEWS: ViewDefinition[] = [
  {
    id: 'glance',
    label: 'Glance',
    icon: (
      <svg viewBox="0 0 14 14" className="w-3 h-3 fill-none stroke-current stroke-[1.5]">
        <rect x="1.5" y="2.5" width="11" height="9" rx="2" />
        <path d="M1.5 6h11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg viewBox="0 0 14 14" className="w-3 h-3 fill-none stroke-current stroke-[1.5]">
        <path d="M2 4.2l1.6 1.6L6.4 3M2 10.2l1.6 1.6L6.4 9M8.4 4.4h4M8.4 10.4h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

/** Each view sets the shell it needs; the notch springs between them. */
const SIZES: Record<string, { width: number; height: number }> = {
  glance: { width: 810, height: 132 },
  settings: { width: 620, height: 200 },
  tasks: { width: 690, height: 250 },
}

export default function HomePage() {
  const nowPlaying = useNowPlaying()
  const albumTint = useDominantColor(nowPlaying?.thumbnailUrl)
  const timer = useTimer()
  const tasks = useTasks()
  const [view, setView] = useState('glance')

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)

  useEffect(() => {
    window.bridge
      ?.invoke<Partial<Settings>>('store:get', 'settings')
      .then((stored) => setSettings({ ...DEFAULT_SETTINGS, ...stored }))
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

  const tint = settings.albumTint ? albumTint : '255, 255, 255'

  const glanceZones = [
    settings.showMusic && {
      id: 'music',
      width: 'minmax(0,1.1fr)',
      node: <NowPlayingPanel nowPlaying={nowPlaying} tint={tint} />,
    },
    settings.showTasks && {
      id: 'tasks',
      width: 'minmax(90px,0.7fr)',
      node: <TaskGlance store={tasks} />,
    },
    settings.showCalendar && {
      id: 'calendar',
      width: 'auto',
      node: <CalendarStrip />,
    },
    settings.showPhoto && {
      id: 'photo',
      width: 'auto',
      node: (
        <div className="w-[62px] h-[62px]">
          <PhotoWidget />
        </div>
      ),
    },
  ].filter(Boolean) as { id: string; width: string; node: React.ReactNode }[]

  const glanceWidth = glanceZones.reduce((total, zone) => {
    if (zone.id === 'music') return total + 290
    if (zone.id === 'tasks') return total + 150
    if (zone.id === 'calendar') return total + 230
    return total + 110
  }, 60)

  const size =
    view === 'glance'
      ? { width: Math.max(320, glanceWidth), height: 132 }
      : SIZES[view] ?? SIZES.glance

  return (
    <React.Fragment>
      <Head>
        <title>deskNotch</title>
      </Head>
      <div className="w-full h-full flex justify-center items-start pointer-events-none">
        <div className="pointer-events-auto">
          <NotchChassis
            ambient={(isOpen) => (
              <AmbientVideo
                active={
                  settings.ambientVideo && isOpen && Boolean(nowPlaying?.isPlaying)
                }
              />
            )}
            expandedWidth={size.width}
            expandedHeight={size.height}
            // leading={<StatusRail />}
            expandedContent={
              <div className="flex h-full items-stretch gap-3">
                <div className="flex-1 min-w-0">
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
                        // One surface, divided by hairlines rather than cards —
                        // panels inside a panel read as clutter at this size. The
                        // zones come from settings, so hiding one closes its
                        // column instead of leaving a gap.
                        <div
                          className="relative grid h-full items-start gap-6 pt-1"
                          style={{ gridTemplateColumns: glanceZones.map((z) => z.width).join(' ') }}
                        >
                          {/* Light bleeding from behind the notch, tinted by the
                          album art. Keeps the surface from reading as a flat
                          black rectangle without adding a single border. */}
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute -inset-x-6 -top-10 h-24 -z-10 blur-2xl"
                            animate={{
                              background: `radial-gradient(55% 100% at 20% 0%, rgba(${tint}, 0.13), transparent 72%)`,
                            }}
                            transition={{ duration: 0.9 }}
                          />

                          {glanceZones.map((zone, index) => (
                            <div
                              key={zone.id}
                              className={
                                index === 0
                                  ? 'min-w-0'
                                  : `relative h-[76px] flex items-start pl-6 min-w-0
                                 before:absolute before:left-0 before:top-2
                                 before:h-14 before:w-px
                                 before:bg-gradient-to-b before:from-transparent
                                 before:via-white/[0.07] before:to-transparent`
                              }
                            >
                              {zone.node}
                            </div>
                          ))}
                        </div>
                      ) : view === 'settings' ? (
                        <SettingsPanel settings={settings} onChange={setSettings} />
                      ) : (
                        <div className="grid grid-cols-2 gap-3 h-full">
                          <TodoCard store={tasks} />
                          <TimerCard timer={timer} />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Same gradient hairline the zones use — a solid rule reads
                    as a hard edge next to them. */}
                <div className="relative flex items-center shrink-0 pl-3
                                before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
                                before:h-14 before:w-px
                                before:bg-gradient-to-b before:from-transparent
                                before:via-white/[0.07] before:to-transparent">
                  <ViewSwitcher
                    views={VIEWS}
                    active={view}
                    onChange={setView}
                    footer={
                      <SettingsButton
                        active={view === 'settings'}
                        onClick={() =>
                          setView((current) => (current === 'settings' ? 'glance' : 'settings'))
                        }
                      />
                    }
                  />
                </div>
              </div>
            }
          >
            <CollapsedStatus nowPlaying={nowPlaying} tasks={tasks} />
          </NotchChassis>
        </div>
      </div>
    </React.Fragment>
  )
}
