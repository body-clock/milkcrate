import RecordCard from "./record_card"
import FeaturedCratesRow from "./featured_crates_row"
import GenreGrid from "./genre_grid"
import TactileCard from "./tactile_card"
import type { StorefrontSection } from "../types/inertia"

interface Props {
  sections: StorefrontSection[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function StoreFloor({ sections, onSelectCrate }: Props) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div className="flex flex-col">
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          const picks = section.crate
          return (
            picks.records.length > 0 && (
              <div key="picks" className="-mx-4 mb-6 bg-mc-bg-raised border-y border-mc-border" data-section="picks_wall">
                <button
                  type="button"
                  onClick={() => onSelectCrate("picks")}
                  className="w-full text-left cursor-pointer group px-4 pt-3 pb-2"
                  aria-label="Open Milkcrate Picks"
                >
                  <div className="flex items-baseline gap-3 pb-2 border-b border-mc-border">
                    <span className="mc-section-name text-base font-semibold">Milkcrate Picks</span>
                    <span className="mc-section-count">{today}</span>
                  </div>
                </button>

                {/* CSS Grid auto-fit: collapses naturally from 6→3→2 columns. */}
                <div className="grid gap-1 sm:gap-2 px-3 pt-3 pb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                  {picks.records.slice(0, 12).map((record, i) => {
                    const tilt = i % 2 === 0 ? 1.5 : -1.5
                    return (
                      <TactileCard
                        key={record.id}
                        restingTilt={tilt}
                        className="aspect-square"
                      >
                        <RecordCard listing={record} imageLoading="lazy" />
                      </TactileCard>
                    )
                  })}
                </div>
              </div>
            )
          )
        }

        if (section.key === "featured_crates") {
          return <div key="featured" data-section="featured_crates"><FeaturedCratesRow crates={section.crates} onSelectCrate={onSelectCrate} /></div>
        }

        if (section.key === "genre_grid") {
          return <div key="genres" data-section="genre_grid"><GenreGrid crates={section.crates} onSelectCrate={onSelectCrate} /></div>
        }

        return null
      })}
    </div>
  )
}
