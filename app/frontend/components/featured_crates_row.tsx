import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  if (crates.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
        <span className="mc-section-name text-base font-semibold">Featured</span>
        <span className="mc-section-count">{crates.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {crates.map((crate) => (
          <CrateCard key={crate.slug} crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
        ))}
      </div>
    </div>
  )
}
