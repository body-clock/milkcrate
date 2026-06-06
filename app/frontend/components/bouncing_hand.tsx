import { motion, type Transition, type Variants } from "framer-motion";

import SwipeDownIcon from "./swipe_down_icon";

const BOUNCE_Y = 26;
const PULSE_DURATION = 2.0;
const REDUCED_DURATION = 0.2;

const TIMES_MIDPOINT = 0.5;

const bounceVariants: Variants = {
  start: { y: 0 },
  bounce: { y: [0, BOUNCE_Y, 0] },
};

const bounceTransition: Transition = {
  duration: PULSE_DURATION,
  ease: "easeInOut",
  times: [0, TIMES_MIDPOINT, 1],
  repeat: Infinity,
};

export default function BouncingHand({ reducedMotion }: { reducedMotion: boolean }) {
  const animate = reducedMotion ? "start" : "bounce";
  const transition = animate === "start" ? { duration: REDUCED_DURATION } : bounceTransition;

  return (
    <motion.div
      variants={bounceVariants}
      initial="start"
      animate={animate}
      transition={transition}
      style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.35))" }}
    >
      <SwipeDownIcon />
    </motion.div>
  );
}
