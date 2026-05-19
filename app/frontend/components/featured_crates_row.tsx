import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"
import { useViewport } from "@/hooks/use_viewport"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  const { isCompact, isComfy } = useViewport()
  if (crates.length === 0) return null

  // Responsive columns: compact stays 1, comfy gets more, wide fills
  const cols = isCompact ? 1 : isComfy ? 2 : 3

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
        <span className="mc-section-name text-base font-semibold">Featured</span>
        <span className="mc-section-count">{crates.length}</span>
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {crates.map((crate) => (
          <CrateCard key={crate.slug} crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
        ))}
      </div>
    </div>
  )
}
