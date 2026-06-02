import { motion } from "framer-motion";
import { springTactile } from "@/lib/motion_tokens";

export function ToastMotion({
  lastAdded,
  title,
  reducedMotion,
}: {
  lastAdded: { id: number };
  title: string;
  reducedMotion: boolean;
}) {
  const initial = reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 };
  const exit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 };

  return (
    <motion.div
      key={lastAdded.id}
      role="status"
      aria-live="polite"
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      exit={exit}
      transition={springTactile}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-mc-bg-raised border border-mc-border shadow-lg text-sm font-medium text-mc-text pointer-events-none select-none whitespace-nowrap"
    >
      Added {title} to pile
    </motion.div>
  );
}
