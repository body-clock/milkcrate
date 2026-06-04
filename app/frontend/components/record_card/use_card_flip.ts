import { useCallback, useEffect, useRef, useState } from "react";

import { MOVE_THRESHOLD_PX } from "./constants";

interface CardFlipHandlers {
  flipped: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  handleFlip: (e: React.MouseEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

function shouldIgnoreEvent(e: { target: EventTarget }, canFlip: boolean): boolean {
  return !canFlip || !!(e.target as HTMLElement).closest("a, button, form");
}

function usePointerHandlers(canFlip: boolean, flip: () => void) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY };
  };

  const handleFlip = (e: React.MouseEvent) => {
    if (shouldIgnoreEvent(e, canFlip)) {
      return;
    }
    const pd = pointerDown.current;
    if (pd && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > MOVE_THRESHOLD_PX) {
      pointerDown.current = null;
      return;
    }
    pointerDown.current = null;
    flip();
  };

  return { handlePointerDown, handleFlip };
}

function useKeyboardHandler(canFlip: boolean, flip: () => void) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (shouldIgnoreEvent(e, canFlip)) {
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }
      e.preventDefault();
      flip();
    },
    [canFlip, flip],
  );
}

export function useCardFlip(
  canFlip: boolean,
  onFlip: (() => void) | undefined,
  resetKey: string | number | undefined,
): CardFlipHandlers {
  const [flipped, setFlipped] = useState(false);
  const hasCalledOnFlip = useRef(false);
  const flip = useCallback(() => {
    setFlipped((f) => {
      if (!f && !hasCalledOnFlip.current) {
        hasCalledOnFlip.current = true;
        onFlip?.();
      }
      return !f;
    });
  }, [onFlip]);
  useEffect(() => {
    setFlipped(false);
  }, [resetKey]);
  const { handlePointerDown, handleFlip } = usePointerHandlers(canFlip, flip);
  const handleKeyDown = useKeyboardHandler(canFlip, flip);
  return { flipped, handlePointerDown, handleFlip, handleKeyDown };
}
