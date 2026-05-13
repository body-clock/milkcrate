import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"
import { useViewport } from "@/hooks/use_viewport"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function GenreGrid({ crates, onSelectCrate }: Props) {
  const { isCompact, isComfy, isWide } = useViewport()
  if (crates.length === 0) return null

  // Responsive columns: compact=2, comfy=3, wide=4
  const cols = isCompact ? 2 : isComfy ? 3 : 4

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-2 mb-4">
        <span className="mc-section-name text-base font-semibold">Browse by genre</span>
        <span className="mc-section-count">{crates.length}</span>
      </div>
      <div
        className="grid gap-3 sm:gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
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
