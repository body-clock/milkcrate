import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";

import { useReducedMotionContext } from "@/components/storefront_motion_config";
import { usePileContext } from "@/contexts/pile_context";

import { ToastMotion } from "./toast_motion";

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
    if (!lastAdded) {
      return;
    }
    const timer = setTimeout(clearLastAdded, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [lastAdded, clearLastAdded]);

  const title = lastAdded?.title ? truncate(lastAdded.title, TITLE_MAX_CHARS) : "record";

  return (
    <AnimatePresence>
      {lastAdded && (
        <ToastMotion lastAdded={lastAdded} title={title} reducedMotion={reducedMotion} />
      )}
    </AnimatePresence>
  );
}
