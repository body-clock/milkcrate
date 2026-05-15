import { motion } from "framer-motion"

export const GHOST_FINGER_CUE_TEST_ID = "ghost-finger-cue"

/**
 * Material Symbols "swipe_down" icon — a hand silhouette with one finger
 * extended downward and motion-trail arcs below, communicating
 * "touch and drag down."
 */
function SwipeDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      width="80"
      height="80"
      fill="white"
      opacity="0.8"
      aria-hidden="true"
    >
      <path d="M170-389 44-515l28-28 74 73q-8-32-12-64t-4-64q0-77 24.5-149T226-880l29 29q-42 55-63.5 119.5T170-598q0 34 6 67t14 65l78-77 28 28-126 126Zm476 263q-20 8-42 7t-42-11L295-254l7-26q5-19 19-31t34-14l99-8-117-320q-5-12 .5-22.5T355-691q12-5 23 .5t16 17.5l144 394-128 12 178 83q9 4 19 4t19-3l159-58q39-14 56.5-51.5T845-369l-62-169q-5-12 .5-23t17.5-16q12-5 23 .5t16 17.5l61 169q23 63-4.5 122.5T806-185l-160 59Zm-83-279-58-160q-5-12 .5-22.5T523-603q12-5 22.5.5T561-585l58 160-56 20Zm118-43-44-122q-5-12 .5-23t17.5-16q12-5 22.5.5T693-591l45 123-57 20Zm-4 104Z" />
    </svg>
  )
}

interface Props {
  reducedMotion: boolean
}

/**
 * Ghost-finger cue that overlays the active record card, teaching the
 * pull-down riffle gesture. Uses the Material Symbols swipe_down hand
 * icon, pulsing downward. No text — pure gesture.
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
            : { y: [0, 26, 0] }
        }
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : { repeat: Infinity, duration: 2.0, ease: "easeInOut", times: [0, 0.5, 1] }
        }
        style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.35))" }}
      >
        <SwipeDownIcon />
      </motion.div>
    </motion.div>
  )
}
