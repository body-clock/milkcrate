import type { MotionStyle, Transition } from "framer-motion";
import { useMemo } from "react";

import {
  SCALE_PRESS,
  SCALE_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
  springTactile,
  springPress,
} from "@/lib/motion_tokens";

interface UseTactileTransformOptions {
  /** Resting tilt in degrees when not hovered. Default 0. */
  restingTilt?: number;
  /** Disable tilt entirely — rotate always stays at 0. */
  disableTilt?: boolean;
  /** Disable all animations — returns identity transforms. */
  reducedMotion?: boolean;
}

interface UseTactileTransformResult {
  /** Framer Motion animate target. */
  transform: MotionStyle;
  /** Transition to use for the current state — snappier on press. */
  transition: Transition;
}

/**
 * Pure computation hook: derives Framer Motion style values from proximity
 * and press state. Does not track pointer position — pair with usePointerProximity.
 */
const TILT_HOVER_ADJUST = 1.5;

// eslint-disable-next-line max-lines-per-function
export function useTactileTransform(
  proximity: number,
  isPressed: boolean,
  options: UseTactileTransformOptions = {},
): UseTactileTransformResult {
  const { restingTilt = 0, disableTilt = false, reducedMotion = false } = options;

  const transform = useMemo<MotionStyle>(() => {
    if (reducedMotion) {
      return { rotate: 0, scale: 1, y: 0 };
    }
    const rotate = disableTilt
      ? 0
      : restingTilt * (TILT_HOVER / TILT_HOVER_ADJUST) * (1 - proximity);
    const scale = isPressed ? SCALE_PRESS : 1 + (SCALE_HOVER - 1) * proximity;
    const y = proximity === 0 ? 0 : -LIFT_HOVER * proximity;
    return { rotate, scale, y };
  }, [reducedMotion, disableTilt, isPressed, restingTilt, proximity]);

  return {
    transform,
    transition: isPressed ? springPress : springTactile,
  };
}
