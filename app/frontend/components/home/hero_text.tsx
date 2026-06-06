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
  headline: string;
  subhead: string;
}

export default function HeroText({ headline, subhead }: Props) {
  return (
    <>
      <motion.h1
        variants={fadeUp}
        id="home-headline"
        className="text-2xl sm:text-3xl font-bold text-mc-text mb-3 leading-tight max-w-md"
      >
        {headline}
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="text-sm sm:text-base text-mc-text-dim mb-8 leading-relaxed max-w-md"
      >
        {subhead}
      </motion.p>
    </>
  );
}
