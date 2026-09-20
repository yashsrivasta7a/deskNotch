import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

/**
 * A circular photo the user picks themselves.
 *
 * The image is stored as a data URL rather than a path, so it keeps working if
 * the original file is moved or renamed.
 */
export const PhotoWidget: React.FC = () => {
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    window.bridge
      ?.invoke<string | null>('store:get', 'photo')
      .then((stored) => setPhoto(stored ?? null))
      .catch(() => setPhoto(null))
  }, [])

  const pick = async () => {
    const picked = await window.bridge?.invoke<string | null>('photo:pick')
    if (picked) setPhoto(picked)
  }

  return (
    <motion.button
      type="button"
      onClick={pick}
      aria-label={photo ? 'Change photo' : 'Choose a photo'}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className="group relative grid place-items-center w-full h-full rounded-[16px]
                 overflow-hidden bg-white/[0.04]
                 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
    >
      <AnimatePresence mode="popLayout">
        {photo ? (
          <motion.img
            key={photo}
            src={photo}
            alt=""
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.svg
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-none stroke-white/40 stroke-[1.4]"
          >
            <circle cx="12" cy="9" r="3.2" />
            <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Only hints at being editable once there is something to replace. */}
      {photo && (
        <div className="absolute inset-0 grid place-items-center bg-black/55
                        opacity-0 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-white stroke-[1.4]">
            <path d="M11.5 2.5l2 2-7 7-2.5.5.5-2.5z" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.button>
  )
}
