import React from "react"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  onSelect: (slug: string) => void
}

export default function StoreSection({ crate, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(crate.slug)}
      className="w-full text-left cursor-pointer group"
    >
      <div className="mc-section-header">
        <span className="mc-section-name">{crate.name}</span>
        <span className="mc-section-count">{crate.count} records</span>
        <span className="mc-section-browse group-hover:text-mc-accent">Dig in →</span>
      </div>
      <div className="mc-crate-row pb-3">
        {crate.records.slice(0, 10).map((record) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <div
              key={record.id}
              className="flex-shrink-0 w-14 h-14 rounded bg-mc-bg-raised overflow-hidden border border-mc-border"
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
                <div className="w-full h-full flex items-center justify-center mc-dim text-sm">♪</div>
              )}
            </div>
          )
        })}
      </div>
    </button>
  )
}
