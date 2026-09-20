import { useEffect, useState } from 'react'

const FALLBACK = '255, 255, 255'

/**
 * Average colour of an image, as an "r, g, b" string ready for rgba().
 *
 * Used to tint the notch from whatever is playing, so the shell reacts to the
 * music rather than staying a flat black box. Averaging a downscaled copy is
 * enough at this size — a full histogram or k-means would be more accurate and
 * completely invisible behind a 12% opacity glow.
 */
export function useDominantColor(src: string | null | undefined): string {
  const [color, setColor] = useState(FALLBACK)

  useEffect(() => {
    if (!src) {
      setColor(FALLBACK)
      return
    }

    let cancelled = false
    const image = new Image()
    image.src = src

    image.onload = () => {
      if (cancelled) return

      const size = 12
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      context.drawImage(image, 0, 0, size, size)

      let r = 0
      let g = 0
      let b = 0
      let counted = 0

      const { data } = context.getImageData(0, 0, size, size)
      for (let i = 0; i < data.length; i += 4) {
        const [red, green, blue] = [data[i], data[i + 1], data[i + 2]]

        // Near-black and near-white pixels carry no hue and would wash the
        // average out toward grey.
        const max = Math.max(red, green, blue)
        const min = Math.min(red, green, blue)
        if (max < 28 || min > 232) continue

        r += red
        g += green
        b += blue
        counted += 1
      }

      if (!counted) {
        setColor(FALLBACK)
        return
      }

      // Lift toward the light end: the tint sits on black, and a muted average
      // disappears entirely.
      const lift = (channel: number) => Math.min(255, Math.round(channel / counted) + 40)
      setColor(`${lift(r)}, ${lift(g)}, ${lift(b)}`)
    }

    image.onerror = () => !cancelled && setColor(FALLBACK)

    return () => {
      cancelled = true
    }
  }, [src])

  return color
}
