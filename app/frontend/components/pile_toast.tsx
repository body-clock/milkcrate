import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePileContext } from "@/contexts/pile_context";
import { useReducedMotionContext } from "@/components/storefront_motion_config";
import { springTactile } from "@/lib/motion_tokens";

const TOAST_DURATION_MS = 2000;
const TITLE_MAX_CHARS = 30;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}\u2026`;
}

/**
 * A brief confirmation toast that appears when a record is added to the pile.
 * Mounts inside AppLayoutContent so it's available across all modes.
 * Auto-dismisses after 2 seconds. Respects prefers-reduced-motion.
 */
export default function PileToast() {
  const { lastAdded, clearLastAdded } = usePileContext();
  const reducedMotion = useReducedMotionContext();

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(clearLastAdded, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [lastAdded, clearLastAdded]);

  const title = lastAdded?.title ? truncate(lastAdded.title, TITLE_MAX_CHARS) : "record";

  return (
    <AnimatePresence>
      {lastAdded && (
        <motion.div
          key={lastAdded.id}
          role="status"
          aria-live="polite"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={springTactile}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-mc-bg-raised border border-mc-border shadow-lg text-sm font-medium text-mc-text pointer-events-none select-none whitespace-nowrap"
        >
          Added {title} to pile
        </motion.div>
      )}
    </AnimatePresence>
  );
}
