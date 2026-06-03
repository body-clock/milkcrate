import { motion } from "framer-motion";

export default function AnimatedHeadline({ children }: { children: React.ReactNode }) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="text-2xl font-bold text-mc-text mb-3"
    >
      {children}
    </motion.h1>
  );
}
