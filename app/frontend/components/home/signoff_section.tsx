import { motion } from "framer-motion";

import { EASE_OUT } from "@/lib/motion_tokens";

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: FADE_UP_DURATION, ease: EASE_OUT },
  },
};

interface Props {
  text: string;
}

export default function SignoffSection({ text }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="border-t border-mc-border py-8 sm:py-10"
    >
      <div className="max-w-md mx-auto text-center">
        <motion.p variants={fadeUp} className="text-sm text-mc-text-dim leading-relaxed">
          {text}
        </motion.p>
      </div>
    </motion.section>
  );
}
