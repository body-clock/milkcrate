import { motion } from "framer-motion";

const fadeInAnim = { opacity: 0, y: 8 };
const visibleAnim = { opacity: 1, y: 0 };

export const DELAYS = {
  immediate: { duration: 0.3 },
  step1: { delay: 0.1, duration: 0.3 },
  step2: { delay: 0.2, duration: 0.3 },
  step3: { delay: 0.3, duration: 0.3 },
} as const;

export default function AnimatedBlock({
  delay,
  className,
  children,
}: {
  delay: keyof typeof DELAYS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={fadeInAnim}
      animate={visibleAnim}
      transition={DELAYS[delay]}
      className={className}
    >
      {children}
    </motion.div>
  );
}
