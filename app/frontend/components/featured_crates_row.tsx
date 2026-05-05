import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  if (crates.length === 0) return null

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {crates.map((crate) => (
        <CrateCard key={crate.slug} crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
      ))}
    </div>
  )
}
