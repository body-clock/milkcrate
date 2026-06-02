import { useState, useCallback, useMemo } from "react";
import type { MotionStyle, Transition } from "framer-motion";
import { useReducedMotionContext } from "@/components/storefront_motion_config";
import { usePointerProximity } from "./use_pointer_proximity";
import { useTactileTransform } from "./use_tactile_transform";

interface UseTactileHoverOptions {
  /** Resting tilt in degrees when not hovered. Default 0. */
  restingTilt?: number;
  /** Disable tilt entirely — rotate always stays at 0. */
  disableTilt?: boolean;
}

interface TactileHandlers {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
}

interface TactileState {
  /** True when proximity > 0 (derived — not a separate state). */
  isHovered: boolean;
  isPressed: boolean;
  /** Cursor proximity to element center, 0 (idle) to 1 (centered). */
  proximity: number;
  /** Framer Motion animate target — updated reactively. */
  transform: MotionStyle;
  /** Transition to use for the current state — snappier on press. */
  transition: Transition;
  /** Pointer event handlers to spread onto a motion element. */
  handlers: TactileHandlers;
}

/**
 * Cursor-proximity hover hook. Tracks pointer position relative to
 * the element center and returns a continuous 0–1 proximity value.
 * Falls back to zero-proximity on touch devices and when reduced
 * motion is active (no hover flash — press state handles feedback).
 *
 * Composes usePointerProximity (pointer tracking) and
 * useTactileTransform (motion value computation).
 */
export function useTactileHover(options: UseTactileHoverOptions = {}): TactileState {
  const { restingTilt = 0, disableTilt = false } = options;
  const reducedMotion = useReducedMotionContext();

  const { proximity, handlers: proximityHandlers } = usePointerProximity({
    disabled: reducedMotion,
  });

  const [isPressed, setIsPressed] = useState(false);

  const down = useCallback(() => {
    if (reducedMotion) {return;}
    setIsPressed(true);
  }, [reducedMotion]);

  const up = useCallback(() => {
    setIsPressed(false);
  }, []);

  const leaveWithPressReset = useCallback(
    (e: React.PointerEvent) => {
      proximityHandlers.onPointerLeave(e);
      setIsPressed(false);
    },
    [proximityHandlers],
  );

  const handlers = useMemo<TactileHandlers>(
    () => ({
      onPointerEnter: proximityHandlers.onPointerEnter,
      onPointerLeave: leaveWithPressReset,
      onPointerDown: down,
      onPointerUp: up,
      onPointerMove: proximityHandlers.onPointerMove,
    }),
    [
      proximityHandlers.onPointerEnter,
      proximityHandlers.onPointerMove,
      leaveWithPressReset,
      down,
      up,
    ],
  );

  const { transform, transition } = useTactileTransform(proximity, isPressed, {
    restingTilt,
    disableTilt,
    reducedMotion,
  });

  const isHovered = proximity > 0;

  return {
    isHovered,
    isPressed,
    proximity,
    transform,
    transition,
    handlers,
  };
}
