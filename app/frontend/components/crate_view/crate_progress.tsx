import { motion } from "framer-motion";
import {
  SCALE_PRESS,
  springPress,
  transitionCrate,
  reducedMotionTransition,
} from "../../lib/motion_tokens";
import {
  RIFFLE_LANGUAGE,
  type RiffleDirection,
} from "../../lib/riffle_navigation";

interface CrateProgressProps {
  index: number;
  total: number;
  progress: number;
  edgeStatus: string | null;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  navigate: (dir: RiffleDirection) => void;
}

/**
 * Progress bar and navigation controls for crate browsing.
 * Renders front/deeper navigation buttons with a progress bar
 * and edge-of-crate status messages.
 */
export default function CrateProgress({
  index,
  total,
  progress,
  edgeStatus,
  isCompact,
  prefersReducedMotion,
  navigate,
}: CrateProgressProps) {
  return (
    <>
      <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${isCompact ? "mt-1 mb-3" : "mb-4"}`}>
        <div
          className={`flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim select-none ${isCompact ? "mb-1" : "mb-1.5"}`}
        >
          <span>{RIFFLE_LANGUAGE.progressStart}</span>
          <span>{RIFFLE_LANGUAGE.progressEnd}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={RIFFLE_LANGUAGE.progress(index + 1, total)}
          className="h-1.5 bg-mc-bg-raised rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={prefersReducedMotion ? reducedMotionTransition : transitionCrate}
          />
        </div>
      </div>

      <div className={`flex items-center justify-center ${isCompact ? "gap-3" : "gap-4 sm:gap-6"}`}>
        <motion.button
          type="button"
          onClick={() => navigate("front")}
          disabled={index <= 0}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label={RIFFLE_LANGUAGE.controls.front}
        >
          ↑
        </motion.button>

        <span
          className={`${isCompact ? "w-16 text-xs" : "w-20 text-sm"} text-mc-text-dim tabular-nums text-center select-none`}
          aria-label={RIFFLE_LANGUAGE.progress(index + 1, total)}
          aria-live="polite"
          aria-atomic="true"
        >
          {RIFFLE_LANGUAGE.count(index + 1, total)}
        </span>

        <motion.button
          type="button"
          onClick={() => navigate("deeper")}
          disabled={index >= total - 1}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label={RIFFLE_LANGUAGE.controls.deeper}
        >
          ↓
        </motion.button>
      </div>

      {edgeStatus && (
        <p className="mt-2 text-center text-[11px] text-mc-text-dim" aria-live="polite">
          {edgeStatus}
        </p>
      )}
    </>
  );
}
