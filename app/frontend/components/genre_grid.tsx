import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function GenreGrid({ crates, onSelectCrate }: Props) {
  if (crates.length === 0) {
    return (
      <div className="py-8 text-center mc-dim text-sm">
        No genre crates available yet.
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="mc-section-header mb-3">
        <span className="mc-section-name text-base font-semibold">Browse by genre</span>
        <span className="mc-section-count text-xs">{crates.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
