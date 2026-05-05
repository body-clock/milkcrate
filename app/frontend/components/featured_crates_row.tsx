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
      className={isDesktop ? "mb-6 grid grid-cols-2 gap-4" : "mb-6 flex flex-col gap-4"}
    >
      {crates.map((crate) => (
        <div key={crate.slug} className="w-full">
          <CrateCard crate={crate} variant="featured" onSelectCrate={onSelectCrate} />
        </div>
      ))}
    </div>
  )
}
