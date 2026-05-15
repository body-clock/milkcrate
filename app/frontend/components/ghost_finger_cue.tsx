import { motion } from "framer-motion"

export const GHOST_FINGER_CUE_TEST_ID = "ghost-finger-cue"

/**
 * A single finger silhouette pointing down, with subtle motion trails
 * fading below — teaches the pull-down riffle gesture.
 */
function FingerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 72"
      width="48"
      height="72"
      fill="none"
      aria-hidden="true"
    >
      {/* Finger body — rounded rect from fingertip to base */}
      <rect
        x="15"
        y="6"
        width="18"
        height="34"
        rx="9"
        fill="white"
        opacity="0.9"
      />

      {/* Motion trails — fading dashes below the finger */}
      <line x1="24" y1="48" x2="24" y2="54" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="24" y1="53" x2="24" y2="59" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="24" y1="58" x2="24" y2="64" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </svg>
  )
}

interface Props {
  reducedMotion: boolean
}

/**
 * Ghost-finger cue that overlays the active record card, teaching the
 * pull-down riffle gesture. A single finger silhouette pulses downward
 * with fading motion trails. No text — pure gesture.
 */
export default function GhostFingerCue({ reducedMotion }: Props) {
  return (
    <motion.div
      data-testid={GHOST_FINGER_CUE_TEST_ID}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center select-none pointer-events-none"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <motion.div
        initial={{ y: 0 }}
        animate={
          reducedMotion
            ? { y: 0 }
            : { y: [0, 22, 0] }
        }
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : { repeat: Infinity, duration: 2.0, ease: "easeInOut", times: [0, 0.5, 1] }
        }
        style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.4))" }}
      >
        <FingerIcon />
      </motion.div>
    </motion.div>
  )
}
