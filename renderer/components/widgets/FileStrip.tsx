import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, File as FileIcon, Folder, Trash2, X } from 'lucide-react'
import { CHROME_X } from '../notch/NotchChassis'
import { dragFile, droppedPaths, openFile, revealFile, useFileList, /* useRecentFiles, */ type FileItem } from '../../hooks/useFiles'

const spring = { type: 'spring' as const, stiffness: 400, damping: 32 }

export type StripTab = 'shelf' | 'recent' | 'pinned'
// Parked with Recent and Pinned:
// const TABS: { id: StripTab; label: string }[] = [
//   { id: 'shelf', label: 'Shelf' },
//   { id: 'recent', label: 'Recent' },
//   { id: 'pinned', label: 'Pinned' },
// ]


const stop = (event: React.SyntheticEvent) => event.stopPropagation()

/** "8l4KKMut_40c9e.png" → "8l4KK…c9e.png": the start and the extension survive. */
const middle = (name: string, max = 13) => {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : ''
  const stem = name.slice(0, name.length - ext.length)
  const keep = max - ext.length - 1
  return `${stem.slice(0, Math.ceil(keep * 0.6))}…${stem.slice(-Math.floor(keep * 0.4))}${ext}`
}

/**
 * One file on the shelf: a preview of the file itself where Windows has one,
 * its icon where not, and its name beneath. Click opens it, right-click shows
 * it in its folder, and dragging it out moves it — dropped somewhere else, it
 * leaves the shelf.
 */
const Chip: React.FC<{ item: FileItem; onRemove?: () => void; onDraggedOut?: () => void }> = ({ item, onRemove, onDraggedOut }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.6, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.6, y: -8 }}
    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    draggable
    onDragStart={(event) => {
      // The OS does the dragging, so the file lands wherever it is dropped.
      event.preventDefault()
      const home = (event.target as HTMLElement).closest('main')
      void dragFile(item.path, home).then((out) => out && onDraggedOut?.())
    }}
    onClick={(event) => {
      stop(event)
      openFile(item.path)
    }}
    onContextMenu={(event) => {
      event.preventDefault()
      revealFile(item.path)
    }}
    title={`${item.name}
Click to open · drag out to move · right-click to show in folder`}
    className="group relative flex w-[74px] shrink-0 cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
  >
    <div className="relative grid h-[52px] w-[52px] place-items-center">
      {item.thumb ? (
        <img
          src={item.thumb}
          alt=""
          draggable={false}
          className="h-[52px] w-[52px] rounded-[12px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_8px_18px_-8px_rgba(0,0,0,0.8)]"
        />
      ) : item.icon ? (
        <img src={item.icon} alt="" draggable={false} className="h-[40px] w-[40px] drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]" />
      ) : item.isDir ? (
        <Folder size={34} strokeWidth={1.5} className="text-white/70" />
      ) : (
        <FileIcon size={34} strokeWidth={1.5} className="text-white/70" />
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={(event) => {
            stop(event)
            onRemove()
          }}
          className="absolute -right-1.5 -top-1.5 grid h-[17px] w-[17px] place-items-center rounded-full bg-[#2a2a2e] text-white/80 opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-opacity hover:bg-[#3a3a3f] hover:text-white group-hover:opacity-100"
        >
          <X size={9} strokeWidth={2.8} />
        </button>
      )}
    </div>
    <span className="w-full overflow-hidden whitespace-nowrap text-center text-[10px] font-medium leading-tight text-white/70">{middle(item.name, 12)}</span>
  </motion.div>
)

/** Shelf geometry: one chip, the gap between chips, and the row's side padding. */
export const SHELF_CHIP = 74
export const SHELF_GAP = 14
/** Empty, the shelf is a drop well this wide; with files, it grows a chip at a
 *  time up to SHELF_MAX, then the row scrolls sideways. */
export const SHELF_EMPTY = 300
export const SHELF_MAX = 640
export const SHELF_HEIGHT = 92
/** The clear-all button at the row's end, with its gap. */
const CLEAR = 28 + SHELF_GAP

/** How wide the notch should be for a shelf holding `count` files. */
export const shelfWidth = (count: number) =>
  count === 0 ? SHELF_EMPTY : Math.min(SHELF_MAX, Math.max(SHELF_EMPTY, CHROME_X + 16 + count * (SHELF_CHIP + SHELF_GAP) + (count > 1 ? CLEAR : 0)))

/**
 * The shelf, after the Mac notch shelves: no tabs, no headings — a slim tray
 * you drop files onto. Each file sits as its icon and name, left to right;
 * the notch widens with each one up to a limit, then the row scrolls
 * sideways. Drag a file back out to put it wherever it is needed.
 *
 * Recent and Pinned are parked, not gone: their tabs are commented out below
 * and their hooks are still in useFiles.
 */
export const FileStrip: React.FC<{ accent: string; dragging: boolean; onCount?: (count: number) => void }> = ({
  accent,
  dragging,
  onCount,
}) => {
  // const [tab, setTab] = useState<StripTab>('shelf')
  // const tab: StripTab = 'shelf'
  const [over, setOver] = useState(false)
  const shelf = useFileList('shelf')
  // const pins = useFileList('pins')
  // const recent = useRecentFiles(tab === 'recent')
  const row = useRef<HTMLDivElement>(null)

  const items = shelf.items
  useEffect(() => onCount?.(items.length), [items.length, onCount])

  // A new file lands at the end of the row: bring it into view.
  const last = items.length
  useEffect(() => {
    row.current?.scrollTo({ left: row.current.scrollWidth, behavior: 'smooth' })
  }, [last])

  const lit = over || dragging

  return (
    <div className="group/shelf relative flex h-full min-w-0 items-center" onClick={stop}>
      {/* Tabs for Recent and Pinned, parked for now.
      <div className="mb-2 flex items-center gap-1">
        {TABS.map((option) => (
          <button key={option.id} type="button" aria-pressed={tab === option.id} onClick={() => setTab(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      */}

      <div
        ref={row}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          const paths = droppedPaths(event)
          if (paths.length) void shelf.add(paths)
        }}
        // A vertical wheel scrolls the row sideways, the way a shelf is read.
        onWheel={(event) => {
          if (row.current && Math.abs(event.deltaY) > Math.abs(event.deltaX)) row.current.scrollLeft += event.deltaY
        }}
        className="relative flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden rounded-[24px] px-2 transition-[background,box-shadow] duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          height: SHELF_HEIGHT,
          gap: SHELF_GAP,
          // Centred while the files fit; from the left once the row scrolls.
          justifyContent: shelfWidth(items.length) >= SHELF_MAX ? 'flex-start' : 'center',
          // Black throughout; a dashed edge marks the shelf — grey at rest, the
          // companion's colour while a file is on its way in.
          background: 'transparent',
          border: `1.5px dashed ${lit ? `color-mix(in srgb, ${accent} 80%, transparent)` : 'rgba(255,255,255,0.18)'}`,
          // Fades at the edges once there is more than fits.
          maskImage: shelfWidth(items.length) >= SHELF_MAX ? 'linear-gradient(to right, transparent, black 16px, black calc(100% - 32px), transparent)' : undefined,
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <Chip key={item.path} item={item} onRemove={() => shelf.remove(item.path)} onDraggedOut={() => shelf.remove(item.path)} />
          ))}
        </AnimatePresence>

        {/* Empty: the well itself says what to do. */}
        {items.length === 0 && (
          // Pinned to the middle of the well, so it is centred at once, not
          // pushed about by files still leaving.
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"
          >
            <ArrowDownToLine size={16} strokeWidth={2} style={{ color: lit ? accent : 'rgba(255,255,255,0.35)' }} />
            <span className="text-[11.5px] font-medium" style={{ color: lit ? 'white' : 'rgba(255,255,255,0.4)' }}>
              {lit ? 'Drop to keep it here' : 'Drop files here'}
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {/* Clear all: beside the row, not in it, so it stays at the right
            however far the files scroll. Faint until the pointer is on the shelf. */}
        {items.length > 1 && (
          <motion.button
            key="clear"
            layout
            type="button"
            aria-label="Clear the shelf"
            title="Clear all"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={spring}
            onClick={(event) => {
              stop(event)
              shelf.clear()
            }}
            className="mb-5 ml-2 grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/35 transition-[color,background] duration-150 hover:bg-white/[0.12] hover:text-white group-hover/shelf:text-white/70"
          >
            <Trash2 size={12} strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
