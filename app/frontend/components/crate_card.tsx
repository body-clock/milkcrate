import { motion } from "framer-motion"
import { useTactileHover } from "@/hooks/use_tactile_hover"
import { springTactile, springPress, SCALE_HOVER, SCALE_PRESS } from "@/lib/motion_tokens"
import CrateShelf from "./crate_shelf"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  variant: "featured" | "genre"
  onSelectCrate: (slug: string, startIndex?: number) => void
}

/**
 * A tactile crate card — wraps CrateShelf in a Framer Motion container
 * that applies cursor-proximity hover animations (scale, lift, tilt,
 * border glow).
 */
export default function CrateCard({ crate, variant, onSelectCrate }: Props) {
  const { isHovered, isPressed, handlers } = useTactileHover()

  return (
    <motion.div
      animate={{
        borderColor: isHovered ? "var(--mc-accent)" : "var(--mc-border)",
        scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1,
        y: isHovered ? -3 : 0,
        rotate: isHovered ? 0 : -0.5,
      }}
      transition={isPressed ? springPress : springTactile}
      {...handlers}
    >
      <CrateShelf
        crate={crate}
        interactive
        onSelectCrate={onSelectCrate}
        previewCount={4}
        openLabel="DIG →"
        headerSize={variant}
      />
    </motion.div>
  )
}
