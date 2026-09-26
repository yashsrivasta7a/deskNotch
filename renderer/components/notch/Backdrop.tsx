import React, { useEffect, useRef, useState } from 'react'

/**
 * What a surface shows through, for the two material styles. Used by the
 * notch, the tabs dock and the apps tray, so they read as one material.
 *
 * - **Mica**: the wallpaper, heavily blurred and darkened, lined up with where
 *   the surface sits on screen, the way Windows 11's own Mica material works.
 *   Costs nothing: one image, read once.
 * - **Glass**: a live view of the screen behind, blurred. The window is
 *   excluded from capture (see `glass:protect` in main/ipc/system.ts), so the
 *   capture shows what is underneath. One capture at 15 fps is shared by every
 *   surface, and runs while this style is on.
 *
 * Each layer is sized to the whole display and shifted by its surface's own
 * position, so every surface acts as a window onto the right part of the
 * screen, even while it springs between sizes.
 */

// ── One shared capture ──────────────────────────────────────────────────────

let users = 0
let pending: Promise<MediaStream | null> | null = null
let shared: MediaStream | null = null

const acquire = () => {
  users++
  if (users === 1) void window.bridge?.invoke('glass:protect', true)
  pending ??= (async () => {
    const id = await window.bridge?.invoke<string | null>('glass:source')
    if (!id) return null
    try {
      shared = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // Chromium's desktop-capture constraints, which Electron accepts.
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxFrameRate: 15 } } as unknown as MediaTrackConstraints,
      })
      return shared
    } catch {
      return null
    }
  })()
  return pending
}

const release = () => {
  users = Math.max(0, users - 1)
  if (users > 0) return
  void window.bridge?.invoke('glass:protect', false)
  const stream = shared
  pending = null
  shared = null
  stream?.getTracks().forEach((t) => t.stop())
}

// ── The layer ───────────────────────────────────────────────────────────────

export const Backdrop: React.FC<{ kind: 'mica' | 'glass'; host: React.RefObject<HTMLElement | null> }> = ({ kind, host }) => {
  const layer = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [wallpaper, setWallpaper] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  // Mica: the wallpaper, once.
  useEffect(() => {
    if (kind !== 'mica' || wallpaper) return
    window.bridge
      ?.invoke<string | null>('system:wallpaper')
      .then(setWallpaper)
      .catch(() => {})
  }, [kind, wallpaper])

  // Glass: join the shared capture while mounted.
  useEffect(() => {
    if (kind !== 'glass') return
    let cancelled = false
    void acquire().then((stream) => {
      if (cancelled || !stream || !video.current) return
      video.current.srcObject = stream
      void video.current.play()
    })
    return () => {
      cancelled = true
      setLive(false)
      release()
    }
  }, [kind])

  // Keep the layer aligned with the surface's place on screen while it
  // animates. Small surfaces (the closed bar, the dock) blur less, so what is
  // behind them stays recognisable instead of smearing into one colour.
  useEffect(() => {
    let frame = 0
    let small: boolean | null = null
    const follow = () => {
      const box = host.current?.getBoundingClientRect()
      if (box && layer.current) {
        layer.current.style.transform = `translate(${-box.left}px, ${-box.top}px)`
        layer.current.style.width = `${window.screen.width}px`
        layer.current.style.height = `${window.screen.height}px`
        const isSmall = Math.min(box.width, box.height) < 60
        if (isSmall !== small && video.current) {
          small = isSmall
          video.current.style.filter = isSmall ? 'blur(6px) saturate(1.8) brightness(1.2)' : 'blur(14px) saturate(1.9) brightness(1.08)'
        }
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [host])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ borderRadius: 'inherit' }}>
      <div ref={layer} className="absolute left-0 top-0 origin-top-left">
        {kind === 'mica' && wallpaper && (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(48px) saturate(1.4)' }}
          />
        )}
        {kind === 'glass' && (
          <video
            ref={video}
            muted
            playsInline
            onPlaying={() => setLive(true)}
            className="absolute inset-0 h-full w-full object-fill transition-opacity duration-300"
            style={{ opacity: live ? 1 : 0 }}
          />
        )}
      </div>
      {/* The tint that keeps text readable over anything. Mica is dark and even;
          Glass stays clear, darker only toward the bottom where most text sits. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            kind === 'mica'
              ? 'rgba(12, 12, 16, 0.55)'
              : 'linear-gradient(180deg, rgba(8, 8, 12, 0.12) 0%, rgba(8, 8, 12, 0.26) 100%)',
        }}
      />
      {/* Glass catches the light: a bright hairline along the top edge and a soft sheen. */}
      {kind === 'glass' && (
        <>
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
        </>
      )}
    </div>
  )
}
