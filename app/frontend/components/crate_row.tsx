import React from "react"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  onSelect: (listingId: number, crateSlug: string) => void
}

export default function CrateRow({ crate, onSelect }: Props) {
  if (crate.records.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold mc-text">
          {crate.slug === "picks" ? "✨ " : ""}
          {crate.name}
        </h2>
        <span className="text-xs text-mc-text-dim">{crate.count} records</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
        {crate.records.slice(0, 20).map((record) => (
          <button
            key={record.id}
            onClick={() => onSelect(record.id, crate.slug)}
            className="group flex-shrink-0 w-32 text-left"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-mc-bg-raised border border-mc-border mb-1.5 group-hover:border-mc-accent transition-colors">
              {record.cover_image_url ? (
                <img
                  src={record.cover_image_url}
                  alt={record.title ?? ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-3xl">♪</div>
              )}
            </div>
            <p className="text-xs truncate font-medium mc-text">{record.title}</p>
            <p className="text-xs text-mc-text-dim truncate">{record.artist}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
