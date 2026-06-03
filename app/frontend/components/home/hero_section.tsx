import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import { actionClassName } from "@/components/ui/action";

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;
const EASE_OUT = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] as const;

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
  ctaDemo: string;
  demoHref: string;
}

// eslint-disable-next-line eslint/max-lines-per-function
export default function HeroSection({ headline, subhead, ctaDemo, demoHref }: Props) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      aria-labelledby="home-headline"
      className="flex flex-col items-center text-center pt-4 pb-10 sm:pb-16"
    >
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
      <motion.div variants={fadeUp}>
        <Link
          href={demoHref}
          className={actionClassName({
            size: "lg",
            className: "w-full text-center tracking-wide sm:w-auto",
          })}
        >
          {ctaDemo}
        </Link>
      </motion.div>
    </motion.section>
  );
}
