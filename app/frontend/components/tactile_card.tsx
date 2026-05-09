import { motion } from "framer-motion"
import { useTactileHover } from "@/hooks/use_tactile_hover"

interface Props {
  /** Resting rotation in degrees when not hovered. */
  restingTilt?: number
  /** Disable tilt entirely. */
  disableTilt?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * A motion.div wrapper that gives any content tactile hover/press
 * behavior. Consumes useTactileHover and wires its transform +
 * pointer handlers to framer-motion props.
 *
 * Drop-in: replace a plain <div> with <TactileCard> and children
 * get lift, scale, and tilt animation with zero per-component config.
 */
export default function TactileCard({
  restingTilt,
  disableTilt,
  children,
  className,
  style,
}: Props) {
  const { transform, transition, handlers } = useTactileHover({ restingTilt, disableTilt })

  return (
    <motion.div
      animate={transform}
      transition={transition}
      className={className}
      style={style}
      {...handlers}
    >
      {children}
    </motion.div>
  )
}
