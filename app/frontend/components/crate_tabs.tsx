import React from "react"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export default function CrateTabs({ crates, activeSlug, onSelect }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
      {crates.map((crate) => (
        <button
          key={crate.slug}
          onClick={() => onSelect(crate.slug)}
          className={`whitespace-nowrap px-2.5 py-1 rounded text-xs sm:text-sm cursor-pointer transition-colors ${
            crate.slug === activeSlug
              ? "bg-mc-accent text-mc-bg font-medium"
              : "bg-mc-bg-raised text-mc-text-dim hover:bg-mc-bg-card hover:text-mc-text"
          }`}
        >
          {crate.name}
        </button>
      ))}
    </div>
  )
}
