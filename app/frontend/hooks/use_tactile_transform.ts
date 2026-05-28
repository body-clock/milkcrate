import { useMemo } from "react"
import type { MotionStyle, Transition } from "framer-motion"
import {
  SCALE_PRESS,
  SCALE_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
  springTactile,
  springPress,
} from "@/lib/motion_tokens"

interface UseTactileTransformOptions {
  /** Resting tilt in degrees when not hovered. Default 0. */
  restingTilt?: number
  /** Disable tilt entirely — rotate always stays at 0. */
  disableTilt?: boolean
  /** Disable all animations — returns identity transforms. */
  reducedMotion?: boolean
}

interface UseTactileTransformResult {
  /** Framer Motion animate target. */
  transform: MotionStyle
  /** Transition to use for the current state — snappier on press. */
  transition: Transition
}

/**
 * Pure computation hook: derives Framer Motion style values from proximity
 * and press state. Does not track pointer position — pair with usePointerProximity.
 */
export function useTactileTransform(
  proximity: number,
  isPressed: boolean,
  options: UseTactileTransformOptions = {},
): UseTactileTransformResult {
  const { restingTilt = 0, disableTilt = false, reducedMotion = false } = options

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
    transform,
    transition: isPressed ? springPress : isHovered ? springTactile : springPress,
  }
}
