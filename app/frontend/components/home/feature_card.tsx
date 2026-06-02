import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

interface FeatureData {
  title: string;
  description: string;
}

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;

const FADE_IN_DURATION = 0.4;
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: FADE_IN_DURATION, ease: [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] },
  },
};

export default function FeatureCard({ title, description }: FeatureData) {
  return (
    <motion.div
      variants={fadeIn}
      className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-mc-bg-raised border border-mc-border"
    >
      <h3 className="text-base font-semibold text-mc-text">{title}</h3>
      <p className="text-sm text-mc-text-dim leading-relaxed">{description}</p>
    </motion.div>
  );
}
