import { useState, useCallback, useMemo, useRef } from "react"
import type { MotionStyle, Transition } from "framer-motion"
import {
  SCALE_PRESS,
  SCALE_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
  springTactile,
  springPress,
} from "@/lib/motion_tokens"
import { useReducedMotionContext } from "@/components/storefront_motion_config"

interface UseTactileHoverOptions {
  /** Resting tilt in degrees when not hovered. Default 0. */
  restingTilt?: number
  /** Disable tilt entirely — rotate always stays at 0. */
  disableTilt?: boolean
}

interface TactileHandlers {
  onPointerEnter: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
}

interface TactileState {
  /** True when proximity > 0 (derived — not a separate state). */
  isHovered: boolean
  isPressed: boolean
  /** Cursor proximity to element center, 0 (idle) to 1 (centered). */
  proximity: number
  /** Framer Motion animate target — updated reactively. */
  transform: MotionStyle
  /** Transition to use for the current state — snappier on press. */
  transition: Transition
  /** Pointer event handlers to spread onto a motion element. */
  handlers: TactileHandlers
}

const isBrowser = typeof window !== "undefined"

/**
 * Cursor-proximity hover hook. Tracks pointer position relative to
 * the element center and returns a continuous 0–1 proximity value.
 * Falls back to zero-proximity on touch devices and when reduced
 * motion is active (no hover flash — press state handles feedback).
 */
export function useTactileHover(
  options: UseTactileHoverOptions = {},
): TactileState {
  const { restingTilt = 0, disableTilt = false } = options
  const reducedMotion = useReducedMotionContext()

  const [proximity, setProximity] = useState(0)
  const [isPressed, setIsPressed] = useState(false)
  const isTouchRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // ── Proximity math ───────────────────────────────────────

  const updateProximity = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement | null
    if (!el) return 0
    const rect = el.getBoundingClientRect()

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    const maxDist = Math.hypot(rect.width, rect.height) * 0.6

    return Math.max(0, Math.min(1, 1 - dist / maxDist))
  }, [])

  // ── Pointer handlers ──────────────────────────────────────

  const enter = useCallback(
    (e: React.PointerEvent) => {
      if (!isBrowser) return
      const isTouch = e.pointerType !== "mouse"
      isTouchRef.current = isTouch

      if (reducedMotion || isTouch) {
        setProximity(0)
        return
      }
      // Mouse: compute proximity from the enter event's position
      setProximity(updateProximity(e))
    },
    [reducedMotion, updateProximity],
  )

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!isBrowser || reducedMotion || isTouchRef.current) return

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (e.currentTarget) {
          setProximity(updateProximity(e))
        }
      })
    },
    [reducedMotion, updateProximity],
  )

  const leave = useCallback(() => {
    if (!isBrowser) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setProximity(0)
    setIsPressed(false)
  }, [])

  const down = useCallback(() => {
    if (!isBrowser || reducedMotion) return
    setIsPressed(true)
  }, [reducedMotion])

  const up = useCallback(() => {
    if (!isBrowser) return
    setIsPressed(false)
  }, [])

  const handlers = useMemo<TactileHandlers>(
    () => ({
      onPointerEnter: enter,
      onPointerLeave: leave,
      onPointerDown: down,
      onPointerUp: up,
      onPointerMove: move,
    }),
    [enter, leave, down, up, move],
  )

  // ── Derived state ─────────────────────────────────────────

  const isHovered = proximity > 0

  const transform = useMemo<MotionStyle>(() => {
    if (reducedMotion) {
      return { rotate: 0, scale: 1, y: 0 }
    }

    // Tilt: straightens as cursor approaches
    const rotate = disableTilt
      ? 0
      : restingTilt * (TILT_HOVER / 1.5) * (1 - proximity)

    // Scale: SCALE_PRESS when pressed, otherwise interpolate
    const scale = isPressed
      ? SCALE_PRESS
      : 1 + (SCALE_HOVER - 1) * proximity

    // Lift: increases as cursor approaches
    const y = proximity === 0 ? 0 : -LIFT_HOVER * proximity

    return { rotate, scale, y }
  }, [reducedMotion, disableTilt, isPressed, restingTilt, proximity])

  return {
    isHovered,
    isPressed,
    proximity,
    transform,
    transition: isPressed ? springPress : springTactile,
    handlers,
  }
}
