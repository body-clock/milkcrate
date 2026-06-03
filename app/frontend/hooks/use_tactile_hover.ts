import type { MotionStyle, Transition } from "framer-motion";
import { useState, useCallback, useMemo } from "react";

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
function usePressState(reducedMotion: boolean) {
  const [isPressed, setIsPressed] = useState(false);

  const down = useCallback(() => {
    if (reducedMotion) {
      return;
    }
    setIsPressed(true);
  }, [reducedMotion]);

  const up = useCallback(() => {
    setIsPressed(false);
  }, []);

  return { isPressed, down, up };
}

function buildTactileHandlers(
  ph: ReturnType<typeof usePointerProximity>["handlers"],
  leave: (e: React.PointerEvent) => void,
  down: () => void,
  up: () => void,
): TactileHandlers {
  return {
    onPointerEnter: ph.onPointerEnter,
    onPointerLeave: leave,
    onPointerDown: down,
    onPointerUp: up,
    onPointerMove: ph.onPointerMove,
  };
}

function useTactileHandlers(
  ph: ReturnType<typeof usePointerProximity>["handlers"],
  down: () => void,
  up: () => void,
): TactileHandlers {
  const leave = useCallback(
    (e: React.PointerEvent) => {
      ph.onPointerLeave(e);
      up();
    },
    [ph, up],
  );
  return useMemo(() => buildTactileHandlers(ph, leave, down, up), [ph, leave, down, up]);
}

export function useTactileHover(options: UseTactileHoverOptions = {}): TactileState {
  const { restingTilt = 0, disableTilt = false } = options;
  const reducedMotion = useReducedMotionContext();
  const { proximity, handlers: proximityHandlers } = usePointerProximity({
    disabled: reducedMotion,
  });
  const { isPressed, down, up } = usePressState(reducedMotion);
  const handlers = useTactileHandlers(proximityHandlers, down, up);
  const { transform, transition } = useTactileTransform(proximity, isPressed, {
    restingTilt,
    disableTilt,
    reducedMotion,
  });

  return { isHovered: proximity > 0, isPressed, proximity, transform, transition, handlers };
}
