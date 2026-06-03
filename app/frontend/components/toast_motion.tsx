import { motion } from "framer-motion";

import { springTactile } from "@/lib/motion_tokens";

const TOAST_CLASS =
  "fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-mc-bg-raised border border-mc-border shadow-lg text-sm font-medium text-mc-text pointer-events-none select-none whitespace-nowrap";

export function ToastMotion({
  lastAdded, title, reducedMotion,
}: {
  lastAdded: { id: number }; title: string; reducedMotion: boolean;
}) {
  const anim = reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 };
  const exitAnim = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 };
  return (
    <motion.div key={lastAdded.id} role="status" aria-live="polite"
      initial={anim} animate={{ opacity: 1, y: 0 }} exit={exitAnim}
      transition={springTactile} className={TOAST_CLASS}>
      Added {title} to pile
    </motion.div>
  );
}
