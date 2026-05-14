import { motion } from "framer-motion"
import RecordCard from "./record_card"
import RecordTile from "./record_tile"
import FeaturedCratesRow from "./featured_crates_row"
import GenreGrid from "./genre_grid"
import TactileCard from "./tactile_card"
import { springTactile, SCALE_HOVER, SCALE_PRESS } from "@/lib/motion_tokens"
import { useViewport } from "@/hooks/use_viewport"
import type { StorefrontSection } from "../types/inertia"

interface Props {
  sections: StorefrontSection[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function StoreFloor({ sections, onSelectCrate }: Props) {
  const { isCompact, isComfy, isWide } = useViewport()
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  // Responsive grid columns for the picks wall
  // Desktop: 5 across × 2 rows = 10 · Compact: horizontal scroll
  const picksCols = !isCompact ? 5 : 0

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          const picks = section.crate
          return (
            picks.records.length > 0 && (
              <div key="picks" className="rounded-xl sm:rounded-2xl bg-mc-bg-raised border border-mc-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => onSelectCrate("picks")}
                  className="w-full text-left cursor-pointer group px-4 sm:px-6 pt-3 pb-2"
                  aria-label="Open Milkcrate Picks"
                >
                  <div className="flex items-baseline gap-3 pb-2 border-b border-mc-border">
                    <span className="mc-section-name text-base font-semibold">Milkcrate Picks</span>
                    <span className="mc-section-count">{today}</span>
                  </div>
                </button>

                {/* Wide/comfy: responsive grid */}
                {!isCompact ? (
                  <div
                    className="grid gap-1.5 sm:gap-2 px-4 sm:px-6 pt-3 pb-5"
                    style={{ gridTemplateColumns: `repeat(${picksCols}, 1fr)` }}
                  >
                    {picks.records.slice(0, picksCols * 2).map((record, i) => {
                      const tilt = i % 2 === 0 ? 0.8 : -0.8
                      return (
                        <div
                          key={record.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectCrate("picks", i)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onSelectCrate("picks", i)
                            }
                          }}
                          className="aspect-square cursor-pointer"
                          aria-label={`Open Milkcrate Picks at ${record.title ?? "record"}`}
                        >
                          <TactileCard restingTilt={tilt} className="aspect-square rounded-md overflow-hidden">
                            <RecordCard listing={record} imageLoading="lazy" disableFlip />
                          </TactileCard>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Compact: horizontal scroll */
                  <div className="relative">
                    <div
                      className="flex gap-2 overflow-x-auto pl-4 pr-8 pt-3 pb-5"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {picks.records.slice(0, 10).map((record, i) => (
                          <motion.button
                            key={record.id}
                            type="button"
                            className="flex-shrink-0 w-[44vw] max-w-[200px] aspect-square rounded-lg bg-mc-bg-card overflow-hidden border border-mc-border cursor-pointer"
                            whileHover={{ scale: SCALE_HOVER, zIndex: 10 }}
                            whileTap={{ scale: SCALE_PRESS }}
                            transition={springTactile}
                            onClick={() => onSelectCrate("picks", i)}
                            aria-label={`Open Milkcrate Picks at ${record.title ?? "record"}`}
                          >
                            <RecordTile listing={record} imageLoading="lazy" />
                          </motion.button>
                        ))}
                    </div>
                    <div
                      aria-hidden="true"
                      className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
                      style={{
                        background: "linear-gradient(to right, transparent, var(--mc-bg-raised))",
                      }}
                    />
                  </div>
                )}
              </div>
            )
          )
        }

        if (section.key === "featured_crates") {
          return <FeaturedCratesRow key="featured" crates={section.crates} onSelectCrate={onSelectCrate} />
        }

        if (section.key === "genre_grid") {
          return <GenreGrid key="genres" crates={section.crates} onSelectCrate={onSelectCrate} />
        }

        return null
      })}
    </div>
  )
}
