import { useEffect, useState } from 'react'

const FALLBACK = '255, 255, 255'

/**
 * Parses a hex string (e.g., '0078d7' or '0078d7ff') into "r, g, b".
 */
function hexToRgb(hex: string): string | null {
  const clean = hex.replace('#', '')
  if (clean.length < 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return `${r}, ${g}, ${b}`
}

/**
 * Extracts the dominant color from the top section of the desktop wallpaper
 * where DeskNotch is positioned.
 */
export function useWallpaperColor(): string {
  const [color, setColor] = useState(FALLBACK)

  useEffect(() => {
    let cancelled = false

    const fetchWallpaperColor = async () => {
      try {
        const wallpaperDataUrl = await window.bridge?.invoke<string | null>('system:wallpaper')
        if (cancelled) return

        if (wallpaperDataUrl) {
          const image = new Image()
          image.src = wallpaperDataUrl

          image.onload = () => {
            if (cancelled) return

            const size = 16
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size

            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) return

            // DeskNotch sits at the top center of the screen, so sample the top 15%
            const sampleHeight = Math.max(1, Math.round(image.height * 0.15))
            ctx.drawImage(
              image,
              0,
              0,
              image.width,
              sampleHeight,
              0,
              0,
              size,
              size
            )

            const { data } = ctx.getImageData(0, 0, size, size)
            let r = 0
            let g = 0
            let b = 0
            let counted = 0

            for (let i = 0; i < data.length; i += 4) {
              const red = data[i]
              const green = data[i + 1]
              const blue = data[i + 2]

              // Filter out extreme black or blown-out white
              const max = Math.max(red, green, blue)
              const min = Math.min(red, green, blue)
              if (max < 20 || min > 245) continue

              r += red
              g += green
              b += blue
              counted += 1
            }

            if (counted > 0) {
              const avgR = Math.round(r / counted)
              const avgG = Math.round(g / counted)
              const avgB = Math.round(b / counted)
              setColor(`${avgR}, ${avgG}, ${avgB}`)
              return
            }
          }
        }

        // Fallback to Windows accent color if wallpaper sampling yields no color
        const accentHex = await window.bridge?.invoke<string | null>('system:accent-color')
        if (cancelled) return
        if (accentHex) {
          const rgb = hexToRgb(accentHex)
          if (rgb) {
            setColor(rgb)
            return
          }
        }
      } catch {
        if (!cancelled) setColor(FALLBACK)
      }
    }

    void fetchWallpaperColor()

    // Poll periodically to catch wallpaper changes
    const timer = setInterval(() => {
      void fetchWallpaperColor()
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return color
}
