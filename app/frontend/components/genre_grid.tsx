import CrateCard from "./crate_card"
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
    <div className="mb-6">
      <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
        <span className="mc-section-name text-base font-semibold">Browse by genre</span>
        <span className="mc-section-count">{crates.length}</span>
      </div>
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
