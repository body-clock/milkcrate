import { motion } from "framer-motion";

/** Semi-transparent overlay behind the pile sheet. */
export default function PileSheetBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      aria-hidden="true"
    />
  );
}
