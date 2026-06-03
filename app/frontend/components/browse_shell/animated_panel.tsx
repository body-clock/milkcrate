import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useReducedMotionContext } from "@/components/storefront_motion_config";
import { reducedMotionTransition, springTactile } from "@/lib/motion_tokens";

interface Props {
  mode: string;
  children: ReactNode;
}

export default function AnimatedPanel({ mode, children }: Props) {
  const prefersReducedMotion = useReducedMotionContext();

  return (
    <motion.div
      key={mode}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
      transition={prefersReducedMotion ? reducedMotionTransition : springTactile}
    >
      {children}
    </motion.div>
  );
}
