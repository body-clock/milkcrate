import { motion, type Transition } from "framer-motion";

import BouncingHand from "./bouncing_hand";

export const GHOST_FINGER_CUE_TEST_ID = "ghost-finger-cue";

const FADE_IN_DURATION = 0.5;
const FADE_IN_DELAY = 0.4;

const fadeInTransition: Transition = {
  duration: FADE_IN_DURATION,
  delay: FADE_IN_DELAY,
};

interface Props {
  reducedMotion: boolean;
}

/**
 * Ghost-finger cue overlay that teaches the pull-down riffle gesture.
 */
export default function GhostFingerCue({ reducedMotion }: Props) {
  return (
    <motion.div
      data-testid={GHOST_FINGER_CUE_TEST_ID}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center select-none pointer-events-none"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fadeInTransition}
    >
      <BouncingHand reducedMotion={reducedMotion} />
    </motion.div>
  );
}
