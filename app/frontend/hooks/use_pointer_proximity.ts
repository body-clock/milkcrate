import { useState, useCallback, useEffect, useRef } from "react";

const isBrowser = typeof window !== "undefined";
const HALF = 2;
const PROXIMITY_FACTOR = 0.6;
interface PointerProximityHandlers {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
}

interface UsePointerProximityOptions {
  /** Disable proximity tracking entirely (e.g., when reduced motion is active). */
  disabled?: boolean;
}

interface UsePointerProximityResult {
  /** Cursor proximity to element center, 0 (idle) to 1 (centered). */
  proximity: number;
  /** Pointer event handlers to spread onto a motion element. */
  handlers: PointerProximityHandlers;
}
function computeProximityFromRect(
  rect: DOMRect | { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): number {
  const cx = rect.left + rect.width / HALF;
  const cy = rect.top + rect.height / HALF;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.hypot(rect.width, rect.height) * PROXIMITY_FACTOR;
  return Math.max(0, Math.min(1, 1 - dist / maxDist));
}

function computeProximity(e: React.PointerEvent): number {
  const el = e.currentTarget as HTMLElement | null;
  if (!el) {
    return 0;
  }
  const rect = el.getBoundingClientRect();
  return computeProximityFromRect(rect, e.clientX, e.clientY);
}
function processPointerEnter(
  e: React.PointerEvent,
  disabled: boolean,
): { isTouch: boolean; proximity: number } {
  if (!isBrowser || disabled) {
    return { isTouch: false, proximity: 0 };
  }
  const isTouch = e.pointerType !== "mouse";
  if (isTouch) {
    return { isTouch: true, proximity: 0 };
  }
  return { isTouch: false, proximity: computeProximity(e) };
}
function usePointerEnter(
  disabled: boolean,
  setProximity: React.Dispatch<React.SetStateAction<number>>,
): {
  handler: (e: React.PointerEvent) => boolean;
  isTouchRef: React.MutableRefObject<boolean>;
} {
  const isTouchRef = useRef(false);
  const handler = useCallback(
    (e: React.PointerEvent) => {
      const { isTouch, proximity: prox } = processPointerEnter(e, disabled);
      setProximity(prox);
      return isTouch;
    },
    [disabled, setProximity],
  );
  return { handler, isTouchRef };
}
function getTargetRect(e: React.PointerEvent): DOMRect | null {
  const target = e.currentTarget as HTMLElement | null;
  if (!target) {
    return null;
  }
  return target.getBoundingClientRect();
}

function resolveMoveRaf(
  e: React.PointerEvent,
  skipMovement: boolean,
  currentRaf: number | null,
  setProximity: (n: number) => void,
): number | null {
  if (!isBrowser || skipMovement) {
    return currentRaf;
  }
  const rect = getTargetRect(e);
  if (!rect) {
    return currentRaf;
  }
  if (currentRaf !== null) {
    cancelAnimationFrame(currentRaf);
  }
  return requestAnimationFrame(() =>
    setProximity(computeProximityFromRect(rect, e.clientX, e.clientY)));
}
function usePointerMove(
  disabled: boolean,
  isTouchRef: React.MutableRefObject<boolean>,
  setProximity: (n: number) => void,
): {
  handler: (e: React.PointerEvent) => void;
  rafRef: React.MutableRefObject<number | null>;
} {
  const rafRef = useRef<number | null>(null);
  const handler = useCallback(
    (e: React.PointerEvent) => {
      rafRef.current = resolveMoveRaf(
        e, disabled || isTouchRef.current, rafRef.current, setProximity);
    },
    [disabled, isTouchRef, rafRef, setProximity],
  );
  return { handler, rafRef };
}
function usePointerLeave(
  rafRef: React.MutableRefObject<number | null>,
  setProximity: React.Dispatch<React.SetStateAction<number>>,
): () => void {
  return useCallback(
    () => {
      if (!isBrowser) {
        return;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      setProximity(0);
    },
    [rafRef, setProximity],
  );
}
/** Tracks pointer proximity (0–1) relative to element center. */
export function usePointerProximity(
  options: UsePointerProximityOptions = {},
): UsePointerProximityResult {
  const { disabled = false } = options;
  const [proximity, setProximity] = useState(0);
  const { handler: enterHandler, isTouchRef } = usePointerEnter(disabled, setProximity);
  const { handler: move, rafRef } = usePointerMove(disabled, isTouchRef, setProximity);
  const leave = usePointerLeave(rafRef, setProximity);
  const enter = useCallback(
    (e: React.PointerEvent) => { isTouchRef.current = enterHandler(e); },
    [enterHandler, isTouchRef],
  );
  useEffect(() => () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); }
  }, [rafRef]);
  return {
    proximity,
    handlers: { onPointerEnter: enter, onPointerLeave: leave, onPointerMove: move },
  };
}
