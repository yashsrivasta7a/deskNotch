import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Inbox, Trash2 } from 'lucide-react'
import { dragFile, openFile, type FileItem } from '../../hooks/useFiles'

/** The capture card's content height; the notch's size for it follows. */
export const CAPTURE_HEIGHT = 96
export const CAPTURE_WIDTH = 372

const spring = { type: 'spring' as const, stiffness: 420, damping: 26 }

/** Puts a file on the Shelf from outside it: the Shelf reads its list when shown. */
const keepOnShelf = async (file: string) => {
  const paths = ((await window.bridge?.invoke<string[]>('store:get', 'shelf')) ?? []).filter((p) => p !== file)
  await window.bridge?.invoke('store:set', 'shelf', [...paths, file])
}

/**
 * A screenshot, just taken: the macOS corner thumbnail, in the notch. It
 * lands with a flash, like a shutter. Drag it straight into a chat or a
 * folder, keep it on the Shelf for later, or open it; left alone, the notch
 * folds away and the file stays where Windows saved it. Dealt with (kept,
 * opened, dragged out), it calls `onDone` and the notch folds away at once.
 */
export const CaptureView: React.FC<{ item: FileItem; accent: string; onDone: () => void }> = ({ item, accent, onDone }) => {
  const [kept, setKept] = useState(false)

  return (
    <div className="flex h-full items-center gap-4" onClick={(event) => event.stopPropagation()}>
      <motion.div
        initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={spring}
        draggable
        onDragStart={(event) => {
          event.preventDefault()
          void dragFile(item.path, (event.target as HTMLElement).closest('main')).then((out) => out && onDone())
        }}
        onClick={() => {
          openFile(item.path)
          onDone()
        }}
        title="Drag it anywhere · click to open"
        className="relative shrink-0 cursor-grab overflow-hidden rounded-[12px] shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_24px_-10px_rgba(0,0,0,0.9)] active:cursor-grabbing"
        style={{ height: CAPTURE_HEIGHT }}
      >
        {item.thumb ? (
          <img src={item.thumb} alt="" draggable={false} className="h-full w-auto max-w-[160px] object-cover" />
        ) : (
          <div className="h-full w-[150px] bg-white/10" />
        )}
        {/* The shutter: a white flash that fades as the picture settles. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-white"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </motion.div>

      <motion.div
        className="flex min-w-0 flex-1 flex-col"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        <span className="whitespace-nowrap text-[13px] font-semibold text-white">Screenshot</span>
        <span className="mt-1 whitespace-nowrap text-[11px] text-white/45">Drag it anywhere</span>
        <div className="mt-3 flex gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              if (kept) return
              setKept(true)
              // A beat to see it land, then out of the way.
              void keepOnShelf(item.path).then(() => setTimeout(onDone, 650))
            }}
            className="flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11px] font-medium transition-colors"
            style={kept ? { background: accent, color: '#000' } : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
          >
            {kept ? <Check size={12} strokeWidth={2.6} /> : <Inbox size={12} strokeWidth={2.2} />}
            {kept ? 'On Shelf' : 'Keep'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              openFile(item.path)
              onDone()
            }}
            className="h-[26px] shrink-0 whitespace-nowrap rounded-full bg-white/[0.06] px-3 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            Open
          </motion.button>
          {/* Not wanted: gone before it clutters the folder (to the Recycle Bin). */}
          {!kept && (
            <motion.button
              type="button"
              aria-label="Discard screenshot"
              title="Discard"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                void window.bridge?.invoke('screenshot:discard', item.path)
                onDone()
              }}
              className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/50 transition-colors hover:bg-[#FF453A]/20 hover:text-[#FF453A]"
            >
              <Trash2 size={12} strokeWidth={2.2} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
