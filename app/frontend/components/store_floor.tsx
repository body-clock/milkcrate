import { motion } from "framer-motion"
import RecordCard from "./record_card"
import FeaturedCratesRow from "./featured_crates_row"
import GenreGrid from "./genre_grid"
import { useIsDesktop } from "@/hooks/use_is_desktop"
import type { StorefrontSection } from "../types/inertia"

interface Props {
  sections: StorefrontSection[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function StoreFloor({ sections, onSelectCrate }: Props) {
  const isDesktop = useIsDesktop()
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div className="flex flex-col">
      {sections.map((section) => {
        if (section.key === "picks_wall") {
          const picks = section.crate
          return (
            picks.records.length > 0 && (
              <div key="picks" className="-mx-4 mb-6 bg-mc-bg-raised border-y border-mc-border">
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

                {isDesktop ? (
                  <div className="grid grid-cols-6 gap-1 px-3 pt-3 pb-4">
                    {picks.records.slice(0, 12).map((record, i) => {
                      const tilt = i % 2 === 0 ? 1.5 : -1.5
                      return (
                        <motion.div
                          key={record.id}
                          className="aspect-square"
                          style={{ zIndex: 1 }}
                          whileHover={{ rotate: tilt, y: -3, scale: 1.05, zIndex: 10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        >
                          <RecordCard listing={record} imageLoading="lazy" />
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pl-4 pt-3 pb-4" style={{ scrollbarWidth: "none" }}>
                    {picks.records.slice(0, 10).map((record, i) => {
                      const src = record.cover_image_url ?? record.thumbnail_url
                      return (
                        <motion.button
                          key={record.id}
                          type="button"
                          className="flex-shrink-0 w-[46vw] h-[46vw] rounded bg-mc-bg-card overflow-hidden border border-mc-border cursor-pointer"
                          whileHover={{ scale: 1.04, zIndex: 10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                          onClick={() => onSelectCrate("picks", i)}
                          aria-label={`Open Milkcrate Picks at ${record.title ?? "record"}`}
                        >
                          {src ? (
                            <img
                              src={src}
                              alt={record.title ?? ""}
                              className="w-full h-full object-cover"
                              draggable={false}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center mc-dim text-2xl">♪</div>
                          )}
                        </motion.button>
                      )
                    })}
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
      })}
    </div>
  )
}
