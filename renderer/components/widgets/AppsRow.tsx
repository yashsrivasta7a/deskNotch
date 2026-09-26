import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Search, X } from 'lucide-react'
import { launchApp, useAllApps, useAppInfo, useTopApps, type TopApp } from '../../hooks/useTopApps'

export type DeskApps = 'most' | 'favorites' | 'off'

/** The bar stays short: this many apps, most used or favourites. */
const MAX = 4

const spring = { type: 'spring' as const, stiffness: 420, damping: 26 }

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-[#1c1c1f] px-2 py-[3px] text-[10.5px] font-medium text-white/85 opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-[opacity,transform] duration-150 group-hover/app:translate-y-0 group-hover/app:opacity-100">
    {children}
  </span>
)

const Icon: React.FC<{ app: TopApp; size?: number }> = ({ app, size = 32 }) =>
  app.icon ? (
    <img src={app.icon} alt="" draggable={false} className="object-contain" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-[8px] bg-white/10 text-[11px] font-semibold text-white/70" style={{ width: size, height: size }}>
      {app.name[0]}
    </span>
  )

/** One app on the row: lifts on hover, opens on tap. Favourites also get an × to take them off. */
const AppButton: React.FC<{ app: TopApp; index: number; onRemove?: () => void }> = ({ app, index, onRemove }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 6, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.6 }}
    transition={{ ...spring, delay: index * 0.035 }}
    className="group/app relative"
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
    <Label>{app.name}</Label>
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
const Picker: React.FC<{ taken: string[]; onPick: (id: string) => void; onClose: () => void }> = ({ taken, onPick, onClose }) => {
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
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } }}
      transition={spring}
      onClick={(event) => event.stopPropagation()}
      className="absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-[250px] -translate-x-1/2 overflow-hidden rounded-[14px] bg-[#1c1c1f] p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_18px_40px_-12px_rgba(0,0,0,0.9)]"
      style={{ originY: 1 }}
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
 * The desk's foot: the apps you live in, centred. Either Windows' own "most
 * used" (by time in focus) or the favourites you picked, with a + to add more.
 */
export const AppsRow: React.FC<{ mode: DeskApps; favorites: string[]; onFavorites: (ids: string[]) => void }> = ({
  mode,
  favorites,
  onFavorites,
}) => {
  const top = useTopApps(mode === 'most')
  const favs = useAppInfo(mode === 'favorites' ? favorites : [])
  const [picking, setPicking] = useState(false)
  // Keep the chosen order, not the order the lookup came back in.
  const ordered = favorites.flatMap((id) => favs.filter((app) => app.id === id))

  return (
    <div className="relative flex items-center justify-center gap-3.5" style={{ height: APPS_ROW }}>
      {mode === 'most' &&
        (top === null
          ? Array.from({ length: MAX }, (_, i) => <span key={i} className="h-[32px] w-[32px] rounded-[9px] bg-white/[0.05]" />)
          : top.slice(0, MAX).map((app, i) => <AppButton key={app.id} app={app} index={i} />))}

      {mode === 'favorites' && (
        <>
          <AnimatePresence initial={false}>
            {ordered.map((app, i) => (
              <AppButton key={app.id} app={app} index={i} onRemove={() => onFavorites(favorites.filter((id) => id !== app.id))} />
            ))}
          </AnimatePresence>
          {favorites.length < MAX && (
          <div className="relative">
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
              {!favorites.length && 'Add your apps'}
            </motion.button>
            <AnimatePresence>
              {picking && (
                <Picker
                  taken={favorites}
                  onPick={(id) => {
                    onFavorites([...favorites, id])
                    setPicking(false)
                  }}
                  onClose={() => setPicking(false)}
                />
              )}
            </AnimatePresence>
          </div>
          )}
        </>
      )}
    </div>
  )
}
