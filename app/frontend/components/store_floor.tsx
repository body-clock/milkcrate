import React from "react"
import { motion } from "framer-motion"
import StoreSection from "./store_section"
import RecordCard from "./record_card"
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

  // Deduplicate: seed seen set with picks, then walk genre bins in order
  const seenIds = new Set<number>(picks?.records.map((r) => r.id) ?? [])
  const dedupedGenreCrates = genreCrates.map((crate) => {
    const unique = crate.records.filter((r) => !seenIds.has(r.id))
    unique.forEach((r) => seenIds.add(r.id))
    return { ...crate, records: unique }
  })

  return (
    <div className="flex flex-col">
      {picks && picks.records.length > 0 && (
        <div className={isDesktop ? "mb-6" : "-mx-4 mb-4 bg-mc-bg-raised border-y border-mc-border"}>
          {isDesktop ? (
            <button
              type="button"
              onClick={() => onSelectCrate("picks")}
              className="w-full text-left cursor-pointer group"
              aria-label="Open Milkcrate Picks"
            >
              <div className="mc-section-header">
                <span className="mc-section-name">Milkcrate Picks</span>
                <span className="mc-section-count">{today}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectCrate("picks")}
              className="w-full text-left cursor-pointer group px-4 pt-3 pb-2"
              aria-label="Open Milkcrate Picks"
            >
              <div className="flex items-baseline gap-3 pb-2 border-b border-mc-border">
                <span className="mc-section-name">Milkcrate Picks</span>
                <span className="mc-section-count">{today}</span>
              </div>
            </button>
          )}

          {isDesktop ? (
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
      )}

      <div className="flex flex-col">
        {dedupedGenreCrates.map((dedupedCrate) => {
          const fullCrate = genreCrates.find((c) => c.slug === dedupedCrate.slug)!
          return (
            <StoreSection
              key={dedupedCrate.slug}
              crate={dedupedCrate}
              onSelect={(slug, i) => {
                const startIndex = i ?? 0
                const record = dedupedCrate.records[startIndex]
                if (!record) return

                const fullIndex = fullCrate.records.findIndex((r) => r.id === record.id)
                onSelectCrate(slug, fullIndex >= 0 ? fullIndex : startIndex)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
