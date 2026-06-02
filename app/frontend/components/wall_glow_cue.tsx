import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { isCueLearned, markCueLearned } from "@/lib/cue_lesson";
import { useReducedMotionContext } from "./storefront_motion_config";

export const WALL_CUE_STORAGE_KEY = "mc-wall-cue-dismissed";

const CUE_DURATION_MS = 3000;

interface Props {
  /** Called when the cue has been dismissed (tap, timer, or reduced motion). */
  onDismiss?: () => void;
}

/**
 * One-time ghost glow cue for the Wall — a soft radial glow in the accent
 * color that breathes once across the grid area, then dissolves.
 *
 * Fires on first visit (localStorage key mc-wall-cue-dismissed), dissolves
 * on pointer-down or after 3 seconds. Respects prefers-reduced-motion by
 * never rendering. Never blocks interaction (pointer-events: none).
 */
export default function WallGlowCue({ onDismiss }: Props) {
  const reducedMotion = useReducedMotionContext();
  const [visible, setVisible] = useState(false);
  const dismissCalled = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    // Respect OS preference — no motion means no cue.
    if (reducedMotion) {
      return;
    }

    // Already seen this cue? Don't render.
    if (isCueLearned(WALL_CUE_STORAGE_KEY)) {
      return;
    }

    setVisible(true);

    // Auto-dismiss after CUE_DURATION_MS.
    const timer = setTimeout(() => {
      dismiss();
    }, CUE_DURATION_MS);

    function dismiss() {
      if (dismissCalled.current) return;
      dismissCalled.current = true;

      markCueLearned(WALL_CUE_STORAGE_KEY);
      setVisible(false);
      onDismissRef.current?.();
    }

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Clear the auto-dismiss timer on pointer-down so the glow doesn't
  // dissolve mid-press while the grid is in its pressed-scale state.
  function handlePointerDown() {
    if (dismissCalled.current) return;
    dismissCalled.current = true;

    markCueLearned(WALL_CUE_STORAGE_KEY);
    setVisible(false);
    onDismissRef.current?.();
  }

  if (!visible || reducedMotion) {
    return null;
  }

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.25, 0] }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 2,
        ease: "easeInOut",
      }}
      onPointerDown={handlePointerDown}
      style={{
        background: "radial-gradient(ellipse at center, var(--mc-accent) 0%, transparent 70%)",
      }}
      aria-hidden="true"
    />
  );
}
