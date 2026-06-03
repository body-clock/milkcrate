import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";

interface FeatureData {
  title: string;
  description: string;
}

const FADE_IN_DURATION = 0.4;
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: FADE_IN_DURATION, ease: EASE_OUT },
  },
};

export default function FeatureCard({ title, description }: FeatureData) {
  return (
    <motion.div
      variants={fadeIn}
      className="flex flex-col items-center text-center rounded-lg bg-mc-bg-raised border border-mc-border px-4 py-6 sm:px-6"
    >
      <h3 className="text-sm font-semibold text-mc-text mb-2">{title}</h3>
      <p className="text-xs text-mc-text-dim leading-relaxed max-w-[22ch]">
        {description}
      </p>
    </motion.div>
  );
}
