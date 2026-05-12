import CrateCard from "./crate_card"
import SectionHeader from "./section_header"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  if (crates.length === 0) return null

  return (
    <div className="mb-[--mc-section-gap]">
      <SectionHeader title="Featured" count={crates.length} variant="feature" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {crates.map((crate) => (
          <CrateCard key={crate.slug} crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
        ))}
      </div>
    </div>
  )
}
