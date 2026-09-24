import { useEffect, useState } from 'react'

/**
 * The user's own photo, as a data URL, and a way to pick a new one. Stored as
 * data rather than a path so it survives the original file moving.
 */
export function usePhoto() {
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
    return picked ?? null
  }

  return { photo, pick }
}
