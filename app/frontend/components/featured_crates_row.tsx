import { useIsDesktop } from "@/hooks/use_is_desktop"
import CrateCard from "./crate_card"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  const isDesktop = useIsDesktop()

  if (crates.length === 0) return null

  return (
    <div
      className={isDesktop ? "mb-6 grid grid-cols-2 gap-4" : "mb-4 -mx-4 px-4 flex gap-3 overflow-x-auto"}
      style={!isDesktop ? { scrollbarWidth: "none" } : undefined}
    >
      {crates.map((crate) => (
        <div key={crate.slug} className={!isDesktop ? "flex-shrink-0 w-[70vw] sm:w-64" : ""}>
          <CrateCard crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
        </div>
      ))}
    </div>
  )
}
