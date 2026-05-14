import CrateShelf from "./crate_shelf"
import FeaturedCratesRow from "./featured_crates_row"
import GenreGrid from "./genre_grid"
import { useViewport } from "@/hooks/use_viewport"
import type { StorefrontSection } from "../types/inertia"

interface Props {
  sections: StorefrontSection[]
  onSelectCrate: (slug: string, startIndex?: number) => void
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
              <CrateShelf
                key="picks"
                crate={picks}
                interactive
                onSelectCrate={onSelectCrate}
                previewCount={picksPreviewCount}
                meta={today}
                openLabel="DIG →"
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