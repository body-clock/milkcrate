import { useState, useCallback, useEffect, useRef } from "react"

const isBrowser = typeof window !== "undefined"

interface PointerProximityHandlers {
  onPointerEnter: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
}

interface UsePointerProximityOptions {
  /** Disable proximity tracking entirely (e.g., when reduced motion is active). */
  disabled?: boolean
}

interface UsePointerProximityResult {
  /** Cursor proximity to element center, 0 (idle) to 1 (centered). */
  proximity: number
  /** Pointer event handlers to spread onto a motion element. */
  handlers: PointerProximityHandlers
}

function computeProximityFromRect(rect: DOMRect | {
  left: number
  top: number
  width: number
  height: number
}, clientX: number, clientY: number): number {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = clientX - cx
  const dy = clientY - cy
  const dist = Math.hypot(dx, dy)
  const maxDist = Math.hypot(rect.width, rect.height) * 0.6

  return Math.max(0, Math.min(1, 1 - dist / maxDist))
}

function computeProximity(e: React.PointerEvent): number {
  const el = e.currentTarget as HTMLElement | null
  if (!el) {return 0}
  const rect = el.getBoundingClientRect()

  return computeProximityFromRect(rect, e.clientX, e.clientY)
}

/**
 * Tracks pointer position relative to the element center and returns a
 * continuous 0–1 proximity value. Falls back to zero-proximity on touch
 * devices and when disabled (e.g., reduced motion).
 */
export function usePointerProximity(
  options: UsePointerProximityOptions = {},
): UsePointerProximityResult {
  const { disabled = false } = options
  const [proximity, setProximity] = useState(0)
  const isTouchRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const enter = useCallback(
    (e: React.PointerEvent) => {
      if (!isBrowser || disabled) {return}
      const isTouch = e.pointerType !== "mouse"
      isTouchRef.current = isTouch
      if (isTouch) {
        setProximity(0)
        return
      }
      setProximity(computeProximity(e))
    },
    [disabled],
  )

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!isBrowser || disabled || isTouchRef.current) {return}
      const target = e.currentTarget as HTMLElement | null
      if (!target) {return}
      const rect = target.getBoundingClientRect()
      const { clientX, clientY } = e

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setProximity(computeProximityFromRect(rect, clientX, clientY))
      })
    },
    [disabled],
  )

  const leave = useCallback(() => {
    if (!isBrowser) {return}
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setProximity(0)
  }, [])

  const handlers = { onPointerEnter: enter, onPointerLeave: leave, onPointerMove: move }

  useEffect(() => {
    return () => {
      if (rafRef.current === null) {return}

      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return { proximity, handlers }
}
