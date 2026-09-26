import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Search, X } from 'lucide-react'
import { launchApp, useAllApps, useAppInfo, useTopApps, type TopApp } from '../../hooks/useTopApps'

export type DeskApps = 'most' | 'favorites' | 'off'
export type AppsSide = 'left' | 'right' | 'bottom'

/** Where the bar sits, so names and the picker open away from the notch. */
const SideContext = createContext<AppsSide>('bottom')

/** How many apps are in view at once; the rest are a scroll away. Beside the
 *  notch the bar is a column hanging from the screen's edge, so it shows fewer. */
const VISIBLE = 4
const VISIBLE_SIDE = 2
/** One app's button, the gap between two, and the room kept round the edge
 *  for the favourites' remove badge. */
const SLOT = 34
const GAP = 14
const EDGE = 6

const spring = { type: 'spring' as const, stiffness: 420, damping: 26 }

/** Where an app's name shows, relative to its button: away from the notch. */
const labelAt = (side: AppsSide, r: { x: number; y: number; w: number; h: number }): React.CSSProperties =>
  side === 'bottom'
    ? { left: r.x + r.w / 2, top: r.y + r.h + 6, transform: 'translateX(-50%)' }
    : side === 'right'
      ? { left: r.x + r.w + 10, top: r.y + r.h / 2, transform: 'translateY(-50%)' }
      : { right: `calc(100% - ${r.x - 10}px)`, top: r.y + r.h / 2, transform: 'translateY(-50%)' }

const Icon: React.FC<{ app: TopApp; size?: number }> = ({ app, size = 32 }) =>
  app.icon ? (
    <img src={app.icon} alt="" draggable={false} className="object-contain" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-[8px] bg-white/10 text-[11px] font-semibold text-white/70" style={{ width: size, height: size }}>
      {app.name[0]}
    </span>
  )

/** One app on the row: lifts on hover, opens on tap. Favourites also get an × to take them off. */
const AppButton: React.FC<{ app: TopApp; index: number; onRemove?: () => void; onHover: (el: HTMLElement | null, name?: string) => void }> = ({
  app,
  index,
  onRemove,
  onHover,
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 6, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.6 }}
    transition={{ ...spring, delay: index * 0.035 }}
    className="group/app relative shrink-0"
    onMouseEnter={(event) => onHover(event.currentTarget, app.name)}
    onMouseLeave={() => onHover(null)}
  >
    <motion.button
      type="button"
      aria-label={`Open ${app.name}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.88 }}
      onClick={(event) => {
        event.stopPropagation()
        launchApp(app.id)
      }}
      className="grid h-[34px] w-[34px] place-items-center"
    >
      <Icon app={app} />
    </motion.button>
    {onRemove && (
      <button
        type="button"
        aria-label={`Remove ${app.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        className="absolute -right-1.5 -top-1.5 grid h-[14px] w-[14px] place-items-center rounded-full bg-[#2a2a2e] text-white/80 opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-opacity hover:text-white group-hover/app:opacity-100"
      >
        <X size={8} strokeWidth={3} />
      </button>
    )}
  </motion.div>
)

/**
 * Picking a favourite: type a few letters of any installed app, pick it from
 * the matches. Floats above the row; Escape or a click elsewhere closes it.
 */
/** Where the picker opens: below a bar under the notch, beside a bar beside it. */
const PICKER_AT: Record<AppsSide, string> = {
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  right: 'left-[calc(100%+10px)] top-0',
  left: 'right-[calc(100%+10px)] top-0',
}

const Picker: React.FC<{ taken: string[]; onPick: (id: string) => void; onClose: () => void }> = ({ taken, onPick, onClose }) => {
  const side = useContext(SideContext)
  const all = useAllApps()
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (all ?? [])
      .filter((app) => !taken.includes(app.id) && (!q || app.name.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, 6)
  }, [all, query, taken])
  const described = useAppInfo(matches.map((app) => app.id))
  const iconOf = (id: string) => described.find((app) => app.id === id)

  useEffect(() => {
    const away = (event: MouseEvent) => !box.current?.contains(event.target as Node) && onClose()
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [onClose])

  return (
    <motion.div
      ref={box}
      data-notch-part
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } }}
      transition={spring}
      onClick={(event) => event.stopPropagation()}
      className={`absolute ${PICKER_AT[side]} z-30 w-[250px] overflow-hidden rounded-[14px] bg-[#1c1c1f] p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_18px_40px_-12px_rgba(0,0,0,0.9)]`}
    >
      <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
        <Search size={12} strokeWidth={2.2} className="shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
            if (event.key === 'Enter' && matches[0]) onPick(matches[0].id)
          }}
          placeholder="Add an app"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
        />
      </div>
      <div className="flex flex-col">
        {all === null ? (
          <span className="px-2 py-2 text-[11px] text-white/35">Loading apps…</span>
        ) : matches.length === 0 ? (
          <span className="px-2 py-2 text-[11px] text-white/35">No app called that</span>
        ) : (
          matches.map((app) => {
            const info = iconOf(app.id)
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onPick(app.id)}
                className="flex h-[30px] items-center gap-2.5 rounded-[8px] px-2 text-left transition-colors hover:bg-white/[0.08]"
              >
                {info ? <Icon app={info} size={18} /> : <span className="h-[18px] w-[18px] rounded-[5px] bg-white/[0.06]" />}
                <span className="min-w-0 truncate text-[12px] text-white/85">{app.name}</span>
              </button>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

/** The row's height; the desk sizes itself around it. */
export const APPS_ROW = 36

/**
 * The apps you live in: Windows' own "most used" (by time in focus) or the
 * favourites you picked, with a + to add more. Four are in view (two beside
 * the notch); more scroll, sideways under the notch and up and down beside it.
 */
export const AppsRow: React.FC<{ mode: DeskApps; favorites: string[]; onFavorites: (ids: string[]) => void; side?: AppsSide }> = ({
  mode,
  favorites,
  onFavorites,
  side = 'bottom',
}) => {
  const top = useTopApps(mode === 'most')
  const favs = useAppInfo(mode === 'favorites' ? favorites : [])
  const [picking, setPicking] = useState(false)
  const [hover, setHover] = useState<{ name: string; x: number; y: number; w: number; h: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const across = side === 'bottom'
  const visible = across ? VISIBLE : VISIBLE_SIDE
  // Keep the chosen order, not the order the lookup came back in.
  const ordered = favorites.flatMap((id) => favs.filter((app) => app.id === id))
  const apps = mode === 'most' ? (top ?? []) : ordered
  const scrolls = apps.length > visible
  const viewport = visible * SLOT + (visible - 1) * GAP + EDGE * 2

  const onHover = (el: HTMLElement | null, name?: string) => {
    const box = root.current?.getBoundingClientRect()
    if (!el || !name || !box) return setHover(null)
    const r = el.getBoundingClientRect()
    setHover({ name, x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height })
  }

  return (
    <SideContext.Provider value={side}>
      <div ref={root} className={`relative flex items-center justify-center gap-2 ${across ? '' : 'flex-col'}`} style={across ? { height: APPS_ROW } : { width: APPS_ROW }}>
        <div
          ref={scroller}
          onScroll={() => setHover(null)}
          // Under the notch, a vertical wheel scrolls the row sideways.
          onWheel={(event) => {
            if (across && scroller.current && Math.abs(event.deltaY) > Math.abs(event.deltaX)) scroller.current.scrollLeft += event.deltaY
          }}
          className={`flex shrink-0 items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${across ? 'overflow-x-auto overflow-y-hidden' : 'flex-col overflow-y-auto overflow-x-hidden'}`}
          style={{
            gap: GAP,
            padding: EDGE,
            margin: -EDGE,
            ...(across ? { maxWidth: viewport } : { maxHeight: viewport }),
            // Fades at the ends once there is more than fits.
            maskImage: scrolls
              ? `linear-gradient(to ${across ? 'right' : 'bottom'}, transparent, black ${EDGE + 4}px, black calc(100% - ${EDGE + 4}px), transparent)`
              : undefined,
          }}
        >
          {mode === 'most' && top === null
            ? Array.from({ length: visible }, (_, i) => <span key={i} className="h-[32px] w-[32px] shrink-0 rounded-[9px] bg-white/[0.05]" />)
            : (
              <AnimatePresence initial={false}>
                {apps.map((app, i) => (
                  <AppButton
                    key={app.id}
                    app={app}
                    index={i}
                    onHover={onHover}
                    onRemove={mode === 'favorites' ? () => onFavorites(favorites.filter((id) => id !== app.id)) : undefined}
                  />
                ))}
              </AnimatePresence>
            )}
        </div>

        {mode === 'favorites' && (
          <div className="relative shrink-0">
            <motion.button
              type="button"
              aria-label="Add a favourite app"
              whileTap={{ scale: 0.9 }}
              onClick={(event) => {
                event.stopPropagation()
                setPicking((p) => !p)
              }}
              className={`flex h-[30px] items-center gap-1 rounded-full text-[11px] font-medium transition-colors ${
                favorites.length ? 'w-[30px] justify-center' : 'px-3'
              } ${picking ? 'bg-white/[0.16] text-white' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}
            >
              <Plus size={12} strokeWidth={2.4} />
              {!favorites.length && across && 'Add your apps'}
            </motion.button>
            <AnimatePresence>
              {picking && (
                <Picker
                  taken={favorites}
                  onPick={(id) => {
                    onFavorites([...favorites, id])
                    setPicking(false)
                    // The new one joins the end: bring it into view.
                    requestAnimationFrame(() =>
                      scroller.current?.scrollTo({ left: scroller.current.scrollWidth, top: scroller.current.scrollHeight, behavior: 'smooth' }),
                    )
                  }}
                  onClose={() => setPicking(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* The hovered app's name, outside the scrolling list so it is never clipped. */}
        <AnimatePresence>
          {hover && (
            <motion.span
              key={hover.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.12, delay: 0.15 }}
              className="pointer-events-none absolute z-20 whitespace-nowrap rounded-full bg-[#1c1c1f] px-2 py-[3px] text-[10.5px] font-medium text-white/85 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              style={labelAt(side, hover)}
            >
              {hover.name}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </SideContext.Provider>
  )
}
