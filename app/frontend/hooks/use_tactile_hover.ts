import { useState, useCallback, useMemo } from "react"
import type { MotionStyle } from "framer-motion"
import {
  SCALE_PRESS,
  SCALE_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
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
}

interface TactileState {
  isHovered: boolean
  isPressed: boolean
  /** Framer Motion animate target — updated reactively. */
  transform: MotionStyle
  /** Pointer event handlers to spread onto a motion element. */
  handlers: TactileHandlers
}

const isBrowser = typeof window !== "undefined"

/**
 * Binary hover hook — toggles isHovered / isPressed on pointer events
 * and computes a framer-motion-ready transform target.
 *
 * Phase 3 will add cursor-proximity tracking (proximity 0–1) and
 * an onPointerMove handler for continuous response.
 */
export function useTactileHover(
  options: UseTactileHoverOptions = {},
): TactileState {
  const { restingTilt = 0, disableTilt = false } = options
  const reducedMotion = useReducedMotionContext()

  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const enter = useCallback(() => {
    if (!isBrowser || reducedMotion) return
    setIsHovered(true)
  }, [reducedMotion])

  const leave = useCallback(() => {
    if (!isBrowser) return
    setIsHovered(false)
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
    }),
    [enter, leave, down, up],
  )

  const transform = useMemo<MotionStyle>(() => {
    if (reducedMotion) {
      return { rotate: 0, scale: 1, y: 0 }
    }

    const rotate = disableTilt
      ? 0
      : isHovered
        ? 0
        : restingTilt * (TILT_HOVER / 1.5)

    const scale = isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1

    const y = isHovered ? -LIFT_HOVER : 0

    return { rotate, scale, y }
  }, [reducedMotion, disableTilt, isHovered, isPressed, restingTilt])

  return { isHovered, isPressed, transform, handlers }
}
