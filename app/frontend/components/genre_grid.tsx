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
    <div className="mb-8">
      <div className="-mx-4 bg-mc-accent mb-6">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <span className="font-serif text-base font-bold tracking-wide text-mc-bg">
            Browse by genre
          </span>
          <span className="font-sans text-xs font-bold text-mc-bg">
            {crates.length}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
