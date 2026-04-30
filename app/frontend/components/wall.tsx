import React from "react"
import type { Listing } from "../types/inertia"

interface Props {
  picks: Listing[]
  onSelect: (listingId: number, crateSlug: string) => void
}

export default function Wall({ picks, onSelect }: Props) {
  if (picks.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold mb-4 mc-text">Staff Picks</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {picks.slice(0, 8).map((record) => (
          <button
            key={record.id}
            onClick={() => onSelect(record.id, "picks")}
            className="group text-left"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-mc-bg-raised border border-mc-border mb-2 group-hover:border-mc-accent transition-colors">
              {record.cover_image_url ? (
                <img
                  src={record.cover_image_url}
                  alt={record.title ?? ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-4xl">♪</div>
              )}
            </div>
            <p className="text-xs truncate font-medium mc-text">{record.title}</p>
            <p className="text-xs text-mc-text-dim truncate">{record.artist}</p>
            <p className="text-xs text-mc-text-dim mt-0.5">
              {record.label} {record.year ? `· ${record.year}` : ""}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
