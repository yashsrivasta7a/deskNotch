import React, { useEffect, useRef, useState } from 'react'

interface ScrollingTextProps {
  children: string
  className?: string
  /** Pixels per second. Slow enough to read, quick enough to get round. */
  speed?: number
  /** Seconds held still at each end before moving again. */
  pause?: number
}

/**
 * Scrolls its text only when the text is actually too wide.
 *
 * A marquee that runs regardless is noise — most track titles fit, and moving
 * them for no reason makes the notch feel restless. The width is measured
 * after layout and the animation is only attached if it overflows.
 */
export const ScrollingText: React.FC<ScrollingTextProps> = ({
  children,
  className = '',
  speed = 30,
  pause = 1.6,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    const measure = () => {
      const overflow = text.scrollWidth - container.clientWidth
      setDistance(overflow > 1 ? overflow : 0)
    }

    measure()

    // Re-measure when the notch resizes between views.
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [children])

  const duration = distance / speed

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap will-change-transform"
        style={
          distance > 0
            ? {
                // Keyframes rather than Motion: this runs on the compositor and
                // needs no React re-render per frame.
                animation: `notch-marquee ${duration * 2 + pause * 2}s linear infinite`,
                ['--marquee-distance' as string]: `-${distance}px`,
              }
            : undefined
        }
      >
        {children}
      </span>
    </div>
  )
}
