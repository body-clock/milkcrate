import { motion } from "framer-motion";
import type { RefObject } from "react";

import { CloseButton } from "./close_button";

function panelClass(isCompact: boolean): string {
  if (isCompact) {
    return "fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-0.75rem)] overflow-hidden rounded-t-[1.75rem] border-t border-mc-border bg-mc-bg shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col";
  }
  return "fixed top-0 right-0 bottom-0 z-50 w-96 overflow-hidden border-l border-mc-border bg-mc-bg shadow-2xl flex flex-col";
}

function animationValues(isCompact: boolean, skipAnimation?: boolean) {
  const slide = isCompact ? { y: "100%" } : { x: "100%" };
  const center = isCompact ? { y: 0 } : { x: 0 };
  // When skipping animation, start at final position (no initial offset)
  if (skipAnimation) return { initial: center, animate: center, exit: slide };
  return { initial: slide, animate: center, exit: slide };
}

interface PanelProps {
  dialogRef: RefObject<HTMLDivElement | null>;
  isCompact: boolean;
  transition: Record<string, unknown>;
  onClose: () => void;
  children: React.ReactNode;
  meta: string;
  skipAnimation?: boolean;
}

export function PeekSheetPanel({
  dialogRef, isCompact, transition, onClose, children, meta, skipAnimation,
}: PanelProps) {
  const anim = animationValues(isCompact, skipAnimation);
  return (
    <motion.div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
      aria-label="Record peek"
      aria-describedby={meta ? "wall-peek-meta" : undefined}
      className={panelClass(isCompact)} {...anim} transition={transition}>
      <div className="absolute right-2 top-2 z-10">
        <CloseButton onClose={onClose} />
      </div>
      {children}
    </motion.div>
  );
}
