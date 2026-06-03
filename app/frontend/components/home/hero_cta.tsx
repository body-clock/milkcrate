import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import { actionClassName } from "@/components/ui/action";
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
  ctaDemo: string;
  demoHref: string;
}

export default function HeroCta({ ctaDemo, demoHref }: Props) {
  return (
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
  );
}
