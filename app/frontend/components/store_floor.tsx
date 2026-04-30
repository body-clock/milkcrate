import React from "react"
import { motion } from "framer-motion"
import StoreSection from "./store_section"
import RecordCard from "./record_card"
import CrateView from "./crate_view"
import { useIsDesktop } from "@/hooks/use_is_desktop"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function StoreFloor({ crates, onSelectCrate }: Props) {
  const isDesktop = useIsDesktop()
  const picks = crates.find((c) => c.slug === "picks")
  const genreCrates = crates.filter((c) => c.slug !== "picks")

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div className="flex flex-col">
      {picks && picks.records.length > 0 && (
        isDesktop ? (
          <div className="mb-6">
            <button
              onClick={() => onSelectCrate("picks")}
              className="w-full text-left cursor-pointer group"
            >
              <div className="mc-section-header">
                <span className="mc-section-name">Milkcrate Picks</span>
                <span className="mc-section-count">{today}</span>
                <span className="mc-section-count group-hover:text-mc-accent">See more</span>
              </div>
            </button>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1 px-2 pt-2">
              {picks.records.slice(0, 12).map((record, i) => {
                const tilt = i % 2 === 0 ? 1.5 : -1.5
                return (
                  <motion.div
                    key={record.id}
                    className="aspect-square"
                    style={{ zIndex: 1 }}
                    whileHover={{ rotate: tilt, y: -2, scale: 1.03, zIndex: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <RecordCard listing={record} imageLoading="lazy" />
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="mc-section-header">
              <span className="mc-section-name">Milkcrate Picks</span>
              <span className="mc-section-count">{today}</span>
            </div>
            <CrateView
              crates={[picks]}
              activeSlug="picks"
              hideTabs
              onSelectCrate={() => {}}
            />
          </div>
        )
      )}

      <div className="flex flex-col">
        {genreCrates.map((crate) => (
          <StoreSection key={crate.slug} crate={crate} onSelect={(slug, i) => onSelectCrate(slug, i)} />
        ))}
      </div>
    </div>
  )
}
