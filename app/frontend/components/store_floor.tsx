import { motion } from "framer-motion"
import CrateShelf from "./crate_shelf"
import FeaturedCratesRow from "./featured_crates_row"
import GenreGrid from "./genre_grid"
import { useTactileHover } from "@/hooks/use_tactile_hover"
import { useViewport } from "@/hooks/use_viewport"
import { springTactile, springPress, SCALE_HOVER, SCALE_PRESS } from "@/lib/motion_tokens"
import type { Crate } from "../types/inertia"
import type { StorefrontSection } from "../types/inertia"

interface Props {
  sections: StorefrontSection[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

/**
 * Wraps the picks CrateShelf in a tactile container on desktop viewports.
 * On compact, renders the shelf directly without animation wrapper.
 */
function PicksShelf({
  crate,
  onSelectCrate,
  picksPreviewCount,
  today,
}: {
  crate: Crate
  onSelectCrate: (slug: string, startIndex?: number) => void
  picksPreviewCount: number
  today: string
}) {
  const { isCompact } = useViewport()
  const { isHovered, isPressed, handlers } = useTactileHover()

  const shelf = (
    <CrateShelf
      crate={crate}
      interactive
      onSelectCrate={onSelectCrate}
      previewCount={picksPreviewCount}
      meta={today}
      openLabel="DIG →"
      tactileThumbnails={!isCompact}
    />
  )

  if (isCompact) return shelf

  return (
    <motion.div
      className="w-full rounded-lg overflow-hidden border"
      animate={{
        borderColor: isHovered ? "var(--mc-accent)" : "var(--mc-border)",
        scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1,
        y: isHovered ? -3 : 0,
        rotate: isHovered ? 0 : -0.5,
      }}
      transition={isPressed ? springPress : springTactile}
      {...handlers}
    >
      {shelf}
    </motion.div>
  )
}

export default function StoreFloor({ sections, onSelectCrate }: Props) {
  const { isCompact } = useViewport()

  // Tier-specific preview density: compact shows fewer, wide shows more
  const picksPreviewCount = isCompact ? 4 : 8

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          const picks = section.crate
          const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

          return (
            picks.records.length > 0 && (
              <PicksShelf
                key="picks"
                crate={picks}
                onSelectCrate={onSelectCrate}
                picksPreviewCount={picksPreviewCount}
                today={today}
              />
            )
          )
        }

        if (section.key === "featured_crates") {
          return <FeaturedCratesRow key="featured" crates={section.crates} onSelectCrate={onSelectCrate} />
        }

        if (section.key === "genre_grid") {
          return <GenreGrid key="genres" crates={section.crates} onSelectCrate={onSelectCrate} />
        }

        return null
      })}
    </div>
  )
}