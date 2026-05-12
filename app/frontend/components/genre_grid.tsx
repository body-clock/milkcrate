import CrateCard from "./crate_card"
import SectionHeader from "./section_header"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function GenreGrid({ crates, onSelectCrate }: Props) {
  if (crates.length === 0) {
    return null
  }

  return (
    <div className="mb-[--mc-section-gap] border-t border-mc-border pt-[--mc-section-gap]">
      <SectionHeader title="Browse by genre" count={crates.length} variant="compact" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {crates.map((crate) => (
          <CrateCard
            key={crate.slug}
            crate={crate}
            variant="genre"
            onSelectCrate={onSelectCrate}
          />
        ))}
      </div>
    </div>
  )
}
