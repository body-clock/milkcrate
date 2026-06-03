import { motion } from "framer-motion";

import { SCALE_PRESS, springPress } from "../../lib/motion_tokens";
import { RIFFLE_LANGUAGE, type RiffleDirection } from "../../lib/riffle_navigation";

interface Props {
  index: number;
  total: number;
  isCompact: boolean;
  navigate: (dir: RiffleDirection) => void;
}

function navButtonClass(isCompact: boolean): string {
  return `flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`;
}

function renderNavButton({ label, action, disabled, ariaLabel, isCompact }: { label: string; action: () => void; disabled: boolean; ariaLabel: string; isCompact: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={action}
      disabled={disabled}
      whileTap={{ scale: SCALE_PRESS }}
      transition={springPress}
      className={navButtonClass(isCompact)}
      aria-label={ariaLabel}
    >
      {label}
    </motion.button>
  );
}

function renderPositionCount(index: number, total: number, isCompact: boolean) {
  return (
    <span
      className={`${isCompact ? "w-16 text-xs" : "w-20 text-sm"} text-mc-text-dim tabular-nums text-center select-none`}
      aria-label={RIFFLE_LANGUAGE.progress(index + 1, total)}
      aria-live="polite"
      aria-atomic="true"
    >
      Record {RIFFLE_LANGUAGE.count(index + 1, total)}
    </span>
  );
}

/** Front/deeper navigation buttons with current-position count. */
export default function NavigationButtons({ index, total, isCompact, navigate }: Props) {
  return (
    <div className={`flex items-center justify-center ${isCompact ? "gap-3" : "gap-4 sm:gap-6"}`}>
      {renderNavButton({ label: "↑", action: () => navigate("front"), disabled: index <= 0, ariaLabel: RIFFLE_LANGUAGE.controls.front, isCompact })}
      {renderPositionCount(index, total, isCompact)}
      {renderNavButton({ label: "↓", action: () => navigate("deeper"), disabled: index >= total - 1, ariaLabel: RIFFLE_LANGUAGE.controls.deeper, isCompact })}
    </div>
  );
}
