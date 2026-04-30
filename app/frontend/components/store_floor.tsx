import React from "react"
import StoreSection from "./store_section"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string) => void
}

export default function StoreFloor({ crates, onSelectCrate }: Props) {
  const picks = crates.find((c) => c.slug === "picks")
  const genreCrates = crates.filter((c) => c.slug !== "picks")

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div className="flex flex-col">
      {picks && picks.records.length > 0 && (
        <button
          onClick={() => onSelectCrate("picks")}
          className="w-full text-left cursor-pointer group mb-6"
        >
          <div className="mc-section-header">
            <span className="mc-section-name">Milkcrate Picks</span>
            <span className="mc-section-count">{today}</span>
            <span className="mc-section-browse group-hover:text-mc-accent">Dig in →</span>
          </div>
          <div className="mc-crate-row pb-3">
            {picks.records.slice(0, 10).map((record) => {
              const src = record.cover_image_url ?? record.thumbnail_url
              return (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-[4.5rem] h-[4.5rem] rounded bg-mc-bg-raised overflow-hidden border border-mc-border"
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
                    <div className="w-full h-full flex items-center justify-center mc-dim text-lg">♪</div>
                  )}
                </div>
              )
            })}
          </div>
        </button>
      )}

      <div className="flex flex-col">
        {genreCrates.map((crate) => (
          <StoreSection key={crate.slug} crate={crate} onSelect={onSelectCrate} />
        ))}
      </div>
    </div>
  )
}
