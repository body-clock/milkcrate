import { motion } from "framer-motion";

import { transitionCrate, reducedMotionTransition } from "../../lib/motion_tokens";
import { RIFFLE_LANGUAGE } from "../../lib/riffle_navigation";

interface Props {
  index: number;
  total: number;
  progress: number;
  isCompact: boolean;
  prefersReducedMotion: boolean;
}

function renderProgressLabels(isCompact: boolean) {
  return (
    <div
      className={`flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim select-none ${isCompact ? "mb-1" : "mb-1.5"}`}
    >
      <span>{RIFFLE_LANGUAGE.progressStart}</span>
      <span>{RIFFLE_LANGUAGE.progressEnd}</span>
    </div>
  );
}

function renderProgressBar(index: number, total: number, progress: number, prefersReducedMotion: boolean) {
  return (
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
  );
}

/** Step-through navigation label row and animated progress bar. */
export default function ProgressBarSection({
  index,
  total,
  progress,
  isCompact,
  prefersReducedMotion,
}: Props) {
  return (
    <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${isCompact ? "mt-1 mb-3" : "mb-4"}`}>
      {renderProgressLabels(isCompact)}
      {renderProgressBar(index, total, progress, prefersReducedMotion)}
    </div>
  );
}
