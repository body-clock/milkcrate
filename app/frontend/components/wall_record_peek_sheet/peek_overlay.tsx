import { motion } from "framer-motion";

const FADE_DURATION = 0.15;

export function PeekOverlay({ reducedMotion, onClose }: { reducedMotion: boolean; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/55"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : FADE_DURATION }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
