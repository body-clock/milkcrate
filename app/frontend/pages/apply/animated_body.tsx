import { motion } from "framer-motion";

export default function AnimatedBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="text-sm text-mc-text-dim leading-relaxed max-w-sm"
    >
      {children}
    </motion.p>
  );
}
